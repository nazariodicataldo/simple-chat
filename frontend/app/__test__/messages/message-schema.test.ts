import { describe, expect, it } from "vitest"

import { createMessageSchema } from "@/app/features/messages/message.schema"

describe("createMessageSchema", () => {
  it("accepts a non-empty message up to 300 characters", () => {
    expect(createMessageSchema.safeParse({ text: "Hello" }).success).toBe(true)
    expect(
      createMessageSchema.safeParse({ text: "a".repeat(300) }).success
    ).toBe(true)
  })

  it("rejects blank messages and messages over 300 characters", () => {
    expect(createMessageSchema.safeParse({ text: "   " }).success).toBe(false)
    expect(
      createMessageSchema.safeParse({ text: "a".repeat(301) }).success
    ).toBe(false)
  })
})
