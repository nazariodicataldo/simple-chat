import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Nel container il progetto e' /app: la root esplicita evita che Turbopack
  // deduca /app/app e perda la risoluzione delle dipendenze durante la build.
  turbopack: {
    root: import.meta.dirname,
  },
  allowedDevOrigins: [
    "app.simple-chat.test",
    "app.simple-chat.test:8443",
    "localhost:3000",
  ],
}

export default nextConfig
