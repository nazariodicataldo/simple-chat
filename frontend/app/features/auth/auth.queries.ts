"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

import { messageKeys } from "../messages/message.queries"
import { currentUser, login, logout, register } from "./auth.service"
import type { AuthUser, LoginInput, RegisterInput } from "./auth.type"

export const authQueryKey = ["auth", "user"] as const

export function useCurrentUserQuery() {
  return useQuery<AuthUser | null>({
    queryKey: authQueryKey,
    queryFn: currentUser,
  })
}

function useAuthMutation<TInput>(
  mutationFn: (input: TInput) => Promise<AuthUser>
) {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn,
    onSuccess: async (user) => {
      queryClient.setQueryData(authQueryKey, user)
      await queryClient.invalidateQueries({ queryKey: authQueryKey })
      router.refresh()
    },
  })
}

export function useLoginMutation() {
  return useAuthMutation<LoginInput>(login)
}

export function useRegisterMutation() {
  return useAuthMutation<RegisterInput>(register)
}

export function useLogoutMutation() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      queryClient.setQueryData(authQueryKey, null)
      await queryClient.cancelQueries({ queryKey: messageKeys.all })
      queryClient.removeQueries({ queryKey: messageKeys.all })
      await queryClient.invalidateQueries({ queryKey: authQueryKey })
      router.refresh()
    },
  })
}
