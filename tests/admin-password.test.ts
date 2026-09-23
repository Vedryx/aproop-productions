import { test } from "node:test";
import assert from "node:assert/strict";
import { createPasswordVerifier } from "../lib/admin/password";
import { publicContentCacheIdentity } from "../lib/admin/cache-policy";

test("asynchronous password verification accepts only matching credentials and follows rotation", async () => {
  const verify = createPasswordVerifier();
  assert.equal(await verify("first-password", "first-password"), true);
  assert.equal(await verify("wrong-password", "first-password"), false);
  assert.equal(await verify("first-password", "second-password"), false);
  assert.equal(await verify("second-password", "second-password"), true);
});

test("password derivation yields to the event loop and supports concurrent checks", async () => {
  const verify = createPasswordVerifier();
  let yielded = false;
  const immediate = new Promise<void>((resolve) => setImmediate(() => { yielded = true; resolve(); }));
  const result = verify("password", "password");
  assert.equal(await result, true);
  assert.equal(yielded, true);
  await immediate;
  assert.deepEqual(await Promise.all([verify("right", "right"), verify("wrong", "right")]), [true, false]);
});

test("public cache scopes separate databases and clusters without exposing credentials", () => {
  const uri = "mongodb://user:private-password@cluster.example";
  const production = publicContentCacheIdentity(uri, "production");
  assert.deepEqual(production, publicContentCacheIdentity(uri, "production"));
  assert.notDeepEqual(production, publicContentCacheIdentity(uri, "staging"));
  assert.notDeepEqual(production, publicContentCacheIdentity("mongodb://other.example", "production"));
  assert.ok(!JSON.stringify(production).includes("private-password"));
  assert.ok(production.tag.length < 256);
});
