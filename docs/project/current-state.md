# Stato corrente

- **Milestone corrente:** Milestone 1 — Chat HTTP autenticata
- **Ultimo task completato:** M1-008 — Autenticazione Sanctum per SPA.
- **Task attivo:** nessuno.
- **Prossimo task suggerito:** definire il task frontend per autenticazione SPA e integrazione cookie/CSRF.
- **Ultimo aggiornamento:** 2026-08-10.

## Funzionalita' esistenti

- Skeleton Laravel 13 rilevato in `backend/` (framework `^13.8`, PHP `^8.5` dichiarato); Lerd gestisce runtime PHP 8.5, Composer e web server locale.
- Skeleton Next.js rilevato in `frontend/` (Next `16.2.6`, TypeScript).
- Il frontend Next.js implementa la chat HTTP su `/`: TanStack Query, Axios configurato con `NEXT_PUBLIC_BACKEND_URL`, CRUD messages riusabile, stati loading/error/empty, invio con React Hook Form e Zod, avatar DiceBear e componenti shadcn Message/MessageScroller/Skeleton.
- M1-003 ha introdotto il dominio utente con `first_name`, `last_name`, `username` e `UserResource` camelCase; password e dati sensibili non sono inclusi nella Resource.
- M1-004 ha introdotto il dominio Message con soft-delete, CRUD HTTP, Resource camelCase, policy di proprietà e test; M1-008 associa ora la creazione all'utente autenticato. Migration e smoke test Postman sono verificati sul database PostgreSQL locale Lerd.
- M1-006/M1-007 standardizzano le risposte riuscite del CRUD Message con `success`, `data`, `timestamp`, `message` e `code`; `DELETE` conserva `204 No Content`. `GET /api/messages` restituisce 20 record in ordine cronologico con cursor pagination e autore pubblico eager-loaded, senza email.
- M1-008 ha implementato Sanctum 4.3.3 per SPA cookie/CSRF, CORS con credenziali per `http://localhost:3000`, endpoint register/login/logout/user con risposte riuscite `ApiResponse` e protezione `auth:sanctum` per Message. La verifica backend con test, PHPStan, Pint e Postman è riuscita.
- Lerd configura PostgreSQL, Redis e Mailpit locali. Non sono ancora implementati/documentati chat completa, Reverb, queue, Docker o CI.

## Test esistenti

- Backend: Pest verificato localmente con `composer test`: 13 test superati, 87 assertion (M1-007, 2026-08-10).
- Backend, M1-008: `composer test` verificato localmente con PHP 8.5 Lerd (20 test, 140 assertion); PHPStan con `--memory-limit=512M` riuscito (34/34, nessun errore). Smoke test Postman per Sanctum cookie/CSRF riuscito.
- Frontend: Vitest configurato con jsdom e React Testing Library; M1-005 verifica chat e schema Zod con 6 test.
- Frontend: lint e typecheck verificati con Node `v24.19.0` e pnpm `11.20.0`; lint segnala un warning ESLint esistente ma nessun errore. Build Next.js `16.2.6` verificata localmente dallo sviluppatore: compilazione, TypeScript e generazione delle pagine statiche riusciti.
- Backend, M1-003: suite Pest (3 test, 10 assertion), Pint completo (28 file) e PHPStan con `--memory-limit=512M` verificati localmente dallo sviluppatore.

## Problemi conosciuti

- Git e' ora inizializzato nella root e non ci sono repository annidati. L'intero monorepo e' ancora non tracciato, quindi richiede una revisione intenzionale prima del primo staging/commit.
- Il repository e' ancora interamente non tracciato dopo l'inizializzazione; serve una revisione intenzionale prima del primo staging/commit.
- Il sandbox dell'agente non puo' raggiungere il D-Bus della sessione Lerd dello sviluppatore. I test locali Lerd sono comunque verificabili dallo sviluppatore e vanno riportati con output completo.
- Il sandbox non espone `composer`; per M1-003 i controlli backend non erano avviabili (exit 127).
- PHPStan richiede il limite CLI `--memory-limit=512M` nell’ambiente locale dello sviluppatore.
- Nel sandbox corrente PHP è `8.3.6`, mentre le dipendenze installate richiedono PHP `>= 8.4.1`; PHPStan non può quindi avviarsi. `composer` non è installato nel PATH del sandbox, perciò Pest non può essere eseguito qui.
- M1-008: Lerd non è avviabile nel sandbox perché non può raggiungere il D-Bus della sessione dello sviluppatore. Le verifiche locali di Pest e PHPStan e Pint completo nel sandbox sono riusciti. Lo smoke browser è rinviato al prossimo task frontend per decisione esplicita.

## Decisioni aperte

- Nessuna.

## Comandi verificati

- `git init` nella root: riuscito; esiste solo `./.git`.
- `composer test` da `backend/`, eseguito localmente dallo sviluppatore: 2 test superati, 2 assertion, durata 0.45s.
- M1-003, 2026-08-06: da `backend/`, `composer test` riuscito (3 test, 10 assertion, 0.48s); `./vendor/bin/pint --test` riuscito (28 file); `./vendor/bin/phpstan analyse --memory-limit=512M` riuscito (21 file, nessun errore).
- Frontend, 2026-08-06: ispezionati `package.json` e App Router. `nvm use` seleziona Node `v24.19.0` (npm `11.17.0`) e pnpm `11.20.0`; `pnpm lint` termina con un warning ESLint e senza errori, `pnpm typecheck` senza errori. `pnpm build`, eseguito localmente dallo sviluppatore, e' riuscito con Next.js `16.2.6` e Turbopack.
- M1-004, 2026-08-07: Pint completo è riuscito nel sandbox; `php -l` sui file PHP del task non rileva errori di sintassi; `git diff --check` è riuscito. Verifica locale dello sviluppatore: `composer test` è riuscito con 10 test superati e PHPStan con `--memory-limit=512M` è riuscito (28/28 file, nessun errore); migration sul database PostgreSQL locale Lerd e smoke test Postman sono riusciti.
- M1-005, 2026-08-09: verifica locale dello sviluppatore riuscita per `pnpm test` (6 test), `pnpm typecheck`, `pnpm lint` e `pnpm build`; smoke test della chat integrata con API Laravel riuscito. `git diff --check` riuscito nel sandbox.
- M1-006, 2026-08-10: `composer test` riuscito (13 test, 61 assertion); PHPStan con `--memory-limit=512M` riuscito (0 errori); Pint sui file modificati riuscito. Pint completo segnala soltanto `database/seeders/DatabaseSeeder.php`, file preesistente fuori scope.
- M1-007, 2026-08-10: `composer test` riuscito (13 test, 87 assertion); PHPStan con `--memory-limit=512M` riuscito (0 errori); Pint sui file modificati riuscito. Pint completo segnala soltanto `database/seeders/DatabaseSeeder.php`, file preesistente fuori scope.
- M1-008, 2026-08-10: verifica locale PHP 8.5 Lerd riuscita per `composer test` (20 test, 140 assertion) e PHPStan (34/34, nessun errore); Pint completo riuscito nel sandbox; smoke Postman Sanctum cookie/CSRF riuscito. Smoke browser rinviato al prossimo task frontend per decisione esplicita.
