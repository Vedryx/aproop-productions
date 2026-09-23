import { createHash } from "node:crypto";

// Next's Data Cache can survive deployments. Never share entries between databases
// or put database credentials into a cache key, tag, or diagnostic message.
export function publicContentCacheIdentity(uri: string, databaseName: string) {
  const scope = createHash("sha256").update(uri).update("\0").update(databaseName).digest("hex");
  return {
    key: ["aproop-published-content-v1", scope],
    tag: `aproop:published:${scope}`,
  };
}
