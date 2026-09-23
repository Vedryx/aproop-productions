import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEnquiry, htmlFor, textFor, subjectFor } from "../lib/contact";

test("enquiries normalize input and preserve the selected form source", () => {
  const result = parseEnquiry({
    name: "  Test sender  ", email: " sender@example.com ",
    kind: " Documentary ", note: " A story. ", source: "pitch",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.value, {
    name: "Test sender", email: "sender@example.com", kind: "Documentary",
    note: "A story.", source: "pitch",
  });
  assert.match(subjectFor(result.value), /^Pitch — Documentary/);
  assert.match(textFor(result.value), /A story\./);
});

test("enquiries reject missing names, malformed bodies and invalid addresses", () => {
  for (const input of [null, "text", {}, { name: "Sender", email: "invalid" }]) {
    assert.equal(parseEnquiry(input).ok, false);
  }
});

test("email templates escape untrusted text content", () => {
  const html = htmlFor({
    name: "<img src=x>", email: "sender@example.com", kind: "Film & music",
    note: "<script>alert(1)</script>", source: "contact",
  });
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img src=x>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("Film &amp; music"));
});

test("rejects HTML attribute injection, mail headers and malformed address syntax", () => {
  for (const email of ['a"onmouseover="x@example.com', "a@example.com\r\nBcc:attacker@example.com", "a..b@example.com", ".a@example.com", "a@-example.com"])
    assert.equal(parseEnquiry({ name: "Sender", email }).ok, false, email);
  assert.equal(parseEnquiry({ name: "Sender\r\nBcc: attacker", email: "a@example.com" }).ok, false);
  assert.equal(parseEnquiry({ name: "Sender", email: "a@example.com", kind: "Film\nInjected" }).ok, false);
  for (const email of ["first.last+films@example.co.in", "o'connor@example.com"])
    assert.equal(parseEnquiry({ name: "Sender", email }).ok, true);
});

test("template escaping is safe even when called without validation", () => {
  const email = 'a"onmouseover="x@example.com';
  const html = htmlFor({ name: 'A "name"', email, kind: "Film", note: "", source: "contact" });
  assert.ok(!html.includes('href="mailto:a"'));
  assert.ok(!html.includes('onmouseover="'));
  assert.ok(html.includes("%22"));
  assert.ok(html.includes("&quot;"));
});

test("oversized fields are rejected rather than silently truncating enquiries", () => {
  const valid = { name: "Sender", email: "a@example.com", kind: "Film", note: "", source: "contact" };
  for (const [field, limit] of [["name", 120], ["email", 200], ["kind", 80], ["note", 4000]] as const)
    assert.equal(parseEnquiry({ ...valid, [field]: "x".repeat(limit + 1) }).ok, false);
  assert.equal(parseEnquiry({ ...valid, note: "x".repeat(4000) }).ok, true);
  for (const input of [[], { ...valid, source: "unknown" }, { ...valid, note: {} }])
    assert.equal(parseEnquiry(input).ok, false);
});
