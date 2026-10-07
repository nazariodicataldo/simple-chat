import { expect, test, type Browser, type Page } from "@playwright/test"

import { waitForProductionReadiness } from "./production-global-setup"
import { createStrongPasswords } from "./test-data"

type TestUser = {
  firstName: string
  lastName: string
  username: string
  email: string
  password: string
}

function messageRow(page: Page, text: string) {
  return page
    .locator('[data-slot="message"][aria-label^="Message from"]')
    .filter({ hasText: text })
}

async function registerUser(page: Page, user: TestUser) {
  const reverbSockets: string[] = []
  const reverbSubscriptions: string[] = []
  page.on("websocket", (socket) => {
    if (!socket.url().includes("/app/")) return

    reverbSockets.push(socket.url())
    // La connessione aperta non basta: sincronizza la mutazione solo dopo l'ack del canale privato.
    socket.on("framereceived", ({ payload }) => {
      const frame = typeof payload === "string" ? payload : payload.toString()

      try {
        const message = JSON.parse(frame) as {
          event?: string
          channel?: string
        }

        if (
          message.event === "pusher_internal:subscription_succeeded" &&
          message.channel === "private-chat"
        ) {
          reverbSubscriptions.push(message.channel)
        }
      } catch {
        // I frame non JSON non fanno parte dell'ack di subscription.
      }
    })
  })

  await page.goto("/")
  await expect(
    page.getByRole("heading", { name: "Welcome back" })
  ).toBeVisible()
  await page.getByRole("button", { name: "Create an account" }).click()
  await expect(
    page.getByRole("heading", { name: "Create an account" })
  ).toBeVisible()

  // Il form di login resta montato ma hidden: lo scope evita collisioni sui label duplicati.
  const registerForm = page.locator("form:not([hidden])")
  await registerForm.getByLabel("First name").fill(user.firstName)
  await registerForm.getByLabel("Last name").fill(user.lastName)
  await registerForm.getByLabel("Username").fill(user.username)
  await registerForm.getByLabel("Email").fill(user.email)
  await registerForm.getByLabel("Password", { exact: true }).fill(user.password)
  await registerForm
    .getByLabel("Confirm password", { exact: true })
    .fill(user.password)
  await registerForm.getByRole("button", { name: "Create account" }).click()

  await expect(page.getByRole("heading", { name: "Group chat" })).toBeVisible()
  await expect
    .poll(() => reverbSockets.length, {
      message: "Reverb non ha aperto il socket del browser context",
      timeout: 15_000,
    })
    .toBeGreaterThan(0)
  await expect
    .poll(() => reverbSubscriptions.length, {
      message: "Echo non ha completato la subscription a private-chat",
      timeout: 15_000,
    })
    .toBeGreaterThan(0)
}

async function loginUser(page: Page, user: TestUser) {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible()

  // Il form alternativo resta montato ma hidden: lo scope evita collisioni sui label duplicati.
  const loginForm = page.locator("form:not([hidden])")
  await loginForm.getByLabel("Email").fill(user.email)
  await loginForm.getByLabel("Password", { exact: true }).fill(user.password)
  await loginForm.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByRole("heading", { name: "Group chat" })).toBeVisible()
}

async function deleteMessageFromUi(page: Page, text: string) {
  // Il marker puo' arrivare dopo il login: valutarlo solo quando la query non e' piu' in caricamento.
  await expect(
    page.getByText("Loading messages...", { exact: true })
  ).toHaveCount(0, { timeout: 15_000 })

  const row = messageRow(page, text)
  if ((await row.count()) === 0) return

  await row.getByRole("button", { name: "Message actions" }).click()
  await page.getByRole("button", { name: "Delete message" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click()
  await expect(messageRow(page, text)).toHaveCount(0)
}

async function deleteMessagesFromUi(page: Page, texts: string[]) {
  let firstError: unknown

  for (const text of texts) {
    try {
      await deleteMessageFromUi(page, text)
    } catch (error) {
      firstError ??= error
    }
  }

  if (firstError) throw firstError
}

function isProductionTarget(baseURL: string | undefined) {
  return typeof baseURL === "string" && baseURL.endsWith(".onrender.com")
}

async function recoverCleanup(
  browser: Browser,
  user: TestUser,
  texts: string[],
  baseURL: string
) {
  // La readiness globale evita di creare un nuovo context mentre Render sta ancora recuperando.
  await waitForProductionReadiness(baseURL)
  const context = await browser.newContext({ baseURL })

  try {
    const page = await context.newPage()
    await loginUser(page, user)
    await deleteMessagesFromUi(page, texts)
  } finally {
    await context.close()
  }
}

test("propaga create, update e delete tra due context autenticati", async ({
  browser,
}, testInfo) => {
  const runId = `${Date.now()}-${testInfo.workerIndex}`
  const [passwordA, passwordB] = createStrongPasswords(2)
  const userA: TestUser = {
    firstName: "E2E",
    lastName: "Alice",
    username: `e2e-a-${runId}`,
    email: `e2e-a-${runId}@example.test`,
    password: passwordA,
  }
  const userB: TestUser = {
    firstName: "E2E",
    lastName: "Bob",
    username: `e2e-b-${runId}`,
    email: `e2e-b-${runId}@example.test`,
    password: passwordB,
  }
  const createdText = `E2E create ${runId}`
  const updatedText = `E2E update ${runId}`
  const cleanupTexts = [updatedText, createdText]
  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()

  try {
    // Il secondo context deve restare ospite mentre A e' gia' autenticato.
    await registerUser(pageA, userA)
    await pageB.goto("/")
    await expect(
      pageB.getByRole("heading", { name: "Welcome back" })
    ).toBeVisible()
    await registerUser(pageB, userB)

    // CREATE: A vede l'esito locale e B riceve una sola bubble senza refresh.
    await pageA.getByLabel("New message").fill(createdText)
    await pageA.getByRole("button", { name: "Send message" }).click()
    await expect(messageRow(pageA, createdText)).toHaveCount(1)
    await expect(messageRow(pageB, createdText)).toHaveCount(1, {
      timeout: 15_000,
    })

    // UPDATE: il testo precedente scompare da entrambe le proiezioni dopo l'evento realtime.
    await messageRow(pageA, createdText)
      .getByRole("button", { name: "Message actions" })
      .click()
    await pageA.getByRole("button", { name: "Edit message" }).click()
    await pageA.getByRole("dialog").getByLabel("Message text").fill(updatedText)
    await pageA
      .getByRole("dialog")
      .getByRole("button", { name: "Save" })
      .click()
    await expect(messageRow(pageA, createdText)).toHaveCount(0)
    await expect(messageRow(pageA, updatedText)).toHaveCount(1)
    await expect(messageRow(pageB, createdText)).toHaveCount(0, {
      timeout: 15_000,
    })
    await expect(messageRow(pageB, updatedText)).toHaveCount(1, {
      timeout: 15_000,
    })

    // DELETE: A elimina dalla UI e B rimuove la sola bubble aggiornata senza refresh.
    await deleteMessageFromUi(pageA, updatedText)
    await expect(messageRow(pageB, updatedText)).toHaveCount(0, {
      timeout: 15_000,
    })
    // La rilettura normale completa la prova del soft delete dopo l'evento realtime.
    await pageB.reload()
    await expect(messageRow(pageB, updatedText)).toHaveCount(0)
  } finally {
    // Il cleanup prova entrambi i marker UI: il testo precedente scompare dopo UPDATE.
    let cleanupError: unknown
    try {
      await deleteMessagesFromUi(pageA, cleanupTexts)
    } catch (error) {
      cleanupError = error
    }

    if (cleanupError && isProductionTarget(testInfo.project.use.baseURL)) {
      try {
        await recoverCleanup(browser, userA, cleanupTexts, testInfo.project.use.baseURL!)
        cleanupError = undefined
      } catch (error) {
        cleanupError = error
      }
    }

    if (cleanupError) {
      const marker = `run-id=${runId}; create-marker=${createdText}; update-marker=${updatedText}`
      await testInfo.attach("cleanup-error", {
        body: marker,
        contentType: "text/plain",
      })
      if (testInfo.errors.length === 0) throw new Error(`Cleanup failed: ${marker}`)
      console.error(`Cleanup failed: ${marker}`)
    }
    await Promise.all([contextA.close(), contextB.close()])
  }
})

test("il cleanup attende il caricamento dei messaggi prima di cercare il marker", async ({
  page,
}) => {
  const marker = "E2E cleanup loading marker"
  await page.setContent('<div role="status">Loading messages...</div>')

  // La lista compare dopo l'autenticazione: il cleanup deve aspettarla prima di concludere che sia vuota.
  await page.evaluate((messageText) => {
    window.setTimeout(() => {
      document.body.innerHTML = `
        <article data-slot="message" aria-label="Message from E2E Alice">
          <p>${messageText}</p>
          <button aria-label="Message actions">Actions</button>
        </article>
        <button aria-label="Delete message">Delete message</button>
        <div role="dialog">
          <button>Delete</button>
        </div>
      `

      document
        .querySelector('[role="dialog"] button')
        ?.addEventListener("click", () => {
          document
            .querySelector('[data-slot="message"]')
            ?.remove()
          document.body.dataset.cleanup = "deleted"
        })
    }, 1_000)
  }, marker)

  await deleteMessageFromUi(page, marker)

  await expect(page.locator("body")).toHaveAttribute("data-cleanup", "deleted")
})
