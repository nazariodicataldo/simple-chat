import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const getCurrentUser = vi.fn()

vi.mock("@/app/features/auth/auth.server.service", () => ({ getCurrentUser }))
vi.mock("@/components/auth/auth-gate", () => ({
  AuthGate: () => <div>auth gate</div>,
}))
vi.mock("@/components/chat/chat-page", () => ({ ChatPage: () => <div>chat page</div> }))

describe("Page", () => {
  beforeEach(() => {
    getCurrentUser.mockReset()
  })

  it("renders the chat for an authenticated user", async () => {
    getCurrentUser.mockResolvedValue({ id: 1 })
    const { default: Page } = await import("@/app/page")

    render(await Page())

    expect(screen.getByText("chat page")).toBeInTheDocument()
  })

  it("renders the auth gate only for an absent session", async () => {
    getCurrentUser.mockResolvedValue(null)
    const { default: Page } = await import("@/app/page")

    render(await Page())

    expect(screen.getByText("auth gate")).toBeInTheDocument()
  })

  it("renders a retryable error for an unavailable backend", async () => {
    getCurrentUser.mockRejectedValue(new Error("backend unavailable"))
    const { default: Page } = await import("@/app/page")

    render(await Page())

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to verify your session."
    )
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute("href", "/")
  })
})
