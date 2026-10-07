import { describe, expect, it } from "vitest"

import { createStrongPassword, createStrongPasswords } from "./test-data"

describe("E2E credentials", () => {
  it("creates a password with all production complexity classes", () => {
    const password = createStrongPassword()

    expect(password).toMatch(/[a-z]/)
    expect(password).toMatch(/[A-Z]/)
    expect(password).toMatch(/[0-9]/)
    expect(password).toMatch(/[^a-zA-Z0-9]/)
    expect(password.length).toBeGreaterThanOrEqual(32)
  })

  it("does not reuse a generated password", () => {
    const [first, second] = createStrongPasswords(2)

    expect(first).not.toBe(second)
  })
})
