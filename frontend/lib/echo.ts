import Echo from "laravel-echo"
import Pusher from "pusher-js"

import { http, withCsrf } from "@/lib/http"

declare global {
  interface Window {
    Pusher?: typeof Pusher
    __simpleChatEcho?: Echo<"reverb">
  }
}

if (typeof window !== "undefined") {
  window.Pusher = Pusher
}

function reverbPort(): number {
  return Number(
    process.env.NEXT_PUBLIC_REVERB_PORT ?? (window.location.port || 443)
  )
}

// In production l'host pubblico nasce dopo il build dell'immagine: l'origine del browser resta la fonte di verita'.
function reverbHost(): string {
  return process.env.NEXT_PUBLIC_REVERB_HOST ?? window.location.hostname
}

function reverbUsesTls(): boolean {
  return (
    process.env.NEXT_PUBLIC_REVERB_SCHEME === "https" ||
    (!process.env.NEXT_PUBLIC_REVERB_SCHEME &&
      window.location.protocol === "https:")
  )
}

function createEcho(): Echo<"reverb"> {
  return new Echo({
    broadcaster: "reverb",
    key: process.env.NEXT_PUBLIC_REVERB_APP_KEY,
    wsHost: reverbHost(),
    wsPort: reverbPort(),
    wssPort: reverbPort(),
    forceTLS: reverbUsesTls(),
    enabledTransports: ["ws", "wss"],
    channelAuthorization: {
      customHandler: ({ socketId, channelName }, callback) => {
        void withCsrf(() =>
          http.post("/broadcasting/auth", {
            socket_id: socketId,
            channel_name: channelName,
          })
        )
          .then((response) => {
            callback(null, response.data)
          })
          .catch((error: unknown) => {
            callback(
              error instanceof Error
                ? error
                : new Error("Broadcast channel authorization failed."),
              null
            )
          })
      },
    },
  })
}

export function getEcho(): Echo<"reverb"> {
  if (typeof window === "undefined") {
    throw new Error("Echo can only be initialized in the browser.")
  }

  window.Pusher = Pusher
  window.__simpleChatEcho ??= createEcho()

  return window.__simpleChatEcho
}
