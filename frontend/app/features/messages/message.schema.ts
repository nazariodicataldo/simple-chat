import { z } from "zod"

export const createMessageSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Write a message before sending.")
    .max(300, "Messages must be 300 characters or fewer."),
})
