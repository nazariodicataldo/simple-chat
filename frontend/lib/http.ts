import axios from "axios"

import { getBackendUrl } from "@/lib/backend"

const http = axios.create({
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: "application/json" },
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
})

http.interceptors.request.use((config) => {
  config.baseURL = getBackendUrl()

  return config
})

let csrfRequest: Promise<void> | null = null

function hasCsrfCookie(): boolean {
  return (
    typeof document !== "undefined" &&
    document.cookie
      .split(";")
      .some((cookie) => cookie.trim().startsWith("XSRF-TOKEN="))
  )
}

export function ensureCsrf(force = false): Promise<void> {
  if (!force && hasCsrfCookie()) {
    return Promise.resolve()
  }

  if (csrfRequest) {
    return csrfRequest
  }

  csrfRequest = http
    .get("/sanctum/csrf-cookie")
    .then(() => undefined)
    .finally(() => {
      csrfRequest = null
    })

  return csrfRequest
}

function getErrorResponse(error: unknown) {
  if (!error || typeof error !== "object" || !("response" in error)) {
    return undefined
  }

  return (error as { response?: { status?: number } }).response
}

export async function withCsrf<T>(request: () => Promise<T>): Promise<T> {
  try {
    await ensureCsrf()
    return await request()
  } catch (error) {
    if (getErrorResponse(error)?.status !== 419) {
      throw error
    }

    await ensureCsrf(true)
    return request()
  }
}

export { http }
