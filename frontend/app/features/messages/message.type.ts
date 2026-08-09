
export type MessageAuthor = {
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
  author?: MessageAuthor
}

export type CreateMessageInput = {
  text: string
}

export type UpdateMessageInput = CreateMessageInput
