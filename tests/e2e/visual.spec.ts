import { test, expect } from "./fixtures";

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "mobile", width: 390, height: 844 },
];

test.beforeEach(async ({ page }) => {
  // Keep the first testimonial and returning-visitor intro state deterministic.
  await page.clock.install({ time: new Date("2026-09-23T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-09-23T12:00:00Z"));
  await page.addInitScript(() => sessionStorage.setItem("ap-intro-seen", "1"));
  // External thumbnail pixels are replaced; video uses its local poster in CSS.
  // Fulfill thumbnails with fixed dimensions so network failures cannot alter
  // their fallback state, and do not download the 10.9 MB movie per screenshot.
  await page.route("https://img.youtube.com/**", (route) => route.fulfill({
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"/>',
  }));
  await page.route("**/uploads/*.mp4", (route) => route.abort());
});

for (const viewport of viewports) {
  for (const target of [
    { name: "home", path: "/" },
    { name: "producer", path: "/be-the-producer" },
    { name: "admin-login", path: "/admin/login" },
    { name: "admin-work", path: "/admin" },
    { name: "admin-stories", path: "/admin" },
    { name: "admin-story-editor", path: "/admin" },
  ]) {
    test(`${target.name} layout at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      if (target.path === "/admin") {
        const login = await page.request.post("/api/admin/login", {
          headers: { Origin: process.env.APP_ORIGIN! },
          data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
        });
        expect(login.status()).toBe(200);
      }
      const response = await page.goto(target.path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toBeAttached();
      if (["admin-stories", "admin-story-editor"].includes(target.name)) {
        await page.getByRole("button", { name: /05 Be the producer/ }).click();
      }
      if (target.name === "admin-story-editor") {
        await page.locator(".admin-story-row").first().getByRole("button", { name: /^Edit / }).click();
        await expect(page.getByLabel("Story title", { exact: true })).toBeVisible();
      }
      await page.evaluate(async () => {
        await document.fonts.ready;
        const images = Array.from(document.images);
        images.forEach((img) => { img.loading = "eager"; });
        await Promise.all(images.map((img) => img.decode()));
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page).toHaveScreenshot(`${target.name}-${viewport.name}.png`, {
        fullPage: true,
        animations: "disabled",
        maxDiffPixels: 100,
        // Capture the settled reveal appearance without scrolling a fixed header.
        stylePath: "tests/e2e/visual.css",
      });
      expect(errors).toEqual([]);
    });
  }
}
