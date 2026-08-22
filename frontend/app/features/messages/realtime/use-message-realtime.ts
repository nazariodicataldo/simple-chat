"use client"

import { useEffect, useEffectEvent, useState } from "react"

import { getEcho } from "@/lib/echo"

import {
  messageDeletedEventPayloadSchema,
  messageEventPayloadSchema,
  type RealtimeMessage,
} from "./message-realtime.schema"

export const messageRealtimeEventNames = {
  created: ".App\\Events\\MessageCreated",
  updated: ".App\\Events\\MessageUpdated",
  deleted: ".App\\Events\\MessageDeleted",
} as const

export type MessageRealtimeEvent =
  | { type: "created"; message: RealtimeMessage }
  | { type: "updated"; message: RealtimeMessage }
  | { type: "deleted"; messageId: number }

function reportInvalidPayload(payload: unknown, error: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.error("Invalid realtime message event payload.", payload, error)
  }
}

function parseMessageEvent(
  type: "created" | "updated",
  payload: unknown
): MessageRealtimeEvent | null {
  const result = messageEventPayloadSchema.safeParse(payload)
  if (!result.success) {
    reportInvalidPayload(payload, result.error)
    return null
  }

  return { type, message: result.data.message }
}

function parseDeletedEvent(payload: unknown): MessageRealtimeEvent | null {
  const result = messageDeletedEventPayloadSchema.safeParse(payload)
  if (!result.success) {
    reportInvalidPayload(payload, result.error)
    return null
  }

  return { type: "deleted", messageId: result.data.messageId }
}

export function useMessageRealtime(
  onEvent?: (event: MessageRealtimeEvent) => void
): {
  lastEvent: MessageRealtimeEvent | null
} {
  const [lastEvent, setLastEvent] = useState<MessageRealtimeEvent | null>(null)
  const receive = useEffectEvent((event: MessageRealtimeEvent) => {
    onEvent?.(event)
    setLastEvent(event)
  })

  useEffect(() => {
    const echo = getEcho()
    const channel = echo.private("chat")

    channel.listen(messageRealtimeEventNames.created, (payload: unknown) => {
      const event = parseMessageEvent("created", payload)
      if (event) receive(event)
    })
    channel.listen(messageRealtimeEventNames.updated, (payload: unknown) => {
      const event = parseMessageEvent("updated", payload)
      if (event) receive(event)
    })
    channel.listen(messageRealtimeEventNames.deleted, (payload: unknown) => {
      const event = parseDeletedEvent(payload)
      if (event) receive(event)
    })

    return () => echo.leave("chat")
  }, [])

  return { lastEvent }
}
