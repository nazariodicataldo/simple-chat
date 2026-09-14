import { beforeEach, describe, expect, it, vi } from "vitest"

const cookies = vi.fn()
const get = vi.fn()

vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({ cookies }))
vi.mock("@/lib/server-http", () => ({ serverHttp: { get } }))
vi.mock("@/lib/backend", () => ({
  getBackendUrl: () => "https://api.simple-chat.test:8443",
}))

async function loadService() {
  vi.resetModules()
  return import("@/app/features/auth/auth.server.service")
}

describe("server auth service", () => {
  beforeEach(() => {
    process.env.FRONTEND_URL = "https://app.simple-chat.test:8443"
    cookies.mockResolvedValue({ toString: () => "laravel_session=session-cookie" })
    get.mockReset()
  })

  it("unwraps the current user and forwards the browser request context", async () => {
    get.mockResolvedValue({ data: { data: { id: 1, username: "ada" } } })
    const { getCurrentUser } = await loadService()

    await expect(getCurrentUser()).resolves.toMatchObject({ id: 1, username: "ada" })
    expect(get).toHaveBeenCalledWith("/api/user", {
      headers: {
        Cookie: "laravel_session=session-cookie",
        Origin: "https://app.simple-chat.test:8443",
        Referer: "https://app.simple-chat.test:8443/",
      },
    })
  })

  it("returns null only for an unauthenticated session", async () => {
    get.mockRejectedValue({ response: { status: 401 } })
    const { getCurrentUser } = await loadService()

    await expect(getCurrentUser()).resolves.toBeNull()
  })

  it("propagates backend failures for the page error state", async () => {
    const backendError = { response: { status: 500 } }
    get.mockRejectedValue(backendError)
    const { getCurrentUser } = await loadService()

    await expect(getCurrentUser()).rejects.toBe(backendError)
  })
})
