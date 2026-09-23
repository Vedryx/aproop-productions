import "server-only";
import type { Db } from "mongodb";
import { database } from "./db";
import { ensureAdminIndexes } from "./indexes";

let ready: Promise<Db> | undefined;

// Provision ahead of traffic with db:setup. This once-per-process fallback also
// keeps fresh local installations safe without createIndex on every login.
export function adminDatabase() {
  return ready ??= database().then(async (db) => {
    await ensureAdminIndexes(db);
    return db;
  }).catch((error) => {
    ready = undefined;
    throw error;
  });
}
