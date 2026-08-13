"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2Icon, AlertCircleIcon, XIcon } from "lucide-react"

import { Chat } from "@/components/chat/chat"
import { ChatForm } from "@/components/chat/chat-form"
import { DeleteMessageDialog } from "@/components/chat/delete-message-dialog"
import { EditMessageDialog } from "@/components/chat/edit-message-dialog"
import { LogoutButton } from "@/components/auth/logout-button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import {
  useCreateMessageMutation,
  useDeleteMessageMutation,
  useMessagesQuery,
  useUpdateMessageMutation,
} from "@/app/features/messages/message.queries"
import type {
  ChatMessage,
  CreateMessageInput,
  LocalMessage,
  Message,
  MessageUser,
} from "@/app/features/messages/message.type"

type Notice = { kind: "success" | "error"; title: string }

function errorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "response" in error) {
    const data = (error as { response?: { data?: { message?: string } } })
      .response?.data
    if (data?.message) return data.message
  }
  return fallback
}

function getInitials(user: MessageUser) {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
}

function getAvatarUrl(username: string) {
  return `https://api.dicebear.com/10.x/glyphs/svg?seed=${encodeURIComponent(username)}`
}

export function ChatPage({ currentUser }: { currentUser: MessageUser }) {
  const {
    data,
    isError,
    isPending,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useMessagesQuery()
  const createMessage = useCreateMessageMutation()
  const updateMessage = useUpdateMessageMutation()
  const deleteMessage = useDeleteMessageMutation()
  const isInitialMessagesError = isError && !data?.pages.length
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([])
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [deletingMessage, setDeletingMessage] = useState<Message | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    if (!notice) return

    const timeout = window.setTimeout(() => setNotice(null), 3_000)
    return () => window.clearTimeout(timeout)
  }, [notice])
  const messages = useMemo(() => {
    const remote = data?.pages.flatMap((page) => page.data) ?? []
    const ids = new Set(remote.map((message) => String(message.id)))
    return [
      ...remote,
      ...localMessages.filter((message) => !ids.has(String(message.id))),
    ]
  }, [data, localMessages])

  function sendMessage(message: LocalMessage) {
    setLocalMessages((current) => [...current, message])
    createMessage.mutate(
      { text: message.text },
      {
        onSuccess: (created) => {
          setLocalMessages((current) =>
            current.map((item) =>
              item.id === message.id ? { ...created, user: currentUser } : item
            )
          )
        },
        onError: () => failLocalMessage(message.id),
      }
    )
  }

  function failLocalMessage(temporaryId: string) {
    setLocalMessages((current) =>
      current.map((message) =>
        "deliveryStatus" in message && message.id === temporaryId
          ? { ...message, deliveryStatus: "failed" }
          : message
      )
    )
  }

  function retryMessage(message: LocalMessage) {
    const sending = { ...message, deliveryStatus: "sending" as const }
    setLocalMessages((current) =>
      current.map((item) => (item.id === message.id ? sending : item))
    )
    createMessage.mutate(
      { text: message.text },
      {
        onSuccess: (created) =>
          setLocalMessages((current) =>
            current.map((item) =>
              item.id === message.id ? { ...created, user: currentUser } : item
            )
          ),
        onError: () => failLocalMessage(message.id),
      }
    )
  }

  function openEdit(message: ChatMessage) {
    if (!("deliveryStatus" in message)) {
      setNotice(null)
      setEditingMessage(message)
    }
  }

  function openDelete(message: ChatMessage) {
    if (!("deliveryStatus" in message)) setDeletingMessage(message)
  }

  function saveEdit(
    values: CreateMessageInput,
    setServerError: (message: string) => void
  ) {
    if (!editingMessage) return
    updateMessage.mutate(
      { id: editingMessage.id, input: { text: values.text.trim() } },
      {
        onSuccess: () => {
          setEditingMessage(null)
          setNotice({
            kind: "success",
            title: "Message updated",
          })
        },
        onError: (error) => {
          setServerError(errorMessage(error, "Unable to update the message."))
        },
      }
    )
  }

  function confirmDelete() {
    if (!deletingMessage) return
    deleteMessage.mutate(deletingMessage.id, {
      onSuccess: () => {
        setDeletingMessage(null)
        setNotice({
          kind: "success",
          title: "Message deleted",
        })
      },
      onError: () => {
        setDeletingMessage(null)
        setNotice({
          kind: "error",
          title: "Unable to delete message",
        })
      },
    })
  }

  return (
    <main className="flex min-h-svh flex-col items-center bg-muted/40 p-4 sm:p-8">
      <div className="mb-4 flex w-full max-w-3xl items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            <AvatarImage
              src={getAvatarUrl(currentUser.username)}
              alt={`${currentUser.firstName} ${currentUser.lastName} avatar`}
            />
            <AvatarFallback>{getInitials(currentUser)}</AvatarFallback>
          </Avatar>
          <div className="text-sm">
            <p className="font-medium">
              {currentUser.firstName} {currentUser.lastName}
            </p>
            <p className="text-muted-foreground">@{currentUser.username}</p>
          </div>
        </div>
        <LogoutButton />
      </div>
      <section
        aria-labelledby="chat-title"
        className="flex h-[min(44rem,calc(100svh-2rem))] w-full max-w-3xl flex-col rounded-xl border bg-card shadow-sm sm:h-[min(44rem,calc(100svh-4rem))]"
      >
        {notice ? (
          <div className="px-5 pt-5">
            <Alert
              variant={notice.kind === "error" ? "destructive" : "default"}
              className={
                notice.kind === "success"
                  ? "border-emerald-500/50 bg-emerald-50 text-emerald-700 dark:border-emerald-400/50 dark:bg-emerald-950/30 dark:text-emerald-400"
                  : undefined
              }
            >
              <div className="flex items-start gap-3">
                <div>
                  {notice.kind === "success" ? (
                    <CheckCircle2Icon className="size-4" />
                  ) : (
                    <AlertCircleIcon className="size-4" />
                  )}
                </div>
                <div className="flex-1">
                  <AlertTitle>{notice.title}</AlertTitle>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Dismiss notification"
                  onClick={() => setNotice(null)}
                >
                  <XIcon />
                </Button>
              </div>
            </Alert>
          </div>
        ) : null}
        <header className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h1 id="chat-title" className="text-lg font-semibold">
              Group chat
            </h1>
            <p className="text-sm text-muted-foreground">Messages</p>
          </div>
        </header>
        <div className="min-h-0 flex-1">
          <Chat
            currentUser={currentUser}
            isError={isInitialMessagesError}
            isPending={isPending}
            messages={messages}
            onRetry={() => refetch()}
            onRetryMessage={retryMessage}
            onEditMessage={openEdit}
            onDeleteMessage={openDelete}
            onLoadMore={() => fetchNextPage()}
            hasNextPage={Boolean(hasNextPage)}
            isFetchingNextPage={isFetchingNextPage}
            isFetchNextPageError={isFetchNextPageError}
          />
        </div>
        <ChatForm currentUser={currentUser} onSubmitMessage={sendMessage} />
      </section>
      <EditMessageDialog
        message={editingMessage}
        pending={updateMessage.isPending}
        onOpenChange={(open) => {
          if (!open && !updateMessage.isPending) {
            setEditingMessage(null)
          }
        }}
        onSubmit={saveEdit}
      />
      <DeleteMessageDialog
        message={deletingMessage}
        pending={deleteMessage.isPending}
        onOpenChange={(open) => {
          if (!open && !deleteMessage.isPending) setDeletingMessage(null)
        }}
        onConfirm={confirmDelete}
      />
    </main>
  )
}
