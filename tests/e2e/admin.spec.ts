import { test, expect } from "@playwright/test";
import { authenticatedApi } from "./helpers";
import { randomUUID } from "node:crypto";
import type { Content } from "../../lib/admin/schema";

const origin = process.env.APP_ORIGIN || "http://localhost:3000";
const headers = { Origin: origin };
test("admin CRUD, publication, featured selection, persistence and authentication", async ({
  page,
  request,
}) => {
  const unauthorized = await request.get("/api/admin/content");
  expect(unauthorized.status()).toBe(401);
  const csrf = await request.post("/api/admin/login", {
    data: {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    },
    headers: { Origin: "https://untrusted.example" },
  });
  expect(csrf.status()).toBe(403);
  const rejected = await request.post("/api/admin/login", {
    data: { email: process.env.ADMIN_EMAIL, password: "incorrect-password" },
    headers,
  });
  expect(rejected.status()).toBe(401);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page
    .getByLabel("Email", { exact: true })
    .fill(process.env.ADMIN_EMAIL!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Final outputs." }),
  ).toBeVisible();
  const api = await authenticatedApi(page);
  const original: Content = await (await api.get("/api/admin/content")).json();
  const put = (data: Content) =>
    api.put("/api/admin/content", { data, headers });
  try {
    await page.screenshot({
      path: "artifacts/admin-desktop.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "+ Add film", exact: true }).click();
    await page
      .getByLabel("Film title", { exact: true })
      .fill("Admin verification film");
    await page
      .getByLabel("YouTube link or video ID")
      .fill("https://youtu.be/1r97KROnFFM");
    await page.getByLabel("Client / credit").fill("Local verification");
    await page.getByLabel("Published on website", { exact: true }).check();
    await page.getByRole("button", { name: "Save changes ↗" }).click();
    await expect(page.getByRole("status")).toContainText("Saved.");
    const home = await api.get("/");
    expect(await home.text()).toContain("Admin verification film");
    let current: Content = await (await api.get("/api/admin/content")).json();
    const edited = current.shelves
      .flatMap((s) => s.films)
      .find((f) => f.title === "Admin verification film")!;
    expect(edited.vid).toBe("1r97KROnFFM");
    edited.title = "Edited verification film";
    expect((await put(current)).ok()).toBeTruthy();
    expect((await put(current)).status()).toBe(409);
    current = await (await api.get("/api/admin/content")).json();
    current.shelves
      .flatMap((s) => s.films)
      .find((f) => f.id === edited.id)!.published = false;
    expect((await put(current)).ok()).toBeTruthy();
    expect(await (await api.get("/")).text()).not.toContain(
      "Edited verification film",
    );
    current = await (await api.get("/api/admin/content")).json();
    const story = {
      ...current.projects[0],
      id: randomUUID(),
      title: "Verification story",
      homepageSlot: 0 as const,
      published: true,
    };
    current.projects.push(story);
    expect((await put(current)).ok()).toBeTruthy();
    expect(await (await api.get("/be-the-producer")).text()).toContain(
      "Verification story",
    );
    expect(await (await api.get("/")).text()).not.toContain(
      "Verification story",
    );
    current = await (await api.get("/api/admin/content")).json();
    current.projects.forEach((p) => {
      if (p.homepageSlot === 1) p.homepageSlot = 0;
    });
    current.projects.find((p) => p.id === story.id)!.homepageSlot = 1;
    expect((await put(current)).ok()).toBeTruthy();
    expect(await (await api.get("/")).text()).toContain("Verification story");
    await page.reload();
    await page.getByRole("button", { name: /05 Be the producer/ }).click();
    await expect(
      page.getByRole("button", {
        name: "Remove Verification story from homepage",
        exact: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    const upload = await api.post("/api/admin/uploads", {
      headers: { ...headers, "Content-Type": "image/png" },
      data: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOZsAAAAASUVORK5CYII=",
        "base64",
      ),
    });
    expect(
      (
        await api.post("/api/admin/uploads", {
          headers: { ...headers, "Content-Type": "image/png" },
          data: Buffer.alloc(4 * 1024 * 1024 + 1),
        })
      ).status(),
    ).toBe(413);
    expect(upload.status()).toBe(201);
    const media = await upload.json();
    const image = await request.get(media.url);
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toBe("image/png");
    expect(
      (
        await api.post("/api/admin/uploads", {
          headers,
          data: "<svg onload='alert(1)'/>",
        })
      ).status(),
    ).toBe(400);
    current = await (await api.get("/api/admin/content")).json();
    current.shelves.forEach((s) => {
      s.films = s.films.filter((f) => f.id !== edited.id);
    });
    current.projects = current.projects.filter((p) => p.id !== story.id);
    expect((await put(current)).ok()).toBeTruthy();
    expect(await (await api.get("/be-the-producer")).text()).not.toContain(
      "Verification story",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Save changes ↗" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: "artifacts/admin-mobile.png",
      fullPage: true,
    });
  } finally {
    test.setTimeout(test.info().timeout + 15_000);
    const latest: Content = await (await api.get("/api/admin/content")).json();
    expect(
      (await put({ ...original, revision: latest.revision })).ok(),
    ).toBeTruthy();
  }
  const oldCookies = await page.context().cookies();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
  const replay = await request.get("/api/admin/content", {
    headers: {
      Cookie: oldCookies.map((c) => `${c.name}=${c.value}`).join("; "),
    },
  });
  expect(replay.status()).toBe(401);
});

test("story editor and immediate homepage stars publish the selected story", async ({
  page,
}) => {
  await page.goto("/admin/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill(process.env.ADMIN_EMAIL!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Final outputs." }),
  ).toBeVisible();
  const api = await authenticatedApi(page);
  const original: Content = await (await api.get("/api/admin/content")).json();
  try {
    await page.getByRole("button", { name: /05 Be the producer/ }).click();
    await page
      .getByRole("button", { name: "+ Add story", exact: true })
      .click();
    await page
      .getByLabel("Story title", { exact: true })
      .fill("Browser-created story");
    await page
      .getByLabel("Synopsis", { exact: true })
      .fill("A story created and edited through the admin form.");
    await page
      .getByRole("combobox", { name: "Director", exact: true })
      .selectOption("__custom");
    await page
      .getByLabel("Custom director", { exact: true })
      .fill("Test director");
    await page.getByRole("button", { name: "Save changes ↗" }).click();
    await expect(page.getByRole("status")).toContainText("Saved.");
    expect(await (await api.get("/be-the-producer")).text()).not.toContain(
      "Browser-created story",
    );
    await page
      .getByRole("button", { name: "Next: Poster →", exact: true })
      .click();
    await expect(page.getByLabel("Story title", { exact: true })).toHaveCount(
      0,
    );
    await page.getByLabel("Upload poster").setInputFiles({
      name: "unsafe.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg/>"),
    });
    await expect(page.locator(".admin-error[role=alert]")).toContainText(
      "JPG, PNG or WebP",
    );
    await page.getByLabel("Upload poster").setInputFiles({
      name: "poster.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOZsAAAAASUVORK5CYII=",
        "base64",
      ),
    });
    await expect(page.getByRole("status")).toContainText("Poster uploaded.");
    await page.getByText("Use an image URL", { exact: true }).click();
    await expect(page.getByLabel("Poster URL", { exact: true })).toHaveValue(
      /\/media\//,
    );
    await page
      .getByRole("button", { name: "Next: Funding →", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Remove amount 3", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Remove amount 2", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Next: Review & publish →", exact: true })
      .click();
    await page.getByLabel("Published on website", { exact: true }).check();
    await page
      .getByRole("button", { name: "Save story changes ↗", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Saved.");
    let current: Content = await (await api.get("/api/admin/content")).json();
    const created = current.projects.find(
      (p) => p.title === "Browser-created story",
    )!;
    expect(created.options).toEqual([1000]);
    await page.screenshot({
      path: "artifacts/admin-story-editor.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "← All stories", exact: true })
      .click();
    const previous = original.projects.find((p) => p.homepageSlot === 2)!;
    await page
      .getByRole("button", {
        name: `Remove ${previous.title} from homepage`,
        exact: true,
      })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "removed from the homepage",
    );
    await page
      .getByRole("button", {
        name: "Feature Browser-created story on homepage",
        exact: true,
      })
      .click();
    await expect(page.getByRole("status")).toContainText("now on the homepage");
    expect(await (await api.get("/")).text()).toContain(
      "Browser-created story",
    );
    await page.screenshot({
      path: "artifacts/admin-homepage-stories.png",
      fullPage: true,
    });
    const publicPage = await page.context().newPage();
    await publicPage.goto(`/be-the-producer#story-${created.id}`);
    await expect(
      publicPage.getByRole("heading", { name: "Browser-created story" }),
    ).toBeVisible();
    await expect(
      publicPage
        .locator(`#story-${created.id}`)
        .getByRole("link", { name: "Contribute ₹1,000" }),
    ).toBeVisible();
    await publicPage.close();
    await page.getByRole("button", { name: /05 Be the producer/ }).click();
    await page
      .getByRole("button", { name: /Edit Browser-created story/ })
      .click();
    await page
      .getByLabel("Story title", { exact: true })
      .fill("Updated browser story");
    await page.getByRole("button", { name: "Save changes ↗" }).click();
    await expect(page.getByRole("status")).toContainText("Saved.");
    expect(await (await api.get("/be-the-producer")).text()).toContain(
      "Updated browser story",
    );
    await page
      .getByRole("button", { name: "04 Review & publish", exact: true })
      .click();
    await page.getByText("Ordering and removal", { exact: true }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: "Remove story", exact: true })
      .click();
    await page.getByRole("button", { name: "Save changes ↗" }).click();
    await expect(page.getByRole("status")).toContainText("Saved.");
    current = await (await api.get("/api/admin/content")).json();
    expect(current.projects.some((p) => p.id === created.id)).toBeFalsy();
    expect(current.projects.some((p) => p.homepageSlot === 2)).toBeFalsy();
  } finally {
    test.setTimeout(test.info().timeout + 15_000);
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
  }
});
