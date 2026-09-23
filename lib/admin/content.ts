import "server-only";
import { randomUUID } from "node:crypto";
import { shelfData } from "@/lib/data";
import { projects } from "@/lib/producer";
import { database } from "./db";
import {
  collections,
  transaction,
  syncCampaigns,
  fundingViews,
} from "@/lib/payments/store";
import { HttpError } from "./http";
import { contentSchema, type Content } from "./schema";

type ContentDocument = Content & {
  _id: string;
  updatedAt: Date;
  updatedBy: string;
};
function seed(): Content {
  return contentSchema.parse({
    revision: 0,
    shelves: shelfData.map((s) => ({
      ...s,
      films: s.films.map((f) => ({
        ...f,
        id: randomUUID(),
        award: !!f.award,
        published: true,
      })),
    })),
    projects: projects.map((p, i) => ({
      ...p,
      id: randomUUID(),
      published: true,
      homepageSlot: i + 1,
    })),
  });
}
export async function getContent(): Promise<Content> {
  const collection = (await database()).collection<ContentDocument>(
    "site_content",
  );
  let document = await collection.findOne({ _id: "main" });
  if (!document) {
    try {
      await collection.updateOne(
        { _id: "main" },
        {
          $setOnInsert: {
            ...seed(),
            updatedAt: new Date(),
            updatedBy: "initial-import",
          },
        },
        { upsert: true },
      );
    } catch (error) {
      if (!(
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      ))
        throw error;
    }
    document = await collection.findOne({ _id: "main" });
  }
  if (!document) throw new Error("Content could not be loaded.");
  return {
    revision: document.revision,
    shelves: document.shelves,
    projects: document.projects,
  };
}
export async function saveContent(
  content: Content,
  email: string,
): Promise<boolean> {
  const { campaigns } = await collections();
  return transaction(async (session) => {
    const collection = (await database()).collection<ContentDocument>(
      "site_content",
    );
    const previous = await collection.findOne({ _id: "main" }, { session });
    if (!previous || previous.revision !== content.revision) return false;
    const started = await campaigns.find({}, { session }).toArray();
    for (const campaign of started) {
      const before = previous.projects.find((p) => p.id === campaign._id);
      const after = content.projects.find((p) => p.id === campaign._id);
      if (
        before &&
        after &&
        (before.raised !== after.raised || before.backers !== after.backers)
      )
        throw new HttpError(
          "Payment totals and opening balances cannot be edited after fundraising starts.",
          400,
        );
    }
    await syncCampaigns(content.projects, session);
    const result = await collection.updateOne(
      { _id: "main", revision: content.revision },
      {
        $set: {
          shelves: content.shelves,
          projects: content.projects,
          updatedAt: new Date(),
          updatedBy: email,
        },
        $inc: { revision: 1 },
      },
      { session },
    );
    return result.modifiedCount === 1;
  });
}

export async function getPublicContent() {
  const content = await getContent();
  const views = await fundingViews(content.projects);
  return {
    shelves: content.shelves.map((s) => ({
      ...s,
      films: s.films.filter((f) => f.published),
    })),
    projects: content.projects
      .filter((p) => p.published)
      .map((p) => ({
        ...p,
        raised: views.get(p.id)!.raisedPaise / 100,
        backers: views.get(p.id)!.backers,
      })),
  };
}
