export const LOCAL_PLAYWRIGHT_BASE_URL = "https://app.simple-chat.test:8443"

const INVALID_RENDER_URL_MESSAGE =
  "PLAYWRIGHT_BASE_URL must be an HTTPS root URL for a single *.onrender.com host."
const TLS_BYPASS_MESSAGE =
  "PLAYWRIGHT_IGNORE_HTTPS_ERRORS cannot be true with a Render target."

type PlaywrightEnvironment = {
  baseUrl?: string
  ignoreHttpsErrors?: string
  ci?: string
}

export type PlaywrightTarget = {
  baseURL: string
  isProduction: boolean
  ignoreHTTPSErrors: boolean
}

type PlaywrightRuntimeSettings = PlaywrightTarget & {
  timeout: number
  retries: number
  reporter: "line" | "html"
  trace: "off" | "on-first-retry"
  video: "off" | undefined
  screenshot: "off" | undefined
}

export function resolvePlaywrightTarget(
  baseUrl: string | undefined,
  ignoreHttpsErrors?: string
): PlaywrightTarget {
  const ignoreHTTPSErrors = ignoreHttpsErrors === "true"

  if (baseUrl === undefined) {
    return {
      baseURL: LOCAL_PLAYWRIGHT_BASE_URL,
      isProduction: false,
      ignoreHTTPSErrors,
    }
  }

  // Il dominio esplicito separa il deploy pubblico dal default Compose e impedisce override ambigui.
  if (
    !/^https:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.onrender\.com\/?$/i.test(
      baseUrl
    )
  ) {
    throw new Error(INVALID_RENDER_URL_MESSAGE)
  }

  if (ignoreHTTPSErrors) throw new Error(TLS_BYPASS_MESSAGE)

  return {
    baseURL: new URL(baseUrl).origin,
    isProduction: true,
    ignoreHTTPSErrors: false,
  }
}

export function getPlaywrightRuntimeSettings(
  environment: PlaywrightEnvironment
): PlaywrightRuntimeSettings {
  const target = resolvePlaywrightTarget(
    environment.baseUrl,
    environment.ignoreHttpsErrors
  )
  const isCI = Boolean(environment.ci)

  // I retry restano utili solo alla CI Compose; production non deve duplicare utenti o messaggi.
  return {
    ...target,
    // Production riserva anche i 120 secondi necessari all'eventuale cleanup di recupero.
    timeout: target.isProduction ? 150_000 : 30_000,
    retries: target.isProduction ? 0 : isCI ? 2 : 0,
    reporter: target.isProduction ? "line" : "html",
    trace: target.isProduction ? "off" : isCI ? "off" : "on-first-retry",
    video: target.isProduction ? "off" : undefined,
    screenshot: target.isProduction ? "off" : undefined,
  }
}
