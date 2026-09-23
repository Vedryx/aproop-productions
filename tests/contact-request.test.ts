import { test } from "node:test";
import assert from "node:assert/strict";
import { readContactBody, MAX_CONTACT_BYTES } from "../lib/contact/request";
import { clientIdentity } from "../lib/server/client-identity";

const request = (body: string, headers = {}) => new Request("https://example.com/api/contact", {
  method: "POST", headers: { "Content-Type": "application/json", ...headers }, body,
});

test("contact reader enforces byte limits, content type and valid JSON", async () => {
  assert.deepEqual(await readContactBody(request('{"name":"Sender"}')), { name: "Sender" });
  await assert.rejects(readContactBody(request("{}", { "Content-Type": "text/plain" })), { status: 415 });
  await assert.rejects(readContactBody(request("{")), { status: 400 });
  await assert.rejects(readContactBody(request("{}", { "Content-Length": MAX_CONTACT_BYTES + 1 })), { status: 413 });
  await assert.rejects(readContactBody(request(JSON.stringify({ note: "界".repeat(12_000) }))), { status: 413 });
});

test("chunked requests cannot bypass the byte limit and the reader cancels overflow", async () => {
  let cancelled = false;
  const body = new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(17_000)); },
    cancel() { cancelled = true; },
  });
  const req = new Request("https://example.com/api/contact", {
    method: "POST", headers: { "Content-Type": "application/json" }, body, duplex: "half",
  } as RequestInit);
  await assert.rejects(readContactBody(req), { status: 413 });
  assert.equal(cancelled, true);
});

test("stalled request bodies time out and release their reader", async () => {
  let cancelled = false;
  const body = new ReadableStream({ cancel() { cancelled = true; } });
  const req = new Request("https://example.com/api/contact", {
    method: "POST", headers: { "Content-Type": "application/json" }, body, duplex: "half",
  } as RequestInit);
  await assert.rejects(readContactBody(req, 10), { status: 408 });
  assert.equal(cancelled, true);
  assert.equal(body.locked, false);
});

test("client identity ignores spoofable headers and normalizes trusted IPv6 addresses", () => {
  const headers = new Headers({ "x-forwarded-for": "1.2.3.4", "x-vercel-forwarded-for": "5.6.7.8" });
  assert.equal(clientIdentity(headers, false), "unknown");
  assert.equal(clientIdentity(headers, true), "5.6.7.8");
  assert.equal(clientIdentity(headers, false, "x-forwarded-for"), "1.2.3.4");
  headers.set("x-vercel-forwarded-for", "1.2.3.4, 5.6.7.8");
  assert.equal(clientIdentity(headers, true), "unknown");
  headers.set("x-vercel-forwarded-for", "2001:0db8:0:0:0:0:0:1");
  assert.equal(clientIdentity(headers, true), "[2001:db8::1]");
});
