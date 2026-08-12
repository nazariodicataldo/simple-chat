import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { Chat } from "@/components/chat/chat"
import { ChatForm } from "@/components/chat/chat-form"

const currentUser = { id: 1, firstName: "Felix", lastName: "Miller", username: "felix" }
const chatProps = {
  currentUser,
  hasNextPage: false,
  isFetchingNextPage: false,
  isFetchNextPageError: false,
  onLoadMore: vi.fn(),
  onRetryMessage: vi.fn(),
}

describe("Chat", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("submits an optimistic message when crypto.randomUUID is unavailable", async () => {
    const onSubmitMessage = vi.fn()
    vi.stubGlobal("crypto", {})

    render(<ChatForm currentUser={currentUser} onSubmitMessage={onSubmitMessage} />)

    fireEvent.change(screen.getByRole("textbox", { name: "New message" }), {
      target: { value: "Hello from a compatible browser" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Send message" }))

    await waitFor(() => {
      expect(onSubmitMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          text: "Hello from a compatible browser",
          deliveryStatus: "sending",
        })
      )
    })
  })

  it("mounts with a loading status while messages load", () => {
    const { container } = render(
      <Chat {...chatProps} isError={false} isPending messages={[]} onRetry={vi.fn()} />
    )

    expect(screen.getByRole("status")).toHaveTextContent("Loading messages...")
    expect(container.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(0)
  })

  it("shows an empty state when the chat has no messages", () => {
    render(
      <Chat {...chatProps} isError={false} isPending={false} messages={[]} onRetry={vi.fn()} />
    )

    expect(screen.getByText("No messages yet.")).toBeInTheDocument()
  })

  it("offers a retry action when loading messages fails", () => {
    const onRetry = vi.fn()

    render(
      <Chat {...chatProps} isError isPending={false} messages={[]} onRetry={onRetry} />
    )

    screen.getByRole("button", { name: "Try again" }).click()

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("renders author initials and aligns the current user's messages", () => {
    render(
      <Chat
        {...chatProps}
        isError={false}
        isPending={false}
        messages={[
          {
            id: 1,
            userId: 1,
            text: "Hello, everyone!",
            createdAt: "2026-08-07T10:00:00.000000Z",
            updatedAt: "2026-08-07T10:00:00.000000Z",
            deletedAt: null,
            user: {
              id: 1,
              firstName: "Felix",
              lastName: "Miller",
              username: "felix",
            },
          },
        ]}
        onRetry={vi.fn()}
      />
    )

    expect(screen.getByText("Hello, everyone!")).toBeInTheDocument()
    expect(screen.getByText("Felix Miller")).toBeInTheDocument()
    expect(screen.getByText("FM")).toBeInTheDocument()
    expect(screen.getByLabelText(/message from felix miller/i)).toHaveAttribute(
      "data-align",
      "end"
    )
    expect(
      screen.getByText("Hello, everyone!").closest("[data-slot='bubble']")
    ).toHaveAttribute("data-variant", "default")
  })

  it("announces optimistic sending and offers a retry for a failed message", () => {
    const onRetryMessage = vi.fn()
    const failedMessage = {
      id: "temporary-message",
      userId: 1,
      text: "Will retry",
      createdAt: "2026-08-12T10:00:00.000Z",
      updatedAt: "2026-08-12T10:00:00.000Z",
      deletedAt: null,
      user: currentUser,
      deliveryStatus: "failed" as const,
    }

    const { rerender } = render(
      <Chat {...chatProps} onRetryMessage={onRetryMessage} isError={false} isPending={false} messages={[{ ...failedMessage, deliveryStatus: "sending" }]} onRetry={vi.fn()} />
    )

    expect(screen.getByRole("status")).toHaveTextContent("Sending...")

    rerender(
      <Chat {...chatProps} onRetryMessage={onRetryMessage} isError={false} isPending={false} messages={[failedMessage]} onRetry={vi.fn()} />
    )

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to send the message.")
    screen.getByRole("button", { name: "Try again" }).click()
    expect(onRetryMessage).toHaveBeenCalledWith(failedMessage)
  })

  it("loads one next page for an observed sentinel and waits for explicit retry after an error", () => {
    const onLoadMore = vi.fn()
    const observerCallbacks: IntersectionObserverCallback[] = []

    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: IntersectionObserverCallback) {
        observerCallbacks.push(callback)
      }

      disconnect() {}
      observe() {}
      unobserve() {}
      takeRecords() { return [] }
    })

    const { rerender } = render(
      <Chat
        {...chatProps}
        hasNextPage
        isError={false}
        isPending={false}
        messages={[]}
        onLoadMore={onLoadMore}
        onRetry={vi.fn()}
      />
    )

    observerCallbacks[0]([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    observerCallbacks[0]([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)

    expect(onLoadMore).toHaveBeenCalledOnce()

    rerender(
      <Chat
        {...chatProps}
        hasNextPage
        isFetchNextPageError
        isError={false}
        isPending={false}
        messages={[]}
        onLoadMore={onLoadMore}
        onRetry={vi.fn()}
      />
    )

    expect(observerCallbacks).toHaveLength(1)
    screen.getByRole("button", { name: "Try again" }).click()
    expect(onLoadMore).toHaveBeenCalledTimes(2)
  })
})
