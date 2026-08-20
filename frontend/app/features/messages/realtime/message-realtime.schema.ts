import { z } from "zod"

const positiveInteger = z.number().int().positive()
const realtimeDate = z.iso.datetime({ offset: true }).nullable()

const realtimeMessageUserSchema = z.object({
  id: positiveInteger,
  firstName: z.string(),
  lastName: z.string(),
  username: z.string(),
})

export const realtimeMessageSchema = z.object({
  id: positiveInteger,
  userId: positiveInteger,
  text: z.string(),
  createdAt: realtimeDate,
  updatedAt: realtimeDate,
  user: realtimeMessageUserSchema,
})

export const messageEventPayloadSchema = z.object({
  message: realtimeMessageSchema,
})

export const messageDeletedEventPayloadSchema = z.object({
  messageId: positiveInteger,
})

export type RealtimeMessage = z.infer<typeof realtimeMessageSchema>
