import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const listeners = new Map<string, (payload: unknown) => void>()
  const channel = {
    listen: vi.fn((eventName: string, listener: (payload: unknown) => void) => {
      listeners.set(eventName, listener)
      return channel
    }),
  }

  return {
    channel,
    getEcho: vi.fn(),
    leave: vi.fn(),
    listeners,
    privateChannel: vi.fn(),
  }
})

vi.mock("@/lib/echo", () => ({ getEcho: mocks.getEcho }))

import {
  messageDeletedEventPayloadSchema,
  messageEventPayloadSchema,
} from "@/app/features/messages/realtime/message-realtime.schema"
import { useMessageRealtime } from "@/app/features/messages/realtime/use-message-realtime"

const message = {
  id: 42,
  userId: 7,
  text: "Ciao gruppo!",
  createdAt: "2026-08-20T09:00:00.000000Z",
  updatedAt: "2026-08-20T10:00:00.000000Z",
  user: {
    id: 7,
    firstName: "Ada",
    lastName: "Lovelace",
    username: "ada",
  },
}

describe("Message realtime payload schemas", () => {
  it.each([
    ["created", { message }],
    ["updated", { message: { ...message, text: "Aggiornato" } }],
  ])("accepts a valid %s payload", (_event, payload) => {
    expect(messageEventPayloadSchema.safeParse(payload).success).toBe(true)
  })

  it("accepts nullable broadcast timestamps", () => {
    expect(
      messageEventPayloadSchema.safeParse({
        message: { ...message, createdAt: null, updatedAt: null },
      }).success
    ).toBe(true)
  })

  it.each([
    ["created", { message: { ...message, text: undefined } }],
    ["updated", { message: { ...message, user: undefined } }],
  ])("rejects a %s payload with a required field missing", (_event, payload) => {
    expect(messageEventPayloadSchema.safeParse(payload).success).toBe(false)
  })

  it.each([
    ["created", { message: { ...message, id: "42" } }],
    ["updated", { message: { ...message, createdAt: "not-a-date" } }],
  ])("rejects a %s payload with an invalid transport type", (_event, payload) => {
    expect(messageEventPayloadSchema.safeParse(payload).success).toBe(false)
  })

  it("accepts a valid delete payload and rejects missing or invalid messageId", () => {
    expect(messageDeletedEventPayloadSchema.safeParse({ messageId: 42 }).success).toBe(true)
    expect(messageDeletedEventPayloadSchema.safeParse({}).success).toBe(false)
    expect(messageDeletedEventPayloadSchema.safeParse({ messageId: "42" }).success).toBe(false)
  })

  it("strips unknown fields without rejecting the payload", () => {
    const parsed = messageEventPayloadSchema.parse({
      message: { ...message, internalOnly: "do not propagate" },
      unexpectedEnvelopeField: true,
    })

    expect(parsed).toEqual({ message })
  })
})

function deliver(eventName: string, payload: unknown) {
  const listener = mocks.listeners.get(eventName)
  if (!listener) throw new Error(`Missing listener for ${eventName}`)

  act(() => listener(payload))
}

describe("useMessageRealtime", () => {
  beforeEach(() => {
    mocks.listeners.clear()
    mocks.channel.listen.mockClear()
    mocks.getEcho.mockClear()
    mocks.leave.mockClear()
    mocks.privateChannel.mockClear()
    mocks.privateChannel.mockReturnValue(mocks.channel)
    mocks.getEcho.mockReturnValue({
      leave: mocks.leave,
      private: mocks.privateChannel,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("delivers every valid event directly to its consumer", () => {
    const onEvent = vi.fn()

    renderHook(() => useMessageRealtime(onEvent))

    deliver(".App\\Events\\MessageCreated", { message })

    expect(onEvent).toHaveBeenCalledOnce()
    expect(onEvent).toHaveBeenCalledWith({ type: "created", message })
  })

  it("delivers an event to the callback supplied after a rerender", () => {
    const firstOnEvent = vi.fn()
    const secondOnEvent = vi.fn()
    const { rerender } = renderHook(
      ({ onEvent }) => useMessageRealtime(onEvent),
      { initialProps: { onEvent: firstOnEvent } }
    )

    rerender({ onEvent: secondOnEvent })
    deliver(".App\\Events\\MessageCreated", { message })

    expect(secondOnEvent).toHaveBeenCalledOnce()
    expect(secondOnEvent).toHaveBeenCalledWith({ type: "created", message })
    expect(firstOnEvent).not.toHaveBeenCalled()
  })

  it("subscribes to exactly the three Message FQCNs and normalizes valid payloads", () => {
    const { result } = renderHook(() => useMessageRealtime())

    expect(mocks.privateChannel).toHaveBeenCalledOnce()
    expect(mocks.privateChannel).toHaveBeenCalledWith("chat")
    expect(mocks.channel.listen).toHaveBeenCalledTimes(3)
    expect(mocks.channel.listen).toHaveBeenNthCalledWith(
      1,
      ".App\\Events\\MessageCreated",
      expect.any(Function)
    )
    expect(mocks.channel.listen).toHaveBeenNthCalledWith(
      2,
      ".App\\Events\\MessageUpdated",
      expect.any(Function)
    )
    expect(mocks.channel.listen).toHaveBeenNthCalledWith(
      3,
      ".App\\Events\\MessageDeleted",
      expect.any(Function)
    )

    deliver(".App\\Events\\MessageCreated", { message })
    expect(result.current.lastEvent).toEqual({ type: "created", message })

    deliver(".App\\Events\\MessageUpdated", {
      message: { ...message, text: "Aggiornato" },
    })
    expect(result.current.lastEvent).toEqual({
      type: "updated",
      message: { ...message, text: "Aggiornato" },
    })

    deliver(".App\\Events\\MessageDeleted", { messageId: 42 })
    expect(result.current.lastEvent).toEqual({ type: "deleted", messageId: 42 })
  })

  it("ignores invalid payloads without releasing the channel and keeps every listener active in development", () => {
    vi.stubEnv("NODE_ENV", "development")
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const { result } = renderHook(() => useMessageRealtime())

    deliver(".App\\Events\\MessageCreated", { message })
    for (const { eventName, invalidPayload, validPayload, expectedEvent } of [
      {
        eventName: ".App\\Events\\MessageCreated",
        invalidPayload: { message: { ...message, id: "42" } },
        validPayload: { message: { ...message, text: "Create after invalid" } },
        expectedEvent: {
          type: "created" as const,
          message: { ...message, text: "Create after invalid" },
        },
      },
      {
        eventName: ".App\\Events\\MessageUpdated",
        invalidPayload: { message: { ...message, text: undefined } },
        validPayload: { message: { ...message, text: "Update after invalid" } },
        expectedEvent: {
          type: "updated" as const,
          message: { ...message, text: "Update after invalid" },
        },
      },
      {
        eventName: ".App\\Events\\MessageDeleted",
        invalidPayload: { messageId: 0 },
        validPayload: { messageId: 42 },
        expectedEvent: { type: "deleted" as const, messageId: 42 },
      },
    ]) {
      const previousEvent = result.current.lastEvent

      deliver(eventName, invalidPayload)

      expect(result.current.lastEvent).toEqual(previousEvent)
      expect(mocks.leave).not.toHaveBeenCalled()

      deliver(eventName, validPayload)
      expect(result.current.lastEvent).toEqual(expectedEvent)
    }

    expect(consoleError).toHaveBeenCalledTimes(3)
    expect(consoleError).toHaveBeenNthCalledWith(
      1,
      "Invalid realtime message event payload.",
      { message: { ...message, id: "42" } },
      expect.anything()
    )
  })

  it("does not log invalid payloads in production", () => {
    vi.stubEnv("NODE_ENV", "production")
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const { result } = renderHook(() => useMessageRealtime())

    deliver(".App\\Events\\MessageDeleted", { messageId: "42" })

    expect(result.current.lastEvent).toBeNull()
    expect(consoleError).not.toHaveBeenCalled()
  })

  it("leaves the chat channel during ordinary effect cleanup", () => {
    const { unmount } = renderHook(() => useMessageRealtime())

    unmount()

    expect(mocks.leave).toHaveBeenCalledOnce()
    expect(mocks.leave).toHaveBeenCalledWith("chat")
  })
})
