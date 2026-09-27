import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

describe("server HTTP client", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it("uses the private loopback URL at runtime", async () => {
    vi.stubEnv("BACKEND_INTERNAL_URL", "http://127.0.0.1:8080")
    vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "https://public.example.test")

    const { getServerBackendUrl } = await import("@/lib/server-http")

    expect(getServerBackendUrl()).toBe("http://127.0.0.1:8080")
  })

  it("keeps the explicit local URL when no private URL is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "https://api.simple-chat.test:8443")

    const { getServerBackendUrl } = await import("@/lib/server-http")

    expect(getServerBackendUrl()).toBe("https://api.simple-chat.test:8443")
  })

  it("applies the private runtime URL to the actual server request", async () => {
    vi.stubEnv("BACKEND_INTERNAL_URL", "http://127.0.0.1:8080")
    vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "https://public.example.test")

    const { serverHttp } = await import("@/lib/server-http")
    const adapter = vi.fn(async (config) => ({
      data: {},
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }))

    serverHttp.defaults.adapter = adapter

    await serverHttp.get("/api/user")

    expect(adapter).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "http://127.0.0.1:8080",
        url: "/api/user",
      })
    )
  })
})
