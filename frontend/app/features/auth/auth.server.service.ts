import "server-only"

import { cache } from "react"
import { cookies } from "next/headers"

import { serverHttp } from "@/lib/server-http"

import type { ApiResponse, AuthUser } from "./auth.type"

function getFrontendUrl(): string {
  const value = process.env.FRONTEND_URL

  if (!value || value.endsWith("/")) {
    throw new Error("FRONTEND_URL must be configured without a trailing slash.")
  }

  try {
    const url = new URL(value)
    if (
      !/^https?:$/.test(url.protocol) ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      throw new Error()
    }
  } catch {
    throw new Error(
      "FRONTEND_URL must be a valid HTTP URL without a trailing slash."
    )
  }

  return value
}

export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const cookieStore = await cookies()
  const frontendUrl = getFrontendUrl()

  try {
    const response = await serverHttp.get<ApiResponse<AuthUser>>("/api/user", {
      headers: {
        Cookie: cookieStore.toString(),
        Origin: frontendUrl,
        Referer: `${frontendUrl}/`,
      },
    })

    return response.data.data
  } catch (error) {
    if (error && typeof error === "object" && "response" in error) {
      const status = (error as { response?: { status?: number } }).response
        ?.status
      if (status === 401) {
        return null
      }
    }

    throw error
  }
})
