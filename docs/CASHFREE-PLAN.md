# Cashfree contributions: local implementation and testing

Status: implemented locally on `feat/aproop-cashfree-fundraising`. No production push or deployment is authorised. Browser tests use a provider test double; real Cashfree sandbox verification still requires sandbox credentials.

## What is available

- Hosted checkout for published, open stories; presets and custom contributions with up to two decimal places.
- Story Funding step: open/pause/close, minimum/maximum amount, closing month/date and contribution/refund terms.
- `/admin/contributions`: confirmed totals, reserved amounts, refunds, paginated supporter ledger, CSV export of the current page and provider verification.
- Browser confirmation, protected lookup, pending/retry/refunded states and printable confirmation. Email receipts are **not implemented**.
- Signed webhooks plus authenticated provider lookups. Browser redirects and webhook payload amounts never directly credit funds.

## Local setup

1. `npm install`, then `npm run db:up`. This starts only the Aproop Compose MongoDB and initialises its single-node replica set. It retains the existing volume. Transactions require a replica set; Atlas already provides one.
2. Use local settings in `.env.local`. Do not reuse the production database:

   ```dotenv
   MONGODB_URI=mongodb://127.0.0.1:27019/?directConnection=true
   MONGODB_DB=aproop_cashfree_sandbox
   APP_ORIGIN=http://localhost:3001
   CASHFREE_ENV=sandbox
   CASHFREE_CLIENT_ID=<sandbox client ID>
   CASHFREE_CLIENT_SECRET=<sandbox secret>
   CASHFREE_LIVE_ENABLED=false
   CONTRIBUTION_OPENING_BALANCE_POLICY=zero
   ```

   `zero` is appropriate for a new test database. Before activating existing real stories, the studio must confirm `zero` (demo figures) or `existing` (verified opening funds). The policy is applied once per campaign and cannot later rewrite its opening balance. Changing `ADMIN_JWT_SECRET` changes supporter hashes; keep it stable while financial records are in use.
3. Keep the existing local admin credentials or run `npm run setup:admin` to generate missing ones. Never prefix payment credentials with `NEXT_PUBLIC_`.
4. Run `npm run dev -- --port 3001` and visit `http://localhost:3001/admin`. The request origin must match `APP_ORIGIN` exactly.
5. Open a story's Funding step, enter sandbox terms and a future closing date, then enable contributions. Defaults remain disabled. Old published content stays visible without payment credentials.
6. Use the official sandbox checkout and approved test methods from Cashfree. If Cashfree requires domain whitelisting, use an approved HTTPS tunnel to this local server and set `APP_ORIGIN` accordingly. Cashfree cannot deliver webhooks to localhost; use the tunnel for sandbox webhook verification. No production deployment is needed.

Missing credentials keep checkout disabled. `CASHFREE_ENV=production` additionally requires `CASHFREE_LIVE_ENABLED=true`; leave it false throughout this local phase. Sandbox and production campaigns cannot share a database.

## Funding rules and edge cases

- Ledger amounts use integer paise. New contributions allow up to two decimal places, at least ₹1. A remainder below ₹1 after a partial refund cannot be collected online. The final remainder may be below the configured minimum; amounts over the remaining capacity are rejected, not silently changed.
- Reservation and contribution creation run in one MongoDB transaction. Competing requests cannot reserve more than the goal. Confirmed payments move reserved funds to paid funds exactly once.
- Checkout reservations normally last 15 minutes, capped at the campaign's closing time. No new order is created with less than five minutes remaining. Dates/months close at their end in India time.
- Expiry alone does **not** release capacity. Cashfree can receive a successful payment after order expiry when an earlier payment was pending. We request termination and retain funds while termination is uncertain. Confirmed `TERMINATED` releases capacity. An `EXPIRED` order may release only after 25 hours and a fresh list containing no successful or pending attempts. Provider outages retain reservations.
- A contradictory late success after released capacity is excluded from the campaign total and sent for an idempotent full refund. Refund failures remain visible for review/reconciliation. This can briefly involve a payment that must be refunded; no distributed payment system can guarantee that an external provider never reports an exceptional late debit.
- Reaching the goal permanently latches the campaign closed to new contributions. Refunds or later goal increases do not reopen it automatically.
- Pausing, closing, unpublishing, changing terms or passing the deadline stops new checkouts. Existing reserved orders retain their agreed terms and can complete. An emergency full cancellation must also address in-flight orders/refunds through Cashfree.
- Request IDs are idempotent and bound to immutable payer/amount/consent details. Uncertain create responses are retried using the same provider order. One active checkout per email/project and shared database rate limits reduce repeated reservations.
- Lookup uses a separate random token saved in the originating browser before order creation. URLs contain only order references. Status responses exclude payer PII; another browser needs support assistance using the reference.
- Duplicate and out-of-order payment/refund notifications cannot count money twice. We validate provider order/payment identity, currency and amount. Refund totals are monotonic, so a stale response cannot undo a refund.
- Backers count unique online email addresses with a remaining paid balance, plus any approved opening backer count. Existing opening backers cannot be deduplicated against online emails because the old content had no identities.
- Started campaigns lock manual raised/backer editing. Goals cannot undercut paid plus reserved money. Stories with any contribution history cannot be hard deleted; close and unpublish them.

## API map

| Endpoint | Access | Purpose |
| --- | --- | --- |
| `GET /api/funding` | Public | Published story availability and net confirmed totals |
| `POST /api/contributions` | Same origin, validated body, rate limited | Reserve capacity and create/reuse a provider order |
| `GET /api/contributions/[orderId]` | Bearer lookup token | Private confirmation/status and throttled reconciliation |
| `POST /api/payments/cashfree/webhook` | Raw-body Cashfree signature | Verify provider payment/refund state |
| `GET /api/payments/reconcile` | `Authorization: Bearer <CRON_SECRET>` | Reconcile up to six due contributions |
| `GET /api/admin/contributions?page=0` | Admin session | Ledger and campaign summary, 30 rows per page |
| `POST /api/admin/contributions` | Admin session + same origin | Reconcile due records, or `{ "orderId": "..." }` |

Financial collections: `funding_campaigns`, `contributions`, `payment_refunds`, `payment_events`; `payment_limits` holds expiring rate counters. Content and media stay in their existing collections.

## Reconciliation and refunds

Configure payment success/failure/user-dropped and refund-status webhooks in the Cashfree dashboard at `/api/payments/cashfree/webhook`. The HTTPS notify URL is also supplied when creating orders. Signature verification uses the untouched raw payload plus timestamp. Valid delayed retries are accepted safely.

Pending status pages poll with bounded backoff. New checkouts check up to three expired reservations for that story. The admin can verify individual contributions or due records. The scheduled endpoint processes six due records per call, with concurrency three and provider timeouts. `vercel.json` contains a daily fallback compatible with basic scheduling; it is **not adequate as the sole scheduler for active fundraising**. Before live use, configure a frequent authenticated scheduler (for example every minute), monitor backlog/latency, and size batches/workers to volume. Confirm the platform request timeout accommodates the provider calls; the routes request 60 seconds.

Normal cancellation/missed-goal refunds are initiated in the Cashfree dashboard under the agreed policy, then synced by webhook, scheduled reconciliation or Verify. They are not automatically triggered by a closing date. Only unallocatable late payments have automatic refund initiation. Preserve ledger collections in backups; code rollback does not undo financial records.

## Verification

```sh
npm run db:up
npm test
npm run test:payments
npm run lint
npm run build
npm run test:e2e
```

Financial tests use real MongoDB transactions in a randomly named isolated local database and a deterministic provider double. E2E uses the real built Next application on `127.0.0.1:3101`, another isolated database and a mock provider on `127.0.0.1:3199`. Both clean their test databases. Test scripts are excluded from Vercel uploads; the production code contains no mock-provider URL switch.

Coverage includes concurrency at the final funding amount, idempotency, lost create responses, expiry with pending payment, confirmed termination, late success/refund, duplicate/out-of-order events, incorrect amounts/signatures, partial/full refunds, unique backers, campaign closure, deletion/goal protection, hosted-checkout return flow, authentication, mobile layout and existing content-admin regression tests.

**Real sandbox acceptance remains separate:** use genuine sandbox credentials, verify approved-origin hosted checkout, success/failure/cancel/pending flows, actual signed webhooks through a local HTTPS tunnel, dashboard refund sync and provider references. Provider-double E2E does not certify merchant account settings or real provider behaviour.

## Needed from the studio

- Sandbox client ID and secret, added securely to local environment files.
- Whether existing raised/backer figures are demo or verified opening funds.
- Agreed contributor benefits and refund rules for cancellation, delays and missed funding goals; enter these accurately on each story.

Production account approval, approved domain, live credentials, live database configuration and a live transaction/refund check belong to a later, explicitly authorised release. No production action is part of the current local task.

## Official documentation

Discovery began with the [complete index](https://www.cashfree.com/docs/llms.txt) and [Payments index](https://www.cashfree.com/docs/_llms/payments.md). Implementation uses API version `2026-01-01`.

- [Hosted web checkout](https://www.cashfree.com/docs/payments/online/web/redirect)
- [Create order](https://www.cashfree.com/docs/api-reference/payments/latest/orders/create-order), [get order](https://www.cashfree.com/docs/api-reference/payments/latest/orders/get-order), [terminate order](https://www.cashfree.com/docs/api-reference/payments/latest/orders/terminate-order)
- [Get payment attempts](https://www.cashfree.com/docs/api-reference/payments/latest/payments/get-payments-for-an-order)
- [Payment lifecycle and pending-payment TTL](https://www.cashfree.com/docs/payments/online/resources/payment-lifecycle)
- [Webhook signature verification](https://www.cashfree.com/docs/payments/online/webhooks/signature-verification)
- [Create refund](https://www.cashfree.com/docs/api-reference/payments/latest/refunds/create-refund), [get refunds](https://www.cashfree.com/docs/api-reference/payments/latest/refunds/get-all-refunds-for-an-order)
