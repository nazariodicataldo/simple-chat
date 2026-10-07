import { describe, expect, it } from "vitest"

import {
  getPlaywrightRuntimeSettings,
  resolvePlaywrightTarget,
} from "./playwright-config"

describe("Playwright target configuration", () => {
  it("keeps the local Compose target and CI retry contract by default", () => {
    expect(
      getPlaywrightRuntimeSettings({
        baseUrl: undefined,
        ignoreHttpsErrors: "true",
        ci: "true",
      })
    ).toEqual({
      baseURL: "https://app.simple-chat.test:8443",
      isProduction: false,
      ignoreHTTPSErrors: true,
      timeout: 30_000,
      retries: 2,
      reporter: "html",
      trace: "off",
      video: undefined,
      screenshot: undefined,
    })
  })

  it("accepts only the HTTPS root of one Render service and removes one final slash", () => {
    expect(
      resolvePlaywrightTarget("https://chat-example.onrender.com/")
    ).toEqual({
      baseURL: "https://chat-example.onrender.com",
      isProduction: true,
      ignoreHTTPSErrors: false,
    })
  })

  it.each([
    "http://chat-example.onrender.com",
    "https://onrender.com",
    "https://chat-example.onrender.com:443",
    "https://chat-example.onrender.com/path",
    "https://chat-example.onrender.com?debug=true",
    "https://chat-example.onrender.com#fragment",
    "https://user:password@chat-example.onrender.com",
  ])("rejects an invalid Render URL: %s", (baseUrl) => {
    expect(() => resolvePlaywrightTarget(baseUrl)).toThrow(
      "PLAYWRIGHT_BASE_URL must be an HTTPS root URL for a single *.onrender.com host."
    )
  })

  it("rejects the TLS bypass when Render is selected", () => {
    expect(() =>
      resolvePlaywrightTarget("https://chat-example.onrender.com", "true")
    ).toThrow(
      "PLAYWRIGHT_IGNORE_HTTPS_ERRORS cannot be true with a Render target."
    )
  })

  it("reserves the production cleanup timeout and disables retries and artifacts", () => {
    expect(
      getPlaywrightRuntimeSettings({
        baseUrl: "https://chat-example.onrender.com",
        ignoreHttpsErrors: undefined,
        ci: "true",
      })
    ).toEqual({
      baseURL: "https://chat-example.onrender.com",
      isProduction: true,
      ignoreHTTPSErrors: false,
      retries: 0,
      timeout: 150_000,
      reporter: "line",
      trace: "off",
      video: "off",
      screenshot: "off",
    })
  })
})
