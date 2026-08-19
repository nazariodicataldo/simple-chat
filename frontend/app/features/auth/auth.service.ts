import type { AxiosRequestConfig } from "axios"

import { http, withCsrf } from "@/lib/http"

import { AuthApiError } from "./auth.type"
import type {
  ApiResponse,
  AuthUser,
  LoginInput,
  RegisterInput,
} from "./auth.type"

function toAuthError(error: unknown): AuthApiError {
  if (error instanceof AuthApiError) {
    return error
  }

  const response = getErrorResponse(error)
  if (!response) {
    return new AuthApiError("Authentication failed. Please try again.", 0)
  }

  const data = response?.data as
    { message?: string; errors?: Record<string, string[]> } | undefined

  return new AuthApiError(
    data?.message ?? "Authentication failed. Please try again.",
    response?.status ?? 0,
    data?.errors
  )
}

function getErrorResponse(error: unknown) {
  if (!error || typeof error !== "object" || !("response" in error)) {
    return undefined
  }

  return (error as { response?: { status?: number; data?: unknown } }).response
}

async function withAuthCsrf<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await withCsrf(request)
  } catch (error) {
    throw toAuthError(error)
  }
}

async function requestAuth<T>(config: AxiosRequestConfig): Promise<T> {
  return withAuthCsrf(async () => {
    const response = await http.request<ApiResponse<T>>(config)
    return response.data.data
  })
}

export function login(input: LoginInput) {
  return requestAuth<AuthUser>({
    method: "POST",
    url: "/api/login",
    data: input,
  })
}

export function register(input: RegisterInput) {
  return requestAuth<AuthUser>({
    method: "POST",
    url: "/api/register",
    data: {
      first_name: input.firstName,
      last_name: input.lastName,
      username: input.username,
      email: input.email,
      password: input.password,
      password_confirmation: input.passwordConfirmation,
    },
  })
}

export function logout() {
  return withAuthCsrf(async () => {
    await http.post("/api/logout")
  })
}

export async function currentUser(): Promise<AuthUser | null> {
  try {
    const response = await http.get<ApiResponse<AuthUser>>("/api/user")
    return response.data.data
  } catch (error) {
    if (getErrorResponse(error)?.status === 401) {
      return null
    }

    throw toAuthError(error)
  }
}
