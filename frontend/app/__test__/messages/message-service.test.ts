import { describe, expect, it, vi } from "vitest"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock("@/lib/http", () => ({ http: { get } }))

import { listMessages } from "@/app/features/messages/message.service"

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
