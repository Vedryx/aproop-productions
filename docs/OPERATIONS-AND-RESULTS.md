# Operations and six-round results

All changes preserve the normal public and admin screens. New messages appear
only for invalid requests, network failures or timeouts.

## Diagnostics

Admin API and media route responses carry a generated `X-Request-ID` and
`Server-Timing: app;dur=…`. Application logs use `[request]` for responses with
status 500+ or handler time of at least two seconds, with the ID, fixed route
label, status and duration. User-supplied request IDs are ignored. Contact keeps
its existing independent request IDs and failure logging.

Timing covers work until the handler returns a response. For streamed media it
does not measure the full download or client playback. A CDN may serve cached
headers, including the original request ID; that ID then identifies the origin
response rather than a new request. These logs are diagnostics, not an installed
metrics/alerting service or a complete access log.

Next's instrumentation hook records the route template and route type for
uncaught server failures. App-added logging intentionally excludes raw URLs,
query strings, cookies, request/response bodies, exception messages and stacks.
Framework/platform logs remain subject to their own configuration and retention.
No external telemetry service, account or billing integration was added.

## Failure bounds and recovery

- The shared MongoDB client has five-second server selection, pool queue and
  default operation limits. Explicit shorter/longer operation limits remain,
  including session reads and media streaming. These are per operation, not a
  universal end-to-end page deadline. Failed initial clients are closed and their
  cached promise is reset; later requests can reconnect.
- Admin JSON reads accept only JSON media types, check declared and actual size,
  cancel oversized streams and time out stalled bodies after five seconds.
- Browser admin requests have a 45-second deadline and handle non-JSON gateway
  errors without displaying a parser exception. They never automatically retry a
  mutation. Existing form state remains after failure. A timeout cannot prove a
  save failed to commit: check the latest persisted content before resubmitting.
  Revision conflicts still prevent silently overwriting a newer save.
- Malformed percent-encoded hash fragments no longer throw during page effects.
- Intro and modal scroll locks share the same ownership mechanism, so releasing
  one does not unlock another overlay or discard an existing overflow setting.

The recovery test starts a separate production server and a loopback-only TCP
proxy against the guarded test database. It simulates failed initial MongoDB
connectivity, checks a bounded 503 and safe diagnostics, then restores forwarding
and verifies login succeeds in the same process. It does not interrupt the shared
MongoDB container or touch production. This covers initial-connection recovery,
not every possible live-cluster failover or storage failure.

## Measured comparison

| Area | Before | After |
| --- | --- | --- |
| Public content reads | MongoDB read on every page request | Shared five-minute data cache; successful admin mutations expire it immediately |
| Session lookup | No explicit token-ID index | Unique token-ID index; test explain examined one key and one document |
| Password verification | Synchronous derivation | Asynchronous derivation and cached configured-password key |
| Media downloads | Whole-file buffering before response | GridFS streaming with byte-counted Web queue, cancellation, HEAD and ETag |
| Static public asset bytes | 13,394,180 | 13,366,698 (27,482 saved without changed PNG pixels) |
| Seeded work-grid JSON slice | 5,436 bytes | 1,956 bytes (64% smaller) |
| Admin field edits | Whole-document clone; repeated parsing and saved-list scans | Copy affected item/collection; memoized snapshots and indexed saved-item lookup |

The hero movie remains 10,913,248 bytes with its original picture and audio. It
already had fast-start metadata; range delivery, playback and mute controls are
tested. No lossy video compression was introduced. JSON figures concern one
seeded component prop slice, not a whole page. Asset totals are filesystem bytes,
not initial transfer. No live Core Web Vitals, user-load latency, production
capacity or universal percentage speedup is claimed.

## Release and incident checks

1. Run `npm run verify` on the documented macOS baseline platform. Review visual
   differences; do not regenerate images simply to turn a failure green.
2. Provision indexes with `npm run db:setup` using the intended deployment's
   environment. Confirm the hosting arrangement shares cache/tag invalidation
   between app instances and that any trusted IP header is overwritten by ingress.
3. Verify a staging deployment's login, publish/unpublish, uploads, image caching
   and contact delivery with the intended provider configuration. The automated
   suite never sends real email.
4. Configure log retention and alerts in the hosting provider if required. On an
   incident, use the response request ID to locate the fixed-route failure/slow
   log; check database connectivity, provider status and deployment configuration.
   Avoid pasting cookies, credentials or contact-message bodies into incident logs.
5. For ambiguous admin mutations, inspect the latest saved content before retrying.
   For mail, follow the bounded idempotency/retry windows in
   [contact reliability](CONTACT-RELIABILITY.md).
6. Back up content and both GridFS collections together. Restore into staging and
   validate there before a live restore. Republish through the admin API after
   out-of-band content restoration to invalidate cached public content. Code
   rollback does not restore database data; retain the prior deployment reference.

No deployment, production index provisioning, email-provider verification,
backup/restore of real data, cross-region cache check or live performance run was
performed by these local implementation rounds. See [production](PRODUCTION.md)
for the existing release workflow and [verification](VERIFICATION.md) for exact
local test results.
