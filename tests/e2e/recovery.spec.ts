import { test, expect } from "./fixtures";
import { createServer, connect, type Socket } from "node:net";
import { spawn } from "node:child_process";
import { once } from "node:events";

test("malformed hash does not break the page", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => sessionStorage.setItem("ap-intro-seen", "1"));
  await page.goto("/#%E0%A4%A");
  await expect(page.locator("#work")).toBeAttached();
  await page.getByRole("tab").first().click();
  expect(errors).toEqual([]);
});

test("a failed admin save retains edits and an explicit retry succeeds", async ({ page, request }) => {
  await page.request.post("/api/admin/login", { headers: { Origin: process.env.APP_ORIGIN! }, data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } });
  await page.goto("/admin");
  await page.locator("button.admin-row").first().click();
  await page.getByLabel("Film title", { exact: true }).fill("Recovery verified film");
  let attempts = 0;
  await page.route("**/api/admin/content", async (route) => {
    if (route.request().method() === "PUT" && ++attempts === 1)
      return route.fulfill({ status: 502, contentType: "text/html", body: "temporary gateway failure" });
    return route.continue();
  });
  await page.getByRole("button", { name: "Save changes ↗" }).click();
  await expect(page.locator(".admin-error")).toContainText("service is unavailable");
  await expect(page.getByLabel("Film title", { exact: true })).toHaveValue("Recovery verified film");
  await expect(page.locator(".admin-topbar")).toContainText("Unsaved changes");
  expect(attempts).toBe(1);
  await page.getByRole("button", { name: "Save changes ↗" }).click();
  await expect(page.getByRole("status")).toContainText("Saved.");
  expect(await (await request.get("/")).text()).toContain("Recovery verified film");
});

test("database connection failure is bounded, logged safely and recovers in the same server", async ({ request }) => {
  test.setTimeout(60_000);
  let available = false;
  const sockets = new Set<Socket>();
  const proxy = createServer((incoming) => {
    sockets.add(incoming);
    incoming.on("close", () => sockets.delete(incoming));
    incoming.on("error", () => {});
    if (!available) { incoming.destroy(); return; }
    const upstream = connect(27019, "127.0.0.1");
    sockets.add(upstream);
    upstream.on("close", () => sockets.delete(upstream));
    upstream.on("error", () => incoming.destroy());
    incoming.on("close", () => upstream.destroy());
    incoming.pipe(upstream).pipe(incoming);
  });
  proxy.listen(0, "127.0.0.1");
  await once(proxy, "listening");
  const address = proxy.address();
  if (!address || typeof address === "string") throw new Error("Missing proxy port");
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const reserved = reservation.address();
  if (!reserved || typeof reserved === "string") throw new Error("Missing app port");
  await new Promise<void>((resolve) => reservation.close(() => resolve()));
  const origin = `http://127.0.0.1:${reserved.port}`;
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(reserved.port)], {
    env: { ...process.env, APP_ORIGIN: origin, MONGODB_URI: `mongodb://127.0.0.1:${address.port}/?directConnection=true` },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  const record = (chunk: Buffer) => { logs = (logs + chunk.toString()).slice(-20_000); };
  child.stdout.on("data", record);
  child.stderr.on("data", record);
  try {
    await expect.poll(async () => {
      try { return (await request.get(`${origin}/admin/login`, { timeout: 1000 })).status(); }
      catch { return 0; }
    }, { timeout: 15_000 }).toBe(200);
    const options = { headers: { Origin: origin }, data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }, timeout: 12_000 };
    const start = Date.now();
    const failed = await request.post(`${origin}/api/admin/login?private-query-marker`, options);
    expect(failed.status()).toBe(503);
    expect(Date.now() - start).toBeLessThan(10_000);
    expect(failed.headers()["x-request-id"]).toMatch(/^[a-f0-9-]{36}$/);
    expect(failed.headers()["server-timing"]).toMatch(/^app;dur=/);
    await expect.poll(() => logs).toContain(failed.headers()["x-request-id"]);
    expect(logs).not.toContain("private-query-marker");
    expect(logs).not.toContain(process.env.ADMIN_PASSWORD!);
    available = true;
    expect((await request.post(`${origin}/api/admin/login`, options)).status()).toBe(200);
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      const kill = setTimeout(() => child.kill("SIGKILL"), 3000);
      await exited;
      clearTimeout(kill);
    }
    sockets.forEach((socket) => socket.destroy());
    await new Promise<void>((resolve) => proxy.close(() => resolve()));
  }
});
