import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import type { MessageListResponse } from "@/app/features/messages/message.type"

const { createMessage, listMessages } = vi.hoisted(() => ({
  createMessage: vi.fn(),
  listMessages: vi.fn(),
}))

vi.mock("@/app/features/messages/message.service", () => ({
  createMessage,
  deleteMessage: vi.fn(),
  getMessage: vi.fn(),
  listMessages,
  updateMessage: vi.fn(),
}))

import { getNextMessagePageParam, useCreateMessageMutation, useMessagesQuery } from "@/app/features/messages/message.queries"

function response(nextCursor: string | null, hasMorePages: boolean): MessageListResponse {
  return {
    success: true,
    data: [],
    timestamp: "2026-08-12 10:00:00",
    message: null,
    code: 200,
    pagination: { nextCursor, previousCursor: null, hasMorePages, perPage: 20 },
  }
}

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe("useMessagesQuery", () => {
  it("uses the next cursor for the next infinite page and stops at the end", async () => {
    listMessages.mockResolvedValueOnce(response("next-cursor", true)).mockResolvedValueOnce(response(null, false))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useMessagesQuery(), { wrapper: createWrapper(client) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listMessages).toHaveBeenNthCalledWith(1, {})

    await act(async () => {
      await result.current.fetchNextPage()
    })

    expect(listMessages).toHaveBeenNthCalledWith(2, { cursor: "next-cursor" })
    expect(getNextMessagePageParam(response(null, false))).toBeUndefined()

    await act(async () => {
      await result.current.fetchNextPage()
    })

    expect(listMessages).toHaveBeenCalledTimes(2)
  })

  it("marks the infinite list stale without refetching after creation", async () => {
    createMessage.mockResolvedValue({ id: 21 })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateQueries = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useCreateMessageMutation(), {
      wrapper: createWrapper(client),
    })

    await act(async () => {
      await result.current.mutateAsync({ text: "Created message" })
    })

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["messages", "list"],
      refetchType: "none",
    })
  })
})
