import type { NextConfig } from "next"

const turbopackRoot = import.meta.dirname

// Diagnostica temporanea per confrontare la root effettiva nel runner GitHub.
console.log("[DIAGNOSTICA TURBOPACK]", {
  cwd: process.cwd(),
  dirname: turbopackRoot,
  argv: process.argv,
})

const nextConfig: NextConfig = {
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
