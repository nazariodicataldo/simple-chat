import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { Chat } from "@/components/chat/chat"

describe("Chat", () => {
  it("mounts with a loading status while messages load", () => {
    const { container } = render(
      <Chat isError={false} isPending messages={[]} onRetry={vi.fn()} />
    )

    expect(screen.getByRole("status")).toHaveTextContent("Loading messages...")
    expect(container.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(0)
  })

  it("shows an empty state when the chat has no messages", () => {
    render(
      <Chat isError={false} isPending={false} messages={[]} onRetry={vi.fn()} />
    )

    expect(screen.getByText("No messages yet.")).toBeInTheDocument()
  })

  it("offers a retry action when loading messages fails", () => {
    const onRetry = vi.fn()

    render(
      <Chat isError isPending={false} messages={[]} onRetry={onRetry} />
    )

    screen.getByRole("button", { name: "Try again" }).click()

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("renders author initials and aligns the current user's messages", () => {
    render(
      <Chat
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
            author: {
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
})
