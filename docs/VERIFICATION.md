# Optimization verification baseline

Round 1 establishes regression checks without changing application UI, styles,
content, or runtime behavior. Later rounds should compare against these baselines,
not regenerate them merely to make a failure pass.

Round 1 verification on 2026-09-23: `npm run verify` passed lint, TypeScript,
10 unit tests, the production build, and all 32 Chromium tests (18 visual
comparisons and 14 functional tests). Baselines were generated first and then
compared in a separate full verification run. No application runtime files changed.

Round 2 verification on 2026-09-24: `npm run verify` passed lint, TypeScript,
25 unit tests, the production build, and all 38 Chromium/integration tests,
including the original 18 visual comparisons without baseline updates. Changes
cover contact validation, shared quotas, bounded delivery and retry safety; see
[contact reliability](CONTACT-RELIABILITY.md) for operational limits. Live email
was not sent, and production deployment/settings were not changed.

Round 3 verification on 2026-09-24: `npm run verify` passed lint, TypeScript,
28 unit tests, the production build, and all 43 Chromium/integration tests,
including the original 18 visual comparisons without baseline updates. Tests
cover public cache reuse and immediate invalidation, fresh admin reads, indexed
session lookups, concurrent login limits and repeatable database index setup.
See [caching and authentication](CACHING-AND-AUTH.md) for deployment requirements
and cache limits. Production data and deployment settings were not changed.

Round 4 verification on 2026-09-24: `npm run verify` passed lint, TypeScript,
31 unit tests, the production build, and all 45 Chromium/integration tests,
including all 18 original visual comparisons without baseline updates. Media
tests cover validated uploads, byte-exact streamed downloads, cache revalidation,
HEAD, bounded queues/cancellation and real hero playback/sound/range delivery.
Lossless PNG optimization saved 27,482 bytes with decoded pixels unchanged; see
[media delivery](MEDIA-DELIVERY.md). No live deployment was changed.

Round 5 verification on 2026-09-24: `npm run verify` passed lint, TypeScript,
34 unit tests, the production build, and all 48 Chromium/integration tests,
including the original 18 visual comparisons without baseline updates. New tests
cover immutable editor updates, edit/revert status, public data projection, image
fallback recovery, modal scroll locks and animation cleanup. The seeded work-grid
JSON slice decreases from 5,436 to 1,956 bytes; this is not a whole-page or runtime
speed measurement. See [editor and lifecycle](EDITOR-AND-LIFECYCLE.md).

Round 6 final verification on 2026-09-24: `npm run verify` passed lint,
TypeScript, all 37 unit tests, the production build, and all 51 Chromium/integration
tests, including all 18 original visual comparisons without baseline updates.
Recovery tests verify a bounded database connection failure and subsequent
reconnection in the same server, safe request-ID logging, retained edits after a
gateway failure, explicit save retry, and malformed-fragment handling.
`npm audit --omit=dev --audit-level=high` reported zero known vulnerabilities.
This dependency snapshot is not a guarantee against undisclosed issues.

## Run the checks

```sh
npm ci
npx playwright install chromium
npm run db:up
npm run verify
```

`verify` runs lint, route-type generation and TypeScript, all unit tests, a
production build, and the complete Chromium browser suite (including visual
comparisons). It stops on failure. `npm run test:visual` runs only the visual
comparisons against the current production build; rebuild after application edits.

The browser suite uses port 3101 and a random `aproop_e2e_*` database on the local
MongoDB at port 27019. Tests run with one worker and reset records before each test.
After each reset, the fixture publishes through the authenticated admin API to
invalidate cached public content, then revokes its setup session and clears its
login quota records. Cache keys are isolated by database configuration.
Do not override the worker count: the test server shares one database. Teardown
drops only the guarded test database. Local development and production content are
not used. The test server overrides the Resend API key with an empty value; contact
UI tests intercept the endpoint and never send email.

## Visual baselines

Tracked PNGs live in `tests/e2e/visual.spec.ts-snapshots/`. There are 18 comparisons:
homepage, producer page, admin login, film list, story list and story editor,
each at desktop (1440×1000), tablet (834×1112) and mobile (390×844).

These baselines were captured on macOS arm64 with the lockfile's Playwright
Chromium. Browser versions, operating systems and installed system fonts can
change rasterization. Use the same platform and lockfile for comparison. A Linux
CI runner needs its own reviewed Linux baselines; missing baselines fail by default.

To deliberately create or replace baselines, run `npm run test:visual:update` and
inspect the resulting PNGs and diff before accepting them. Normal verification
never updates baselines. The pixel comparison permits at most 100 differing
pixels, using Playwright's default per-pixel color threshold.

Screenshot-only controls freeze testimonial timers, use returning-visitor intro
state, disable animations and show settled reveal content. All images are decoded
before capture, and horizontal overflow and page JavaScript errors fail the test.
The moving hero video is replaced with its local poster in screenshot-only CSS;
thumbnail requests receive a dimensionally stable transparent test image. This
preserves overlaid navigation, badges and play buttons in the comparison, unlike
rectangular screenshot masks. Layout and local artwork remain visible. These
comparisons do not validate video quality, audio playback, external
YouTube availability, animation timing, or every editor/modal state. Full-page
screenshots also show sticky controls at the capture scroll position.

Functional tests separately cover work filtering/pagination, opening and closing
the video modal, FAQ toggling, mobile navigation, contribution email links, pitch
dialog dismissal/focus restoration, contact error/retry/success, and intro session
completion. Existing admin tests exercise publication, drafts, conflicts, uploads,
authentication, CSRF protection, expiry/revocation and editor workflows. Contact UI
tests mock success/failure responses. Round 2 adds API hardening/provider unit tests
and real-MongoDB quota/receipt integration tests; see
[contact reliability](CONTACT-RELIABILITY.md). Live email delivery is not tested.

## Starting technical measurements

Recorded before application optimizations:

| Item | Baseline |
| --- | --- |
| Public directory total | 13,394,180 bytes |
| Hero MP4 | 10,913,248 bytes; 1920×1080; 68.245 seconds; H.264 + AAC |
| Makers PNG | 538,702 bytes |
| Bhimbhaskara artwork | 290,362 bytes |
| Datan artwork | 229,623 bytes |
| Public page rendering | `/` and `/be-the-producer` dynamically rendered |
| Public content access | Uncached MongoDB content-document read per page request |

Asset totals are disk sizes, not initial network transfer. No live Core Web Vitals
or throttled performance scores are claimed. Round 4 measures asset sizes and
tests real video delivery/playback separately from the screenshot suite; see
[media delivery](MEDIA-DELIVERY.md).

## Completion

All six authorized implementation rounds are complete and locally verified.
See [operations and results](OPERATIONS-AND-RESULTS.md) for measured comparisons
and the staging/production checks that require the intended hosting environment.
No production deployment or real email delivery was performed.
