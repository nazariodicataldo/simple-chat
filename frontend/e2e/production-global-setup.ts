import type { FullConfig } from "@playwright/test"

const READINESS_TIMEOUT_MS = 120_000
const REQUEST_TIMEOUT_MS = 10_000
const INITIAL_BACKOFF_MS = 250
const MAX_BACKOFF_MS = 2_000

type ReadinessOptions = {
  fetch?: (input: string, init?: RequestInit) => Promise<Response>
  now?: () => number
  sleep?: (milliseconds: number) => Promise<void>
  timeoutMs?: number
  requestTimeoutMs?: number
}

function safeError(error: unknown) {
  if (!(error instanceof Error)) return "request failed"

  const detail = `${error.name}: ${error.message}`
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/\s+/g, " ")
    .trim()

  return detail.slice(0, 160) || "request failed"
}

async function wait(milliseconds: number) {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
}

async function requestReadiness(
  endpoint: string,
  fetchRequest: (input: string, init?: RequestInit) => Promise<Response>,
  requestTimeoutMs: number
) {
  try {
    const response = await fetchRequest(endpoint, {
      redirect: "error",
      signal: AbortSignal.timeout(requestTimeoutMs),
    })
    const status = response.status
    await response.body?.cancel()

    return status === 200 ? { ready: true as const } : { ready: false as const, detail: `status ${status}` }
  } catch (error) {
    return { ready: false as const, detail: safeError(error) }
  }
}

export async function waitForProductionReadiness(
  baseURL: string,
  options: ReadinessOptions = {}
) {
  const fetchRequest = options.fetch ?? fetch
  const now = options.now ?? Date.now
  const sleep = options.sleep ?? wait
  const timeoutMs = options.timeoutMs ?? READINESS_TIMEOUT_MS
  const requestTimeoutMs = options.requestTimeoutMs ?? REQUEST_TIMEOUT_MS
  const startedAt = now()
  const deadline = startedAt + timeoutMs

  for (const path of ["/up", "/"]) {
    let attempt = 0
    let lastDetail = "not attempted"
    let ready = false

    while (now() < deadline) {
      const endpoint = new URL(path, `${baseURL}/`).toString()
      const requestDeadline = Math.min(requestTimeoutMs, deadline - now())
      const result = await requestReadiness(endpoint, fetchRequest, requestDeadline)

      if (result.ready) {
        if (now() <= deadline) {
          ready = true
          break
        }

        lastDetail = "status 200 after deadline"
      } else {
        lastDetail = result.detail
      }

      if (now() >= deadline) {
        throw new Error(
          `Production readiness failed during ${path} at ${path} after ${now() - startedAt}ms; last status/error: ${lastDetail}`
        )
      }

      const backoff = Math.min(
        INITIAL_BACKOFF_MS * 2 ** attempt,
        MAX_BACKOFF_MS,
        deadline - now()
      )
      await sleep(backoff)
      attempt += 1
    }

    if (!ready) {
      throw new Error(
        `Production readiness failed during ${path} at ${path} after ${now() - startedAt}ms; last status/error: ${lastDetail}`
      )
    }
  }
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL

  if (typeof baseURL !== "string") {
    throw new Error("Production readiness requires a configured HTTPS base URL.")
  }

  await waitForProductionReadiness(baseURL)
}
