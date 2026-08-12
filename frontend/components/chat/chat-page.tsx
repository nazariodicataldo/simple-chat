"use client"

import { useMemo, useState } from "react"

import { Chat } from "@/components/chat/chat"
import { ChatForm } from "@/components/chat/chat-form"
import { LogoutButton } from "@/components/auth/logout-button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { useCreateMessageMutation, useMessagesQuery } from "@/app/features/messages/message.queries"
import type { ChatMessage, LocalMessage, MessageUser } from "@/app/features/messages/message.type"

function getInitials(user: MessageUser) {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
}

function getAvatarUrl(username: string) {
  return `https://api.dicebear.com/10.x/glyphs/svg?seed=${encodeURIComponent(username)}`
}

export function ChatPage({ currentUser }: { currentUser: MessageUser }) {
  const { data, isError, isPending, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError } = useMessagesQuery()
  const createMessage = useCreateMessageMutation()
  const isInitialMessagesError = isError && !data?.pages.length
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([])
  const messages = useMemo(() => {
    const remote = data?.pages.flatMap((page) => page.data) ?? []
    const ids = new Set(remote.map((message) => String(message.id)))
    return [...remote, ...localMessages.filter((message) => !ids.has(String(message.id)))]
  }, [data, localMessages])

  function sendMessage(message: LocalMessage) {
    setLocalMessages((current) => [...current, message])
    createMessage.mutate(
      { text: message.text },
      {
        onSuccess: (created) => {
          setLocalMessages((current) => current.map((item) => item.id === message.id ? { ...created, user: currentUser } : item))
        },
        onError: () => failLocalMessage(message.id),
      }
    )
  }

  function failLocalMessage(temporaryId: string) {
    setLocalMessages((current) => current.map((message) => "deliveryStatus" in message && message.id === temporaryId ? { ...message, deliveryStatus: "failed" } : message))
  }

  function retryMessage(message: LocalMessage) {
    const sending = { ...message, deliveryStatus: "sending" as const }
    setLocalMessages((current) => current.map((item) => item.id === message.id ? sending : item))
    createMessage.mutate(
      { text: message.text },
      {
        onSuccess: (created) => setLocalMessages((current) => current.map((item) => item.id === message.id ? { ...created, user: currentUser } : item)),
        onError: () => failLocalMessage(message.id),
      }
    )
  }

  return (
    <main className="flex min-h-svh flex-col items-center bg-muted/40 p-4 sm:p-8">
      <div className="mb-4 flex w-full max-w-3xl items-center justify-end gap-3">
        <div className="text-right text-sm">
          <p className="font-medium">{currentUser.firstName} {currentUser.lastName}</p>
          <p className="text-muted-foreground">@{currentUser.username}</p>
        </div>
        <Avatar size="lg">
          <AvatarImage src={getAvatarUrl(currentUser.username)} alt={`${currentUser.firstName} ${currentUser.lastName} avatar`} />
          <AvatarFallback>{getInitials(currentUser)}</AvatarFallback>
        </Avatar>
        <LogoutButton />
      </div>
      <section
        aria-labelledby="chat-title"
        className="flex h-[min(44rem,calc(100svh-2rem))] w-full max-w-3xl flex-col rounded-xl border bg-card shadow-sm sm:h-[min(44rem,calc(100svh-4rem))]"
      >
        <header className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h1 id="chat-title" className="text-lg font-semibold">Group chat</h1>
            <p className="text-sm text-muted-foreground">Messages</p>
          </div>
        </header>
        <div className="min-h-0 flex-1">
          <Chat currentUser={currentUser} isError={isInitialMessagesError} isPending={isPending} messages={messages} onRetry={() => refetch()} onRetryMessage={retryMessage} onLoadMore={() => fetchNextPage()} hasNextPage={Boolean(hasNextPage)} isFetchingNextPage={isFetchingNextPage} isFetchNextPageError={isFetchNextPageError} />
        </div>
        <ChatForm currentUser={currentUser} onSubmitMessage={sendMessage} />
      </section>
    </main>
  )
}
