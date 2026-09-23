import assert from "node:assert/strict";
import test from "node:test";
import { readJson } from "../lib/server/read-json";
import { withDiagnostics } from "../lib/server/diagnostics";
import { adminRequest } from "../lib/admin/request";

const request = (body: ReadableStream<Uint8Array>) => new Request("http://localhost", {
  method: "POST", headers: { "Content-Type": "application/json" }, body, duplex: "half",
} as RequestInit);

test("admin JSON reads bound actual bytes and stalled bodies and reject misleading types", async () => {
  let cancelled = false;
  await assert.rejects(readJson(request(new ReadableStream({
    start(c) { c.enqueue(new Uint8Array(20)); }, cancel() { cancelled = true; },
  })), 10), { status: 413 });
  assert.equal(cancelled, true);
  await assert.rejects(readJson(request(new ReadableStream()), 100, 10), { status: 408 });
  await assert.rejects(readJson(new Request("http://localhost", { method: "POST", headers: { "Content-Type": "application/jsonp" }, body: "{}" })), { status: 415 });
  assert.deepEqual(await readJson(new Request("http://localhost", { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body: '{"ok":true}' })), { ok: true });
});

test("diagnostics correlate failures without logging input, credentials or thrown messages", async () => {
  const entries: unknown[][] = [];
  const original = console.error;
  console.error = (...args) => { entries.push(args); };
  try {
    const handler = withDiagnostics("/api/admin/content", async () => { throw new Error("SECRET_PASSWORD"); });
    const response = await handler(new Request("http://localhost/private?SECRET_QUERY", { headers: { Cookie: "SECRET_COOKIE", "X-Request-ID": "untrusted" } }));
    assert.equal(response.status, 503);
    assert.match(response.headers.get("x-request-id")!, /^[a-f0-9-]{36}$/);
    assert.match(response.headers.get("server-timing")!, /^app;dur=/);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const output = JSON.stringify(entries);
    assert.ok(output.includes(response.headers.get("x-request-id")!));
    assert.ok(!output.includes("SECRET"));
    assert.ok(!(await response.text()).includes("SECRET"));
  } finally { console.error = original; }
});

test("admin requests handle bad responses and abort stalls without retrying mutations", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async () => { calls++; return new Response("gateway unavailable", { status: 502 }); };
    await assert.rejects(adminRequest("http://localhost", { method: "PUT" }), /service is unavailable/);
    assert.equal(calls, 1);
    globalThis.fetch = async () => Response.json({ error: "Another tab changed the content." }, { status: 409 });
    await assert.rejects(adminRequest("http://localhost", {}), /Another tab/);
    globalThis.fetch = async () => new Response("invalid JSON", { status: 200 });
    await assert.rejects(adminRequest("http://localhost", {}), /invalid response/);
    let aborted = false;
    globalThis.fetch = (_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => { aborted = true; reject(new Error("abort")); });
    });
    await assert.rejects(adminRequest("http://localhost", { method: "PUT" }, 10), /timed out/);
    assert.equal(aborted, true);
  } finally { globalThis.fetch = original; }
});
