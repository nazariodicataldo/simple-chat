import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { type PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { login, logout, refresh } = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock("@/app/features/auth/auth.service", () => ({
  currentUser: vi.fn(),
  login,
  logout,
  register: vi.fn(),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }))

import {
  authQueryKey,
  useLoginMutation,
  useLogoutMutation,
} from "@/app/features/auth/auth.queries"

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("auth mutations", () => {
  beforeEach(() => {
    login.mockReset()
    logout.mockReset()
    refresh.mockReset()
  })

  it("stores the authenticated user and refreshes the server gate after login", async () => {
    const queryClient = new QueryClient()
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries")
    login.mockResolvedValue({ id: 1, username: "ada" })
    const { result } = renderHook(() => useLoginMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(() => result.current.mutateAsync({ email: "ada@example.com", password: "password" }))

    expect(queryClient.getQueryData(authQueryKey)).toMatchObject({ id: 1, username: "ada" })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: authQueryKey })
    expect(refresh).toHaveBeenCalledOnce()
  })

  it("clears the authenticated user and refreshes the server gate after logout", async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(authQueryKey, { id: 1 })
    logout.mockResolvedValue(undefined)
    const { result } = renderHook(() => useLogoutMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(() => result.current.mutateAsync())

    expect(queryClient.getQueryData(authQueryKey)).toBeNull()
    expect(refresh).toHaveBeenCalledOnce()
  })
})
