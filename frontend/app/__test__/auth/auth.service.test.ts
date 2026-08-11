import { beforeEach, describe, expect, it, vi } from "vitest"

import { ensureCsrf, http } from "@/lib/http"
import { login, logout, register } from "@/app/features/auth/auth.service"

vi.mock("@/lib/backend", () => ({
  getBackendUrl: () => "http://localhost:8000",
}))

describe("browser auth service", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(document, "cookie", {
      configurable: true,
      value: "",
    })
  })

  it("uses the browser Axios Sanctum configuration", () => {
    expect(http.defaults.withCredentials).toBe(true)
    expect(http.defaults.withXSRFToken).toBe(true)
    expect(http.defaults.xsrfCookieName).toBe("XSRF-TOKEN")
    expect(http.defaults.xsrfHeaderName).toBe("X-XSRF-TOKEN")
    expect(http.defaults.headers.Accept).toBe("application/json")
  })

  it("deduplicates concurrent CSRF requests and resets after success", async () => {
    const request = vi.spyOn(http, "get").mockResolvedValue({} as never)

    await Promise.all([ensureCsrf(), ensureCsrf()])
    expect(request).toHaveBeenCalledOnce()

    await ensureCsrf()
    expect(request).toHaveBeenCalledTimes(2)
  })

  it("does not request a CSRF cookie when it is already present", async () => {
    Object.defineProperty(document, "cookie", {
      configurable: true,
      value: "XSRF-TOKEN=already-present",
    })
    const request = vi.spyOn(http, "get")

    await ensureCsrf()

    expect(request).not.toHaveBeenCalled()
  })

  it("resets the CSRF request after failure", async () => {
    const request = vi
      .spyOn(http, "get")
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({} as never)

    await expect(ensureCsrf()).rejects.toThrow("network")
    await ensureCsrf()
    expect(request).toHaveBeenCalledTimes(2)
  })

  it("unwraps ApiResponse.data and retries one time after a 419", async () => {
    vi.spyOn(http, "get").mockResolvedValue({} as never)
    const request = vi
      .spyOn(http, "request")
      .mockRejectedValueOnce({ response: { status: 419 } })
      .mockResolvedValueOnce({ data: { data: { id: 1 } } } as never)

    await expect(login({ email: "a@example.com", password: "password" })).resolves.toEqual({
      id: 1,
    })
    expect(request).toHaveBeenCalledTimes(2)
  })

  it("returns a typed auth error without retrying a second 419", async () => {
    vi.spyOn(http, "get").mockResolvedValue({} as never)
    vi.spyOn(http, "request")
      .mockRejectedValueOnce({ response: { status: 419 } })
      .mockRejectedValueOnce({ response: { status: 419, data: { message: "Expired" } } })

    const error = await login({ email: "a@example.com", password: "password" }).catch(
      (value) => value
    )

    expect(error).toMatchObject({ name: "AuthApiError", status: 419, message: "Expired" })
  })

  it("converts a network error into a safe auth error", async () => {
    vi.spyOn(http, "get").mockRejectedValueOnce(new Error("network unavailable"))

    const error = await login({ email: "a@example.com", password: "password" }).catch(
      (value) => value
    )

    expect(error).toMatchObject({
      name: "AuthApiError",
      status: 0,
      message: "Authentication failed. Please try again.",
    })
  })

  it("converts the camelCase register input only for the API payload", async () => {
    vi.spyOn(http, "get").mockResolvedValue({} as never)
    const request = vi.spyOn(http, "request").mockResolvedValue({
      data: { data: { id: 1 } },
    } as never)

    await register({
      firstName: "Ada",
      lastName: "Lovelace",
      username: "ada",
      email: "ada@example.com",
      password: "secret-password",
      passwordConfirmation: "secret-password",
    })

    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      method: "POST",
      url: "/api/register",
      data: {
        first_name: "Ada",
        last_name: "Lovelace",
        username: "ada",
        email: "ada@example.com",
        password: "secret-password",
        password_confirmation: "secret-password",
      },
    }))
  })

  it("sends logout through the CSRF-protected auth request", async () => {
    vi.spyOn(http, "get").mockResolvedValue({} as never)
    const post = vi.spyOn(http, "post").mockResolvedValue({} as never)

    await expect(logout()).resolves.toBeUndefined()
    expect(post).toHaveBeenCalledWith("/api/logout")
  })
})
