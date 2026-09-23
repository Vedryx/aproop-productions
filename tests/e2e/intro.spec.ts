import { test, expect } from "./fixtures";

test("the cold open finishes and does not replay within the browser session", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-intro-seen", "1", { timeout: 7000 });
  expect(await page.evaluate(() => sessionStorage.getItem("ap-intro-seen"))).toBe("1");
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await page.reload();
  await expect(page.locator(".ap-intro")).toBeHidden();
});
