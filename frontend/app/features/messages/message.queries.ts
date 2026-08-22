import { type InfiniteData, type QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createMessage,
  deleteMessage,
  getMessage,
  listMessages,
  updateMessage,
} from "./message.service"
import type { CreateMessageInput, Message, MessageListQueryParams, MessageListResponse, UpdateMessageInput } from "./message.type"

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

export function keepNewerCachedMessages(
  current: InfiniteData<MessageListResponse> | undefined,
  incoming: InfiniteData<MessageListResponse>
) {
  if (!current) return incoming

  const currentById = new Map(
    current.pages.flatMap((page) => page.data.map((message) => [message.id, message]))
  )

  return {
    ...incoming,
    pages: incoming.pages.map((page) => ({
      ...page,
      data: page.data.map((message) => {
        const currentMessage = currentById.get(message.id)

        return currentMessage && Date.parse(currentMessage.updatedAt) > Date.parse(message.updatedAt)
          ? currentMessage
          : message
      }),
    })),
  }
}

export function updateCachedMessage(queryClient: QueryClient, message: Message) {
  queryClient.setQueryData<InfiniteData<MessageListResponse>>(messageKeys.lists(), (current) => {
    if (!current) return current

    return {
      ...current,
      pages: current.pages.map((page) => ({
        ...page,
        data: page.data.map((existing) =>
          existing.id === message.id && Date.parse(existing.updatedAt) <= Date.parse(message.updatedAt)
            ? message
            : existing
        ),
      })),
    }
  })
}

export function removeCachedMessage(queryClient: QueryClient, messageId: number) {
  queryClient.setQueryData<InfiniteData<MessageListResponse>>(messageKeys.lists(), (current) => {
    if (!current) return current

    return {
      ...current,
      pages: current.pages.map((page) => ({
        ...page,
        data: page.data.filter((message) => message.id !== messageId),
      })),
    }
  })
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
    structuralSharing: (current, incoming) =>
      keepNewerCachedMessages(
        current as InfiniteData<MessageListResponse> | undefined,
        incoming as InfiniteData<MessageListResponse>
      ),
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
    onSuccess: (message) => {
      updateCachedMessage(queryClient, message)
      return queryClient.invalidateQueries({ queryKey: messageKeys.lists() })
    },
  })
}

export function useDeleteMessageMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteMessage(id),
    onSuccess: (_data, messageId) => {
      removeCachedMessage(queryClient, messageId)
      return queryClient.invalidateQueries({ queryKey: messageKeys.lists() })
    },
  })
}
