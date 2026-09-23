import { test, expect, type Page } from "./fixtures";
import { authenticatedApi } from "./helpers";
import { MongoClient } from "mongodb";
import type { Content } from "../../lib/admin/schema";

const headers = { Origin: process.env.APP_ORIGIN! };
async function signIn(page: Page) {
  const response = await page.request.post("/api/admin/login", {
    headers,
    data: {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    },
  });
  expect(response.ok()).toBeTruthy();
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Final outputs." }),
  ).toBeVisible();
  return authenticatedApi(page);
}

test("wizard validation, back navigation, draft persistence and step-specific save errors", async ({
  page,
}) => {
  const api = await signIn(page);
  await page.getByRole("button", { name: /05 Be the producer/ }).click();
  await page.getByRole("button", { name: "+ Add story", exact: true }).click();
  await page
    .getByRole("button", { name: "Next: Poster →", exact: true })
    .click();
  await expect(page.locator(".story-validation[role=alert]")).toContainText(
    "highlighted fields",
  );
  await expect(page.getByLabel("Synopsis", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.getByLabel("Story title", { exact: true }).fill("Wizard draft");
  await page
    .getByLabel("Synopsis", { exact: true })
    .fill("Draft description kept between steps.");
  await page
    .getByRole("combobox", { name: "Director", exact: true })
    .selectOption("__custom");
  await page
    .getByLabel("Custom director", { exact: true })
    .fill("Wizard director");
  await page
    .getByRole("button", { name: "Next: Poster →", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Give it a face." }),
  ).toBeFocused();
  await page.getByText("Use an image URL", { exact: true }).click();
  await page
    .getByLabel("Poster URL", { exact: true })
    .fill("javascript:alert(1)");
  await page
    .getByRole("button", { name: "Next: Funding →", exact: true })
    .click();
  await expect(page.getByLabel("Poster URL", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page
    .getByLabel("Poster URL", { exact: true })
    .fill("/uploads/datan-poster.jpg");
  await page.getByRole("button", { name: "← Back", exact: true }).click();
  await expect(page.getByLabel("Story title", { exact: true })).toHaveValue(
    "Wizard draft",
  );
  await expect(page.getByLabel("Synopsis", { exact: true })).toHaveValue(
    "Draft description kept between steps.",
  );
  await page.getByRole("button", { name: "03 Funding", exact: true }).click();
  await page.getByLabel("Funding goal (₹)", { exact: true }).fill("0");
  await page
    .getByRole("button", { name: "Next: Review & publish →", exact: true })
    .click();
  await expect(
    page.getByLabel("Funding goal (₹)", { exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Funding goal (₹)", { exact: true }).fill("90000");
  await page.getByLabel("Contribution amount 2", { exact: true }).fill("1000");
  await page
    .getByRole("button", { name: "Next: Review & publish →", exact: true })
    .click();
  await expect(
    page.getByText("Contribution amounts must be different."),
  ).toBeVisible();
  await page.getByLabel("Contribution amount 2", { exact: true }).fill("5000");
  await page
    .getByRole("button", { name: "Next: Review & publish →", exact: true })
    .click();
  await expect(
    page.getByLabel("Published on website", { exact: true }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved.");
  expect(await (await api.get("/be-the-producer")).text()).not.toContain(
    "Wizard draft",
  );
  await page.getByLabel("Published on website", { exact: true }).check();
  await page
    .getByRole("button", { name: "01 Story details", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Director", exact: true })
    .selectOption("");
  await page
    .getByRole("button", { name: "Save changes ↗", exact: true })
    .click();
  await expect(page.getByLabel("Director", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page
    .getByRole("combobox", { name: "Director", exact: true })
    .selectOption("__custom");
  await page
    .getByLabel("Custom director", { exact: true })
    .fill("Updated director");
  await page
    .getByRole("button", { name: "Save changes ↗", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Saved.");
  await page.reload();
  await page.getByRole("button", { name: /05 Be the producer/ }).click();
  await page.getByRole("button", { name: /Edit Wizard draft/ }).click();
  await expect(page.getByLabel("Director", { exact: true })).toHaveValue(
    "Updated director",
  );
  await api.post("/api/admin/logout", { headers });
});

test("all story steps stay usable on desktop, tablet and mobile", async ({
  page,
}) => {
  const api = await signIn(page);
  await page.getByRole("button", { name: /05 Be the producer/ }).click();
  await page
    .getByRole("button", { name: "Edit दाटण / Datan", exact: true })
    .click();
  for (const size of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 375, height: 812 },
  ]) {
    await page.setViewportSize(size);
    for (const [step, label] of [
      "01 Story details",
      "02 Poster",
      "03 Funding",
      "04 Review & publish",
    ].entries()) {
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect(
        page.getByRole("button", { name: label, exact: true }),
      ).toHaveAttribute("aria-current", "step");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBeTruthy();
      const footer = page.locator(".story-step-footer");
      await footer.scrollIntoViewIfNeeded();
      const box = await footer.boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(size.height + 1);
      if (size.width === 1440 || size.width === 375) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: `artifacts/wizard-${size.width}-step-${step + 1}.png`,
          fullPage: true,
        });
      }
    }
  }
  await api.post("/api/admin/logout", { headers });
});

test("admin mutations reject forged sessions, cross-origin requests and invalid payloads", async ({
  page,
  request,
}) => {
  expect(
    (await request.put("/api/admin/content", { headers, data: {} })).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/admin/uploads", { headers, data: "image" })
    ).status(),
  ).toBe(401);
  const api = await signIn(page);
  const content: Content = await (await api.get("/api/admin/content")).json();
  expect(
    (
      await api.put("/api/admin/content", {
        headers: { Origin: "https://untrusted.example" },
        data: content,
      })
    ).status(),
  ).toBe(403);
  const bad = structuredClone(content);
  bad.projects[0].need = -1;
  expect(
    (await api.put("/api/admin/content", { headers, data: bad })).status(),
  ).toBe(400);
  const duplicate = structuredClone(content);
  duplicate.projects
    .filter((p) => p.published)
    .slice(0, 2)
    .forEach((p) => {
      p.homepageSlot = 1;
    });
  expect(
    (
      await api.put("/api/admin/content", { headers, data: duplicate })
    ).status(),
  ).toBe(400);
  expect(
    (
      await api.put("/api/admin/content", {
        headers: { ...headers, "Content-Type": "application/json" },
        data: '{"broken":',
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await api.put("/api/admin/content", {
        headers: { ...headers, "Content-Type": "application/json" },
        data: "x".repeat(1_000_001),
      })
    ).status(),
  ).toBe(413);
  const cookie = (await page.context().cookies()).find(
    (c) => c.name === "aproop_admin",
  )!;
  expect(cookie.httpOnly).toBeTruthy();
  expect(cookie.secure).toBeTruthy();
  expect(cookie.sameSite).toBe("Strict");
  const parts = cookie.value.split(".");
  parts[2] = (parts[2][0] === "A" ? "B" : "A") + parts[2].slice(1);
  expect(
    (
      await request.get("/api/admin/content", {
        headers: { Cookie: `aproop_admin=${parts.join(".")}` },
      })
    ).status(),
  ).toBe(401);
  const token = JSON.parse(
    Buffer.from(cookie.value.split(".")[1], "base64url").toString(),
  );
  const client = await new MongoClient(process.env.MONGODB_URI!).connect();
  try {
    await client
      .db(process.env.MONGODB_DB)
      .collection("admin_sessions")
      .updateOne({ tokenId: token.jti }, { $set: { expiresAt: new Date(0) } });
  } finally {
    await client.close();
  }
  expect((await api.get("/api/admin/content")).status()).toBe(401);
});

test("film and category creation, editing and removal through the browser", async ({
  page,
}) => {
  const api = await signIn(page);
  page.once("dialog", (dialog) => dialog.accept("Browser category"));
  await page
    .getByRole("button", { name: "+ Add category", exact: true })
    .click();
  await page.getByRole("button", { name: "+ Add film", exact: true }).click();
  await page.getByLabel("Film title", { exact: true }).fill("Browser film");
  await page
    .getByLabel("YouTube link or video ID")
    .fill("https://www.youtube.com/watch?v=1r97KROnFFM");
  await page.getByLabel("Client / credit").fill("Browser client");
  await page
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption({ label: "Browser category" });
  await page.getByLabel("Published on website", { exact: true }).check();
  await page.getByLabel("Award winning", { exact: true }).check();
  await page
    .getByRole("button", { name: "Save changes ↗", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Saved.");
  const site = await page.context().newPage();
  await site.goto("/#work");
  await site.getByRole("tab", { name: /Browser category/ }).click();
  await expect(
    site.getByRole("heading", { name: "Browser film", exact: true }),
  ).toBeVisible();
  await site.close();
  await page
    .getByLabel("Film title", { exact: true })
    .fill("Edited browser film");
  page.once("dialog", (dialog) => dialog.accept("Renamed category"));
  await page
    .getByRole("button", { name: "Rename Browser category", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save changes ↗", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Saved.");
  await page.reload();
  await page.getByRole("button", { name: /Edited browser film/ }).click();
  await expect(page.getByLabel("Film title", { exact: true })).toHaveValue(
    "Edited browser film",
  );
  await expect(
    page.getByRole("combobox", { name: "Category", exact: true }),
  ).toContainText("Renamed category");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remove film", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", {
      name: "Remove Renamed category category",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Save changes ↗", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Saved.");
  const content: Content = await (await api.get("/api/admin/content")).json();
  expect(content.shelves.some((s) => s.key === "Renamed category")).toBeFalsy();
  expect(
    content.shelves
      .flatMap((s) => s.films)
      .some((f) => f.title === "Edited browser film"),
  ).toBeFalsy();
  await api.post("/api/admin/logout", { headers });
});
