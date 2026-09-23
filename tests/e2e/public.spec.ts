import { test, expect } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("ap-intro-seen", "1"));
});

test("mobile navigation opens and closes after choosing a section", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await page.locator('.ap-drawer a[href="#work"]').click();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(page).toHaveURL(/#work$/);
});

test("work categories, pagination, video modal and FAQ retain their behavior", async ({ page }) => {
  await page.route("https://www.youtube.com/embed/**", (route) => route.fulfill({
    contentType: "text/html", body: "<html><body>Test player</body></html>",
  }));
  await page.goto("/");
  const cards = page.locator("#work-grid article");
  await expect(cards).toHaveCount(4);
  const initialTitle = await cards.first().locator("h3").textContent();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(cards.first().locator("h3")).not.toHaveText(initialTitle!);
  await page.getByRole("button", { name: "Previous page", exact: true }).click();
  await expect(cards.first().locator("h3")).toHaveText(initialTitle!);
  const category = page.getByRole("tab").nth(1);
  await category.click();
  await expect(category).toHaveAttribute("aria-selected", "true");
  const play = cards.first().getByRole("button").first();
  await play.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("iframe")).toHaveAttribute("src", /youtube\.com\/embed\/.*autoplay=1/);
  await page.getByRole("button", { name: "Close video" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(play).toBeFocused();
  const questions = page.locator("#faq button");
  await questions.nth(1).click();
  await expect(questions.nth(1)).toHaveAttribute("aria-expanded", "true");
  await expect(questions.first()).toHaveAttribute("aria-expanded", "false");
});

test("contact submission preserves errors and clears the form only on success", async ({ page }) => {
  let attempts = 0;
  const submissionIds: string[] = [];
  await page.route("**/api/contact", async (route) => {
    submissionIds.push(route.request().headers()["idempotency-key"]);
    expect(route.request().postDataJSON()).toMatchObject({
      name: "Test sender", email: "sender@example.com", source: "contact",
    });
    attempts++;
    await route.fulfill({
      status: attempts === 1 ? 502 : 200,
      json: attempts === 1 ? { ok: false, error: "Temporary test failure." } : { ok: true },
    });
  });
  await page.goto("/");
  const form = page.locator("#contact form");
  await form.getByLabel("Name", { exact: true }).fill("Test sender");
  await form.getByLabel("Email", { exact: true }).fill("sender@example.com");
  await form.getByLabel("Tell us a little").fill("Please retain this message after a failure.");
  await form.getByRole("button", { name: "Get your free draft" }).click();
  await expect(form.getByRole("alert")).toHaveText("Temporary test failure.");
  await expect(form.getByLabel("Tell us a little")).not.toHaveValue("");
  await form.getByRole("button", { name: "Get your free draft" }).click();
  await expect(form.getByRole("button")).toHaveText("Thanks — we'll be in touch");
  await expect(form.getByLabel("Name", { exact: true })).toHaveValue("");
  expect(attempts).toBe(2);
  expect(submissionIds[0]).toMatch(/^[a-f0-9-]{36}$/);
  expect(submissionIds[1]).toBe(submissionIds[0]);
  await form.getByLabel("Name", { exact: true }).fill("Test sender");
  await form.getByLabel("Email", { exact: true }).fill("sender@example.com");
  await form.getByLabel("Tell us a little").fill("Please retain this message after a failure.");
  await form.getByRole("button").click();
  await expect.poll(() => attempts).toBe(3);
  expect(submissionIds[2]).not.toBe(submissionIds[0]);
});

test("contribution selection and pitch dialog preserve existing interactions", async ({ page }) => {
  await page.goto("/be-the-producer");
  const story = page.locator(".bp-card").first();
  await story.getByRole("button", { name: "₹5,000", exact: true }).click();
  const contribution = story.getByRole("link", { name: "Contribute ₹5,000" });
  await expect(contribution).toHaveAttribute("href", /^mailto:/);
  expect(decodeURIComponent(await contribution.getAttribute("href") || "")).toContain("₹5,000");
  const open = page.getByRole("button", { name: "Pitch it to us" });
  await open.click();
  const dialog = page.getByRole("dialog", { name: "Pitch your story" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();
});
