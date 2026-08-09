"use client"

import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useCreateMessageMutation } from "@/app/features/messages/message.queries"
import { createMessageSchema } from "@/app/features/messages/message.schema"
import type { CreateMessageInput } from "@/app/features/messages/message.type"

export function ChatForm() {
  const createMessage = useCreateMessageMutation()
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
    createMessage.mutate(
      { text: values.text.trim() },
      {
        onSuccess: () => reset(),
      }
    )
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
        disabled={createMessage.isPending}
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
        <Button type="submit" disabled={createMessage.isPending}>
          {createMessage.isPending ? "Sending..." : "Send message"}
        </Button>
      </div>
      {errors.text ? (
        <p
          id="message-text-error"
          role="alert"
          className="mt-3 text-sm text-destructive"
        >
          {errors.text.message}
        </p>
      ) : null}
      {createMessage.isError ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          Unable to send your message. Please try again.
        </p>
      ) : null}
    </form>
  )
}
