import "server-only"

import axios from "axios"

export function getServerBackendUrl(): string {
  // SSR e' interno al container: preferisce il loopback runtime e mantiene il fallback esplicito del profilo locale.
  const backendUrl =
    process.env.BACKEND_INTERNAL_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL

  if (!backendUrl) {
    throw new Error(
      "BACKEND_INTERNAL_URL or NEXT_PUBLIC_BACKEND_URL must be configured."
    )
  }

  return backendUrl.replace(/\/$/, "")
}

export const serverHttp = axios.create({
  headers: { Accept: "application/json" },
})

// La variabile server-only viene letta alla richiesta, non durante next build, per tenere l'immagine portabile.
serverHttp.interceptors.request.use((config) => {
  config.baseURL = getServerBackendUrl()

  return config
})
