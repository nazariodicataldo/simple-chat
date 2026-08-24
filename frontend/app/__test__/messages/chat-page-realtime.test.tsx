import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const activeListeners = new Map<
    string,
    Array<(payload: unknown) => void>
  >()
  const historicalListeners = new Map<
    string,
    Array<(payload: unknown) => void>
  >()
  const channel = {
    listen: vi.fn((eventName: string, listener: (payload: unknown) => void) => {
      activeListeners.set(eventName, [
        ...(activeListeners.get(eventName) ?? []),
        listener,
      ])
      historicalListeners.set(eventName, [
        ...(historicalListeners.get(eventName) ?? []),
        listener,
      ])
      return channel
    }),
  }

  return {
    channel,
    createMessage: vi.fn(),
    getEcho: vi.fn(),
    leave: vi.fn(),
    activeListeners,
    historicalListeners,
    listMessages: vi.fn(),
    privateChannel: vi.fn(),
    removeCachedMessage: vi.fn(),
    updateCachedMessage: vi.fn(),
  }
})

vi.mock("@/lib/echo", () => ({ getEcho: mocks.getEcho }))

vi.mock("@/app/features/messages/message.service", () => ({
  createMessage: mocks.createMessage,
  deleteMessage: vi.fn(),
  getMessage: vi.fn(),
  listMessages: mocks.listMessages,
  updateMessage: vi.fn(),
}))

vi.mock("@/app/features/messages/message.queries", async () => {
  const actual = await vi.importActual<typeof import("@/app/features/messages/message.queries")>(
    "@/app/features/messages/message.queries"
  )

  return {
    ...actual,
    removeCachedMessage: vi.fn((...args: Parameters<typeof actual.removeCachedMessage>) => {
      mocks.removeCachedMessage(...args)
      return actual.removeCachedMessage(...args)
    }),
    updateCachedMessage: vi.fn((...args: Parameters<typeof actual.updateCachedMessage>) => {
      mocks.updateCachedMessage(...args)
      return actual.updateCachedMessage(...args)
    }),
  }
})

vi.mock("@/components/auth/logout-button", () => ({
  LogoutButton: () => <button type="button">Log out</button>,
}))

import { ChatPage } from "@/components/chat/chat-page"

const currentUser = {
  id: 7,
  firstName: "Ada",
  lastName: "Lovelace",
  username: "ada",
}

const message = {
  id: 42,
  userId: currentUser.id,
  text: "Messaggio ricevuto",
  createdAt: "2026-08-20T09:00:00.000000Z",
  updatedAt: "2026-08-20T09:00:00.000000Z",
  user: currentUser,
}

function renderChatPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <ChatPage currentUser={currentUser} />
      </QueryClientProvider>
    ),
  }
}

function deliver(eventName: string, payload: unknown) {
  const listeners = mocks.activeListeners.get(eventName)
  if (!listeners?.length) throw new Error(`Missing active listener for ${eventName}`)

  act(() => listeners.forEach((listener) => listener(payload)))
}

describe("ChatPage realtime reconciliation", () => {
  beforeEach(() => {
    mocks.activeListeners.clear()
    mocks.historicalListeners.clear()
    mocks.createMessage.mockReset()
    mocks.getEcho.mockReset()
    mocks.leave.mockReset()
    mocks.privateChannel.mockReset()
    mocks.listMessages.mockReset()
    mocks.removeCachedMessage.mockReset()
    mocks.updateCachedMessage.mockReset()
    mocks.privateChannel.mockReturnValue(mocks.channel)
    mocks.leave.mockImplementation(() => mocks.activeListeners.clear())
    mocks.getEcho.mockReturnValue({ leave: mocks.leave, private: mocks.privateChannel })
    mocks.listMessages.mockResolvedValue({
      success: true,
      data: [],
      timestamp: "2026-08-20T09:00:00.000000Z",
      message: null,
      code: 200,
      pagination: { nextCursor: null, previousCursor: null, hasMorePages: false, perPage: 20 },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("shows a remote create without waiting for an HTTP refresh", async () => {
    renderChatPage()

    await waitFor(() => expect(mocks.privateChannel).toHaveBeenCalledWith("chat"))
    deliver(".App\\Events\\MessageCreated", { message })
    deliver(".App\\Events\\MessageCreated", { message })

    expect(await screen.findByText(message.text)).toBeInTheDocument()
    expect(screen.getAllByText(message.text)).toHaveLength(1)
  })

  it("updates and removes a message that still exists only in the live projection", async () => {
    renderChatPage()

    await waitFor(() => expect(mocks.privateChannel).toHaveBeenCalledWith("chat"))
    deliver(".App\\Events\\MessageCreated", { message })
    deliver(".App\\Events\\MessageUpdated", {
      message: { ...message, text: "Messaggio live aggiornato", updatedAt: "2026-08-20T10:00:00.000000Z" },
    })

    expect(await screen.findByText("Messaggio live aggiornato")).toBeInTheDocument()
    deliver(".App\\Events\\MessageDeleted", { messageId: message.id })

    await waitFor(() => expect(screen.queryByText("Messaggio live aggiornato")).not.toBeInTheDocument())
  })

  it("reconciles one active update and ignores its callback after unmount", async () => {
    mocks.listMessages.mockResolvedValueOnce({
      success: true,
      data: [{ ...message, deletedAt: null }],
      timestamp: "2026-08-20T09:00:00.000000Z",
      message: null,
      code: 200,
      pagination: { nextCursor: null, previousCursor: null, hasMorePages: false, perPage: 20 },
    })
    const { unmount } = renderChatPage()

    expect(await screen.findByText(message.text)).toBeInTheDocument()
    const [lateUpdateListener] = mocks.historicalListeners.get(
      ".App\\Events\\MessageUpdated"
    ) ?? []

    deliver(".App\\Events\\MessageUpdated", {
      message: { ...message, text: "Messaggio aggiornato", updatedAt: "2026-08-20T10:00:00.000Z" },
    })

    expect(await screen.findByText("Messaggio aggiornato")).toBeInTheDocument()
    expect(screen.getAllByText("Messaggio aggiornato")).toHaveLength(1)
    expect(mocks.updateCachedMessage).toHaveBeenCalledOnce()

    unmount()
    act(() =>
      lateUpdateListener?.({
        message: { ...message, text: "Aggiornamento tardivo", updatedAt: "2026-08-20T11:00:00.000Z" },
      })
    )

    expect(mocks.updateCachedMessage).toHaveBeenCalledOnce()
  })

  it("updates a loaded message and removes it after a remote delete", async () => {
    mocks.listMessages.mockResolvedValueOnce({
      success: true,
      data: [{ ...message, deletedAt: null }],
      timestamp: "2026-08-20T09:00:00.000000Z",
      message: null,
      code: 200,
      pagination: { nextCursor: null, previousCursor: null, hasMorePages: false, perPage: 20 },
    })
    renderChatPage()

    expect(await screen.findByText(message.text)).toBeInTheDocument()
    deliver(".App\\Events\\MessageUpdated", {
      message: { ...message, text: "Update stale", updatedAt: "2026-08-20T08:00:00.000000Z" },
    })
    expect(screen.queryByText("Update stale")).not.toBeInTheDocument()
    deliver(".App\\Events\\MessageUpdated", {
      message: { ...message, text: "Messaggio aggiornato", updatedAt: "2026-08-20T10:00:00.000000Z" },
    })

    expect(await screen.findByText("Messaggio aggiornato")).toBeInTheDocument()
    deliver(".App\\Events\\MessageDeleted", { messageId: message.id })

    await waitFor(() => expect(screen.queryByText("Messaggio aggiornato")).not.toBeInTheDocument())
  })

  it("keeps one bubble when a refetch promotes a live message into an HTTP page", async () => {
    const { client } = renderChatPage()

    await waitFor(() => expect(mocks.privateChannel).toHaveBeenCalledWith("chat"))
    deliver(".App\\Events\\MessageCreated", { message })
    expect(await screen.findByText(message.text)).toBeInTheDocument()

    mocks.listMessages.mockResolvedValueOnce({
      success: true,
      data: [{ ...message, deletedAt: null }],
      timestamp: "2026-08-20T09:00:00.000000Z",
      message: null,
      code: 200,
      pagination: { nextCursor: null, previousCursor: null, hasMorePages: false, perPage: 20 },
    })
    await act(async () => {
      await client.refetchQueries({ queryKey: ["messages", "list"] })
    })

    expect(screen.getAllByText(message.text)).toHaveLength(1)
  })

  it("resolves the optimistic create and its broadcast to one canonical bubble", async () => {
    let resolveCreate: (value: typeof message & { deletedAt: null }) => void
    mocks.createMessage.mockReturnValue(
      new Promise<typeof message & { deletedAt: null }>((resolve) => {
        resolveCreate = resolve
      })
    )
    renderChatPage()

    fireEvent.change(screen.getByRole("textbox", { name: "New message" }), {
      target: { value: message.text },
    })
    fireEvent.click(screen.getByRole("button", { name: "Send message" }))
    expect(await screen.findByText("Sending...")).toBeInTheDocument()

    deliver(".App\\Events\\MessageCreated", { message })
    await act(async () => {
      resolveCreate({ ...message, deletedAt: null })
    })

    await waitFor(() => expect(screen.getAllByText(message.text)).toHaveLength(1))
  })

  it("keeps one canonical bubble when the create response arrives before its broadcast", async () => {
    let resolveCreate: (value: typeof message & { deletedAt: null }) => void
    mocks.createMessage.mockReturnValue(
      new Promise<typeof message & { deletedAt: null }>((resolve) => {
        resolveCreate = resolve
      })
    )
    renderChatPage()

    fireEvent.change(screen.getByRole("textbox", { name: "New message" }), {
      target: { value: message.text },
    })
    fireEvent.click(screen.getByRole("button", { name: "Send message" }))
    expect(await screen.findByText("Sending...")).toBeInTheDocument()

    await act(async () => {
      resolveCreate({ ...message, deletedAt: null })
    })
    expect(await screen.findByText(message.text)).toBeInTheDocument()

    deliver(".App\\Events\\MessageCreated", { message })

    await waitFor(() => expect(screen.getAllByText(message.text)).toHaveLength(1))
  })

  it("ignores a valid realtime payload whose timestamps cannot form a UI message", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    renderChatPage()

    await waitFor(() => expect(mocks.privateChannel).toHaveBeenCalledWith("chat"))
    deliver(".App\\Events\\MessageCreated", {
      message: { ...message, createdAt: null, updatedAt: null },
    })

    expect(screen.queryByText(message.text)).not.toBeInTheDocument()
    expect(consoleError).toHaveBeenCalledWith(
      "Ignoring realtime message with missing timestamps.",
      { ...message, createdAt: null, updatedAt: null }
    )
  })
})
