import { test, expect } from "./fixtures";
import { MongoClient } from "mongodb";
import { randomUUID } from "node:crypto";
import { createContactStore } from "../../lib/contact/store";
import { createContactHandler } from "../../lib/contact/handler";
import { ContactError } from "../../lib/contact/request";

const enquiry = { name: "Contact test", email: "test@example.com", note: "Test only", source: "contact" };

test("contact HTTP endpoint rejects invalid, oversized and cross-origin requests", async ({ request }) => {
  expect((await request.post("/api/contact", { data: "{}", headers: { "Content-Type": "text/plain" } })).status()).toBe(415);
  expect((await request.post("/api/contact", { data: "{", headers: { "Content-Type": "application/json" } })).status()).toBe(400);
  expect((await request.post("/api/contact", { data: { ...enquiry, note: "x".repeat(33_000) } })).status()).toBe(413);
  expect((await request.post("/api/contact", { data: { ...enquiry, email: 'a"onmouseover="x@example.com' } })).status()).toBe(400);
  expect((await request.post("/api/contact", { data: enquiry, headers: { Origin: "https://untrusted.example" } })).status()).toBe(403);
  expect((await request.post("/api/contact", { data: { ...enquiry, website: "bot" } })).status()).toBe(200);
});

test("live route quotas survive new clients and ignore spoofed forwarding headers", async ({ request }) => {
  for (let i = 0; i < 5; i++) {
    const response = await request.post("/api/contact", {
      data: { ...enquiry, email: `test${i}@example.com` },
      headers: { "x-forwarded-for": `192.0.2.${i + 1}`, "x-vercel-forwarded-for": `192.0.2.${i + 1}` },
    });
    // The isolated production server deliberately has no provider credentials.
    expect(response.status()).toBe(500);
    expect((await response.json()).ok).toBe(false);
  }
  const response = await request.post("/api/contact", { data: enquiry });
  expect(response.status()).toBe(429);
  expect(Number(response.headers()["retry-after"])).toBeGreaterThan(0);
  expect(response.headers()["cache-control"]).toBe("no-store");
});

test("two database clients enforce one atomic quota and reset at the next window", async () => {
  const clients = [new MongoClient(process.env.MONGODB_URI!), new MongoClient(process.env.MONGODB_URI!)];
  await Promise.all(clients.map((client) => client.connect()));
  try {
    const stores = await Promise.all(clients.map((client) => createContactStore(client.db(process.env.MONGODB_DB))));
    const now = Date.now();
    const results = await Promise.allSettled(Array.from({ length: 12 }, (_, i) =>
      stores[i % 2].limit("192.0.2.1", `sender${i}@example.com`, now)));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(5);
    for (const result of results) {
      if (result.status === "rejected") expect(result.reason).toMatchObject({ status: 429 });
    }
    await expect(stores[1].limit("192.0.2.1", "new@example.com", now + 600_000)).resolves.toBeUndefined();
    const db = clients[0].db(process.env.MONGODB_DB);
    const rows = await db.collection("contact_limits").find().toArray();
    expect(JSON.stringify(rows)).not.toContain("192.0.2.1");
    expect(JSON.stringify(rows)).not.toContain("@example.com");
    expect(await db.collection("contact_limits").indexes()).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: { expiresAt: 1 }, expireAfterSeconds: 0 }),
    ]));
  } finally {
    await Promise.all(clients.map((client) => client.close()));
  }
});

test("sender and global quotas also apply when trusted client identities change", async () => {
  const client = await new MongoClient(process.env.MONGODB_URI!).connect();
  try {
    const store = await createContactStore(client.db(process.env.MONGODB_DB));
    const now = Date.now();
    for (let i = 0; i < 5; i++) await store.limit(`192.0.2.${i}`, "same@example.com", now);
    await expect(store.limit("192.0.2.9", "SAME@example.com", now)).rejects.toMatchObject({ status: 429 });
    const nextWindow = now + 600_000;
    const results = await Promise.allSettled(Array.from({ length: 105 }, (_, i) =>
      store.limit(`client-${i}`, `sender${i}@example.com`, nextWindow)));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(100);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(5);
  } finally {
    await client.close();
  }
});

test("receipts survive a new store, reject changed payloads and stop expired uncertain retries", async () => {
  const client = await new MongoClient(process.env.MONGODB_URI!).connect();
  try {
    const db = client.db(process.env.MONGODB_DB);
    const store = await createContactStore(db);
    const id = randomUUID();
    const now = Date.now();
    expect(await store.reserve(id, "payload", now)).toBe(false);
    const other = await createContactStore(db);
    expect(await other.reserve(id, "payload", now + 1000)).toBe(false);
    await expect(other.reserve(id, "changed", now)).rejects.toMatchObject({ status: 409 });
    await expect(other.reserve(id, "payload", now + 23 * 60 * 60 * 1000)).rejects.toMatchObject({ status: 409 });
    await store.markSent(id);
    expect(await other.reserve(id, "payload", now + 24 * 60 * 60 * 1000)).toBe(true);
    const receipt = await db.collection<{ _id: string; expiresAt: Date; createdAt: Date }>("contact_receipts").findOne({ _id: id });
    expect(receipt).not.toBeNull();
    expect(receipt!.expiresAt.getTime() - receipt!.createdAt.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    expect(await db.collection("contact_receipts").indexes()).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: { expiresAt: 1 }, expireAfterSeconds: 0 }),
    ]));
  } finally {
    await client.close();
  }
});

test("uncertain provider success retries use the same key across server instances", async () => {
  const client = await new MongoClient(process.env.MONGODB_URI!).connect();
  try {
    const db = client.db(process.env.MONGODB_DB);
    const stores = await Promise.all([createContactStore(db), createContactStore(db)]);
    const delivered = new Set<string>();
    let calls = 0;
    const handlers = stores.map((store) => createContactHandler({
      store: async () => store, configured: () => true, from: "from@example.com", to: "to@example.com",
      send: async (_payload, id) => {
        delivered.add(id); // Models Resend's documented idempotency behavior.
        if (++calls === 1) throw new ContactError("Lost provider response", 502);
      },
    }));
    const id = randomUUID();
    const req = () => new Request("https://example.com/api/contact", {
      method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": id }, body: JSON.stringify(enquiry),
    });
    expect((await handlers[0](req())).status).toBe(502);
    expect((await handlers[1](req())).status).toBe(200);
    expect((await handlers[0](req())).status).toBe(200);
    expect(calls).toBe(2);
    expect(delivered.size).toBe(1);
  } finally {
    await client.close();
  }
});
