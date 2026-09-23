import { createHash } from "node:crypto";
import type { Db } from "mongodb";

const WINDOW_MS = 15 * 60 * 1000;

export async function consumeLoginAttempt(db: Db, clientId = "unknown", now = Date.now()) {
  const collection = db.collection<{ _id: string; count: number; expiresAt: Date }>("admin_login_limits");
  const bucket = Math.floor(now / WINDOW_MS);
  const identities: Array<[string, number]> = [];
  // A single abusive client cannot consume all ten account-wide attempts.
  // Without a trusted identity, retain the existing account-only limit.
  if (clientId !== "unknown") {
    const digest = createHash("sha256").update(clientId).digest("hex");
    identities.push([`client:${bucket}:${digest}`, 5]);
  }
  identities.push([`login:${bucket}`, 10]);
  for (const [id, limit] of identities) {
    const filter = { _id: id };
    const update = { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 2) * WINDOW_MS) } };
    let row;
    try {
      row = await collection.findOneAndUpdate(filter, update, { upsert: true, returnDocument: "after", timeoutMS: 3000 });
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) throw error;
      row = await collection.findOneAndUpdate(filter, update, { returnDocument: "after", timeoutMS: 3000 });
    }
    if (!row || row.count > limit) return false;
  }
  return true;
}
