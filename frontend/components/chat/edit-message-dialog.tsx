"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { createMessageSchema } from "@/app/features/messages/message.schema"
import type { CreateMessageInput, Message } from "@/app/features/messages/message.type"

type EditMessageDialogProps = {
  message: Message | null
  pending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (
    values: CreateMessageInput,
    setServerError: (message: string) => void
  ) => void
}

export function EditMessageDialog({
  message,
  pending,
  onOpenChange,
  onSubmit,
}: EditMessageDialogProps) {
  const form = useForm<CreateMessageInput>({
    defaultValues: { text: "" },
    resolver: zodResolver(createMessageSchema),
  })
  const text = useWatch({ control: form.control, name: "text" }) ?? ""
  const textField = form.register("text")

  useEffect(() => {
    if (message) form.reset({ text: message.text })
  }, [form, message])

  return (
    <Dialog open={Boolean(message)} onOpenChange={onOpenChange}>
      <DialogContent closeDisabled={pending}>
        <DialogHeader>
          <DialogTitle>Edit message</DialogTitle>
          <DialogDescription>Update your message below.</DialogDescription>
        </DialogHeader>
        {message ? (
          <form
            className="mt-4"
            onSubmit={form.handleSubmit((values) =>
              onSubmit(values, (message) =>
                form.setError("text", { type: "server", message })
              )
            )}
          >
            <p className="mb-3 rounded-md bg-muted p-3 text-sm" aria-label="Original message">
              {message.text}
            </p>
            <label htmlFor="edit-message-text" className="sr-only">
              Message text
            </label>
            <Textarea
              id="edit-message-text"
              maxLength={300}
              aria-invalid={Boolean(form.formState.errors.text)}
              {...textField}
              onChange={(event) => {
                if (form.formState.errors.text?.type === "server") {
                  form.clearErrors("text")
                }
                textField.onChange(event)
              }}
            />
            {form.formState.errors.text ? (
              <p role="alert" className="mt-2 text-sm text-destructive dark:text-red-400">
                {form.formState.errors.text.message}
              </p>
            ) : null}
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={!text.trim() || pending}>
                Save
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
