"use client"

import { useEffect, useRef } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
} from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { Skeleton } from "@/components/ui/skeleton"
import type { ChatMessage, LocalMessage, MessageUser } from "@/app/features/messages/message.type"

type ChatProps = {
  messages: ChatMessage[]
  isPending: boolean
  isError: boolean
  onRetry: () => void
  currentUser: MessageUser
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isFetchNextPageError: boolean
  onLoadMore: () => void
  onRetryMessage: (message: LocalMessage) => void
}

function formatMessageDate(createdAt: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(createdAt))
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

function getAvatarUrl(username: string) {
  return `https://api.dicebear.com/10.x/glyphs/svg?seed=${encodeURIComponent(username)}`
}

function MessageRow({ message, currentUser, onRetryMessage }: { message: ChatMessage; currentUser: MessageUser; onRetryMessage: (message: LocalMessage) => void }) {
  const author = message.user
  const displayName = `${author.firstName} ${author.lastName}`
  const createdAt = formatMessageDate(message.createdAt)
  const isCurrentUser = message.userId === currentUser.id
  const local = "deliveryStatus" in message ? message : null

  return (
    <Message
      align={isCurrentUser ? "end" : "start"}
      aria-label={`Message from ${displayName} at ${createdAt}`}
    >
      <MessageAvatar>
        <Avatar>
          <AvatarImage
            src={getAvatarUrl(author.username)}
            alt={`${displayName} avatar`}
          />
          <AvatarFallback>
            {getInitials(author.firstName, author.lastName)}
          </AvatarFallback>
        </Avatar>
      </MessageAvatar>
      <MessageContent>
        <Bubble variant={isCurrentUser ? "default" : "secondary"}>
          <BubbleContent className="space-y-1">
            <p className="text-xs font-medium">{displayName}</p>
            <p>{message.text}</p>
            {local?.deliveryStatus === "sending" ? <p role="status" aria-live="polite" className="text-xs text-muted-foreground">Sending...</p> : null}
            {local?.deliveryStatus === "failed" ? (
              <div role="alert" className="space-y-1 text-sm text-destructive dark:text-red-400">
                <p>Failed to send the message.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => onRetryMessage(local)}>Try again</Button>
              </div>
            ) : null}
          </BubbleContent>
        </Bubble>
        <MessageFooter>
          <time dateTime={message.createdAt}>{createdAt}</time>
        </MessageFooter>
      </MessageContent>
    </Message>
  )
}

function PendingMessage() {
  return (
    <div aria-hidden="true" className="flex items-end gap-2">
      <Skeleton className="size-8 shrink-0 rounded-full" />
      <div className="flex w-full max-w-sm flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}

export function Chat({ messages, isPending, isError, onRetry, currentUser, hasNextPage, isFetchingNextPage, isFetchNextPageError, onLoadMore, onRetryMessage }: ChatProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const lastMessageRef = useRef<HTMLDivElement>(null)
  const nextPageRequestedRef = useRef(false)

  useEffect(() => {
    if (
      !hasNextPage ||
      isFetchingNextPage ||
      isFetchNextPageError ||
      !sentinelRef.current
    ) {
      return
    }

    nextPageRequestedRef.current = false
    const observer = new IntersectionObserver(([entry]) => {
      if (
        entry.isIntersecting &&
        hasNextPage &&
        !isFetchingNextPage &&
        !isFetchNextPageError &&
        !nextPageRequestedRef.current
      ) {
        nextPageRequestedRef.current = true
        onLoadMore()
      }
    }, { root: viewportRef.current })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, onLoadMore])

  useEffect(() => {
    const latest = messages.at(-1)
    const target = lastMessageRef.current
    if (
      latest &&
      "deliveryStatus" in latest &&
      latest.deliveryStatus === "sending" &&
      typeof target?.scrollIntoView === "function"
    ) {
      target.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [messages])

  return (
    <MessageScrollerProvider>
      <MessageScroller>
        <MessageScrollerViewport ref={viewportRef} aria-label="Messages">
          <MessageScrollerContent className="gap-4 p-5">
            {isPending ? (
              <MessageScrollerItem>
                <div role="status" aria-live="polite">
                  <span className="sr-only">Loading messages...</span>
                  <div className="space-y-5">
                    <PendingMessage />
                    <PendingMessage />
                    <PendingMessage />
                  </div>
                </div>
              </MessageScrollerItem>
            ) : null}

            {isError ? (
              <MessageScrollerItem className="my-auto flex justify-center">
                <div role="alert" className="space-y-3 text-center text-sm text-destructive dark:text-red-400">
                  <p>Unable to load messages.</p>
                  <Button type="button" variant="outline" onClick={onRetry}>
                    Try again
                  </Button>
                </div>
              </MessageScrollerItem>
            ) : null}

            {!isPending && !isError && messages.length === 0 ? (
              <MessageScrollerItem>
                <p className="text-sm text-muted-foreground">
                  No messages yet.
                </p>
              </MessageScrollerItem>
            ) : null}

            {!isPending && !isError
              ? messages.map((message) => (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={String(message.id)}
                  >
                  <div ref={message === messages.at(-1) ? lastMessageRef : undefined}>
                    <MessageRow message={message} currentUser={currentUser} onRetryMessage={onRetryMessage} />
                  </div>
                  </MessageScrollerItem>
                ))
              : null}
            {!isPending && !isError ? <MessageScrollerItem><div ref={sentinelRef} aria-hidden="true" /></MessageScrollerItem> : null}
            {isFetchingNextPage ? <MessageScrollerItem><p role="status" aria-live="polite" className="text-sm text-muted-foreground">Loading messages...</p></MessageScrollerItem> : null}
            {isFetchNextPageError ? <MessageScrollerItem><div role="alert" className="space-y-2 text-sm text-destructive dark:text-red-400"><p>Unable to load more messages.</p><Button type="button" variant="outline" onClick={onLoadMore}>Try again</Button></div></MessageScrollerItem> : null}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  )
}
