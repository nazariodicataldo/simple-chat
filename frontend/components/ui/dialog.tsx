"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Dialog(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogContent({
  className,
  children,
  closeDisabled = false,
  ...props
}: DialogPrimitive.Popup.Props & { closeDisabled?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50" />
      <DialogPrimitive.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <DialogPrimitive.Popup data-slot="dialog-content" className={cn("relative w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg outline-none", className)} {...props}>
          {children}
          <DialogPrimitive.Close aria-label="Close dialog" disabled={closeDisabled} className="absolute top-4 right-4 rounded-sm opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <XIcon className="size-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("space-y-2", className)} {...props} /> }
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("mt-6 flex justify-end gap-2", className)} {...props} /> }
function DialogTitle(props: DialogPrimitive.Title.Props) { return <DialogPrimitive.Title className="text-lg font-semibold" {...props} /> }
function DialogDescription(props: DialogPrimitive.Description.Props) { return <DialogPrimitive.Description className="text-sm text-muted-foreground" {...props} /> }
function DialogClose(props: DialogPrimitive.Close.Props) { return <DialogPrimitive.Close {...props} /> }

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle }
