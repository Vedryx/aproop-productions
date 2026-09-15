import { defineConfig } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { createHash, randomBytes } from "node:crypto";
loadEnvConfig(process.cwd());
// A separate server/database keeps verification away from the user's open editor.
const run = (process.env.APROOP_E2E_RUN ||= randomBytes(8).toString("hex"));
const origin = "http://127.0.0.1:3101";
const settings = {
  APP_ORIGIN: origin,
  MONGODB_URI: "mongodb://127.0.0.1:27019",
  MONGODB_DB: `aproop_e2e_${run}`,
  ADMIN_EMAIL: "e2e@aproop.local",
  ADMIN_PASSWORD: `test-password-${run}`,
  ADMIN_JWT_SECRET: createHash("sha256").update(run).digest("hex"),
};
Object.assign(process.env, settings);
export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  globalTeardown: "./tests/e2e/teardown.ts",
  use: {
    baseURL: origin,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3101",
    url: `${origin}/admin/login`,
    reuseExistingServer: false,
    env: settings,
    timeout: 30_000,
  },
});
