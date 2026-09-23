# Contact API reliability

The contact and pitch forms retain their current layout, labels and submit flow.
Both post JSON to `/api/contact`. Successful delivery means Resend accepted the
email, not that it has reached the recipient's inbox; bounce/delivery monitoring
remains a separate operational concern.

## Request handling

- JSON only, at most 32 KiB, counted while reading even without Content-Length.
- A stalled body is cancelled after five seconds.
- Name, email, kind and note limits are validated; excess text is rejected instead
  of silently shortened. Name/kind cannot contain header control characters.
- Email addresses use conservative unquoted mailbox syntax. Templates escape
  quotation marks as well as HTML delimiters and encode the mailto address.
- Reply-To contains only the validated email address; the sender's name remains
  in the message body and subject.
- A supplied foreign Origin is rejected. Requests without Origin remain supported
  for non-browser clients; origin checking is not an anti-bot authentication scheme.
- Honeypot/fast-submission traps still return a silent success without sending.
  Other invalid requests do not reach storage or the provider.

## Shared quotas and deployment

MongoDB stores atomic counters in `contact_limits`: five validated requests per
client identity, five per normalized sender email and 100 globally, per fixed
ten-minute window. These count failed deliveries and manual retries too. A request
can consume an earlier counter even if a later counter rejects it. Fixed windows
permit bursts across a window boundary; they are not sliding-window quotas.

The global counter is checked first to bound creation of per-client records during
abuse. Counters expire through a TTL index after their active window plus one
window of grace. TTL deletion may lag; expiry correctness comes from the window
key, not deletion timing. Rejections return 429 and Retry-After in seconds.

On Vercel, identity comes only from `x-vercel-forwarded-for` when the server's
`VERCEL` environment is `1`. Other deployments may configure
`TRUSTED_IP_HEADER` (`CONTACT_TRUSTED_IP_HEADER` remains a compatibility alias),
but only if a trusted ingress overwrites that header
and direct access to the application is blocked. The value must be one valid IP,
not an ambiguous list. Without a trusted IP, visitors share the `unknown` counter.
Ordinary X-Forwarded-For and client-supplied Vercel headers are not trusted on a
local/self-hosted server by default. IPv6 textual equivalents are normalized.

No extra service or credentials are required on the documented Vercel deployment.
The existing MongoDB user must be able to create TTL indexes and read/write the
two new collections. Index initialization happens once per server process and is
retried if it fails. Database failure returns 503 and does not bypass quotas.
Global quotas bound provider abuse but are not a replacement for ingress DDoS
protection; abusive traffic can exhaust shared capacity temporarily.

## Retry and duplicate-send protection

The browser supplies a UUID in Idempotency-Key. It retains that UUID for retries
of unchanged form values, creates a new UUID after editing or successful delivery,
and prevents simultaneous submissions from the same form. Requests time out in
the browser after 45 seconds; errors preserve the form contents. This key is held
in the mounted form, not persisted across a reload. Older clients without a key
receive a fresh server-generated key and cannot deduplicate separate HTTP retries.

`contact_receipts` stores the key, a SHA-256 payload fingerprint, timestamps and a
sent flag. It does not store the raw message. Reusing a key with a different payload
(including changed sender/recipient/template settings) returns 409. Confirmed
receipts return success without calling the email provider again.

Delivery uses a fixed Resend API URL through native fetch, with an eight-second
timeout covering each request/response body. Transient server/network failures
receive at most one automatic retry, after 250 ms, with the identical serialized
payload and provider key. Permanent errors, throttling and concurrent-key conflicts
return an error without an automatic retry. Provider failures never become a false
success, and response bodies/credentials are not logged.

Resend deduplicates concurrent/repeated sends using that provider key. If Resend
accepted a message but its response or the receipt write was lost, the same-key
retry can confirm acceptance without sending another copy. Pending receipts may
retry for only 23 hours, below Resend's 24-hour key retention. Older uncertain
receipts return 409 and direct the sender to email the studio instead. Receipts
expire after seven days. Deduplication is bounded by that retention, not permanent,
and a new submission key represents a new submission.

The sender/recipient and RESEND_API_KEY configuration are unchanged. The unused
Resend SDK dependency was removed; native fetch supplies explicit cancellation.

## Verification

Unit tests exercise validation, escaping, byte limits, stalled bodies, trusted
headers, provider errors, real localhost timeout cancellation, receipt outcomes
and sanitized failures. Integration tests use the isolated MongoDB to verify
atomic quotas across two clients, window rollover, sender/global limits, TTL
indexes, receipt persistence and expired/changed-key rejection. A mocked provider
models the documented idempotency contract for uncertain-response recovery.

Browser tests confirm that retries retain the same key, successful submissions
clear the form, and the next submission gets a different key. The full visual
suite compares the original 18 baselines without updating them. The browser test
server has no Resend API key: no test sends live email or validates inbox delivery.

References: [Resend idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys),
[Vercel request headers](https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for).
