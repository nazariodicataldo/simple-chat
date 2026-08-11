import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { LogoutButton } from "@/components/auth/logout-button"

const mutation = { mutate: vi.fn(), isPending: false }

vi.mock("@/app/features/auth/auth.queries", () => ({
  useLogoutMutation: () => mutation,
}))

describe("LogoutButton", () => {
  it("starts the logout mutation when activated", () => {
    render(<LogoutButton />)

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }))

    expect(mutation.mutate).toHaveBeenCalledOnce()
  })
})
