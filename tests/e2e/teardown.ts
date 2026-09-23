import { MongoClient } from "mongodb";
export default async function teardown() {
  const name = process.env.MONGODB_DB || "";
  if (!/^aproop_e2e_[a-f0-9]{16}$/.test(name))
    throw new Error("Refusing to clean a non-test database.");
  const client = await new MongoClient("mongodb://127.0.0.1:27019/?directConnection=true").connect();
  try {
    await client.db(name).dropDatabase();
  } finally {
    await client.close();
  }
}
