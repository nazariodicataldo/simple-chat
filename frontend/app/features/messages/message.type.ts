export type MessageUser = {
  id: number
  firstName: string
  lastName: string
  username: string
}

export type Message = {
  id: number
  userId: number
  text: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  user: MessageUser
}

export type MessageListQueryParams = {
  cursor?: string
}

export type MessagePagination = {
  nextCursor: string | null
  previousCursor: string | null
  hasMorePages: boolean
  perPage: number
}

export type MessageListResponse = {
  success: boolean
  data: Message[]
  timestamp: string
  message: string | null
  code: number
  pagination: MessagePagination
}

export type LocalMessage = {
  id: string
  userId: number
  text: string
  createdAt: string
  updatedAt: string
  deletedAt: null
  user: MessageUser
  deliveryStatus: "sending" | "failed"
}

export type ChatMessage = Message | LocalMessage

export type CreateMessageInput = {
  text: string
}

export type UpdateMessageInput = CreateMessageInput
