import { test, expect } from "@playwright/test";
import { MongoClient } from "mongodb";
import { randomBytes, randomUUID, createHmac } from "node:crypto";
import { authenticatedApi } from "./helpers";
import type { Content } from "../../lib/admin/schema";
const origin = process.env.APP_ORIGIN!;
const headers = { Origin: origin };
let projectId: string;
test.beforeEach(async ({ page, request }) => {
  const name = process.env.MONGODB_DB!;
  if (!/^aproop_e2e_[a-f0-9]{16}$/.test(name))
    throw Error("Isolated test DB required");
  const client = await new MongoClient(
    "mongodb://127.0.0.1:27019/?directConnection=true",
  ).connect();
  try {
    for (const collection of [
      "funding_campaigns",
      "contributions",
      "payment_limits",
      "payment_events",
      "payment_refunds",
      "admin_login_limits",
    ])
      await client.db(name).collection(collection).deleteMany({});
  } finally {
    await client.close();
  }
  await request.post("http://127.0.0.1:3199/__test/reset");
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
  const content: Content = await (await api.get("/api/admin/content")).json();
  projectId = content.projects[0].id;
  Object.assign(content.projects[0], {
    need: 1000,
    raised: 0,
    backers: 0,
    options: [100, 500, 1000],
    closes: "December 2030",
    fundingState: "open",
    fundingTerms:
      "Sandbox terms. A producer credit is included. Contributions are refunded if the project is cancelled; test payments do not move real money.",
    minContribution: 100,
    maxContribution: 1000,
  });
  expect(
    (await api.put("/api/admin/content", { headers, data: content })).status(),
  ).toBe(200);
  await api.dispose();
});
async function sdk(page: import("@playwright/test").Page, success = true) {
  await page.route("https://sdk.cashfree.com/js/v3/cashfree.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `window.Cashfree=()=>({checkout:async({paymentSessionId})=>{const orderId=paymentSessionId.replace('session_','');await fetch('http://127.0.0.1:3199/__test/${success ? "pay" : "fail"}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId})});location.assign('/contributions/status?order_id='+orderId);}});`,
    }),
  );
}
async function checkout(page: import("@playwright/test").Page, amount = 1000) {
  await page.goto("/be-the-producer");
  const card = page.locator(`#story-${projectId}`);
  await card
    .getByRole("button", {
      name: `₹${amount.toLocaleString("en-IN")}`,
      exact: true,
    })
    .click();
  await card
    .getByRole("button", {
      name: `Contribute ₹${amount.toLocaleString("en-IN")} ↗`,
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog
    .getByLabel("Full name", { exact: true })
    .fill("Sandbox Supporter");
  await dialog
    .getByLabel("Email", { exact: true })
    .fill("supporter@example.com");
  await dialog.getByLabel("Mobile number", { exact: true }).fill("9999999999");
  await dialog
    .getByLabel("Name in credits (optional)", { exact: true })
    .fill("Producer Test");
  await dialog.getByRole("checkbox").check();
  return dialog;
}
test("checkout, provider verification, full-funding lock, admin ledger and confirmation", async ({
  page,
  request,
}) => {
  await sdk(page);
  const dialog = await checkout(page);
  await dialog.screenshot({ path: "artifacts/cashfree-checkout.png" });
  await dialog
    .getByRole("button", { name: "Continue to pay ₹1,000", exact: true })
    .click();
  await expect(page).toHaveURL(/contributions\/status/);
  await expect(
    page.getByRole("heading", { name: "You’re part of the story." }),
  ).toBeVisible();
  await expect(
    page.getByText("Confirmed contribution", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/cashfree-confirmation.png",
    fullPage: true,
  });
  const id = new URL(page.url()).searchParams.get("order_id")!;
  const token = await page.evaluate(
    (id) => localStorage.getItem("aproop-contribution:" + id),
    id,
  );
  expect((await request.get(`/api/contributions/${id}`)).status()).toBe(403);
  const raw = JSON.stringify({
    type: "PAYMENT_SUCCESS_WEBHOOK",
    data: { order: { order_id: id } },
  });
  const timestamp = String(Date.now()),
    signature = createHmac("sha256", process.env.CASHFREE_CLIENT_SECRET!)
      .update(timestamp + raw)
      .digest("base64");
  for (let i = 0; i < 2; i++)
    expect(
      (
        await request.post("/api/payments/cashfree/webhook", {
          data: raw,
          headers: {
            "Content-Type": "application/json",
            "x-webhook-timestamp": timestamp,
            "x-webhook-signature": signature,
          },
        })
      ).status(),
    ).toBe(200);
  expect(
    (
      await request.get(`/api/contributions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).status(),
  ).toBe(200);
  await page.goto("/be-the-producer");
  const card = page.locator(`#story-${projectId}`);
  await expect(card.getByRole("status")).toContainText("Fully funded");
  await expect(card.getByRole("button", { name: /Contribute/ })).toHaveCount(0);
  await expect(card).toContainText("1 producers on board");
  await page.goto("/admin/contributions");
  await expect(
    page.getByRole("heading", { name: "Contributions & payments" }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: /Sandbox Supporter/ }),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: /paid/ })).toBeVisible();
  await page.screenshot({
    path: "artifacts/cashfree-admin.png",
    fullPage: true,
  });
  const api = await authenticatedApi(page);
  const current: Content = await (await api.get("/api/admin/content")).json();
  current.projects.find((p) => p.id === projectId)!.raised = 999;
  expect(
    (await api.put("/api/admin/content", { headers, data: current })).status(),
  ).toBe(400);
  await api.dispose();
});
test("failed attempt stays pending; resume uses same order and amount without double payment", async ({
  page,
}) => {
  await sdk(page, false);
  const dialog = await checkout(page, 500);
  await dialog
    .getByRole("button", { name: "Continue to pay ₹500", exact: true })
    .click();
  await expect(page).toHaveURL(/contributions\/status/);
  await expect(
    page.getByRole("heading", { name: "Checking your payment." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Resume this checkout", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Confirmed contribution", { exact: true }),
  ).toHaveCount(0);
  const orderId = new URL(page.url()).searchParams.get("order_id")!;
  await page.evaluate(() => {
    window.Cashfree = undefined;
    document
      .querySelector('script[src="https://sdk.cashfree.com/js/v3/cashfree.js"]')
      ?.remove();
  });
  await page.unroute("https://sdk.cashfree.com/js/v3/cashfree.js");
  await sdk(page, true);
  await page.reload();
  await page
    .getByRole("button", { name: "Resume this checkout", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "You’re part of the story." }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.get("order_id")).toBe(orderId);
});
test("server rejects overfunding, stale terms, missing consent and project closure", async ({
  page,
  request,
}) => {
  const views = await (await request.get("/api/funding")).json();
  const view = views.find(
    (v: { projectId: string }) => v.projectId === projectId,
  );
  const payload = {
    projectId,
    requestId: randomUUID(),
    accessToken: randomBytes(32).toString("hex"),
    amount: "1001",
    name: "Test Person",
    email: "test@example.com",
    phone: "9999999999",
    creditName: "",
    acceptedTerms: true,
    termsVersion: view.termsVersion,
  };
  expect(
    (
      await request.post("/api/contributions", { headers, data: payload })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.post("/api/contributions", {
        headers,
        data: { ...payload, amount: "100", acceptedTerms: false },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/contributions", {
        headers,
        data: { ...payload, amount: "100", termsVersion: "stale" },
      })
    ).status(),
  ).toBe(409);
  const api = await authenticatedApi(page);
  const current: Content = await (await api.get("/api/admin/content")).json();
  current.projects.find((p) => p.id === projectId)!.fundingState = "closed";
  expect(
    (await api.put("/api/admin/content", { headers, data: current })).status(),
  ).toBe(200);
  expect(
    (
      await request.post("/api/contributions", {
        headers,
        data: { ...payload, amount: "100" },
      })
    ).status(),
  ).toBe(409);
  await api.dispose();
});
test("mobile contribution form and funding editor are usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = await checkout(page, 100);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await dialog.screenshot({ path: "artifacts/cashfree-mobile.png" });
  await dialog.getByRole("button", { name: "Close contribution form" }).click();
  await page.goto("/admin");
  await page.getByRole("button", { name: /05 Be the producer/ }).click();
  await page.getByRole("button", { name: /Edit दाटण/ }).click();
  await page.getByRole("button", { name: /03 Funding/ }).click();
  await expect(
    page.getByRole("combobox", { name: "Online contributions", exact: true }),
  ).toHaveValue("open");
  await expect(
    page.getByText("Online payment totals are calculated", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("blocked checkout script can be retried without reserving twice", async ({
  page,
}) => {
  await page.route("https://sdk.cashfree.com/js/v3/cashfree.js", (route) =>
    route.abort(),
  );
  const dialog = await checkout(page, 500);
  await dialog
    .getByRole("button", { name: "Continue to pay ₹500", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Cashfree checkout couldn’t load",
  );
  const statusHref = await dialog
    .getByRole("link", { name: "Check this checkout’s status ↗" })
    .getAttribute("href");
  const firstId = new URL(statusHref!, origin).searchParams.get("order_id");
  await page.unroute("https://sdk.cashfree.com/js/v3/cashfree.js");
  await sdk(page);
  await dialog
    .getByRole("button", { name: "Continue to pay ₹500", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "You’re part of the story." }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.get("order_id")).toBe(firstId);
  const api = await authenticatedApi(page);
  const ledger = await (await api.get("/api/admin/contributions")).json();
  expect(ledger.total).toBe(1);
  expect(
    ledger.campaigns.find((c: { _id: string }) => c._id === projectId)
      .reservedPaise,
  ).toBe(0);
  await api.dispose();
});
