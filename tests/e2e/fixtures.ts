import { test as base, expect } from "@playwright/test";
import { MongoClient } from "mongodb";
import { ensureAdminIndexes } from "../../lib/admin/indexes";

// Tests share one isolated server and run serially. Reset records (not indexes)
// before each test so publication state and login quotas cannot leak between them.
export const test = base.extend<{ isolatedDatabase: void }>({
  isolatedDatabase: [async ({ request }, use) => {
    const name = process.env.MONGODB_DB || "";
    const uri = process.env.MONGODB_URI;
    if (!/^aproop_e2e_[a-f0-9]{16}$/.test(name) || uri !== "mongodb://127.0.0.1:27019") {
      throw new Error("Refusing to reset a non-test database.");
    }
    const client = await new MongoClient(uri).connect();
    try {
      const db = client.db(name);
      for (const collection of await db.listCollections().toArray()) {
        await db.collection(collection.name).deleteMany({});
      }
      await ensureAdminIndexes(db);
      // Direct DB resets do not invalidate Next's Data Cache. Seed and publish
      // through the real protected API, avoiding any test-only production route.
      const origin = process.env.APP_ORIGIN!;
      const login = await request.post("/api/admin/login", {
        headers: { Origin: origin },
        data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
      });
      expect(login.status()).toBe(200);
      const cookie = login.headers()["set-cookie"]?.split(";")[0];
      if (!cookie) throw new Error("Test setup did not receive a session cookie.");
      const headers = { Origin: origin, Cookie: cookie };
      const content = await request.get("/api/admin/content", { headers });
      expect(content.status()).toBe(200);
      const saved = await request.put("/api/admin/content", { headers, data: await content.json() });
      expect(saved.status()).toBe(200);
      expect((await request.post("/api/admin/logout", { headers })).status()).toBe(200);
      // Setup must not consume the quota under test or leave an authenticated client.
      await db.collection("admin_login_limits").deleteMany({});
    } finally {
      await client.close();
    }
    await use();
  }, { auto: true }],
});

export { expect };
export type { Page } from "@playwright/test";
