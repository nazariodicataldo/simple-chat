# Stato corrente

- **Milestone corrente:** Milestone 1 — Chat HTTP autenticata
- **Ultimo task completato:** M1-002 — Verificare e documentare il bootstrap frontend esistente.
- **Task attivo:** nessuno.
- **Prossimo task suggerito:** da definire nella Milestone 1; non avviato in questo task.
- **Ultimo aggiornamento:** 2026-08-06.

## Funzionalita' esistenti

- Skeleton Laravel 13 rilevato in `backend/` (framework `^13.8`, PHP `^8.3` dichiarato).
- Skeleton Next.js rilevato in `frontend/` (Next `16.2.6`, TypeScript).
- Lo skeleton frontend usa Next.js `16.2.6`, React `19.2.4`, TypeScript e App Router; non implementa ancora chat, autenticazione o integrazione API.
- Non sono stati verificati in questa sessione come applicazione integrata e non sono implementati/documentati chat, auth, PostgreSQL, Sanctum, Reverb, Redis, queue, Docker o CI.

## Test esistenti

- Backend: Pest verificato localmente con `composer test`: 2 test superati, 2 assertion.
- Frontend: nessun workflow Vitest/Playwright documentato.
- Frontend: lint e typecheck verificati con Node `v24.19.0` e pnpm `11.20.0`; lint segnala un warning ESLint esistente ma nessun errore. Build Next.js `16.2.6` verificata localmente dallo sviluppatore: compilazione, TypeScript e generazione delle pagine statiche riusciti.

## Problemi conosciuti

- Git e' ora inizializzato nella root e non ci sono repository annidati. L'intero monorepo e' ancora non tracciato, quindi richiede una revisione intenzionale prima del primo staging/commit.
- Il repository e' ancora interamente non tracciato dopo l'inizializzazione; serve una revisione intenzionale prima del primo staging/commit.
- Il sandbox dell'agente non puo' raggiungere il D-Bus della sessione Lerd dello sviluppatore. I test locali Lerd sono comunque verificabili dallo sviluppatore e vanno riportati con output completo.

## Decisioni aperte

- Versione PHP fissata e compatibilita' effettiva Laravel 13.
- Configurazione PostgreSQL e strategia di bootstrap degli ambienti.

## Comandi verificati

- `git init` nella root: riuscito; esiste solo `./.git`.
- `composer test` da `backend/`, eseguito localmente dallo sviluppatore: 2 test superati, 2 assertion, durata 0.45s.
- Frontend, 2026-08-06: ispezionati `package.json` e App Router. `nvm use` seleziona Node `v24.19.0` (npm `11.17.0`) e pnpm `11.20.0`; `pnpm lint` termina con un warning ESLint e senza errori, `pnpm typecheck` senza errori. `pnpm build`, eseguito localmente dallo sviluppatore, e' riuscito con Next.js `16.2.6` e Turbopack.
