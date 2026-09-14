# M6-001 — Configurare Playwright per il Compose locale

- **Stato:** completato
- **Milestone:** Milestone 6 — Test end-to-end e CI
- **Data di apertura:** 2026-09-14
- **Data di chiusura:** 2026-09-14
- **Dipendenze:** M5-005

## Contesto

M5-005 espone la chat reale con Compose, Nginx e HTTPS/WSS su
`https://app.simple-chat.test:8443`. Il repository non contiene ancora
Playwright, un comando E2E o una configurazione per collegarsi a questo stack.
Il primo passo deve preparare uno strumento riproducibile senza introdurre un
secondo ambiente applicativo o avviare servizi nascosti dal test runner.

## Obiettivo

Installare e configurare Playwright nel frontend per eseguire test E2E Chromium
contro un Compose gia' avviato della chat reale. Aggiungere un smoke E2E minimo
che dimostri il raggiungimento HTTPS dell'applicazione e renda utilizzabile il
comando locale dedicato.

## Fuori scope

- Registrazione, login, CRUD e verifica realtime a due context: M6-002.
- Workflow GitHub Actions e browser installati nel runner CI: M6-003 e M6-004.
- Un server Next o un Compose alternativo controllato automaticamente da
  Playwright, test con mock o variazioni a API, autenticazione e realtime.
- Modifiche a Docker, Nginx, certificati mkcert locali o configurazioni di
  produzione.

## File modificabili

- `frontend/package.json` e `frontend/pnpm-lock.yaml` per la sola dipendenza
  di sviluppo Playwright e il comando E2E.
- Configurazione Playwright e test E2E minimi sotto `frontend/`.
- Documentazione di utilizzo locale direttamente necessaria al nuovo comando.
- Questo task e `docs/project/current-state.md` quando il task verra' attivato
  o completato.

## File non modificabili

- Codice di dominio Laravel/Next, test unitari esistenti, API pubbliche,
  Compose, Nginx, certificati e file `.env` locali.

## Requisiti

- Playwright usa soltanto Chromium e mantiene isolata la sua configurazione
  dagli attuali test Vitest.
- Il comando E2E richiede esplicitamente lo stack Compose normale gia' avviato
  e non include `webServer`, `docker compose up`, reset del database o fallback
  HTTP.
- La base URL e' il dominio pubblico HTTPS gia' usato dalla chat reale:
  `https://app.simple-chat.test:8443`.
- Il test di fondazione fallisce in modo comprensibile se il dominio non
  risolve, Nginx non e' attivo o il certificato mkcert non e' trusted sul
  computer locale.

## Strategia di test

Con lo stack Compose normale gia' avviato e i domini `.test` configurati sul
computer, installare Chromium Playwright ed eseguire il nuovo smoke. Il test
deve osservare la pagina pubblica reale via HTTPS, non simulare il frontend o
l'API. Eseguire poi la suite, lint e typecheck frontend per distinguere la
nuova configurazione E2E dalle verifiche gia' esistenti.

## Comandi da eseguire

- `git status --short`
- `docker compose --env-file compose.env up -d`
- `docker compose --env-file compose.env ps`
- Comando Playwright Chromium introdotto dal task
- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`
- `docker compose --env-file compose.env down`
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [x] Il frontend dichiara Playwright come dipendenza di sviluppo e offre un
      comando E2E esplicito.
- [x] Chromium Playwright raggiunge la pagina reale tramite il dominio HTTPS
      Compose senza avviare un ambiente differente.
- [x] La configurazione non indebolisce il profilo locale mkcert/TLS e non
      introduce mock, credenziali o dati fittizi versionati.
- [x] Vitest, lint e typecheck frontend hanno esiti registrati.

## Rischi e assunzioni

Si assume che il computer locale disponga del mapping dei domini `.test`, della
CA mkcert trusted e dei file `.cert/` gia' richiesti da M5-005. L'installazione
del browser Playwright puo' richiedere download di rete e librerie di sistema:
se non eseguibile, il task deve registrare il comando e la copertura mancante.

## Verifica manuale

1. Avviare il Compose normale senza Lerd per il progetto.
2. Aprire il dominio app nel browser e verificare il certificato trusted.
3. Eseguire il comando E2E Chromium e controllare che visiti la stessa origine
   HTTPS, senza servizi avviati automaticamente dal runner.
4. Arrestare Compose senza `-v`.

## Decisioni emerse

- Chromium e' l'unico browser E2E iniziale; due sessioni indipendenti saranno
  ottenute con due browser context nel task M6-002.
- L'E2E locale usa il Compose normale della chat reale: non esiste un profilo
  Docker separato per i test.

## File modificati

- `frontend/package.json`
- `frontend/pnpm-lock.yaml`
- `frontend/playwright.config.ts`
- `frontend/e2e/smoke.e2e.ts`
- `frontend/.gitignore`
- `frontend/README.md`
- `docs/project/current-state.md`
- Questo task, spostato in `docs/tasks/completed/`

## Risultati dei controlli

- `pnpm add --save-dev @playwright/test`: riuscito; aggiunta la dev
  dependency `@playwright/test` `1.63.0` e aggiornato il lockfile.
- `pnpm exec playwright install chromium`: Chromium Playwright installato
  nell'ambiente locale; il browser non e' versionato.
- `docker compose --env-file compose.env up -d`: riuscito; i sette servizi
  dello stack sono stati avviati senza Lerd.
- `docker compose --env-file compose.env ps`: riuscito; PostgreSQL e Redis
  sono healthy, Reverb healthy e Nginx e' pubblicato su
  `127.0.0.1:8443`.
- `pnpm e2e`: riuscito con 1 test Chromium superato in 8,1 s. Il test ha
  visitato la pagina pubblica reale via `https://app.simple-chat.test:8443`,
  verificando titolo e gate di autenticazione senza `webServer`, mock o
  fallback HTTP.
- `pnpm test`: riuscito con 15 file e 86 test superati.
- `pnpm lint`: riuscito con exit 0.
- `pnpm typecheck`: riuscito con exit 0.
- `docker compose --env-file compose.env down`: riuscito senza `-v`; i
  volumi locali sono stati preservati.
- `git diff --check`: riuscito.

## Problemi residui

Nessuno. L'installazione iniziale del browser richiede accesso di rete e una
volta completata usa la cache locale Playwright; il comando E2E verificato non
installa o avvia servizi applicativi.

## Riepilogo finale

Playwright e' configurato nel frontend per il solo progetto Chromium, con base
URL HTTPS esplicita verso il Compose gia' avviato e smoke reale della pagina
pubblica. Vitest resta isolato grazie al suffisso `.e2e.ts`; il comando locale
`pnpm e2e` non avvia ambienti alternativi e mantiene la verifica TLS mkcert
predefinita. M6-001 e' completato.
