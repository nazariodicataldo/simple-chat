"use client"

import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import type { FieldValues, Path, UseFormRegister } from "react-hook-form"

import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type PasswordFieldProps<T extends FieldValues> = {
  name: Path<T>
  label: string
  register: UseFormRegister<T>
  error?: string
}

export function PasswordField<T extends FieldValues>({
  name,
  label,
  register,
  error,
}: PasswordFieldProps<T>) {
  const [visible, setVisible] = useState(false)

  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <div className="relative">
        <Input
          id={name}
          type={visible ? "text" : "password"}
          aria-label={label}
          aria-invalid={Boolean(error)}
          className="pr-11"
          {...register(name)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute inset-y-0 right-0"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
        </Button>
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  )
}
