import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

function Field({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="field" className={cn("grid gap-2", className)} {...props} />
}

function FieldLabel({ className, ...props }: ComponentProps<"label">) {
  return <label data-slot="field-label" className={cn("text-sm font-medium", className)} {...props} />
}

function FieldError({ className, ...props }: ComponentProps<"p">) {
  return <p data-slot="field-error" className={cn("text-sm text-destructive dark:text-red-400", className)} {...props} />
}

export { Field, FieldError, FieldLabel }
