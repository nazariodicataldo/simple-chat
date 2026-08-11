"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import {
  loginSchema,
  type LoginFormValues,
} from "@/app/features/auth/auth.schema"
import { useLoginMutation } from "@/app/features/auth/auth.queries"
import { AuthApiError } from "@/app/features/auth/auth.type"
import { Button } from "@/components/ui/button"

import { AuthField } from "./auth-field"
import { PasswordField } from "./password-field"

export function LoginForm({
  active,
  onRegister,
}: {
  active: boolean
  onRegister: () => void
}) {
  const form = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })
  const mutation = useLoginMutation()
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
      <h2 className="text-2xl font-semibold">Welcome back</h2>
      <p className="text-sm text-muted-foreground">
        Sign in to continue to the group chat.
      </p>
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
      {error ? (
        <p role="alert" className="text-sm text-destructive dark:text-red-400">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? "Signing in..." : "Sign in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <button type="button" className="underline" onClick={onRegister}>
          Create an account
        </button>
      </p>
    </form>
  )
}
