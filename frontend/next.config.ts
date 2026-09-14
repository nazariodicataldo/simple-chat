import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "app.simple-chat.test",
    "app.simple-chat.test:8443",
    "localhost:3000",
  ],
}

export default nextConfig
