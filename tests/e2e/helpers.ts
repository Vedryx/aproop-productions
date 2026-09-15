import { request, type Page } from "@playwright/test";

export async function authenticatedApi(page: Page) {
  // Chromium allows Secure cookies on loopback HTTP. The API client's cookie jar
  // does not, so send the browser's cookie explicitly for local production tests.
  const cookies = await page.context().cookies();
  return request.newContext({
    baseURL: process.env.APP_ORIGIN,
    extraHTTPHeaders: {
      Cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; "),
    },
  });
}
