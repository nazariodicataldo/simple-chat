import type { NextConfig } from "next"

const turbopackRoot = import.meta.dirname

const nextConfig: NextConfig = {
  // Il server standalone contiene soltanto il runtime Next necessario all'immagine production.
  output: "standalone",
  // Nel container il progetto e' /app: la root esplicita evita che Turbopack
  // deduca /app/app e perda la risoluzione delle dipendenze durante la build.
  turbopack: {
    root: turbopackRoot,
  },
  allowedDevOrigins: [
    "app.simple-chat.test",
    "app.simple-chat.test:8443",
    "localhost:3000",
  ],
}

export default nextConfig
