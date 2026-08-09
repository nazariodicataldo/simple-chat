import type { AxiosResponse } from "axios"

import { http } from "@/lib/http"

import type {
  CreateMessageInput,
  Message,
  UpdateMessageInput,
} from "./message.type"

type ResourceResponse<T> = {
  data: T
}

export async function listMessages(): Promise<Message[]> {
  const response: AxiosResponse<ResourceResponse<Message[]>> =
    await http.get("/api/messages")

  return response.data.data
}

export async function getMessage(id: number): Promise<Message> {
  const response: AxiosResponse<ResourceResponse<Message>> = await http.get(
    `/api/messages/${id}`
  )

  return response.data.data
}

export async function createMessage(
  input: CreateMessageInput
): Promise<Message> {
  const response: AxiosResponse<ResourceResponse<Message>> = await http.post(
    "/api/messages",
    input
  )

  return response.data.data
}

export async function updateMessage(
  id: number,
  input: UpdateMessageInput
): Promise<Message> {
  const response: AxiosResponse<ResourceResponse<Message>> = await http.put(
    `/api/messages/${id}`,
    input
  )

  return response.data.data
}

export async function deleteMessage(id: number): Promise<void> {
  await http.delete(`/api/messages/${id}`)
}
