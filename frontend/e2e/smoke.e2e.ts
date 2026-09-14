import { expect, test } from "@playwright/test"

test("raggiunge la pagina pubblica HTTPS del Compose", async ({
  page,
}, testInfo) => {
  const baseUrl =
    testInfo.project.use.baseURL ?? "https://app.simple-chat.test:8443"

  // La navigazione deve fallire con il motivo infrastrutturale utile a correggere l'ambiente locale.
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)

    throw new Error(
      `Il Compose HTTPS non e' raggiungibile su ${baseUrl}. Verifica domini .test, Nginx attivo e CA mkcert trusted. Dettaglio: ${detail}`
    )
  }

  await expect(page).toHaveTitle("Simple Chat")
  await expect(
    page.getByRole("heading", { name: "Welcome back" })
  ).toBeVisible()
})
