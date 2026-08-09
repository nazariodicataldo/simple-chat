import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createMessage,
  deleteMessage,
  getMessage,
  listMessages,
  updateMessage,
} from "./message.service"
import type { CreateMessageInput, UpdateMessageInput } from "./message.type"

export const messageKeys = {
  all: ["messages"] as const,
  lists: () => [...messageKeys.all, "list"] as const,
  details: () => [...messageKeys.all, "detail"] as const,
  detail: (id: number) => [...messageKeys.details(), id] as const,
}

export function useMessagesQuery() {
  return useQuery({
    queryKey: messageKeys.lists(),
    queryFn: listMessages,
  })
}

export function useMessageQuery(id: number) {
  return useQuery({
    queryKey: messageKeys.detail(id),
    queryFn: () => getMessage(id),
  })
}

export function useCreateMessageMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateMessageInput) => createMessage(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: messageKeys.lists() }),
  })
}

export function useUpdateMessageMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateMessageInput }) =>
      updateMessage(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: messageKeys.lists() }),
  })
}

export function useDeleteMessageMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteMessage(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: messageKeys.lists() }),
  })
}
