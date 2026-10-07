import { defineConfig } from "@playwright/test"

import { getPlaywrightRuntimeSettings } from "./e2e/playwright-config"

const runtime = getPlaywrightRuntimeSettings({
  baseUrl: process.env.PLAYWRIGHT_BASE_URL,
  ignoreHttpsErrors: process.env.PLAYWRIGHT_IGNORE_HTTPS_ERRORS,
  ci: process.env.CI,
})

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  timeout: runtime.timeout,
  retries: runtime.retries,
  reporter: runtime.reporter,
  globalSetup: runtime.isProduction ? "./e2e/production-global-setup.ts" : undefined,
  // Il runner si collega al Compose gia' avviato: nessun servizio deve essere gestito dal test.
  use: {
    baseURL: runtime.baseURL,
    // In production nessun artifact deve conservare body, cookie, token o password.
    trace: runtime.trace,
    video: runtime.video,
    screenshot: runtime.screenshot,
    ignoreHTTPSErrors: runtime.ignoreHTTPSErrors,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
})
