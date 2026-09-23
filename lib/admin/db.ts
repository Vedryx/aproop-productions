import "server-only";
import { MongoClient } from "mongodb";

const globalDb = globalThis as typeof globalThis & {
  aproopMongo?: Promise<MongoClient>;
};
export async function database() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured.");
  if (!globalDb.aproopMongo) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      waitQueueTimeoutMS: 5000,
      timeoutMS: 5000,
    });
    globalDb.aproopMongo = client.connect()
      .catch(async (error) => {
        await client.close().catch(() => {});
        globalDb.aproopMongo = undefined;
        throw error;
      });
  }
  return (await globalDb.aproopMongo).db(process.env.MONGODB_DB || "aproop");
}
