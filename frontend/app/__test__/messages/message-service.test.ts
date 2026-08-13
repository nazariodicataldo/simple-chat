import { describe, expect, it, vi } from "vitest"

const { get, put, del } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), del: vi.fn() }))

vi.mock("@/lib/http", () => ({ http: { get, put, delete: del } }))

import { deleteMessage, listMessages, updateMessage } from "@/app/features/messages/message.service"

describe("listMessages", () => {
  it("returns the Laravel envelope and sends the cursor query params", async () => {
    const response = {
      success: true,
      data: [],
      timestamp: "2026-08-12 10:00:00",
      message: null,
      code: 200,
      pagination: {
        nextCursor: "next-cursor",
        previousCursor: null,
        hasMorePages: true,
        perPage: 20,
      },
    }
    get.mockResolvedValue({ data: response })

    await expect(listMessages({ cursor: "current-cursor" })).resolves.toEqual(response)
    expect(get).toHaveBeenCalledWith("/api/messages", {
      params: { cursor: "current-cursor" },
    })
  })
})

describe("message mutations", () => {
  it("updates a message through its public HTTP contract", async () => {
    const message = { id: 21, text: "Updated message" }
    put.mockResolvedValue({ data: { data: message } })

    await expect(updateMessage(21, { text: "Updated message" })).resolves.toEqual(message)
    expect(put).toHaveBeenCalledWith("/api/messages/21", { text: "Updated message" })
  })

  it("deletes a message through its public HTTP contract", async () => {
    del.mockResolvedValue({ status: 204 })

    await expect(deleteMessage(21)).resolves.toBeUndefined()
    expect(del).toHaveBeenCalledWith("/api/messages/21")
  })
})
