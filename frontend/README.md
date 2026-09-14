# Next.js template

This is a Next.js template with shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button";
```

## Test E2E locale

Il test Playwright usa soltanto Chromium e visita il Compose gia' avviato su
`https://app.simple-chat.test:8443`. Non avvia servizi, non usa `webServer` e
non modifica il database.

Dopo aver avviato il Compose dalla root del repository, installa una volta il
browser e avvia lo smoke dalla directory `frontend/`:

```bash
pnpm exec playwright install chromium
pnpm e2e
```

Il computer deve risolvere il dominio `.test` e considerare trusted la CA
mkcert usata dal progetto. Il test lascia quindi attiva la verifica TLS
predefinita di Playwright: errori di DNS, Nginx fermo o certificato non trusted
falliscono esplicitamente lo smoke.
