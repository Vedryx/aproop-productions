import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { MAX_UPLOAD_BYTES, readUpload, validateImage } from "../lib/media/upload";

const request = (body: ReadableStream<Uint8Array>) => new Request("http://localhost/upload", {
  method: "POST", body, duplex: "half",
} as RequestInit);

test("upload reads enforce actual size, empty bodies and a deadline", async () => {
  let cancelled = false;
  await assert.rejects(readUpload(request(new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(MAX_UPLOAD_BYTES + 1)); },
    cancel() { cancelled = true; },
  }))), { status: 413 });
  assert.equal(cancelled, true);
  await assert.rejects(readUpload(new Request("http://localhost", { method: "POST", body: "" })), { status: 400 });
  cancelled = false;
  await assert.rejects(readUpload(request(new ReadableStream({ cancel() { cancelled = true; } })), 10), { status: 408 });
  assert.equal(cancelled, true);
});

test("all supported image formats decode; forged headers, truncated images and pixel bombs fail", async () => {
  for (const format of ["jpeg", "png", "webp"] as const) {
    const image = await sharp({ create: { width: 20, height: 10, channels: 3, background: "red" } }).toFormat(format).toBuffer();
    assert.deepEqual(await validateImage(image), { contentType: `image/${format}`, width: 20, height: 10 });
    await assert.rejects(validateImage(image.subarray(0, 25)), { status: 400 });
  }
  await assert.rejects(validateImage(Buffer.from([255, 216, 255, 0])), { status: 400 });
  await assert.rejects(validateImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>')), { status: 400 });
  const large = await sharp({ create: { width: 5001, height: 5000, channels: 3, background: "red" } }).png().toBuffer();
  await assert.rejects(validateImage(large), { status: 400 });
});

test("download adapter bounds queued bytes and closes storage on cancellation", async () => {
  const { Readable } = await import("node:stream");
  const { downloadBody } = await import("../lib/media/download");
  let reads = 0;
  let aborted = false;
  const stream = Object.assign(new Readable({
    read() { reads++; this.push(Buffer.alloc(256 * 1024)); },
  }), { async abort() { aborted = true; } });
  const reader = downloadBody(stream).getReader();
  await reader.read();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.ok(reads <= 4, `Read too far ahead: ${reads} chunks`);
  await reader.cancel();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(stream.destroyed, true);
  assert.equal(aborted, true);
});
