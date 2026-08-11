"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import {
  registerSchema,
  type RegisterFormValues,
} from "@/app/features/auth/auth.schema"
import { useRegisterMutation } from "@/app/features/auth/auth.queries"
import { AuthApiError } from "@/app/features/auth/auth.type"
import { Button } from "@/components/ui/button"

import { AuthField } from "./auth-field"
import { PasswordField } from "./password-field"

export function RegisterForm({
  active,
  onLogin,
}: {
  active: boolean
  onLogin: () => void
}) {
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  })
  const mutation = useRegisterMutation()
  const error =
    mutation.error
      ? mutation.error instanceof AuthApiError
        ? mutation.error.message
        : "Authentication failed. Please try again."
      : null

  return (
    <form
      className="space-y-4"
      hidden={!active}
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      noValidate
    >
      <h2 className="text-2xl font-semibold">Create an account</h2>
      <p className="text-sm text-muted-foreground">Join the group chat.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <AuthField
          name="firstName"
          label="First name"
          register={form.register}
          error={form.formState.errors.firstName?.message}
        />
        <AuthField
          name="lastName"
          label="Last name"
          register={form.register}
          error={form.formState.errors.lastName?.message}
        />
      </div>
      <AuthField
        name="username"
        label="Username"
        register={form.register}
        error={form.formState.errors.username?.message}
      />
      <AuthField
        name="email"
        label="Email"
        type="email"
        register={form.register}
        error={form.formState.errors.email?.message}
      />
      <PasswordField
        name="password"
        label="Password"
        register={form.register}
        error={form.formState.errors.password?.message}
      />
      <PasswordField
        name="passwordConfirmation"
        label="Confirm password"
        register={form.register}
        error={form.formState.errors.passwordConfirmation?.message}
      />
      {error ? (
        <p role="alert" className="text-sm text-destructive dark:text-red-400">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? "Creating account..." : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <button type="button" className="underline" onClick={onLogin}>
          Sign in
        </button>
      </p>
    </form>
  )
}
