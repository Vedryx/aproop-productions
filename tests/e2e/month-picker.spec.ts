import { test, expect } from "./fixtures";
import { authenticatedApi } from "./helpers";
import type { Content } from "../../lib/admin/schema";

const headers = { Origin: process.env.APP_ORIGIN! };

test("month and year dropdowns support either selection order and persist on the website", async ({
  page,
}) => {
  const login = await page.request.post("/api/admin/login", {
    headers,
    data: {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    },
  });
  expect(login.ok()).toBeTruthy();
  await page.goto("/admin");
  const api = await authenticatedApi(page);
  const original: Content = await (await api.get("/api/admin/content")).json();
  const story = original.projects.find((p) => p.published)!;
  const nextYear = String(new Date().getFullYear() + 5);
  const openStory = async () => {
    await page.getByRole("button", { name: /05 Be the producer/ }).click();
    await page
      .getByRole("button", { name: `Edit ${story.title}`, exact: true })
      .click();
  };
  const month = page.getByRole("combobox", {
    name: "Closing month",
    exact: true,
  });
  const year = page.getByRole("combobox", {
    name: "Closing year",
    exact: true,
  });
  const mode = page.getByRole("combobox", {
    name: "Closing date type",
    exact: true,
  });
  try {
    await openStory();
    await mode.selectOption("tba");
    await mode.selectOption("month");
    await expect(month.locator("option")).toHaveCount(13);
    // Picking a year first must not reset it before a month is chosen.
    await year.selectOption(nextYear);
    await month.selectOption({ label: "November" });
    await expect(year).toHaveValue(nextYear);
    await page
      .getByRole("button", { name: "Save changes ↗", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Saved.");
    await page.reload();
    await openStory();
    await expect(month).toHaveValue("11");
    await expect(year).toHaveValue(nextYear);
    const publicPage = await page.context().newPage();
    await publicPage.goto("/be-the-producer");
    await expect(publicPage.locator(`#story-${story.id}`)).toContainText(
      `November ${nextYear}`,
    );
    await publicPage.close();

    await page.setViewportSize({ width: 375, height: 812 });
    await mode.selectOption("tba");
    await mode.selectOption("month");
    // Also support month first, then changing the year on mobile.
    await month.selectOption({ label: "February" });
    await year.selectOption(nextYear);
    await expect(month).toHaveValue("02");
    await page
      .getByRole("button", { name: "Save changes ↗", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Saved.");
    await page.reload();
    await openStory();
    await expect(month).toHaveValue("02");
    await expect(year).toHaveValue(nextYear);
    await month.scrollIntoViewIfNeeded();
    await page.screenshot({ path: "artifacts/admin-month-year-mobile.png" });
    const persisted: Content = await (
      await api.get("/api/admin/content")
    ).json();
    expect(persisted.projects.find((p) => p.id === story.id)!.closes).toBe(
      `February ${nextYear}`,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  } finally {
    const latest: Content = await (await api.get("/api/admin/content")).json();
    expect(
      (
        await api.put("/api/admin/content", {
          headers,
          data: { ...original, revision: latest.revision },
        })
      ).ok(),
    ).toBeTruthy();
    await api.post("/api/admin/logout", { headers });
    await api.dispose();
  }
});
