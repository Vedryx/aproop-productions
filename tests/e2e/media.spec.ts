import { test, expect } from "./fixtures";
import sharp from "sharp";
import { randomBytes } from "node:crypto";
import { MongoClient } from "mongodb";

test("validated uploads stream unchanged bytes with HEAD and conditional caching", async ({ request }) => {
  const headers = { Origin: process.env.APP_ORIGIN! };
  const login = await request.post("/api/admin/login", { headers, data: {
    email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD,
  } });
  expect(login.status()).toBe(200);
  Object.assign(headers, { Cookie: login.headers()["set-cookie"].split(";")[0] });
  for (const format of ["png", "jpeg", "webp"] as const) {
    // The PNG crosses several GridFS chunks, exercising streamed output.
    const pixels = randomBytes(600 * 600 * 3);
    const bytes = await sharp(pixels, { raw: { width: 600, height: 600, channels: 3 } }).toFormat(format).toBuffer();
    const upload = await request.post("/api/admin/uploads", { headers, data: bytes });
    expect(upload.status()).toBe(201);
    const { url } = await upload.json();
    const response = await request.get(url);
    expect(response.status()).toBe(200);
    expect(await response.body()).toEqual(bytes);
    expect(response.headers()["content-length"]).toBe(String(bytes.length));
    expect(response.headers()["content-type"]).toBe(`image/${format}`);
    expect(response.headers()["cache-control"]).toContain("immutable");
    const head = await request.head(url);
    expect(head.status()).toBe(200);
    expect((await head.body()).length).toBe(0);
    expect(head.headers()["content-length"]).toBe(String(bytes.length));
    const cached = await request.get(url, { headers: { "If-None-Match": `W/${response.headers().etag}` } });
    expect(cached.status()).toBe(304);
    expect((await cached.body()).length).toBe(0);
  }
  const client = await new MongoClient(process.env.MONGODB_URI!).connect();
  try {
    const db = client.db(process.env.MONGODB_DB);
    const count = await db.collection("media.files").countDocuments();
    for (const data of [Buffer.from([255, 216, 255]), Buffer.from('<svg onload="alert(1)"/>')]) {
      expect((await request.post("/api/admin/uploads", { headers, data })).status()).toBe(400);
    }
    expect(await db.collection("media.files").countDocuments()).toBe(count);
  } finally { await client.close(); }
  expect((await request.get("/media/not-an-id")).status()).toBe(404);
  expect((await request.get("/media/000000000000000000000000")).status()).toBe(404);
});

test("hero video supports byte ranges and retains browser playback and sound controls", async ({ request, page }) => {
  const range = await request.get("/uploads/biryani_web_compressed.mp4", { headers: { Range: "bytes=0-1023" } });
  expect(range.status()).toBe(206);
  expect((await range.body()).length).toBe(1024);
  expect(range.headers()["content-range"]).toBe("bytes 0-1023/10913248");
  await page.addInitScript(() => sessionStorage.setItem("ap-intro-seen", "1"));
  await page.goto("/");
  const video = page.locator("#top video");
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.videoWidth)).toBe(1920);
  await page.getByRole("button", { name: "Unmute the video", exact: true }).click();
  expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(false);
  await page.getByRole("button", { name: "Mute the video", exact: true }).click();
  expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);
});
