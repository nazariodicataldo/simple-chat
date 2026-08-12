import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { mutate, useCreateMessageMutation, useMessagesQuery } = vi.hoisted(() => ({
  mutate: vi.fn(),
  useCreateMessageMutation: vi.fn(),
  useMessagesQuery: vi.fn(),
}))

vi.mock("@/app/features/messages/message.queries", () => ({
  useCreateMessageMutation,
  useMessagesQuery,
}))

vi.mock("@/components/auth/logout-button", () => ({
  LogoutButton: () => <button type="button">Log out</button>,
}))

import { ChatPage } from "@/components/chat/chat-page"

const currentUser = {
  id: 1,
  firstName: "Felix",
  lastName: "Miller",
  username: "felix",
}

type MutationCallbacks = {
  onError?: () => void
  onSuccess?: (message: {
    id: number
    userId: number
    text: string
    createdAt: string
    updatedAt: string
    deletedAt: null
  }) => void
}

describe("ChatPage", () => {
  beforeEach(() => {
    mutate.mockReset()
    useCreateMessageMutation.mockReturnValue({ mutate })
    useMessagesQuery.mockReturnValue({
      data: { pages: [] },
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isError: false,
      isFetchNextPageError: false,
      isFetchingNextPage: false,
      isPending: false,
      refetch: vi.fn(),
    })
  })

  it("keeps the optimistic bubble visible, scrolls to it, and replaces it on success", async () => {
    const scrollIntoView = vi.fn()
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    })
    let callbacks: MutationCallbacks | undefined
    mutate.mockImplementation((_input, nextCallbacks) => {
      callbacks = nextCallbacks
    })

    render(<ChatPage currentUser={currentUser} />)
    fireEvent.change(screen.getByRole("textbox", { name: "New message" }), {
      target: { value: "Optimistic message" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Send message" }))

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith(
        { text: "Optimistic message" },
        expect.any(Object)
      )
    })
    expect(screen.getByRole("status")).toHaveTextContent("Sending...")
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "end" }))

    act(() => {
      callbacks?.onSuccess?.({
        id: 21,
        userId: currentUser.id,
        text: "Canonical message",
        createdAt: "2026-08-12T10:00:00.000Z",
        updatedAt: "2026-08-12T10:00:00.000Z",
        deletedAt: null,
      })
    })

    expect(screen.getByText("Canonical message")).toBeInTheDocument()
    expect(screen.queryByText("Sending...")).not.toBeInTheDocument()
  })

  it("keeps a failed message and retries it with its original text", async () => {
    const callbacks: MutationCallbacks[] = []
    mutate.mockImplementation((_input, nextCallbacks) => {
      callbacks.push(nextCallbacks)
    })

    render(<ChatPage currentUser={currentUser} />)
    fireEvent.change(screen.getByRole("textbox", { name: "New message" }), {
      target: { value: "Retry this message" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Send message" }))

    await waitFor(() => expect(callbacks).toHaveLength(1))

    act(() => {
      callbacks[0].onError?.()
    })

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to send the message.")
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))

    expect(mutate).toHaveBeenLastCalledWith(
      { text: "Retry this message" },
      expect.any(Object)
    )
    expect(screen.getByRole("status")).toHaveTextContent("Sending...")
  })

  it("shows only the pagination error when an existing page fails to load its cursor", () => {
    useMessagesQuery.mockReturnValue({
      data: { pages: [{ data: [] }] },
      fetchNextPage: vi.fn(),
      hasNextPage: true,
      isError: true,
      isFetchNextPageError: true,
      isFetchingNextPage: false,
      isPending: false,
      refetch: vi.fn(),
    })

    render(<ChatPage currentUser={currentUser} />)

    expect(screen.queryByText("Unable to load messages.")).not.toBeInTheDocument()
    expect(screen.getByText("Unable to load more messages.")).toBeInTheDocument()
    expect(screen.getAllByRole("alert")).toHaveLength(1)
  })
})
