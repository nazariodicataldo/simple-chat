import Link from "next/link"

export function SessionError() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <section className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <p role="alert" className="text-sm text-destructive dark:text-red-400">
          Unable to verify your session. <Link className="underline" href="/">Try again</Link>
        </p>
      </section>
    </main>
  )
}
