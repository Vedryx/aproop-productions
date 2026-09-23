import { loadEnvConfig } from "@next/env";
import { MongoClient } from "mongodb";
import { ensureAdminIndexes } from "../lib/admin/indexes";
import { createContactStore } from "../lib/contact/store";

async function main() {
  loadEnvConfig(process.cwd());
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Database configuration is missing.");
  const client = await new MongoClient(uri, { serverSelectionTimeoutMS: 5000 }).connect();
  try {
    const db = client.db(process.env.MONGODB_DB || "aproop");
    await ensureAdminIndexes(db);
    await createContactStore(db);
    console.log("Database indexes are ready. No content or sessions were removed.");
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  console.error("Index setup failed.", error instanceof Error ? error.name : "Unknown error");
  process.exitCode = 1;
});
