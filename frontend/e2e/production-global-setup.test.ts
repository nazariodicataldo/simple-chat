import { describe, expect, it } from "vitest"

import { waitForProductionReadiness } from "./production-global-setup"

describe("production readiness", () => {
  it("waits for /up and then / without reading response bodies", async () => {
    const requests: string[] = []
    const responses = [new Response("up-secret", { status: 503 }), new Response("up", { status: 200 }), new Response("home", { status: 200 })]
    let now = 0

    await waitForProductionReadiness("https://chat-example.onrender.com", {
      fetch: async (input) => {
        requests.push(String(input))
        return responses.shift() ?? new Response(null, { status: 500 })
      },
      now: () => now,
      sleep: async (milliseconds) => {
        now += milliseconds
      },
      timeoutMs: 1000,
      requestTimeoutMs: 100,
    })

    expect(requests).toEqual([
      "https://chat-example.onrender.com/up",
      "https://chat-example.onrender.com/up",
      "https://chat-example.onrender.com/",
    ])
  })

  it("reports phase, endpoint, elapsed time and the last status without the body", async () => {
    let now = 0

    await expect(
      waitForProductionReadiness("https://chat-example.onrender.com", {
        fetch: async () => new Response("secret response body", { status: 503 }),
        now: () => now,
        sleep: async (milliseconds) => {
          now += milliseconds
        },
        timeoutMs: 100,
        requestTimeoutMs: 10,
      })
    ).rejects.toThrow(
      "Production readiness failed during /up at /up after 100ms; last status/error: status 503"
    )
  })
})
