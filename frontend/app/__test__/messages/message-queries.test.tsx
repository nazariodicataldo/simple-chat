import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import type { InfiniteData } from "@tanstack/react-query"

import type { Message, MessageListResponse } from "@/app/features/messages/message.type"

const { createMessage, deleteMessage, listMessages, updateMessage } = vi.hoisted(() => ({
  createMessage: vi.fn(),
  deleteMessage: vi.fn(),
  listMessages: vi.fn(),
  updateMessage: vi.fn(),
}))

vi.mock("@/app/features/messages/message.service", () => ({
  createMessage,
  deleteMessage,
  getMessage: vi.fn(),
  listMessages,
  updateMessage,
}))

import { getNextMessagePageParam, messageKeys, updateCachedMessage, useCreateMessageMutation, useDeleteMessageMutation, useMessagesQuery, useUpdateMessageMutation } from "@/app/features/messages/message.queries"

const message: Message = {
  id: 21,
  userId: 7,
  text: "Original message",
  createdAt: "2026-08-20T09:00:00.000000Z",
  updatedAt: "2026-08-20T09:00:00.000000Z",
  deletedAt: null,
  user: {
    id: 7,
    firstName: "Ada",
    lastName: "Lovelace",
    username: "ada",
  },
}

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

function infiniteResponse(data: Message[]): InfiniteData<MessageListResponse> {
  return {
    pages: [
      {
        ...response(null, false),
        data,
      },
    ],
    pageParams: [{}],
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

  it("keeps a newer cached message when a stale refetch arrives", async () => {
    const updated = { ...message, text: "Realtime update", updatedAt: "2026-08-20T10:00:00.000000Z" }
    listMessages.mockReset()
    listMessages
      .mockResolvedValueOnce({ ...response(null, false), data: [message] })
      .mockResolvedValueOnce({ ...response(null, false), data: [message] })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useMessagesQuery(), { wrapper: createWrapper(client) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    updateCachedMessage(client, updated)

    await act(async () => {
      await result.current.refetch()
    })

    expect(client.getQueryData<InfiniteData<MessageListResponse>>(messageKeys.lists())).toEqual(
      infiniteResponse([updated])
    )
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

  it("invalidates the message list after update and delete", async () => {
    updateMessage.mockResolvedValue({ id: 21 })
    deleteMessage.mockResolvedValue(undefined)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateQueries = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => ({ update: useUpdateMessageMutation(), remove: useDeleteMessageMutation() }), { wrapper: createWrapper(client) })

    await act(async () => { await result.current.update.mutateAsync({ id: 21, input: { text: "Updated" } }); await result.current.remove.mutateAsync(21) })

    expect(updateMessage).toHaveBeenCalledWith(21, { text: "Updated" })
    expect(deleteMessage).toHaveBeenCalledWith(21)
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["messages", "list"] })
  })

  it("replaces an already loaded message with the canonical update response", async () => {
    const updated = { ...message, text: "Canonical update", updatedAt: "2026-08-20T10:00:00.000000Z" }
    updateMessage.mockResolvedValue(updated)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(messageKeys.lists(), infiniteResponse([message]))
    const { result } = renderHook(() => useUpdateMessageMutation(), {
      wrapper: createWrapper(client),
    })

    await act(async () => {
      await result.current.mutateAsync({ id: message.id, input: { text: updated.text } })
    })

    expect(client.getQueryData<InfiniteData<MessageListResponse>>(messageKeys.lists())).toEqual(
      infiniteResponse([updated])
    )
  })

  it("updates the matching message even when it belongs to a later cached page", async () => {
    const firstPageMessage = { ...message, id: 20, text: "Earlier page" }
    const updated = { ...message, text: "Later page update", updatedAt: "2026-08-20T10:00:00.000000Z" }
    updateMessage.mockResolvedValue(updated)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData<InfiniteData<MessageListResponse>>(messageKeys.lists(), {
      pages: [
        { ...response("cursor-2", true), data: [firstPageMessage] },
        { ...response(null, false), data: [message] },
      ],
      pageParams: [{}, { cursor: "cursor-2" }],
    })
    const { result } = renderHook(() => useUpdateMessageMutation(), {
      wrapper: createWrapper(client),
    })

    await act(async () => {
      await result.current.mutateAsync({ id: message.id, input: { text: updated.text } })
    })

    expect(client.getQueryData<InfiniteData<MessageListResponse>>(messageKeys.lists())).toEqual({
      pages: [
        { ...response("cursor-2", true), data: [firstPageMessage] },
        { ...response(null, false), data: [updated] },
      ],
      pageParams: [{}, { cursor: "cursor-2" }],
    })
  })

  it("removes an already loaded message after the canonical delete response", async () => {
    deleteMessage.mockResolvedValue(undefined)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(messageKeys.lists(), infiniteResponse([message]))
    const { result } = renderHook(() => useDeleteMessageMutation(), {
      wrapper: createWrapper(client),
    })

    await act(async () => {
      await result.current.mutateAsync(message.id)
    })

    expect(client.getQueryData<InfiniteData<MessageListResponse>>(messageKeys.lists())).toEqual(
      infiniteResponse([])
    )
  })
})
