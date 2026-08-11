import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { AuthGate } from "@/components/auth/auth-gate"

const loginMutation: { mutate: ReturnType<typeof vi.fn>; isPending: boolean; error: Error | null } = {
  mutate: vi.fn(),
  isPending: false,
  error: null,
}
const registerMutation = { mutate: vi.fn(), isPending: false, error: null }

vi.mock("@/app/features/auth/auth.queries", () => ({
  useLoginMutation: () => loginMutation,
  useRegisterMutation: () => registerMutation,
}))

function visibleForm() {
  return screen.getByRole("heading", { name: "Welcome back" }).closest("form")!
}

function registerForm() {
  return screen.getByRole("heading", { name: "Create an account", hidden: true }).closest("form")!
}

describe("AuthGate", () => {
  it("starts at login and switches to register without a request", () => {
    render(<AuthGate />)
    const login = visibleForm()
    const register = registerForm()

    expect(login).not.toHaveAttribute("hidden")
    expect(register).toHaveAttribute("hidden")
    fireEvent.click(screen.getByRole("button", { name: "Create an account" }))

    expect(login).toHaveAttribute("hidden")
    expect(register).not.toHaveAttribute("hidden")
    expect(loginMutation.mutate).not.toHaveBeenCalled()
    expect(registerMutation.mutate).not.toHaveBeenCalled()
  })

  it("validates login, submits the exact payload, and toggles password visibility", async () => {
    render(<AuthGate />)
    const form = visibleForm()
    const email = within(form).getByLabelText("Email")
    const password = within(form).getByLabelText("Password")

    fireEvent.click(within(form).getByRole("button", { name: "Sign in" }))
    expect(await within(form).findByText("Enter a valid email address.")).toBeInTheDocument()

    fireEvent.change(email, { target: { value: "user@example.com" } })
    fireEvent.change(password, { target: { value: "secret-password" } })
    fireEvent.click(within(form).getByRole("button", { name: "Show password" }))
    expect(password).toHaveAttribute("type", "text")
    fireEvent.click(within(form).getByRole("button", { name: "Hide password" }))
    expect(password).toHaveAttribute("type", "password")
    fireEvent.click(within(form).getByRole("button", { name: "Sign in" }))

    await waitFor(() =>
      expect(loginMutation.mutate).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "secret-password",
      })
    )
  })

  it("keeps register form values camelCase before the service call", async () => {
    render(<AuthGate />)
    fireEvent.click(screen.getByRole("button", { name: "Create an account" }))
    const form = registerForm()

    fireEvent.change(within(form).getByRole("textbox", { name: "First name" }), { target: { value: "Ada" } })
    fireEvent.change(within(form).getByRole("textbox", { name: "Last name" }), { target: { value: "Lovelace" } })
    fireEvent.change(within(form).getByRole("textbox", { name: "Username" }), { target: { value: "ada" } })
    fireEvent.change(within(form).getByRole("textbox", { name: "Email" }), { target: { value: "ada@example.com" } })
    fireEvent.change(within(form).getByLabelText("Password"), { target: { value: "secret-password" } })
    fireEvent.change(within(form).getByLabelText("Confirm password"), { target: { value: "secret-password" } })
    fireEvent.click(within(form).getByRole("button", { name: "Create account" }))

    await waitFor(() =>
      expect(registerMutation.mutate).toHaveBeenCalledWith({
        firstName: "Ada",
        lastName: "Lovelace",
        username: "ada",
        email: "ada@example.com",
        password: "secret-password",
        passwordConfirmation: "secret-password",
      })
    )
  })

  it("shows a safe error when the mutation fails without an HTTP response", () => {
    loginMutation.error = new Error("Network request failed")

    render(<AuthGate />)

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Authentication failed. Please try again."
    )
    expect(screen.queryByText("Network request failed")).not.toBeInTheDocument()

    loginMutation.error = null
  })
})
