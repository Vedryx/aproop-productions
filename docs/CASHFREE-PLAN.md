# Cashfree contribution payments — implementation plan

Status: planning only. This branch adds content administration. Contribution buttons still open an email enquiry; no Cashfree order, charge, webhook or payment credentials are active.

## Recommended checkout

Use Cashfree hosted web checkout with the JS SDK. Aproop keeps its story cards and contribution choices, while Cashfree handles payment entry. Our Next.js server creates each order and returns only the payment session ID to the browser. Use sandbox first, then approved production credentials and domain. [Web integration](https://www.cashfree.com/docs/payments/online/web/redirect)

## Contributor journey

1. Select a published, open story and preset or custom INR amount.
2. Collect name, email, mobile number, producer-credit name and explicit acceptance of the contribution/refund terms. Explain exactly what a contribution provides.
3. `POST /api/contributions` validates the story, allowed amount and campaign closing time from the database. Convert money to integer paise internally; convert explicitly to rupees for Cashfree. Never trust a client-supplied goal, price, payment status or project title.
4. Persist a pending contribution with an unpredictable order ID, story ID, amount, currency, contact details, terms version and a snapshot of the story title/reward. Use an idempotency key so a retry reuses the same contribution/order.
5. Create the Cashfree order from the server with customer details, a fixed configured return URL, and a webhook URL. Store `order_id`, `cf_order_id` and `payment_session_id`. Retry uncertain order creation with the same idempotency key, not a fresh order. [Create Order API](https://www.cashfree.com/docs/api-reference/payments/latest/orders/create-order)
6. Launch hosted checkout. Returning to the website shows a checking/pending state until the backend verifies the order. A browser redirect or SDK callback alone never grants credit. [Get Order API](https://www.cashfree.com/docs/api-reference/payments/latest/orders/get-order)
7. On verified success, display the confirmation and send one receipt/acknowledgement. On failure or cancellation, offer a retry. If the webhook is delayed, poll our status endpoint with bounded backoff and reconcile pending orders server-side. Restrict status access using a separate random lookup token or a contributor session; do not reveal PII from a guessable URL.

## Webhook processing and payment truth

`POST /api/payments/cashfree/webhook` must read the unchanged raw request body and verify `x-webhook-signature` against the timestamp plus payload using the secret key before JSON parsing. Use a constant-time comparison or Cashfree's verification helper. Reject invalid signatures. [Signature verification](https://www.cashfree.com/docs/payments/online/webhooks/signature-verification)

Store each `cf_payment_id` uniquely. Multiple attempts can exist under one order. Only a verified successful payment may transition a contribution to paid. Duplicate notifications and later failed attempts must not increment totals again or reverse a successful state. Validate order identity, amount and currency against our stored contribution. [Webhook idempotency](https://www.cashfree.com/docs/payments/online/webhooks/webhook-indempotency)

Proposed storage:

| Collection          | Purpose / constraints                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| contributions       | Stable story ID, original story/reward snapshot, payer fields, integer paise, currency, unique order ID and idempotency key, lifecycle timestamps |
| payment_attempts    | Unique provider payment ID, contribution ID, verified status and amount, limited provider metadata                                                |
| payment_events      | Deduplication record, processing outcome and retry information; redact sensitive data                                                             |
| refunds             | Unique provider refund ID, original payment, amount and verified refund status                                                                    |
| notification_outbox | Unique contribution + notification type, retry count and delivery timestamp                                                                       |

Prefer an atomic compare-and-set on the contribution document to mark it paid. Calculate the campaign total from the paid/refunded ledger instead of incrementing editable content counters. Use unique outbox keys to prevent duplicate receipts. If multi-document transactions become necessary, run MongoDB as a replica set / managed cluster (the current local standalone container is sufficient for content CRUD only).

The existing `raised` and `backers` figures are seed/demo-era values. Verify or reset them before launch; do not treat them as Cashfree transactions. Keep verified offline contributions in a separate audited ledger. Define whether “producer count” means unique supporters or successful contributions. Refunds must update the displayed net raised amount consistently.

## Admin additions for the payment phase

- Contributions list: story, supporter, amount, payment state, date, provider reference and receipt status.
- Read-only provider payment totals; no editing “paid” amounts through the content form.
- Campaign open/closed state, timezone-aware closing date, custom amount bounds and reward description.
- Payment/refund detail view and CSV export with access controls.
- Archive stories with payment history; preserve their IDs and payment snapshots. Hard deletion must not remove financial records.
- Refund initiation with a specific confirmation, audit record and idempotency key. Initially refunds may be issued through Cashfree's dashboard and synced back.
- Reconciliation action/job for pending or ambiguous orders, plus retryable notification delivery.

## Decisions needed before payment implementation

- Confirm Cashfree approves Aproop's actual film-contribution model under its merchant account. Producer credit/rewards, donation, and investment are different offers; the site must describe the approved one accurately.
- Decide minimum/maximum custom contribution, funding cutoff behavior and whether overfunding is allowed.
- Confirm what happens if a film is cancelled, delayed, or misses its goal; agree refund terms and actual rewards before taking money.
- Confirm merchant identity, settlement account, production domain, receipt sender and the treatment of any verified funds already received.

For domain approval, Cashfree calls for contact, terms, refund/cancellation details, listed services and INR pricing. Build those pages using the studio's agreed policies. [Domain whitelisting](https://www.cashfree.com/docs/payments/online/go-live/whitelist)

## Delivery and validation order

1. Agree the business rules and prepare policy pages; obtain sandbox credentials securely.
2. Add order creation, persisted contributions and hosted sandbox checkout.
3. Add signature verification, idempotent finalisation, protected status lookup, receipts and reconciliation.
4. Test success, failure, user cancellation, pending status, expired order, timeout during creation, repeated checkout clicks, duplicated/out-of-order webhooks, wrong signature/amount/currency, project closure and refunds.
5. Review admin reporting and reconcile all sandbox ledger totals.
6. Configure production secrets, HTTPS domain approval and reachable webhook; perform an explicitly authorised small live transaction/refund before rollout.

Documentation discovery started with [Cashfree's complete index](https://www.cashfree.com/docs/llms.txt) and its linked [Payments index](https://www.cashfree.com/docs/_llms/payments.md). Recheck the supported API version and account configuration at implementation time.
