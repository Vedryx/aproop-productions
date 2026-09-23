import { test, expect } from "./fixtures";
import { authenticatedApi } from "./helpers";
import { MongoClient } from "mongodb";
import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ensureAdminIndexes } from "../../lib/admin/indexes";
import { consumeLoginAttempt } from "../../lib/admin/login-limits";
import type { Content } from "../../lib/admin/schema";

const headers = { Origin: process.env.APP_ORIGIN! };

test("database setup command is repeatable and preserves content and sessions", async () => {
  const run = promisify(execFile);
  const client = await new MongoClient(process.env.MONGODB_URI!).connect();
  try {
    const db = client.db(process.env.MONGODB_DB);
    const original = await db.collection("site_content").findOne({});
    const tokenId = randomUUID();
    await db.collection("admin_sessions").insertOne({ tokenId, expiresAt: new Date(Date.now() + 60_000) });
    for (let i = 0; i < 2; i++) {
      const result = await run(process.execPath, ["--import", "tsx", "scripts/setup-db.ts"], {
        env: { ...process.env }, timeout: 15_000,
      });
      expect(result.stdout).toContain("Database indexes are ready.");
    }
    expect(await db.collection("site_content").findOne({})).toEqual(original);
    expect(await db.collection("admin_sessions").findOne({ tokenId })).not.toBeNull();
  } finally {
    await client.close();
  }
});

test("public cache is reused across pages while admin reads stay fresh; saves invalidate immediately", async ({ page, request }) => {
  expect((await page.request.post("/api/admin/login", {
    headers, data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  })).status()).toBe(200);
  const api = await authenticatedApi(page);
  const client = await new MongoClient(process.env.MONGODB_URI!).connect();
  try {
    const initial: Content = await (await api.get("/api/admin/content")).json();
    const marker = `Cache-marker-${randomUUID()}`;
    // Warm both routes, then change the DB behind the cache deliberately. A fresh
    // public read must reuse the cached snapshot; the uncached admin must not.
    for (const path of ["/", "/be-the-producer"])
      expect((await request.get(path)).status()).toBe(200);
    await client.db(process.env.MONGODB_DB).collection("site_content").updateOne({}, {
      $set: { "projects.0.title": marker }, $inc: { revision: 1 },
    });
    for (const path of ["/", "/be-the-producer"])
      expect(await (await request.get(path)).text()).not.toContain(marker);
    const fresh: Content = await (await api.get("/api/admin/content")).json();
    expect(fresh.projects[0].title).toBe(marker);
    expect(fresh.revision).toBe(initial.revision + 1);
    const published = await api.put("/api/admin/content", { headers, data: fresh });
    expect(published.status()).toBe(200);
    for (const path of ["/", "/be-the-producer"])
      expect(await (await request.get(path)).text()).toContain(marker);

    let current: Content = await published.json();
    const project = current.projects[0];
    const unstar = await api.patch("/api/admin/content", {
      headers, data: { id: project.id, featured: false, revision: current.revision },
    });
    expect(unstar.status()).toBe(200);
    expect(await (await request.get("/")).text()).not.toContain(marker);
    expect(await (await request.get("/be-the-producer")).text()).toContain(marker);
    current = await unstar.json();
    current.projects[0].published = false;
    const unpublished = await api.put("/api/admin/content", { headers, data: current });
    expect(unpublished.status()).toBe(200);
    for (const path of ["/", "/be-the-producer"])
      expect(await (await request.get(path)).text()).not.toContain(marker);
    // A stale writer cannot restore the previously cached published state.
    expect((await api.put("/api/admin/content", { headers, data: fresh })).status()).toBe(409);
    expect(await (await request.get("/be-the-producer")).text()).not.toContain(marker);

    current = await unpublished.json();
    current.projects = [];
    current.shelves = [];
    expect((await api.put("/api/admin/content", { headers, data: current })).status()).toBe(200);
    expect(await (await request.get("/be-the-producer")).text()).toContain("New stories are on their way.");
    expect((await (await api.get("/api/admin/content")).json()).projects).toEqual([]);
  } finally {
    await client.close();
    await api.dispose();
  }
});

test("session index is unique and supports bounded lookups without expiring live sessions", async () => {
  const client = await new MongoClient(process.env.MONGODB_URI!).connect();
  try {
    const db = client.db(process.env.MONGODB_DB);
    await ensureAdminIndexes(db);
    await ensureAdminIndexes(db); // Deployment setup is idempotent.
    const sessions = db.collection("admin_sessions");
    const tokenId = randomUUID();
    const expiresAt = new Date(Date.now() + 60_000);
    await sessions.insertOne({ tokenId, email: "test@example.com", expiresAt });
    await expect(sessions.insertOne({ tokenId, expiresAt })).rejects.toMatchObject({ code: 11000 });
    const plan = await sessions.find({ tokenId, expiresAt: { $gt: new Date() } }).explain("executionStats");
    expect(plan.executionStats.nReturned).toBe(1);
    expect(plan.executionStats.totalDocsExamined).toBe(1);
    expect(plan.executionStats.totalKeysExamined).toBe(1);
    expect(await sessions.indexes()).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: { tokenId: 1 }, unique: true }),
      expect.objectContaining({ key: { expiresAt: 1 }, expireAfterSeconds: 0 }),
    ]));
  } finally {
    await client.close();
  }
});

test("shared login limits constrain one client before the account quota and hold under concurrency", async () => {
  const clients = [new MongoClient(process.env.MONGODB_URI!), new MongoClient(process.env.MONGODB_URI!)];
  await Promise.all(clients.map((client) => client.connect()));
  try {
    const databases = clients.map((client) => client.db(process.env.MONGODB_DB));
    const now = Date.now();
    const attempts = await Promise.all(Array.from({ length: 15 }, (_, i) =>
      consumeLoginAttempt(databases[i % 2], "abusive-client", now)));
    expect(attempts.filter(Boolean)).toHaveLength(5);
    for (let i = 0; i < 5; i++) expect(await consumeLoginAttempt(databases[0], "owner-client", now)).toBe(true);
    expect(await consumeLoginAttempt(databases[1], "third-client", now)).toBe(false);
    expect(await consumeLoginAttempt(databases[1], "abusive-client", now + 900_000)).toBe(true);
  } finally {
    await Promise.all(clients.map((client) => client.close()));
  }
});

test("correctly signed tokens for old credentials cannot reuse a live session", async ({ request }) => {
  const client = await new MongoClient(process.env.MONGODB_URI!).connect();
  const id = randomUUID();
  try {
    await client.db(process.env.MONGODB_DB).collection("admin_sessions").insertOne({
      tokenId: id, email: process.env.ADMIN_EMAIL, expiresAt: new Date(Date.now() + 60_000),
    });
    const token = await new SignJWT({ role: "admin", version: "obsolete-credential-version" })
      .setProtectedHeader({ alg: "HS256" }).setSubject(process.env.ADMIN_EMAIL!)
      .setIssuer("aproop-admin").setAudience("aproop-admin").setJti(id)
      .setIssuedAt().setExpirationTime("1h")
      .sign(new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!));
    expect((await request.get("/api/admin/content", {
      headers: { Cookie: `aproop_admin=${token}` },
    })).status()).toBe(401);
  } finally {
    await client.close();
  }
});
