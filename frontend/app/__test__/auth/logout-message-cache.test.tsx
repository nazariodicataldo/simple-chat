import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, renderHook, screen, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Message, MessageListResponse, MessageUser } from "@/app/features/messages/message.type"

const mocks = vi.hoisted(() => ({
  listMessages: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock("@/app/features/auth/auth.service", () => ({
  currentUser: vi.fn(),
  login: vi.fn(),
  logout: mocks.logout,
  register: vi.fn(),
}))

vi.mock("@/app/features/messages/message.service", () => ({
  createMessage: vi.fn(),
  deleteMessage: vi.fn(),
  getMessage: vi.fn(),
  listMessages: mocks.listMessages,
  updateMessage: vi.fn(),
}))

vi.mock("@/app/features/messages/realtime/use-message-realtime", () => ({
  useMessageRealtime: vi.fn(),
}))

vi.mock("@/components/auth/logout-button", () => ({
  LogoutButton: () => null,
}))

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }))

import { useLogoutMutation } from "@/app/features/auth/auth.queries"
import { messageKeys } from "@/app/features/messages/message.queries"
import { ChatPage } from "@/components/chat/chat-page"

const currentUser: MessageUser = {
  id: 7,
  firstName: "Ada",
  lastName: "Lovelace",
  username: "ada",
}

function message(text: string): Message {
  return {
    id: 42,
    userId: currentUser.id,
    text,
    createdAt: "2026-08-26T14:00:00.000000Z",
    updatedAt: "2026-08-26T14:00:00.000000Z",
    deletedAt: null,
    user: currentUser,
  }
}

function response(data: Message[]): MessageListResponse {
  return {
    success: true,
    data,
    timestamp: "2026-08-26T14:00:00.000000Z",
    message: null,
    code: 200,
    pagination: { nextCursor: null, previousCursor: null, hasMorePages: false, perPage: 20 },
  }
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("logout message cache", () => {
  beforeEach(() => {
    mocks.listMessages.mockReset()
    mocks.logout.mockReset()
    mocks.refresh.mockReset()
  })

  it("does not render messages from the logged-out session before the current GET resolves", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const previous = message("Messaggio sessione precedente")
    const current = message("Messaggio sessione corrente")
    let resolveMessages: (value: MessageListResponse) => void

    queryClient.setQueryData(messageKeys.lists(), {
      pages: [response([previous])],
      pageParams: [{}],
    })
    mocks.logout.mockResolvedValue(undefined)

    const { result } = renderHook(() => useLogoutMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(() => result.current.mutateAsync())
    mocks.listMessages.mockImplementation(
      () => new Promise<MessageListResponse>((resolve) => {
        resolveMessages = resolve
      })
    )

    render(
      <QueryClientProvider client={queryClient}>
        <ChatPage currentUser={currentUser} />
      </QueryClientProvider>
    )

    await waitFor(() => expect(mocks.listMessages).toHaveBeenCalledOnce())

    expect(screen.queryByText(previous.text)).not.toBeInTheDocument()

    await act(async () => resolveMessages(response([current])))

    expect(await screen.findByText(current.text)).toBeInTheDocument()
  })
})
