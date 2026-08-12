import Link from "next/link"

import { AuthForms } from "./auth-forms"

export function AuthGate({ initialError }: { initialError?: string | null }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <section className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm" aria-label="Authentication">
        {initialError ? <p role="alert" className="mb-4 text-sm text-destructive dark:text-red-400">{initialError} <Link className="underline" href="/">Try again</Link></p> : null}
        <AuthForms />
      </section>
    </main>
  )
}
