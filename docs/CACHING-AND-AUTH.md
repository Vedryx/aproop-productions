# Public caching and admin efficiency

## Public reads and publication

The homepage and producer page share a Next.js Data Cache entry containing only
published content. It is isolated by a SHA-256 scope derived from MONGODB_URI and
MONGODB_DB; connection credentials do not appear in tags or cache keys. Production,
staging and each isolated test database therefore use different entries.

Pages still render per request. `connection()` prevents build-time database reads
without the blanket no-cache policy associated with `force-dynamic`. HTML, session
checks and admin content are not cached by this change. The benefit is avoiding
repeated MongoDB content reads, not eliminating server-side React rendering.

The app retains its existing rendering model and uses `unstable_cache`, which is
supported by the installed Next.js 16.3.3. Its documentation recommends `use cache`
with Cache Components for new migrations. Enabling that mode here would also
require migrating uncached/admin rendering and streaming boundaries; this round
deliberately does not make that broader rendering change.

Successful content saves and star updates call `revalidateTag` with `{ expire: 0 }`
and invalidate both public paths from the shared save function. The next request
after a successful save waits for fresh data instead of receiving stale content
once. Failed revision checks do not invalidate or overwrite published state.
Draft filtering happens before caching. Admin GETs remain direct database reads,
and session checks remain uncached so logout and credential rotation still apply.

The cache also revalidates after 300 seconds. Time-based revalidation can serve
stale data while refreshing; it is a fallback, not a five-minute freshness SLA.
Direct database edits/restores bypass explicit invalidation. Publish through the
admin API after an external content migration to expire cached data immediately.
Existing visitors still reload to see updates; no live push behavior was added.

The deployed platform must provide shared Data Cache/tag invalidation semantics
across instances. For multi-instance self-hosting, configure a shared Next.js cache
handler; isolated filesystem/process caches are not a distributed invalidation
solution. Use consistent connection settings across instances of one deployment.
The local production-server tests verify cache reuse and mutation behavior, not
cross-region production propagation or measured live Core Web Vitals.

## Index provisioning

Run `npm run db:setup` with the target database's environment before promotion.
The script reads local env files when environment variables are not already set.
Confirm the target environment before running it. It creates:

- A unique `admin_sessions.tokenId` index for lookups and revocations.
- TTL indexes on `admin_sessions.expiresAt` and `admin_login_limits.expiresAt`.
- The contact quota/receipt TTL indexes introduced in round 2.

It does not delete content, sessions or uploads and is safe to rerun. Duplicate
legacy token IDs cause setup to fail rather than silently deleting sessions.
Investigate such data before rollout. The application also ensures admin indexes
once per process as a fallback, retrying initialization if it fails. Login and
session creation no longer issue index creation commands on every request.

Session queries use tokenId and expiry with a minimal projection. The regression
test verifies an indexed lookup examining one key and one document. Expiry is
checked in the query itself; delayed TTL deletion cannot extend session validity.

## Password and login work

Password comparisons now use asynchronous scrypt, moving derivation off the main
JavaScript thread. The expected derived key is reused in process memory and
recomputed when the configured password changes. Provided passwords still undergo
derivation for each admitted attempt, and comparisons use timingSafeEqual. This
does not change credential storage, cookie settings, session duration, JWT claims
or the credential-version revocation mechanism.

The existing shared account cap remains ten attempts per fixed fifteen-minute
window. A trusted client has an additional cap of five, checked first, so repeated
requests from one client cannot consume all ten account attempts. Counters use
atomic MongoDB updates across instances. With no trusted identity the account-only
cap remains, rather than inventing an identity from spoofable forwarded headers.

Contact and login share the trusted-ingress identity helper. Vercel uses its
platform header automatically. Other deployments may opt into `TRUSTED_IP_HEADER`
only if the ingress overwrites it and cannot be bypassed. The earlier
`CONTACT_TRUSTED_IP_HEADER` setting remains a compatibility alias and now applies
to both endpoints. Neither header setting is required for the documented Vercel
deployment. Multiple abusive clients can still exhaust the global account cap;
the per-client layer mitigates single-client lockout, not every denial of service.

## Verification

Focused tests verify cache reuse, uncached admin reads, immediate publish/unpublish
and star invalidation, stale-write conflicts, complete deletion without re-seeding,
cache namespace isolation, unique/TTL indexes, repeatable setup without data loss,
concurrent login limits, asynchronous password checks, and rejection of signed
tokens carrying obsolete credential versions. Existing tests also verify forged
tokens, expired stored sessions, logout revocation and all admin workflows.

Test setup now republishes seed content through the authenticated API after each
database reset so it invalidates the real cache without a test-only production
endpoint. Setup sessions are revoked and their login counters cleared before the
actual test starts.
