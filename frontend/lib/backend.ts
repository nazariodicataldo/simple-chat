const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL

export function getBackendUrl() {
  if (!backendUrl) {
    throw new Error("NEXT_PUBLIC_BACKEND_URL must be configured.")
  }

  return backendUrl.replace(/\/$/, "")
}
