import "server-only";
import { createHash, createHmac } from "node:crypto";
import type { ClientSession } from "mongodb";
import { database, mongoClient } from "@/lib/admin/db";
import { HttpError } from "@/lib/admin/http";
import type { AdminProject } from "@/lib/admin/schema";
import {
  Campaign,
  Contribution,
  closingTime,
  paise,
  campaignView,
  type FundingView,
} from "./model";
import { paymentMode, paymentReady } from "./config";
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export const privateHash = (s: string) =>
  createHmac("sha256", process.env.ADMIN_JWT_SECRET || "")
    .update(s)
    .digest("hex");
let indexes: Promise<unknown> | undefined;
export async function collections() {
  const db = await database();
  const campaigns = db.collection<Campaign>("funding_campaigns");
  const contributions = db.collection<Contribution>("contributions");
  if (!indexes)
    indexes = Promise.all([
      contributions.createIndex({ requestId: 1 }, { unique: true }),
      contributions.createIndex(
        { projectId: 1, emailHash: 1 },
        { unique: true, partialFilterExpression: { reservationActive: true } },
      ),
      contributions.createIndex(
        { paymentId: 1 },
        {
          unique: true,
          partialFilterExpression: { paymentId: { $type: "string" } },
        },
      ),
      contributions.createIndex({ nextCheckAt: 1 }),
      contributions.createIndex({ projectId: 1, createdAt: -1 }),
      db
        .collection("payment_limits")
        .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]).catch((e) => {
      indexes = undefined;
      throw e;
    });
  await indexes;
  return { db, campaigns, contributions };
}
export async function transaction<T>(
  fn: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const client = await mongoClient();
  return client.withSession((session) =>
    session.withTransaction(() => fn(session), {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
      maxCommitTimeMS: 10000,
    }),
  );
}
export async function syncCampaigns(
  projects: AdminProject[],
  session: ClientSession,
) {
  const { campaigns, contributions } = await collections();
  const existing = await campaigns.find({}, { session }).toArray();
  for (const old of existing) {
    if (!projects.some((p) => p.id === old._id)) {
      if (await contributions.findOne({ projectId: old._id }, { session }))
        throw new HttpError(
          "Stories with payment history cannot be deleted. Close fundraising and unpublish the story instead.",
          409,
        );
      await campaigns.deleteOne({ _id: old._id }, { session });
    }
  }
  for (const p of projects) {
    const old = existing.find((c) => c._id === p.id);
    if (old && old.environment !== paymentMode())
      throw new HttpError(
        "Use separate databases for sandbox and production contributions.",
        409,
      );
    const state = p.fundingState || "setup";
    if (state === "setup" && !old) continue;
    if (state === "setup" && old)
      throw new HttpError(
        "An existing campaign cannot be reset. Pause or close it instead.",
        400,
      );
    const closesAt = closingTime(p.closes);
    if (!closesAt || !(p.fundingTerms || "").trim())
      throw new HttpError(
        "Set a valid closing date and contribution/refund terms before enabling payments.",
        400,
      );
    const goal = paise(p.need),
      min = paise(p.minContribution ?? 100),
      max = paise(p.maxContribution ?? 200000);
    if (min > max)
      throw new HttpError(
        "The minimum contribution cannot exceed the maximum.",
        400,
      );
    if (
      old &&
      goal <
        old.openingPaise + old.paidPaise - old.refundedPaise + old.reservedPaise
    )
      throw new HttpError(
        "The goal cannot be lower than confirmed and reserved funds.",
        409,
      );
    if (
      !old &&
      !["zero", "existing"].includes(
        process.env.CONTRIBUTION_OPENING_BALANCE_POLICY || "",
      )
    )
      throw new HttpError(
        "Confirm whether the old funding figures are real before enabling payments.",
        400,
      );
    const opening =
      process.env.CONTRIBUTION_OPENING_BALANCE_POLICY === "existing"
        ? paise(p.raised)
        : 0;
    const c: Campaign = old || {
      _id: p.id,
      environment: paymentMode(),
      title: p.title,
      goalPaise: goal,
      openingPaise: opening,
      openingBackers: opening ? p.backers : 0,
      paidPaise: 0,
      refundedPaise: 0,
      reservedPaise: 0,
      paidCount: 0,
      state: "paused",
      published: p.published,
      closesAt,
      minPaise: min,
      maxPaise: max,
      terms: "",
      termsVersion: "",
      updatedAt: new Date(),
    };
    if (!old && opening > goal)
      throw new HttpError(
        "Opening funds exceed this project’s funding goal.",
        400,
      );
    if (c.openingPaise + c.paidPaise - c.refundedPaise >= goal)
      c.fundedAt ||= new Date();
    await campaigns.replaceOne(
      { _id: p.id },
      {
        ...c,
        title: p.title,
        goalPaise: goal,
        state: state as Campaign["state"],
        published: p.published,
        closesAt,
        minPaise: min,
        maxPaise: max,
        terms: p.fundingTerms!,
        termsVersion: hash(p.fundingTerms!),
        updatedAt: new Date(),
      },
      { upsert: true, session },
    );
  }
}
export async function fundingViews(
  projects: AdminProject[],
): Promise<Map<string, FundingView>> {
  const { campaigns } = await collections();
  const all = await campaigns
    .find({ _id: { $in: projects.map((p) => p.id) } })
    .toArray();
  return new Map(
    projects.map((p) => {
      const c = all.find((c) => c._id === p.id);
      return [
        p.id,
        c
          ? campaignView(c, paymentReady(), paymentMode())
          : {
              projectId: p.id,
              goalPaise: paise(p.need),
              raisedPaise: paise(p.raised),
              reservedPaise: 0,
              availablePaise: Math.max(0, paise(p.need) - paise(p.raised)),
              backers: p.backers,
              status: "setup",
              minPaise: 10000,
              maxPaise: 20000000,
              closesAt: closingTime(p.closes)?.toISOString() || null,
              terms: "",
              termsVersion: "",
              checkoutAvailable: false,
              mode: paymentMode(),
            },
      ];
    }),
  );
}
export async function allowCheckout(ip: string, email: string) {
  const { db } = await collections(),
    col = db.collection<{ _id: string; count: number; expiresAt: Date }>(
      "payment_limits",
    );
  const bucket = Math.floor(Date.now() / 900000);
  for (const [key, limit] of [
    [`ip:${privateHash(ip)}`, 15],
    [`email:${privateHash(email)}`, 5],
    ["global", 300],
  ] as const) {
    const row = await col.findOneAndUpdate(
      { _id: `${key}:${bucket}` },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date((bucket + 2) * 900000) },
      },
      { upsert: true, returnDocument: "after" },
    );
    if (!row || row.count > limit)
      throw new HttpError(
        "Too many checkout attempts. Please try again later.",
        429,
      );
  }
}
