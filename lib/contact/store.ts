import { createHash } from "node:crypto";
import type { Db } from "mongodb";
import { ContactError } from "./request";

const WINDOW_MS = 10 * 60 * 1000;
const RETRY_WINDOW_MS = 23 * 60 * 60 * 1000;
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const duplicateKey = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === 11000;

export async function createContactStore(db: Db) {
  const limits = db.collection<{ _id: string; count: number; expiresAt: Date }>("contact_limits");
  const receipts = db.collection<{
    _id: string; fingerprint: string; createdAt: Date; expiresAt: Date; sent: boolean;
  }>("contact_receipts");
  await Promise.all([
    limits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, timeoutMS: 3000 }),
    receipts.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, timeoutMS: 3000 }),
  ]);

  return {
    async limit(ip: string, email: string, now = Date.now()) {
      const bucket = Math.floor(now / WINDOW_MS);
      const retryAfter = Math.max(1, Math.ceil(((bucket + 1) * WINDOW_MS - now) / 1000));
      // Check the global cap first to bound per-identity record creation under abuse.
      for (const [identity, cap] of [
        ["global", 100], [`ip:${hash(ip)}`, 5], [`email:${hash(email.toLowerCase())}`, 5],
      ] as const) {
        const filter = { _id: `${bucket}:${identity}` };
        const update = { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 2) * WINDOW_MS) } };
        let row;
        try {
          row = await limits.findOneAndUpdate(filter, update, { upsert: true, returnDocument: "after", timeoutMS: 3000 });
        } catch (error) {
          if (!duplicateKey(error)) throw error;
          row = await limits.findOneAndUpdate(filter, update, { returnDocument: "after", timeoutMS: 3000 });
        }
        if (!row || row.count > cap)
          throw new ContactError("Too many messages just now. Try again shortly.", 429, retryAfter);
      }
    },
    async reserve(id: string, payload: string, now = Date.now()) {
      const fingerprint = hash(payload);
      try {
        await receipts.updateOne({ _id: id }, { $setOnInsert: {
          fingerprint, createdAt: new Date(now), expiresAt: new Date(now + RETENTION_MS), sent: false,
        } }, { upsert: true, timeoutMS: 3000 });
      } catch (error) {
        if (!duplicateKey(error)) throw error;
      }
      const receipt = await receipts.findOne({ _id: id }, { timeoutMS: 3000 });
      if (!receipt) throw new Error("Missing delivery receipt.");
      if (receipt.fingerprint !== fingerprint)
        throw new ContactError("This submission changed and could not be confirmed. Please email us directly.", 409);
      if (receipt.sent) return true;
      if (now - receipt.createdAt.getTime() >= RETRY_WINDOW_MS)
        throw new ContactError("This delivery could not be confirmed. Please email us directly.", 409);
      return false;
    },
    async markSent(id: string) {
      const result = await receipts.updateOne({ _id: id }, { $set: { sent: true } }, { timeoutMS: 3000 });
      if (!result.matchedCount) throw new Error("Missing delivery receipt.");
    },
  };
}

export type ContactStore = Awaited<ReturnType<typeof createContactStore>>;
