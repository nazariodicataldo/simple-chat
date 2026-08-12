import { type InfiniteData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createMessage,
  deleteMessage,
  getMessage,
  listMessages,
  updateMessage,
} from "./message.service"
import type { CreateMessageInput, MessageListQueryParams, MessageListResponse, UpdateMessageInput } from "./message.type"

export const messageKeys = {
  all: ["messages"] as const,
  lists: () => [...messageKeys.all, "list"] as const,
  details: () => [...messageKeys.all, "detail"] as const,
  detail: (id: number) => [...messageKeys.details(), id] as const,
}

export function getNextMessagePageParam(lastPage: Awaited<ReturnType<typeof listMessages>>) {
  return lastPage.pagination.hasMorePages && lastPage.pagination.nextCursor
    ? { cursor: lastPage.pagination.nextCursor }
    : undefined
}

export function useMessagesQuery() {
  return useInfiniteQuery<
    MessageListResponse,
    Error,
    InfiniteData<MessageListResponse>,
    ReturnType<typeof messageKeys.lists>,
    MessageListQueryParams
  >({
    queryKey: messageKeys.lists(),
    initialPageParam: {} as MessageListQueryParams,
    queryFn: ({ pageParam }) => listMessages(pageParam),
    getNextPageParam: getNextMessagePageParam,
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
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: messageKeys.lists(),
        refetchType: "none",
      }),
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
