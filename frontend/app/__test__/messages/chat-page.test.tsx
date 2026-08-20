import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { mutate, updateMutate, deleteMutate, useCreateMessageMutation, useUpdateMessageMutation, useDeleteMessageMutation, useMessageRealtime, useMessagesQuery } = vi.hoisted(() => ({
  mutate: vi.fn(),
  updateMutate: vi.fn(),
  deleteMutate: vi.fn(),
  useCreateMessageMutation: vi.fn(),
  useUpdateMessageMutation: vi.fn(),
  useDeleteMessageMutation: vi.fn(),
  useMessageRealtime: vi.fn(),
  useMessagesQuery: vi.fn(),
}))

vi.mock("@/app/features/messages/message.queries", () => ({
  useCreateMessageMutation,
  useUpdateMessageMutation,
  useDeleteMessageMutation,
  useMessagesQuery,
}))

vi.mock("@/app/features/messages/realtime/use-message-realtime", () => ({
  useMessageRealtime,
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
  onError?: (error?: unknown) => void
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
    updateMutate.mockReset()
    deleteMutate.mockReset()
    useMessageRealtime.mockReset()
    useCreateMessageMutation.mockReturnValue({ mutate })
    useUpdateMessageMutation.mockReturnValue({ mutate: updateMutate, isPending: false })
    useDeleteMessageMutation.mockReturnValue({ mutate: deleteMutate, isPending: false })
    useMessageRealtime.mockReturnValue({ lastEvent: null })
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

  afterEach(() => {
    vi.useRealTimers()
  })

  it("mounts Message realtime without consuming its last event", () => {
    render(<ChatPage currentUser={currentUser} />)

    expect(useMessageRealtime).toHaveBeenCalledOnce()
  })

  it("edits an owned message without scrolling and announces success", async () => {
    const callbacks: MutationCallbacks[] = []
    updateMutate.mockImplementation((_input, nextCallbacks) => callbacks.push(nextCallbacks))
    useMessagesQuery.mockReturnValue({ data: { pages: [{ data: [{ id: 21, userId: 1, text: "Original", createdAt: "2026-08-12T10:00:00.000Z", updatedAt: "2026-08-12T10:00:00.000Z", deletedAt: null, user: currentUser }] }] }, fetchNextPage: vi.fn(), hasNextPage: false, isError: false, isFetchNextPageError: false, isFetchingNextPage: false, isPending: false, refetch: vi.fn() })
    const scrollIntoView = vi.fn()
    Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: scrollIntoView })

    render(<ChatPage currentUser={currentUser} />)
    fireEvent.click(screen.getByRole("button", { name: "Message actions" }))
    fireEvent.click(await screen.findByRole("button", { name: "Edit message" }))
    expect(screen.getByRole("dialog")).toHaveTextContent("Original")
    const textbox = screen.getByRole("textbox", { name: "Message text" })
    fireEvent.change(textbox, { target: { value: "Changed" } })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(updateMutate).toHaveBeenCalledWith({ id: 21, input: { text: "Changed" } }, expect.any(Object)))
    act(() => callbacks[0].onSuccess?.({} as never))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent("Message updated")
    expect(screen.getByRole("alert")).toHaveClass("text-emerald-700")
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it("disables every edit dialog close action while the update is pending", async () => {
    useUpdateMessageMutation.mockReturnValue({
      mutate: updateMutate,
      isPending: true,
    })
    useMessagesQuery.mockReturnValue({ data: { pages: [{ data: [{ id: 21, userId: 1, text: "Original", createdAt: "2026-08-12T10:00:00.000Z", updatedAt: "2026-08-12T10:00:00.000Z", deletedAt: null, user: currentUser }] }] }, fetchNextPage: vi.fn(), hasNextPage: false, isError: false, isFetchNextPageError: false, isFetchingNextPage: false, isPending: false, refetch: vi.fn() })

    render(<ChatPage currentUser={currentUser} />)
    fireEvent.click(screen.getByRole("button", { name: "Message actions" }))
    fireEvent.click(await screen.findByRole("button", { name: "Edit message" }))

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Close dialog" })).toBeDisabled()
  })

  it("keeps the edit dialog open and shows the server error inline when update fails", async () => {
    const callbacks: MutationCallbacks[] = []
    updateMutate.mockImplementation((_input, nextCallbacks) => callbacks.push(nextCallbacks))
    useMessagesQuery.mockReturnValue({ data: { pages: [{ data: [{ id: 21, userId: 1, text: "Original", createdAt: "2026-08-12T10:00:00.000Z", updatedAt: "2026-08-12T10:00:00.000Z", deletedAt: null, user: currentUser }] }] }, fetchNextPage: vi.fn(), hasNextPage: false, isError: false, isFetchNextPageError: false, isFetchingNextPage: false, isPending: false, refetch: vi.fn() })

    render(<ChatPage currentUser={currentUser} />)
    fireEvent.click(screen.getByRole("button", { name: "Message actions" }))
    fireEvent.click(await screen.findByRole("button", { name: "Edit message" }))
    const textbox = screen.getByRole("textbox", { name: "Message text" })
    expect(textbox).toHaveValue("Original")
    fireEvent.change(textbox, { target: { value: "   " } })
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
    fireEvent.change(textbox, { target: { value: "Changed" } })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(callbacks).toHaveLength(1))

    act(() => callbacks[0].onError?.({ response: { data: { message: "Not allowed." } } }))

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(textbox).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByRole("alert")).toHaveTextContent("Not allowed.")
    expect(screen.queryByRole("button", { name: "Dismiss notification" })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }))
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("closes delete confirmation and announces the server error", async () => {
    const callbacks: MutationCallbacks[] = []
    deleteMutate.mockImplementation((_input, nextCallbacks) => callbacks.push(nextCallbacks))
    useMessagesQuery.mockReturnValue({ data: { pages: [{ data: [{ id: 21, userId: 1, text: "Delete this", createdAt: "2026-08-12T10:00:00.000Z", updatedAt: "2026-08-12T10:00:00.000Z", deletedAt: null, user: currentUser }] }] }, fetchNextPage: vi.fn(), hasNextPage: false, isError: false, isFetchNextPageError: false, isFetchingNextPage: false, isPending: false, refetch: vi.fn() })

    render(<ChatPage currentUser={currentUser} />)
    fireEvent.click(screen.getByRole("button", { name: "Message actions" }))
    fireEvent.click(await screen.findByRole("button", { name: "Delete message" }))
    expect(screen.getByRole("dialog")).toHaveTextContent("Delete this")
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    act(() => callbacks[0].onError?.({ response: { data: { message: "Not allowed." } } }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent("Unable to delete message")
  })

  it("disables every delete dialog action while the delete is pending", async () => {
    useDeleteMessageMutation.mockReturnValue({
      mutate: deleteMutate,
      isPending: true,
    })
    useMessagesQuery.mockReturnValue({ data: { pages: [{ data: [{ id: 21, userId: 1, text: "Delete this", createdAt: "2026-08-12T10:00:00.000Z", updatedAt: "2026-08-12T10:00:00.000Z", deletedAt: null, user: currentUser }] }] }, fetchNextPage: vi.fn(), hasNextPage: false, isError: false, isFetchNextPageError: false, isFetchingNextPage: false, isPending: false, refetch: vi.fn() })

    render(<ChatPage currentUser={currentUser} />)
    fireEvent.click(screen.getByRole("button", { name: "Message actions" }))
    fireEvent.click(await screen.findByRole("button", { name: "Delete message" }))

    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Close dialog" })).toBeDisabled()
  })

  it("closes delete confirmation, announces a green success alert, and auto-dismisses it", async () => {
    const callbacks: MutationCallbacks[] = []
    deleteMutate.mockImplementation((_input, nextCallbacks) => callbacks.push(nextCallbacks))
    useMessagesQuery.mockReturnValue({ data: { pages: [{ data: [{ id: 21, userId: 1, text: "Delete this", createdAt: "2026-08-12T10:00:00.000Z", updatedAt: "2026-08-12T10:00:00.000Z", deletedAt: null, user: currentUser }] }] }, fetchNextPage: vi.fn(), hasNextPage: false, isError: false, isFetchNextPageError: false, isFetchingNextPage: false, isPending: false, refetch: vi.fn() })

    render(<ChatPage currentUser={currentUser} />)
    fireEvent.click(screen.getByRole("button", { name: "Message actions" }))
    fireEvent.click(await screen.findByRole("button", { name: "Delete message" }))
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    await waitFor(() => expect(callbacks).toHaveLength(1))

    vi.useFakeTimers()
    act(() => callbacks[0].onSuccess?.({} as never))

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent("Message deleted")
    expect(screen.getByRole("alert")).toHaveClass("text-emerald-700")
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }))
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()

    act(() => callbacks[0].onSuccess?.({} as never))
    act(() => vi.advanceTimersByTime(3_000))
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
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
