import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createContactHandler } from "../lib/contact/handler";
import { ContactError } from "../lib/contact/request";
import type { ContactStore } from "../lib/contact/store";

const enquiry = { name: "Sender", email: "sender@example.com", kind: "Film", note: "Hello", source: "contact" };
const makeRequest = (body: unknown = enquiry, headers = {}) => new Request("https://studio.example/api/contact", {
  method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
});
const makeStore = (): ContactStore => ({ limit: async () => {}, reserve: async () => false, markSent: async () => {} });

test("handler sends safe reply-to and marks success only after provider confirmation", async () => {
  const store = makeStore();
  const id = randomUUID();
  let marked = false;
  store.markSent = async (key) => { assert.equal(key, id); marked = true; };
  const handler = createContactHandler({
    store: async () => store, configured: () => true, from: "from@example.com", to: "to@example.com",
    send: async (payload, key) => {
      assert.equal(key, id);
      assert.equal(payload.reply_to, enquiry.email);
      assert.equal(marked, false);
      assert.ok(payload.text.includes("Hello"));
    },
  });
  const response = await handler(makeRequest(enquiry, { "Idempotency-Key": id }));
  assert.equal(response.status, 200);
  assert.equal(marked, true);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("honeypots, malformed inputs and foreign origins cannot reach delivery", async () => {
  const handler = createContactHandler({
    store: async () => { throw new Error("Must not touch storage"); }, configured: () => true,
    send: async () => { assert.fail("Must not send"); }, from: "from@example.com", to: "to@example.com",
  });
  assert.equal((await handler(makeRequest({ ...enquiry, website: "bot" }))).status, 200);
  assert.equal((await handler(makeRequest({ ...enquiry, t: Date.now() }))).status, 200);
  assert.equal((await handler(makeRequest({ ...enquiry, email: 'a"onmouseover="b@example.com' }))).status, 400);
  assert.equal((await handler(makeRequest(enquiry, { Origin: "https://attacker.example" }))).status, 403);
  assert.equal((await handler(makeRequest(enquiry, { "Idempotency-Key": "invalid" }))).status, 400);
});

test("confirmed receipts avoid resending and rate limits carry retry-after", async () => {
  const store = makeStore();
  store.reserve = async () => true;
  const handler = createContactHandler({
    store: async () => store, configured: () => true,
    send: async () => { assert.fail("Must not resend"); }, from: "from@example.com", to: "to@example.com",
  });
  assert.equal((await handler(makeRequest())).status, 200);
  store.limit = async () => { throw new ContactError("Limited", 429, 42); };
  const limited = await handler(makeRequest());
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "42");
});

test("database and provider failures fail closed without leaking input or provider errors", async (t) => {
  const logs: unknown[][] = [];
  t.mock.method(console, "error", (...args: unknown[]) => logs.push(args));
  for (const failure of ["database", "provider", "receipt", "configuration"]) {
    let marked = false;
    const store = makeStore();
    store.markSent = async () => {
      if (failure === "receipt") throw new Error("private receipt error");
      marked = true;
    };
    const handler = createContactHandler({
      store: async () => { if (failure === "database") throw new Error("private database error"); return store; },
      configured: () => failure !== "configuration",
      send: async () => { if (failure === "provider") throw new ContactError("Delivery failed", 502); },
      from: "from@example.com", to: "to@example.com",
    });
    const response = await handler(makeRequest());
    assert.equal(response.status, failure === "configuration" ? 500 : failure === "provider" ? 502 : 503);
    assert.equal(marked, false);
    assert.equal((await response.json()).ok, false);
  }
  assert.ok(!JSON.stringify(logs).includes("private"));
  assert.ok(!JSON.stringify(logs).includes(enquiry.email));
});
