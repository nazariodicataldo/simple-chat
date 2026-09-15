import { expect, test, type Page } from "@playwright/test"

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
    })
    .toBeGreaterThan(0)
  await expect
    .poll(() => reverbSubscriptions.length, {
      message: "Echo non ha completato la subscription a private-chat",
    })
    .toBeGreaterThan(0)
}

async function deleteMessageFromUi(page: Page, text: string) {
  const row = messageRow(page, text)
  if ((await row.count()) === 0) return

  await row.getByRole("button", { name: "Message actions" }).click()
  await page.getByRole("button", { name: "Delete message" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click()
  await expect(messageRow(page, text)).toHaveCount(0)
}

test("propaga create, update e delete tra due context autenticati", async ({
  browser,
}, testInfo) => {
  const runId = `${Date.now()}-${testInfo.workerIndex}`
  const password = "playwright-e2e-password"
  const userA: TestUser = {
    firstName: "E2E",
    lastName: "Alice",
    username: `e2e-a-${runId}`,
    email: `e2e-a-${runId}@example.test`,
    password,
  }
  const userB: TestUser = {
    firstName: "E2E",
    lastName: "Bob",
    username: `e2e-b-${runId}`,
    email: `e2e-b-${runId}@example.test`,
    password,
  }
  const createdText = `E2E create ${runId}`
  const updatedText = `E2E update ${runId}`
  let cleanupText = createdText
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
    cleanupText = updatedText
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
    cleanupText = ""
  } finally {
    // Il cleanup resta selettivo e passa dalla UI anche quando lo scenario fallisce a meta'.
    if (cleanupText) {
      try {
        await deleteMessageFromUi(pageA, cleanupText)
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error)
        await testInfo.attach("cleanup-error", {
          body: detail,
          contentType: "text/plain",
        })
        if (testInfo.errors.length === 0) throw error
        console.error(`Cleanup E2E non riuscito: ${detail}`)
      }
    }
    await Promise.all([contextA.close(), contextB.close()])
  }
})
