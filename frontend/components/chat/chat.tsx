"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
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
import type { Message as ChatMessage } from "@/app/features/messages/message.type"

type ChatProps = {
  messages: ChatMessage[]
  isPending: boolean
  isError: boolean
  onRetry: () => void
}

function formatMessageDate(createdAt: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(createdAt))
}

function getAuthor(message: ChatMessage) {
  return (
    message.author ?? {
      firstName: "User",
      lastName: `#${message.userId}`,
      username: `user-${message.userId}`,
    }
  )
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

function getAvatarUrl(username: string) {
  return `https://api.dicebear.com/10.x/glyphs/svg?seed=${encodeURIComponent(username)}`
}

function MessageRow({ message }: { message: ChatMessage }) {
  const author = getAuthor(message)
  const displayName = `${author.firstName} ${author.lastName}`
  const createdAt = formatMessageDate(message.createdAt)
  const isCurrentUser = message.userId === 1

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
        <MessageHeader>{displayName}</MessageHeader>
        <Bubble variant={isCurrentUser ? "default" : "secondary"}>
          <BubbleContent>{message.text}</BubbleContent>
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

export function Chat({ messages, isPending, isError, onRetry }: ChatProps) {
  return (
    <MessageScrollerProvider autoScroll>
      <MessageScroller>
        <MessageScrollerViewport aria-label="Messages">
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
              <MessageScrollerItem>
                <div role="alert" className="space-y-3 text-sm">
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
                    <MessageRow message={message} />
                  </MessageScrollerItem>
                ))
              : null}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  )
}
