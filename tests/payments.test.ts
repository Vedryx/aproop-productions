import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHmac } from "node:crypto";
import { CashfreeMock } from "./cashfree-mock.mjs";
import type { Campaign, ContributionInput } from "../lib/payments/model";
import { paise, closingTime, campaignView } from "../lib/payments/model";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27019/?directConnection=true";
process.env.MONGODB_DB = `aproop_paytest_${randomBytes(8).toString("hex")}`;
process.env.CASHFREE_ENV = "sandbox";
process.env.CASHFREE_CLIENT_ID = "sandbox-test";
process.env.CASHFREE_CLIENT_SECRET = "sandbox-test-secret";
process.env.APP_ORIGIN = "http://127.0.0.1:3001";
process.env.ADMIN_JWT_SECRET = "test-only-key-for-financial-ledger";
process.env.CONTRIBUTION_OPENING_BALANCE_POLICY = "zero";
const mock = new CashfreeMock();
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const url = String(input);
  if (!url.startsWith("https://sandbox.cashfree.com/pg"))
    throw Error(`Unexpected external request: ${url}`);
  const result = mock.handle(
    options?.method || "GET",
    new URL(url).pathname,
    options?.body ? JSON.parse(String(options.body)) : undefined,
  );
  return Response.json(result.body, { status: result.status });
};
import {
  collections,
  hash,
  transaction,
  syncCampaigns,
} from "../lib/payments/store";
import {
  beginContribution,
  reconcileOrder,
  contributionStatus,
} from "../lib/payments/service";
import { mongoClient } from "../lib/admin/db";
import { validSignature } from "../lib/payments/provider";
import { POST as webhook } from "../app/api/payments/cashfree/webhook/route";
const projectId = randomUUID();
let campaign: Campaign;
before(async () => {
  await collections();
});
beforeEach(async () => {
  mock.clear();
  const { db } = await collections();
  for (const name of [
    "funding_campaigns",
    "contributions",
    "payment_limits",
    "payment_events",
    "payment_refunds",
  ])
    await db.collection(name).deleteMany({});
  campaign = {
    _id: projectId,
    environment: "sandbox",
    title: "Test film",
    goalPaise: 100000,
    openingPaise: 0,
    openingBackers: 0,
    paidPaise: 0,
    refundedPaise: 0,
    reservedPaise: 0,
    paidCount: 0,
    state: "open",
    published: true,
    closesAt: new Date("2030-12-31T18:29:59.999Z"),
    minPaise: 10000,
    maxPaise: 100000,
    terms: "Sandbox terms: test contributions only.",
    termsVersion: hash("Sandbox terms: test contributions only."),
    updatedAt: new Date(),
  };
  await (await collections()).campaigns.insertOne(campaign);
});
after(async () => {
  globalThis.fetch = realFetch;
  const client = await mongoClient();
  await client.db(process.env.MONGODB_DB).dropDatabase();
  await client.close();
});
function input(
  amount = "500",
  email = `${randomUUID()}@example.com`,
): ContributionInput {
  return {
    projectId,
    requestId: randomUUID(),
    accessToken: randomBytes(32).toString("hex"),
    amount,
    name: "Test Supporter",
    email,
    phone: "9999999999",
    creditName: "Test Credit",
    acceptedTerms: true,
    termsVersion: campaign.termsVersion,
  };
}
async function current() {
  return (await (await collections()).campaigns.findOne({ _id: projectId }))!;
}
async function expire(id: string) {
  await (
    await collections()
  ).contributions.updateOne(
    { _id: id },
    { $set: { expiresAt: new Date(Date.now() - 10000) } },
  );
}

test("money and deadlines are precise, in IST", () => {
  assert.equal(paise("123.45"), 12345);
  assert.throws(() => paise("1.001"));
  assert.equal(
    closingTime("December 2026")?.toISOString(),
    "2026-12-31T18:29:59.999Z",
  );
  assert.equal(closingTime("2026-02-30"), null);
});
test("concurrent contributors cannot overbook the final amount", async () => {
  const results = await Promise.allSettled(
    Array.from({ length: 6 }, (_, i) =>
      beginContribution(input("500"), `ip-${i}`),
    ),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 2);
  assert.equal((await current()).reservedPaise, 100000);
  for (const row of results)
    if (row.status === "fulfilled") {
      mock.pay(row.value._id);
      await reconcileOrder(row.value._id);
    }
  const c = await current();
  assert.equal(c.paidPaise, 100000);
  assert.equal(c.reservedPaise, 0);
  assert.ok(c.fundedAt);
  await assert.rejects(
    () => beginContribution(input("1"), "extra"),
    /fully funded/,
  );
});
test("idempotent retries reserve once and cannot change the amount", async () => {
  const request = input();
  const result = await Promise.all([
    beginContribution(request, "ip"),
    beginContribution(request, "ip"),
  ]);
  assert.equal(result[0]._id, result[1]._id);
  assert.equal((await current()).reservedPaise, 50000);
  await assert.rejects(
    () => beginContribution({ ...request, amount: "600" }, "ip"),
    /different details|changed/,
  );
  await assert.rejects(
    () => contributionStatus(result[0]._id, "f".repeat(64)),
    /accessed/,
  );
});
test("lost create response reuses the provider order and reservation", async () => {
  mock.loseCreateResponse = true;
  const request = input();
  const first = await beginContribution(request, "ip");
  assert.equal(first.state, "creating");
  const second = await beginContribution(request, "ip");
  assert.ok(second.paymentSessionId);
  assert.equal(mock.createCalls, 1);
  assert.equal((await current()).reservedPaise, 50000);
});
test("expiry and failed attempts do not release a payment still in progress", async () => {
  const c = await beginContribution(input("1000"), "ip");
  await expire(c._id);
  mock.orders.get(c._id).order_status = "EXPIRED";
  mock.terminationPending = true;
  mock.payments.set(c._id, [
    { payment_status: "FAILED" },
    { payment_status: "PENDING" },
  ]);
  await reconcileOrder(c._id);
  assert.equal((await current()).reservedPaise, 100000);
  await assert.rejects(
    () => beginContribution(input("100"), "ip2"),
    /reserved/,
  );
  mock.pay(c._id);
  await reconcileOrder(c._id);
  assert.equal((await current()).paidPaise, 100000);
  assert.equal((await current()).reservedPaise, 0);
});
test("confirmed termination releases funds; a late contradictory success is refunded", async () => {
  const c = await beginContribution(input("1000"), "ip");
  await expire(c._id);
  await reconcileOrder(c._id);
  assert.equal((await current()).reservedPaise, 0);
  const replacement = await beginContribution(input("1000"), "ip2");
  mock.pay(replacement._id);
  await reconcileOrder(replacement._id);
  mock.pay(c._id);
  const late = await reconcileOrder(c._id);
  assert.equal(late?.state, "refunded");
  assert.equal(late?.credited, false);
  assert.equal((await current()).paidPaise, 100000);
  assert.equal(mock.refundCalls, 1);
  await reconcileOrder(c._id);
  assert.equal(mock.refundCalls, 1);
});
test("duplicate and out-of-order notifications never double credit or reverse success", async () => {
  const c = await beginContribution(input(), "ip");
  mock.pay(c._id);
  await Promise.all([reconcileOrder(c._id), reconcileOrder(c._id)]);
  assert.equal((await current()).paidPaise, 50000);
  assert.equal((await current()).paidCount, 1);
  mock.payments.get(c._id).push({ payment_status: "FAILED" });
  await reconcileOrder(c._id);
  assert.equal((await current()).paidPaise, 50000);
});
test("wrong amounts, currencies, and forged webhook payloads cannot credit money", async () => {
  const c = await beginContribution(input(), "ip");
  mock.pay(c._id, { payment_amount: 501 });
  await reconcileOrder(c._id);
  assert.equal((await current()).paidPaise, 0);
  assert.equal((await current()).reservedPaise, 50000);
  const raw = JSON.stringify({
    type: "PAYMENT_SUCCESS_WEBHOOK",
    data: { order: { order_id: c._id } },
  });
  const timestamp = String(Date.now());
  const signature = createHmac("sha256", "sandbox-test-secret")
    .update(timestamp + raw)
    .digest("base64");
  assert.equal(validSignature(raw, timestamp, signature), true);
  assert.equal(validSignature(raw + " ", timestamp, signature), false);
  const invalid = await webhook(
    new Request("http://localhost/api/payments/cashfree/webhook", {
      method: "POST",
      body: raw,
      headers: {
        "x-webhook-timestamp": timestamp,
        "x-webhook-signature": "invalid",
      },
    }),
  );
  assert.equal(invalid.status, 401);
  mock.orders.get(c._id).order_status = "ACTIVE";
  mock.payments.set(c._id, []);
  const signed = await webhook(
    new Request("http://localhost/api/payments/cashfree/webhook", {
      method: "POST",
      body: raw,
      headers: {
        "x-webhook-timestamp": timestamp,
        "x-webhook-signature": signature,
      },
    }),
  );
  assert.equal(signed.status, 200);
  assert.equal((await current()).paidPaise, 0);
});
test("partial/full refunds sync once and a funded project never reopens automatically", async () => {
  const c = await beginContribution(input("1000"), "ip");
  mock.pay(c._id);
  await reconcileOrder(c._id);
  mock.refunds.set(c._id, [
    {
      cf_refund_id: "refund1",
      order_id: c._id,
      refund_amount: 250,
      refund_currency: "INR",
      refund_status: "SUCCESS",
    },
  ]);
  await reconcileOrder(c._id);
  assert.equal((await current()).refundedPaise, 25000);
  assert.equal((await current()).paidCount, 1);
  mock.refunds.get(c._id).push({
    cf_refund_id: "refund2",
    order_id: c._id,
    refund_amount: 750,
    refund_currency: "INR",
    refund_status: "SUCCESS",
  });
  await reconcileOrder(c._id);
  await reconcileOrder(c._id);
  assert.equal((await current()).refundedPaise, 100000);
  assert.equal((await current()).paidCount, 0);
  assert.equal(campaignView(await current(), true, "sandbox").status, "funded");
  await assert.rejects(() => beginContribution(input(), "ip2"), /fully funded/);
});
test("repeat supporter counts once; full refund of one payment preserves the supporter", async () => {
  const first = await beginContribution(input("400", "same@example.com"), "ip");
  mock.pay(first._id);
  await reconcileOrder(first._id);
  const second = await beginContribution(
    input("400", "same@example.com"),
    "ip",
  );
  mock.pay(second._id);
  await reconcileOrder(second._id);
  assert.equal((await current()).paidCount, 1);
  mock.refunds.set(first._id, [
    {
      cf_refund_id: "refund1",
      order_id: first._id,
      refund_amount: 400,
      refund_currency: "INR",
      refund_status: "SUCCESS",
    },
  ]);
  await reconcileOrder(first._id);
  assert.equal((await current()).paidCount, 1);
});
test("closed projects reject new checkouts and honour an already reserved success", async () => {
  const c = await beginContribution(input(), "ip");
  await (
    await collections()
  ).campaigns.updateOne({ _id: projectId }, { $set: { state: "closed" } });
  await assert.rejects(
    () => beginContribution(input(), "ip2"),
    /not accepting/,
  );
  mock.pay(c._id);
  await reconcileOrder(c._id);
  assert.equal((await current()).paidPaise, 50000);
});
test("campaigns with financial history cannot be deleted, and goals cannot undercut reservations", async () => {
  await beginContribution(input(), "ip");
  await assert.rejects(
    () => transaction((s) => syncCampaigns([], s)),
    /cannot be deleted/,
  );
  const project = {
    id: projectId,
    title: "Test film",
    kind: "Short film",
    ph: "Poster",
    poster: "/uploads/a.jpg",
    synopsis: "Story",
    director: "Team",
    stage: "Pre-production",
    closes: "December 2030",
    need: 100,
    raised: 0,
    backers: 0,
    options: [100],
    published: true,
    homepageSlot: 0 as const,
    fundingState: "open" as const,
    fundingTerms: campaign.terms,
  };
  await assert.rejects(
    () => transaction((s) => syncCampaigns([project], s)),
    /goal cannot be lower/,
  );
});

test("fractional rupees are exact and an unpayable sub-rupee remainder disables checkout", async () => {
  const c = await beginContribution(input("999.50"), "ip");
  mock.pay(c._id);
  await reconcileOrder(c._id);
  const view = campaignView(await current(), true, "sandbox");
  assert.equal(view.raisedPaise, 99950);
  assert.equal(view.availablePaise, 50);
  assert.equal(view.checkoutAvailable, false);
  await assert.rejects(
    () => beginContribution(input("0.50"), "ip2"),
    /at least ₹1/,
  );
});
