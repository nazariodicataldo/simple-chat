import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  echo: vi.fn(),
  http: { post: vi.fn() },
  pusher: { name: "Pusher mock" },
  withCsrf: vi.fn(),
}))

vi.mock("laravel-echo", () => ({ default: mocks.echo }))
vi.mock("pusher-js", () => ({ default: mocks.pusher }))
vi.mock("@/lib/http", () => ({ http: mocks.http, withCsrf: mocks.withCsrf }))

describe("Echo Reverb client", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    delete window.Pusher
    delete window.__simpleChatEcho

    mocks.echo.mockImplementation(function EchoMock(options) {
      return { options }
    })
    mocks.withCsrf.mockImplementation(
      (request: () => Promise<unknown>) => request()
    )
  })

  it("configures one lazy HTTPS Reverb client in the browser", async () => {
    vi.stubEnv("NEXT_PUBLIC_REVERB_APP_KEY", "public-reverb-key")
    vi.stubEnv("NEXT_PUBLIC_REVERB_HOST", "reverb.example.test")
    vi.stubEnv("NEXT_PUBLIC_REVERB_PORT", "8443")
    vi.stubEnv("NEXT_PUBLIC_REVERB_SCHEME", "https")

    const { getEcho } = await import("@/lib/echo")

    expect(window.Pusher).toBe(mocks.pusher)

    const first = getEcho()
    const second = getEcho()
    vi.resetModules()
    const { getEcho: getReloadedEcho } = await import("@/lib/echo")
    const reloaded = getReloadedEcho()

    expect(first).toBe(second)
    expect(first).toBe(reloaded)
    expect(mocks.echo).toHaveBeenCalledOnce()
    expect(mocks.echo).toHaveBeenCalledWith(
      expect.objectContaining({
        broadcaster: "reverb",
        key: "public-reverb-key",
        wsHost: "reverb.example.test",
        wsPort: 8443,
        wssPort: 8443,
        forceTLS: true,
        enabledTransports: ["ws", "wss"],
      })
    )
  })

  it("configures HTTP Reverb with explicit environment values", async () => {
    vi.stubEnv("NEXT_PUBLIC_REVERB_APP_KEY", "local-public-key")
    vi.stubEnv("NEXT_PUBLIC_REVERB_HOST", "localhost")
    vi.stubEnv("NEXT_PUBLIC_REVERB_PORT", "8080")
    vi.stubEnv("NEXT_PUBLIC_REVERB_SCHEME", "http")

    const { getEcho } = await import("@/lib/echo")

    getEcho()

    expect(mocks.echo).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "local-public-key",
        wsHost: "localhost",
        wsPort: 8080,
        wssPort: 8080,
        forceTLS: false,
      })
    )
  })

  it("authorizes private channels through the CSRF-aware Axios client", async () => {
    const { getEcho } = await import("@/lib/echo")
    const callback = vi.fn()
    const response = { data: { auth: "signed-channel-auth" } }
    mocks.http.post.mockResolvedValue(response)

    getEcho()

    const [options] = mocks.echo.mock.calls[0]
    const customHandler = options.channelAuthorization.customHandler
    customHandler(
      { socketId: "1234.5678", channelName: "private-chat" },
      callback
    )

    await vi.waitFor(() => {
      expect(mocks.http.post).toHaveBeenCalledWith("/broadcasting/auth", {
        socket_id: "1234.5678",
        channel_name: "private-chat",
      })
    })

    expect(mocks.withCsrf).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenCalledWith(null, response.data)
  })

  it("passes authorization errors to the Pusher callback", async () => {
    const { getEcho } = await import("@/lib/echo")
    const callback = vi.fn()
    const error = new Error("Unauthorized")
    mocks.http.post.mockRejectedValue(error)

    getEcho()

    const [options] = mocks.echo.mock.calls[0]
    options.channelAuthorization.customHandler(
      { socketId: "1234.5678", channelName: "private-chat" },
      callback
    )

    await vi.waitFor(() => {
      expect(callback).toHaveBeenCalledWith(error, null)
    })

    expect(mocks.withCsrf).toHaveBeenCalledOnce()
  })

  it("can be imported when window is unavailable", async () => {
    vi.stubGlobal("window", undefined)

    await expect(import("@/lib/echo")).resolves.toMatchObject({
      getEcho: expect.any(Function),
    })
    expect(mocks.echo).not.toHaveBeenCalled()
  })
})
