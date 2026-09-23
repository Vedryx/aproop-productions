import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { deliverEmail, type EmailPayload } from "../lib/contact/delivery";

const payload: EmailPayload = {
  from: "from@example.com", to: ["to@example.com"], reply_to: "sender@example.com",
  subject: "Test", text: "Test body", html: "<p>Test body</p>",
};

test("provider transient failures retry with identical payloads and delivery keys", async () => {
  const requests: RequestInit[] = [];
  await deliverEmail(payload, "same-id", "test-key", async (url, init) => {
    assert.equal(url, "https://api.resend.com/emails");
    requests.push(init!);
    return requests.length === 1 ? new Response("unavailable", { status: 503 }) : Response.json({ id: "email-id" });
  });
  assert.equal(requests.length, 2);
  assert.equal(requests[0].body, requests[1].body);
  assert.equal(new Headers(requests[0].headers).get("Idempotency-Key"), "contact/same-id");
  assert.deepEqual(requests[0].headers, requests[1].headers);
});

test("permanent provider failures and throttling do not trigger automatic retry", async () => {
  for (const status of [400, 401, 409, 422, 429]) {
    let calls = 0;
    await assert.rejects(deliverEmail(payload, "id", "key", async () => {
      calls++;
      return new Response("provider private details", { status });
    }), { status: 502 });
    assert.equal(calls, 1);
  }
});

test("network failures and malformed successes never report delivery as confirmed", async () => {
  for (const fail of [true, false]) {
    let calls = 0;
    await assert.rejects(deliverEmail(payload, "id", "key", async () => {
      calls++;
      if (fail) throw new TypeError("connection lost");
      return Response.json({});
    }), { status: 502 });
    assert.equal(calls, 2);
  }
});

test("provider timeouts abort the actual HTTP connections within a bounded retry", async () => {
  const server = createServer(() => { /* Deliberately never respond. */ });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  let calls = 0;
  const start = Date.now();
  try {
    await assert.rejects(deliverEmail(payload, "id", "key", async (_url, init) => {
      calls++;
      return fetch(`http://127.0.0.1:${address.port}`, init);
    }, 30), { status: 502 });
    assert.equal(calls, 2);
    assert.ok(Date.now() - start < 3000);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
