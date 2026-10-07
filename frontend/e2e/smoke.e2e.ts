import { expect, test } from "@playwright/test"

test("raggiunge la pagina pubblica HTTPS del target configurato", async ({
  page,
}, testInfo) => {
  const baseUrl =
    testInfo.project.use.baseURL ?? "https://app.simple-chat.test:8443"

  // La navigazione deve fallire con il motivo infrastrutturale utile a correggere l'ambiente locale.
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)

    throw new Error(`The configured HTTPS target is not reachable at ${baseUrl}. Detail: ${detail}`)
  }

  await expect(page).toHaveTitle("Simple Chat")
  await expect(
    page.getByRole("heading", { name: "Welcome back" })
  ).toBeVisible()
})
