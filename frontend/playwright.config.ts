import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  // Il runner si collega al Compose gia' avviato: nessun servizio deve essere gestito dal test.
  use: {
    baseURL: "https://app.simple-chat.test:8443",
    // In CI il report resta utile senza allegare trace che potrebbero contenere sessioni.
    trace: process.env.CI ? "off" : "on-first-retry",
    ignoreHTTPSErrors: process.env.PLAYWRIGHT_IGNORE_HTTPS_ERRORS === "true",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
})
