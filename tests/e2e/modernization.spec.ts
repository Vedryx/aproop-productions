import { test, expect } from "./fixtures";

test("public story navigation uses client transitions and keeps anchors and history", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("ap-intro-seen", "1"));
  await page.goto("/");
  await page.evaluate(() => { document.documentElement.dataset.navigationProbe = "same-document"; });
  await page.getByRole("link", { name: "Support a story" }).click();
  await expect(page).toHaveURL(/\/be-the-producer$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Back a story");
  await expect(page.locator("html")).toHaveAttribute("data-navigation-probe", "same-document");
  await page.getByRole("link", { name: "Back to the studio" }).click();
  await expect(page).toHaveURL(/\/#producer$/);
  await expect(page.locator("#producer")).toBeInViewport();
  await expect(page.locator("html")).toHaveAttribute("data-navigation-probe", "same-document");
  const featured = page.locator('#producer a[href*="#story-"]').first();
  const href = await featured.getAttribute("href");
  await featured.click();
  await expect(page).toHaveURL(new RegExp(`${href!.split("#")[1]}$`));
  await expect(page.locator(`#${href!.split("#")[1]}`)).toBeInViewport();
  await page.goBack();
  await expect(page).toHaveURL(/\/#producer$/);
});

test("malformed save responses preserve drafts and editor state stays isolated between tabs", async ({ page }) => {
  await page.request.post("/api/admin/login", {
    headers: { Origin: process.env.APP_ORIGIN! },
    data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  });
  await page.goto("/admin");
  await page.locator("button.admin-row").first().click();
  const field = page.getByLabel("Film title", { exact: true });
  const savedTitle = await field.inputValue();
  await field.fill("Unsaved local draft");
  const second = await page.context().newPage();
  try {
    await second.goto("/admin");
    await second.locator("button.admin-row").first().click();
    await expect(second.getByLabel("Film title", { exact: true })).toHaveValue(savedTitle);
    await page.route("**/api/admin/content", (route) => route.request().method() === "PUT"
      ? route.fulfill({ status: 200, json: { revision: 100 } }) : route.continue());
    await page.getByRole("button", { name: "Save changes ↗" }).click();
    await expect(page.locator(".admin-error")).toContainText("invalid response");
    await expect(field).toHaveValue("Unsaved local draft");
    await expect(page.locator(".admin-topbar")).toContainText("Unsaved changes");
    await page.unroute("**/api/admin/content");
    await page.getByRole("button", { name: "Save changes ↗" }).click();
    await expect(page.getByRole("status")).toContainText("Saved.");
    await expect(page.locator(".admin-topbar")).toContainText("All changes saved");
  } finally { await second.close(); }
});
