import { AuthGate } from "@/components/auth/auth-gate"
import { ChatPage } from "@/components/chat/chat-page"
import { SessionError } from "@/components/auth/session-error"

import { getCurrentUser } from "./features/auth/auth.server.service"

export default async function Page() {
  let user

  try {
    user = await getCurrentUser()
  } catch {
    return <SessionError />
  }

  return user ? <ChatPage /> : <AuthGate />
}
