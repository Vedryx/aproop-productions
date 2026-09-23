import { test, expect } from "./fixtures";
import { authenticatedApi } from "./helpers";
import type { Content } from "../../lib/admin/schema";

const headers = { Origin: process.env.APP_ORIGIN! };
test("smart choices, quick drafts, status filters and two immediate homepage stars", async ({
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
  await page.getByRole("button", { name: /05 Be the producer/ }).click();
  await expect(
    page.getByRole("button", { name: /Homepage stories/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "+ Add story", exact: true }).click();
  await page
    .getByLabel("Story title", { exact: true })
    .fill("Smart choices story");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved.");
  expect(await (await api.get("/be-the-producer")).text()).not.toContain(
    "Smart choices story",
  );
  await page
    .getByRole("combobox", { name: "Type / format", exact: true })
    .selectOption("Documentary");
  await page
    .getByRole("combobox", { name: "Production stage", exact: true })
    .selectOption("Post-production");
  await page
    .getByRole("combobox", { name: "Director", exact: true })
    .selectOption("Aproop team");
  await page
    .getByRole("combobox", { name: "Closing date type", exact: true })
    .selectOption("date");
  await page.getByLabel("Closing date", { exact: true }).fill("2027-01-12");
  await page
    .getByLabel("Synopsis", { exact: true })
    .fill(
      "A documentary managed with selections rather than repetitive typing.",
    );
  await page
    .getByRole("button", { name: "Next: Poster →", exact: true })
    .click();
  await expect(
    page.getByText("Upload your story’s poster", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Upload poster")
    .setInputFiles("public/uploads/datan-poster.jpg");
  await expect(page.getByRole("status")).toContainText("Poster uploaded.");
  await page
    .getByRole("button", { name: "Next: Funding →", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Contribution preset", exact: true })
    .selectOption("Community");
  await expect(
    page.getByLabel("Contribution amount 1", { exact: true }),
  ).toHaveValue("500");
  await page
    .getByRole("button", { name: "Next: Review & publish →", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Feature Smart choices story on homepage",
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByLabel("Published on website", { exact: true }).check();
  await page
    .getByRole("button", { name: "Save story changes ↗", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Saved.");
  const current: Content = await (await api.get("/api/admin/content")).json();
  const created = current.projects.find(
    (p) => p.title === "Smart choices story",
  )!;
  expect(created).toMatchObject({
    kind: "Documentary",
    stage: "Post-production",
    closes: "2027-01-12",
    director: "Aproop team",
    options: [500, 1000, 2500],
    ph: "Smart choices story — poster",
  });
  const publicPage = await page.context().newPage();
  await publicPage.goto(`/be-the-producer#story-${created.id}`);
  await expect(publicPage.locator(`#story-${created.id}`)).toContainText(
    "12 January 2027",
  );
  await publicPage.close();
  await page
    .getByRole("button", {
      name: "Feature Smart choices story on homepage",
      exact: true,
    })
    .click();
  await expect(page.locator(".admin-error")).toContainText("Only two stories");
  expect(
    (
      await api.patch("/api/admin/content", {
        headers,
        data: { id: created.id, featured: true, revision: current.revision },
      })
    ).status(),
  ).toBe(400);
  await page
    .getByRole("button", { name: "← All stories", exact: true })
    .click();
  const oldStar = current.projects.find((p) => p.homepageSlot === 1)!;
  await page
    .getByRole("button", {
      name: `Remove ${oldStar.title} from homepage`,
      exact: true,
    })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "removed from the homepage",
  );
  await page
    .getByRole("button", {
      name: "Feature Smart choices story on homepage",
      exact: true,
    })
    .click();
  await expect(page.getByRole("status")).toContainText("now on the homepage");
  await expect(
    page.getByRole("button", { name: "Save changes ↗", exact: true }),
  ).toBeDisabled();
  expect(await (await api.get("/")).text()).toContain("Smart choices story");
  await page
    .getByRole("combobox", { name: "Filter content", exact: true })
    .selectOption("starred");
  await expect(page.locator(".admin-story-row")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Edit Smart choices story", exact: true })
    .click();
  await page
    .getByLabel("Story title", { exact: true })
    .fill("Unpublished title change");
  await page
    .getByRole("button", { name: "04 Review & publish", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Remove Unpublished title change from homepage",
      exact: true,
    })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "removed from the homepage",
  );
  await expect(
    page.getByRole("button", { name: "Save changes ↗", exact: true }),
  ).toBeEnabled();
  const persisted: Content = await (await api.get("/api/admin/content")).json();
  expect(persisted.projects.find((p) => p.id === created.id)!.title).toBe(
    "Smart choices story",
  );
  await page
    .getByRole("button", { name: "01 Story details", exact: true })
    .click();
  await expect(page.getByLabel("Story title", { exact: true })).toHaveValue(
    "Unpublished title change",
  );
  await page
    .getByRole("button", { name: "04 Review & publish", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save story changes ↗", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Saved.");
  await page
    .getByRole("button", { name: "← All stories", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Filter content", exact: true })
    .selectOption("all");
  await page.screenshot({
    path: "artifacts/admin-stars-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "artifacts/admin-stars-mobile.png",
    fullPage: true,
  });
  // Competing tabs cannot claim the remaining slot with the same revision.
  const baseline: Content = await (await api.get("/api/admin/content")).json();
  const cleared = structuredClone(baseline);
  cleared.projects.forEach((p) => {
    p.homepageSlot = 0;
  });
  const reset = await api.put("/api/admin/content", { headers, data: cleared });
  expect(reset.ok()).toBeTruthy();
  const ready: Content = await reset.json();
  const candidates = ready.projects.filter((p) => p.published);
  const results = await Promise.all(
    candidates.slice(0, 2).map((p) =>
      api.patch("/api/admin/content", {
        headers,
        data: { id: p.id, featured: true, revision: ready.revision },
      }),
    ),
  );
  expect(results.map((r) => r.status()).sort()).toEqual([200, 409]);
  const afterRace: Content = await (await api.get("/api/admin/content")).json();
  expect(afterRace.projects.filter((p) => p.homepageSlot)).toHaveLength(1);
  const restore = await api.put("/api/admin/content", {
    headers,
    data: { ...baseline, revision: afterRace.revision },
  });
  expect(restore.ok()).toBeTruthy();
  expect(
    (
      await api.patch("/api/admin/content", {
        headers: { Origin: "https://untrusted.example" },
        data: {
          id: created.id,
          featured: true,
          revision: afterRace.revision + 1,
        },
      })
    ).status(),
  ).toBe(403);
  await api.post("/api/admin/logout", { headers });
});
