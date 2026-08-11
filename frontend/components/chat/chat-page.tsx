"use client"

import { Chat } from "@/components/chat/chat"
import { ChatForm } from "@/components/chat/chat-form"
import { LogoutButton } from "@/components/auth/logout-button"

import { useMessagesQuery } from "@/app/features/messages/message.queries"

export function ChatPage() {
  const { data: messages = [], isError, isPending, refetch } = useMessagesQuery()

  return (
    <main className="flex min-h-svh justify-center bg-muted/40 p-4 sm:p-8">
      <section
        aria-labelledby="chat-title"
        className="flex h-[min(44rem,calc(100svh-2rem))] w-full max-w-3xl flex-col rounded-xl border bg-card shadow-sm sm:h-[min(44rem,calc(100svh-4rem))]"
      >
        <header className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h1 id="chat-title" className="text-lg font-semibold">Group chat</h1>
            <p className="text-sm text-muted-foreground">Messages</p>
          </div>
          <LogoutButton />
        </header>
        <div className="min-h-0 flex-1">
          <Chat isError={isError} isPending={isPending} messages={messages} onRetry={() => refetch()} />
        </div>
        <ChatForm />
      </section>
    </main>
  )
}
