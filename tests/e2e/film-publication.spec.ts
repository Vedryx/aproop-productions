import { test, expect } from "@playwright/test";
import { authenticatedApi } from "./helpers";
import type { Content } from "../../lib/admin/schema";

const headers = { Origin: process.env.APP_ORIGIN! };

test("publishing an ad film stays in Final outputs despite unfinished story edits", async ({
  page,
}) => {
  expect(
    (
      await page.request.post("/api/admin/login", {
        headers,
        data: {
          email: process.env.ADMIN_EMAIL,
          password: process.env.ADMIN_PASSWORD,
        },
      })
    ).ok(),
  ).toBeTruthy();
  await page.goto("/admin");
  const api = await authenticatedApi(page);
  const original: Content = await (await api.get("/api/admin/content")).json();
  const story = original.projects.find((p) => p.published)!;
  try {
    await page.getByRole("button", { name: /05 Be the producer/ }).click();
    await page
      .getByRole("button", { name: `Edit ${story.title}`, exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Director", exact: true })
      .selectOption("");
    await page.getByRole("button", { name: /01 Final outputs/ }).click();
    await page.getByRole("button", { name: "+ Add film", exact: true }).click();
    await page
      .getByLabel("Film title", { exact: true })
      .fill("Ad film publication regression");
    await page
      .getByLabel("YouTube link or video ID")
      .fill("https://youtu.be/1r97KROnFFM");
    await page.getByLabel("Client / credit").fill("Publication verification");
    await page.getByLabel("Published on website", { exact: true }).check();
    const row = page
      .locator(".admin-row")
      .filter({ hasText: "Ad film publication regression" });
    await expect(row.locator(".admin-badge")).toHaveText(
      "Ready to publish · Unsaved",
    );
    const site = await page.context().newPage();
    await site.goto("/#work");
    await site.getByRole("tab", { name: /Ad Films/ }).click();
    await expect(
      site.getByRole("heading", {
        name: "Ad film publication regression",
        exact: true,
      }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Save changes ↗", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Final outputs.", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Saved.");
    await expect(page.getByLabel("Film title", { exact: true })).toHaveValue(
      "Ad film publication regression",
    );
    const saved: Content = await (await api.get("/api/admin/content")).json();
    expect(
      saved.shelves
        .flatMap((s) => s.films)
        .find((f) => f.title === "Ad film publication regression")?.published,
    ).toBe(true);
    expect(saved.projects).toEqual(original.projects);
    await expect(row.locator(".admin-badge")).toHaveText("Published");
    await expect(
      page.getByRole("button", { name: "Save changes ↗", exact: true }),
    ).toBeDisabled();
    await site.reload();
    await expect(
      site.getByRole("heading", {
        name: "Ad film publication regression",
        exact: true,
      }),
    ).toBeVisible();
    await site.getByRole("tab", { name: /Ad Films/ }).click();
    await expect(
      site.getByRole("heading", {
        name: "Ad film publication regression",
        exact: true,
      }),
    ).toBeVisible();
    await site
      .getByRole("button", {
        name: "Play Ad film publication regression",
        exact: true,
      })
      .first()
      .click();
    await expect(site.getByRole("dialog")).toBeVisible();
    await expect(site.locator("iframe")).toHaveAttribute(
      "src",
      /embed\/1r97KROnFFM/,
    );
    await site
      .getByRole("button", { name: "Close video", exact: true })
      .click();

    // Changing categories can put a film on a later public page.
    await page
      .getByRole("combobox", { name: "Category", exact: true })
      .selectOption({ label: "Documentaries" });
    await page
      .getByRole("button", { name: "Save film changes ↗", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Documentaries");
    await site.reload();
    await site.getByRole("tab", { name: /Documentaries/ }).click();
    await site.getByRole("button", { name: "Next page", exact: true }).click();
    await expect(
      site.getByRole("heading", {
        name: "Ad film publication regression",
        exact: true,
      }),
    ).toBeVisible();
    await site.setViewportSize({ width: 390, height: 844 });
    await site
      .getByRole("heading", {
        name: "Ad film publication regression",
        exact: true,
      })
      .scrollIntoViewIfNeeded();
    await site.screenshot({ path: "artifacts/published-film-mobile.png" });

    // Unpublishing must remove the saved film from the website.
    await page.getByLabel("Published on website", { exact: true }).uncheck();
    await page
      .getByRole("button", { name: "Save film draft", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("is a draft");
    await site.reload();
    await site.getByRole("tab", { name: /Documentaries/ }).click();
    await site.getByRole("button", { name: "Next page", exact: true }).click();
    await expect(
      site.getByRole("heading", {
        name: "Ad film publication regression",
        exact: true,
      }),
    ).toHaveCount(0);

    // Failed saves must stay in Final outputs without claiming publication.
    await page.getByLabel("Published on website", { exact: true }).check();
    await page.getByLabel("YouTube link or video ID").fill("invalid");
    await page
      .getByRole("button", { name: "Publish film ↗", exact: true })
      .click();
    await expect(page.locator(".admin-error")).toContainText(
      "have not been saved",
    );
    await expect(page.getByRole("status")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Final outputs.", exact: true }),
    ).toBeVisible();
    await expect(row.locator(".admin-badge")).toHaveText(
      "Ready to publish · Unsaved",
    );
    await page
      .getByLabel("YouTube link or video ID")
      .fill("https://youtu.be/1r97KROnFFM");
    await page.route("**/api/admin/content", async (route) => {
      if (route.request().method() === "PUT")
        await route.fulfill({
          status: 503,
          json: { error: "Save unavailable. Try again." },
        });
      else await route.continue();
    });
    await page
      .getByRole("button", { name: "Publish film ↗", exact: true })
      .click();
    await expect(page.locator(".admin-error")).toContainText(
      "Save unavailable",
    );
    await expect(row.locator(".admin-badge")).toHaveText(
      "Ready to publish · Unsaved",
    );
    await page.unroute("**/api/admin/content");
    await page
      .getByRole("button", { name: "Publish film ↗", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Saved.");

    // The unfinished story is still editable, not lost or accidentally saved.
    await page.getByRole("button", { name: /05 Be the producer/ }).click();
    await page
      .getByRole("button", { name: `Edit ${story.title}`, exact: true })
      .click();
    await expect(
      page.getByRole("combobox", { name: "Director", exact: true }),
    ).toHaveValue("");
    await page
      .getByRole("combobox", { name: "Director", exact: true })
      .selectOption("__custom");
    await page
      .getByLabel("Custom director", { exact: true })
      .fill(story.director);
    await page
      .getByLabel("Synopsis", { exact: true })
      .fill("Story edit independent of films.");
    await page.getByRole("button", { name: /01 Final outputs/ }).click();
    await page
      .locator(".admin-row")
      .filter({ hasText: "Ad film publication regression" })
      .click();
    await page.getByLabel("Client / credit").fill("");
    await page.getByRole("button", { name: /05 Be the producer/ }).click();
    await page
      .getByRole("button", { name: "Save changes ↗", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Saved.");
    await expect(
      page.getByRole("heading", { name: "Be the producer.", exact: true }),
    ).toBeVisible();
    const separate: Content = await (
      await api.get("/api/admin/content")
    ).json();
    expect(
      separate.shelves
        .flatMap((s) => s.films)
        .find((f) => f.title === "Ad film publication regression")!.client,
    ).toBe("Publication verification");
    await page.getByRole("button", { name: /01 Final outputs/ }).click();
    await page
      .locator(".admin-row")
      .filter({ hasText: "Ad film publication regression" })
      .click();
    await expect(page.getByLabel("Client / credit")).toHaveValue("");
    await page.getByLabel("Client / credit").fill("Publication verification");
    await page.reload();
    await page
      .locator(".admin-row")
      .filter({ hasText: "Ad film publication regression" })
      .click();
    await expect(
      page.getByLabel("Published on website", { exact: true }),
    ).toBeChecked();
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: "Remove film", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Save changes ↗", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Saved.");
    await site.reload();
    await site.getByRole("tab", { name: /Documentaries/ }).click();
    await site.getByRole("button", { name: "Next page", exact: true }).click();
    await expect(
      site.getByRole("heading", {
        name: "Ad film publication regression",
        exact: true,
      }),
    ).toHaveCount(0);
    await site.close();
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
