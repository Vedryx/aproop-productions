# Client architecture decisions

This modernization keeps the existing design, endpoints, database model,
publication semantics and contact-delivery guarantees.

## Library choices

| Concern | Decision | Reason for this app |
| --- | --- | --- |
| Browser HTTP requests | Ky 2.1.0 | Fetch-based API, JSON options, bounded requests, cancellation and typed HTTP errors; one transport for admin and contact |
| Navigation | Next.js App Router and `next/link` | Already owns routing, Server Components, prefetching and transitions; a second router would duplicate that ownership |
| Server data | Existing server loaders and Next Data Cache | Public content is server-rendered; current screens do not need polling or multiple subscribed client queries |
| Editor draft/UI state | A component-scoped `useAdminEditor` hook | One editor owns the draft, persisted snapshot, selection and feedback; no app-wide mutable store is required |
| Response validation | Existing Zod schemas for admin; a small acknowledgement decoder for contact | Successful HTTP status alone must not replace valid state with malformed data; contact does not need the admin validation bundle |

Axios would also work, but using both it and Ky would duplicate transport policy.
React Router/TanStack Router solve routing; TanStack Query solves server-state
fetching and synchronization, not page routing. Add TanStack Query if a future
dashboard needs live shared queries, pagination or background refresh; keep
unsaved drafts separate from that query cache.

Zustand becomes useful when several independent editor panels or routes need
shared local state and selective subscriptions. That is not the current shape.
If adopted later, use a store scoped to the editor/provider (and request under
SSR), never a module-global store for per-user drafts. Unsaved content is not
persisted in localStorage or shared between tabs.

References: [Ky](https://github.com/sindresorhus/ky),
[TanStack Query SSR](https://tanstack.com/query/latest/docs/framework/react/guides/ssr),
[Zustand Next.js guidance](https://zustand.docs.pmnd.rs/learn/guides/nextjs).
Next routing behavior was checked against the installed Next 16.3.3 guides in
`node_modules/next/dist/docs/`.

## Module ownership

- `lib/api/http.ts`: Ky defaults, timeout and error normalization, response-decoder
  boundary. `ApiError` retains kind/status/request ID without exposing raw bodies.
- `lib/api/admin.ts`: named login/logout/save/star/upload methods with inferred
  return types validated using schemas. Call sites do not build URLs or serialize
  JSON and headers themselves.
- `lib/api/contact.ts`: the contact endpoint and submission type. `useEnquiry`
  still owns the form lifecycle and stable idempotency key for manual retries.
- `hooks/useAdminEditor.ts`: draft state, saved snapshot, derived dirty state,
  mutations, feedback, section selection and sign-out/discard actions.
- `components/admin/AdminEditor.tsx`: rendering and field bindings; no network
  requests or credential handling. The view shrank from 940 to 586 lines.
- `lib/admin/story-validation.ts`: wizard steps and field-to-step validation shared
  by the editor hook and story UI. Domain validation no longer lives in a rendered
  component module.

Normal single-tab internal navigation uses Next links. Same-page anchors, external
URLs, mail links and explicit new-tab admin preview links keep their native anchor
behavior. Server-side Resend delivery keeps its separately tested fetch/retry
policy; browser Ky settings must not alter provider idempotency semantics.

## Request invariants

- Explicit `retry: 0`, including PUT and transient 503 responses. Ambiguous mutations
  require an explicit retry or checking saved state first.
- A 45-second total deadline includes the response body, with caller cancellation
  passed through. No silent hanging after headers arrive.
- Same-origin credentials and no browser HTTP-cache reuse for API calls.
- HTTP failures preserve safe server messages, status and request ID. Network,
  timeout and invalid-response failures have consistent categories/messages.
- Save/star responses must satisfy `contentSchema`; uploads must return a local
  `/media/<ObjectId>` URL; login/logout/contact must return `{ ok: true }`.
- Validation failure leaves the draft/saved snapshot intact. Contact retains its
  stable idempotency key and entered values after failure.

Ky 2 requires **Node.js 22 or newer**. The package now declares that requirement;
check the deployment's Node runtime before merging/promoting. Local verification
uses the workspace's Node 26 installation. No hosting settings are changed here.

## Testing

The new tests exercise JSON encoding, no automatic retries, request-ID/status
retention, invalid success payloads, stalled response bodies and caller aborts.
Browser tests cover same-document page transitions, hash targets/history,
malformed-save recovery and isolated editor drafts across two tabs. Existing
contact, admin publication/conflict, media, recovery and 18 visual-baseline checks
remain part of `npm run verify`.
