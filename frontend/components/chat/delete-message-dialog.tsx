"use client"

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
import type { Message } from "@/app/features/messages/message.type"

type DeleteMessageDialogProps = {
  message: Message | null
  pending: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DeleteMessageDialog({
  message,
  pending,
  onOpenChange,
  onConfirm,
}: DeleteMessageDialogProps) {
  return (
    <Dialog open={Boolean(message)} onOpenChange={onOpenChange}>
      <DialogContent closeDisabled={pending}>
        <DialogHeader>
          <DialogTitle>Delete message</DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        {message ? (
          <p className="mt-4 rounded-md bg-muted p-3 text-sm">{message.text}</p>
        ) : null}
        <DialogFooter>
          <DialogClose
            render={
              <Button type="button" variant="outline" disabled={pending} />
            }
          >
            Cancel
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            className={"dark:text-red-400"}
            disabled={pending}
            onClick={onConfirm}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
