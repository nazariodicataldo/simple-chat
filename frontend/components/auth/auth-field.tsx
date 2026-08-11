import type { FieldValues, Path, UseFormRegister } from "react-hook-form"

import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type AuthFieldProps<T extends FieldValues> = {
  name: Path<T>
  label: string
  register: UseFormRegister<T>
  error?: string
  type?: "email" | "text"
}

export function AuthField<T extends FieldValues>({
  name,
  label,
  register,
  error,
  type = "text",
}: AuthFieldProps<T>) {
  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input id={name} type={type} aria-label={label} aria-invalid={Boolean(error)} {...register(name)} />
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  )
}
