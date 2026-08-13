import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva("relative w-full rounded-md border px-4 py-3 text-sm", { variants: { variant: { default: "bg-background text-foreground", destructive: "border-destructive/50 text-destructive dark:border-destructive dark:text-red-400" } }, defaultVariants: { variant: "default" } })

function Alert({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) { return <div role="alert" data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} /> }
function AlertTitle({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("font-medium", className)} {...props} /> }
function AlertDescription({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("mt-1 text-sm", className)} {...props} /> }

export { Alert, AlertDescription, AlertTitle }
