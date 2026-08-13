"use client"

import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createMessageSchema } from "@/app/features/messages/message.schema"
import type { CreateMessageInput } from "@/app/features/messages/message.type"
import type { LocalMessage, MessageUser } from "@/app/features/messages/message.type"

type ChatFormProps = {
  currentUser: MessageUser
  onSubmitMessage: (message: LocalMessage) => void
}

function createTemporaryMessageId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `temporary-${Date.now()}-${Math.random().toString(36).slice(2)}`
  )
}

export function ChatForm({ currentUser, onSubmitMessage }: ChatFormProps) {
  const {
    handleSubmit,
    register,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateMessageInput>({
    defaultValues: { text: "" },
    resolver: zodResolver(createMessageSchema),
  })
  const text = useWatch({ control, name: "text" }) ?? ""

  function submit(values: CreateMessageInput) {
    const temporaryId = createTemporaryMessageId()
    const message: LocalMessage = {
      id: temporaryId,
      userId: currentUser.id,
      text: values.text.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      user: currentUser,
      deliveryStatus: "sending",
    }

    onSubmitMessage(message)
    reset()
  }

  return (
    <form className="border-t p-4" onSubmit={handleSubmit(submit)}>
      <label htmlFor="message-text" className="sr-only">
        New message
      </label>
      <Textarea
        id="message-text"
        placeholder="Write a message"
        maxLength={300}
        aria-describedby={
          errors.text
            ? "message-text-count message-text-error"
            : "message-text-count"
        }
        aria-invalid={Boolean(errors.text)}
        {...register("text")}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p id="message-text-count" className="text-xs text-muted-foreground">
          {text.length}/300
        </p>
        <Button type="submit" disabled={!text.trim()}>
          Send message
        </Button>
      </div>
      {errors.text ? (
        <p
          id="message-text-error"
          role="alert"
          className="mt-3 text-sm text-destructive dark:text-red-400"
        >
          {errors.text.message}
        </p>
      ) : null}
    </form>
  )
}
