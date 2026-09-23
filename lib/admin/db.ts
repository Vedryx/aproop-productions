import "server-only";
import { MongoClient } from "mongodb";

const globalDb = globalThis as typeof globalThis & {
  aproopMongo?: Promise<MongoClient>;
};
export async function mongoClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured.");
  if (!globalDb.aproopMongo) {
    globalDb.aproopMongo = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    })
      .connect()
      .catch((error) => {
        globalDb.aproopMongo = undefined;
        throw error;
      });
  }
  return await globalDb.aproopMongo;
}

export async function database() {
  return (await mongoClient()).db(process.env.MONGODB_DB || "aproop");
}
