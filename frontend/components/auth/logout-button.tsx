"use client"

import { useLogoutMutation } from "@/app/features/auth/auth.queries"
import { Button } from "@/components/ui/button"

export function LogoutButton() {
  const mutation = useLogoutMutation()

  return (
    <Button type="button" variant="outline" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
      {mutation.isPending ? "Signing out..." : "Sign out"}
    </Button>
  )
}
