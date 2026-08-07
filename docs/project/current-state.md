# Stato corrente

- **Milestone corrente:** Milestone 1 — Chat HTTP autenticata
- **Ultimo task completato:** M1-004 — Creare l’entità Message e il CRUD HTTP provvisorio.
- **Task attivo:** nessuno.
- **Prossimo task suggerito:** da definire nella Milestone 1.
- **Ultimo aggiornamento:** 2026-08-07.

## Funzionalita' esistenti

- Skeleton Laravel 13 rilevato in `backend/` (framework `^13.8`, PHP `^8.5` dichiarato); Lerd gestisce runtime PHP 8.5, Composer e web server locale.
- Skeleton Next.js rilevato in `frontend/` (Next `16.2.6`, TypeScript).
- Lo skeleton frontend usa Next.js `16.2.6`, React `19.2.4`, TypeScript e App Router; non implementa ancora chat, autenticazione o integrazione API.
- M1-003 ha introdotto il dominio utente con `first_name`, `last_name`, `username` e `UserResource` camelCase; password e dati sensibili non sono inclusi nella Resource.
- M1-004 ha introdotto il dominio Message con soft-delete, CRUD HTTP provvisorio, Resource camelCase, policy di proprietà e test. La creazione usa temporaneamente `user_id = 1` finché non esisterà auth; migration e smoke test Postman sono verificati sul database PostgreSQL locale Lerd.
- Lerd configura PostgreSQL, Redis e Mailpit locali. Non sono ancora implementati/documentati chat completa, auth, Sanctum, Reverb, queue, Docker o CI.

## Test esistenti

- Backend: Pest verificato localmente con `composer test`: 2 test superati, 2 assertion.
- Frontend: nessun workflow Vitest/Playwright documentato.
- Frontend: lint e typecheck verificati con Node `v24.19.0` e pnpm `11.20.0`; lint segnala un warning ESLint esistente ma nessun errore. Build Next.js `16.2.6` verificata localmente dallo sviluppatore: compilazione, TypeScript e generazione delle pagine statiche riusciti.
- Backend, M1-003: suite Pest (3 test, 10 assertion), Pint completo (28 file) e PHPStan con `--memory-limit=512M` verificati localmente dallo sviluppatore.

## Problemi conosciuti

- Git e' ora inizializzato nella root e non ci sono repository annidati. L'intero monorepo e' ancora non tracciato, quindi richiede una revisione intenzionale prima del primo staging/commit.
- Il repository e' ancora interamente non tracciato dopo l'inizializzazione; serve una revisione intenzionale prima del primo staging/commit.
- Il sandbox dell'agente non puo' raggiungere il D-Bus della sessione Lerd dello sviluppatore. I test locali Lerd sono comunque verificabili dallo sviluppatore e vanno riportati con output completo.
- Il sandbox non espone `composer`; per M1-003 i controlli backend non erano avviabili (exit 127).
- PHPStan richiede il limite CLI `--memory-limit=512M` nell’ambiente locale dello sviluppatore.
- Nel sandbox corrente PHP è `8.3.6`, mentre le dipendenze installate richiedono PHP `>= 8.4.1`; PHPStan non può quindi avviarsi. `composer` non è installato nel PATH del sandbox, perciò Pest non può essere eseguito qui.

## Decisioni aperte

- Nessuna.

## Comandi verificati

- `git init` nella root: riuscito; esiste solo `./.git`.
- `composer test` da `backend/`, eseguito localmente dallo sviluppatore: 2 test superati, 2 assertion, durata 0.45s.
- M1-003, 2026-08-06: da `backend/`, `composer test` riuscito (3 test, 10 assertion, 0.48s); `./vendor/bin/pint --test` riuscito (28 file); `./vendor/bin/phpstan analyse --memory-limit=512M` riuscito (21 file, nessun errore).
- Frontend, 2026-08-06: ispezionati `package.json` e App Router. `nvm use` seleziona Node `v24.19.0` (npm `11.17.0`) e pnpm `11.20.0`; `pnpm lint` termina con un warning ESLint e senza errori, `pnpm typecheck` senza errori. `pnpm build`, eseguito localmente dallo sviluppatore, e' riuscito con Next.js `16.2.6` e Turbopack.
- M1-004, 2026-08-07: Pint completo è riuscito nel sandbox; `php -l` sui file PHP del task non rileva errori di sintassi; `git diff --check` è riuscito. Verifica locale dello sviluppatore: `composer test` è riuscito con 10 test superati e PHPStan con `--memory-limit=512M` è riuscito (28/28 file, nessun errore); migration sul database PostgreSQL locale Lerd e smoke test Postman sono riusciti.
