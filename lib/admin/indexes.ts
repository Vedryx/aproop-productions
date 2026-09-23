import type { Db } from "mongodb";

export async function ensureAdminIndexes(db: Db) {
  await Promise.all([
    db.collection("admin_sessions").createIndex({ tokenId: 1 }, { unique: true, timeoutMS: 5000 }),
    db.collection("admin_sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, timeoutMS: 5000 }),
    db.collection("admin_login_limits").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, timeoutMS: 5000 }),
  ]);
}
