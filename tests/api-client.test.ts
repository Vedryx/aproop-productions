import assert from "node:assert/strict";
import test from "node:test";
import { ApiError, decodeAcknowledgement, requestJson } from "../lib/api/http";
import { contentSchema } from "../lib/admin/schema";

const endpoint = "http://localhost/api/test";

test("Ky sends JSON, retains error metadata and never retries mutations", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async (input) => {
      calls++;
      assert.ok(input instanceof Request);
      assert.equal(input.credentials, "same-origin");
      assert.equal(input.headers.get("content-type"), "application/json");
      assert.equal(input.headers.get("idempotency-key"), "stable-key");
      assert.deepEqual(await input.json(), { revision: 3 });
      return Response.json({ error: "Try later." }, { status: 503, headers: { "X-Request-ID": "test-request", "Retry-After": "0" } });
    };
    await assert.rejects(requestJson(endpoint, {
      method: "PUT", json: { revision: 3 }, headers: { "Idempotency-Key": "stable-key" },
    }, decodeAcknowledgement), (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.kind, "http");
      assert.equal(error.status, 503);
      assert.equal(error.requestId, "test-request");
      assert.equal(error.message, "Try later.");
      return true;
    });
    assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});

test("successful HTTP responses still need valid acknowledgement and content shapes", async () => {
  const original = globalThis.fetch;
  try {
    for (const data of [{ ok: false }, {}, null, "ok"]) {
      globalThis.fetch = async () => Response.json(data);
      await assert.rejects(requestJson(endpoint, {}, decodeAcknowledgement), { kind: "invalid-response" });
    }
    globalThis.fetch = async () => Response.json({ revision: 1 });
    await assert.rejects(requestJson(endpoint, {}, (data) => contentSchema.parse(data)), { kind: "invalid-response" });
    globalThis.fetch = async () => Response.json({ ok: true });
    assert.deepEqual(await requestJson(endpoint, {}, decodeAcknowledgement), { ok: true });
  } finally { globalThis.fetch = original; }
});

test("the request deadline covers a stalled response body", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(new ReadableStream({
      start(controller) { controller.enqueue(new TextEncoder().encode('{"ok":')); },
    }), { headers: { "Content-Type": "application/json" } });
    const start = performance.now();
    await assert.rejects(requestJson(endpoint, {}, decodeAcknowledgement, 20), { kind: "timeout" });
    assert.ok(performance.now() - start < 1000);
  } finally { globalThis.fetch = original; }
});

test("caller cancellation is forwarded without being reported as a network failure", async () => {
  const original = globalThis.fetch;
  const controller = new AbortController();
  try {
    globalThis.fetch = (input) => new Promise((_resolve, reject) => {
      assert.ok(input instanceof Request);
      input.signal.addEventListener("abort", () => reject(input.signal.reason));
      controller.abort();
    });
    await assert.rejects(requestJson(endpoint, { signal: controller.signal }, decodeAcknowledgement), { name: "AbortError" });
  } finally { globalThis.fetch = original; }
});
