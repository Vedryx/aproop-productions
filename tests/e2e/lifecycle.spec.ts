import { build } from "esbuild";
import { test, expect } from "./fixtures";
import { authenticatedApi } from "./helpers";

let harness: string;
test.beforeAll(async () => {
  // Test-only browser entry; no debug route or extra bundle ships with the app.
  const result = await build({
    stdin: { resolveDir: process.cwd(), loader: "tsx", contents: `
      import { createRoot } from 'react-dom/client';
      import { flushSync } from 'react-dom';
      import SafeImg from './components/ui/SafeImg';
      import Poster from './components/ui/Poster';
      import Services from './components/sections/Services';
      import Reveal from './components/system/Reveal';
      const root = createRoot(document.getElementById('test-root'));
      window.testImages = (src, vid) => flushSync(() => root.render(<>
        <SafeImg src={src} alt="Artwork" width={320} height={180} />
        <Poster vid={vid} alt="Thumbnail" />
      </>));
      window.testServices = () => flushSync(() => root.render(<><Services /><Reveal /></>));
      window.testUnmount = () => flushSync(() => root.unmount());
    ` },
    bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  harness = result.outputFiles[0].text;
});

declare global {
  interface Window {
    testImages(src: string, vid: string): void;
    testServices(): void;
    testUnmount(): void;
  }
}

test("image fallback state resets when the source changes", async ({ page }) => {
  await page.route("**/component-check", (route) => route.fulfill({ contentType: "text/html", body: '<div id="test-root"></div>' }));
  await page.route("**/missing.png", (route) => route.fulfill({ status: 404, body: "" }));
  await page.route("https://img.youtube.com/**", (route) => route.request().url().includes("/bad/")
    ? route.fulfill({ status: 404, body: "" })
    : route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"/>' }));
  await page.goto("/component-check");
  await page.addScriptTag({ content: harness });
  await page.evaluate(() => window.testImages("/missing.png", "bad"));
  await expect(page.locator('img[alt="Artwork"]')).toHaveCount(0);
  await expect(page.locator('div[role="img"][aria-label="Thumbnail"]')).toBeAttached();
  await page.evaluate(() => window.testImages("/uploads/hero-poster.jpg", "good"));
  await expect(page.locator('img[alt="Artwork"]')).toHaveJSProperty("naturalWidth", 1600);
  await expect(page.locator('img[alt="Thumbnail"]')).toHaveAttribute("src", /good\/maxresdefault.jpg$/);
  await expect(page.locator('img[alt="Thumbnail"]')).toHaveJSProperty("naturalWidth", 1280);
});

test("service animation tasks and reveal state clean up on unmount", async ({ page }) => {
  await page.route("**/component-check", (route) => route.fulfill({ contentType: "text/html", body: '<div id="test-root"></div>' }));
  await page.goto("/component-check");
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.addScriptTag({ content: harness });
  await page.evaluate(() => window.testServices());
  await expect(page.locator("html")).toHaveClass(/ap-anim/);
  const result = await page.evaluate(() => {
    const timers: number[] = [];
    const cleared: number[] = [];
    const set = window.setTimeout.bind(window);
    const clear = window.clearTimeout.bind(window);
    window.setTimeout = ((callback: TimerHandler, delay?: number) => {
      const id = set(callback, delay); timers.push(id); return id;
    }) as typeof window.setTimeout;
    window.clearTimeout = ((id?: number) => { if (id !== undefined) cleared.push(id); clear(id); }) as typeof window.clearTimeout;
    document.querySelector<HTMLButtonElement>(".ap-phase button")!.click();
    window.testUnmount();
    window.setTimeout = set;
    window.clearTimeout = clear;
    return { timers, cleared };
  });
  expect(result.timers.length).toBe(2);
  expect(result.cleared).toEqual(expect.arrayContaining(result.timers));
  await expect(page.locator("html")).not.toHaveClass(/ap-anim/);
  await page.clock.runFor(300);
});

test("admin dirty badges clear after reverting edits; public payload omits editor data", async ({ page, request }) => {
  const headers = { Origin: process.env.APP_ORIGIN! };
  await page.request.post("/api/admin/login", { headers, data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } });
  const api = await authenticatedApi(page);
  try {
    const content = await (await api.get("/api/admin/content")).json();
    const marker = "EDITOR-ONLY-CREDIT-ROUND-FIVE";
    content.shelves[0].films[0].client = marker;
    expect((await api.put("/api/admin/content", { headers, data: content })).status()).toBe(200);
    await page.goto("/admin");
    await page.locator("button.admin-row").first().click();
    const title = page.getByLabel("Film title", { exact: true });
    const original = await title.inputValue();
    await title.fill("Temporarily changed");
    await expect(page.locator(".admin-topbar")).toContainText("Unsaved changes");
    await title.fill(original);
    await expect(page.locator(".admin-topbar")).toContainText("All changes saved");
    expect(await (await request.get("/")).text()).not.toContain(marker);
    expect(JSON.stringify(await (await api.get("/api/admin/content")).json())).toContain(marker);
  } finally { await api.dispose(); }
});
