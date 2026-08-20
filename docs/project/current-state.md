# Stato corrente

- **Milestone corrente:** Milestone 2 — Real-time diretto con Reverb ed Echo
- **Ultimo task completato:** M2-005 — Sottoscrivere e validare eventi Message.
- **Task attivo:** nessuno.
- **Prossimo task suggerito:** M2-006 — Riconciliare cache realtime Message.
- **Ultimo aggiornamento:** 2026-08-20.

## Funzionalita' esistenti

- Skeleton Laravel 13 rilevato in `backend/` (framework `^13.8`, PHP `^8.5` dichiarato); Lerd gestisce runtime PHP 8.5, Composer e web server locale.
- Skeleton Next.js rilevato in `frontend/` (Next `16.2.6`, TypeScript).
- Il frontend Next.js implementa la chat HTTP su `/`: TanStack Query, Axios configurato con `NEXT_PUBLIC_BACKEND_URL`, CRUD messages riusabile, stati loading/error/empty, invio con React Hook Form e Zod, avatar DiceBear e componenti shadcn Message/MessageScroller/Skeleton.
- M1-003 ha introdotto il dominio utente con `first_name`, `last_name`, `username` e `UserResource` camelCase; password e dati sensibili non sono inclusi nella Resource.
- M1-004 ha introdotto il dominio Message con soft-delete, CRUD HTTP, Resource camelCase, policy di proprietà e test; M1-008 associa ora la creazione all'utente autenticato. Migration e smoke test Postman sono verificati sul database PostgreSQL locale Lerd.
- M1-006/M1-007 standardizzano le risposte riuscite del CRUD Message con `success`, `data`, `timestamp`, `message` e `code`; `DELETE` conserva `204 No Content`. `GET /api/messages` restituisce 20 record in ordine cronologico con cursor pagination e autore pubblico eager-loaded, senza email.
- M1-008 ha implementato Sanctum 4.3.3 per SPA cookie/CSRF, CORS con credenziali per `http://localhost:3000`, endpoint register/login/logout/user con risposte riuscite `ApiResponse` e protezione `auth:sanctum` per Message. La verifica backend con test, PHPStan, Pint e Postman è riuscita.
- M1-009 implementa il gate server-side della sessione in `/`, login/register/logout, form auth separati con campi camelCase convertiti nel service, CSRF browser deduplicato con retry singolo su `419` e service Axios server-only con inoltro cookie/origin/referer. Lint, typecheck, build e smoke browser sono riusciti.
- M1-010 tipizza l'envelope cursor Message, carica le pagine successive con infinite scroll TanStack Query e mostra autore reale nelle bubble. L'invio usa una bubble optimistic con `Sending...`, errore destructive e retry; il profilo autenticato e' visibile sopra la card chat.
- M1-011 implementa lato frontend le azioni update/delete per i soli messaggi
  persistiti dell'utente corrente: popover, dialog accessibili, alert persistenti
  e riuso delle mutation esistenti. Il pulsante create resta disabilitato con
  testo trim-vuoto. I test, lint e typecheck sono riusciti nel sandbox; la build
  Next.js e' riuscita nell'ambiente locale dello sviluppatore.
- M2-001 ha aggiunto gli eventi Laravel `MessageCreated`, `MessageUpdated` e
  `MessageDeleted` con `ShouldBroadcastNow`, payload espliciti sul canale
  privato `chat` e feature test con broadcaster fake; suite Pest, Pint e
  PHPStan sono verificati localmente su PHP 8.5 Lerd.
- M2-002 registra il canale privato `chat` e protegge l'endpoint Laravel
  `/broadcasting/auth` con `web` e `auth:sanctum`; include feature test per
  autorizzazione, rifiuto dell'ospite, canale privato non registrato e preflight
  CORS. Dopo il clear della route cache, CORS e il rifiuto del canale non
  registrato sono verificati localmente; la risposta guest ha evidenziato il
  redirect predefinito verso una route `login` assente. Il bootstrap non
  reindirizza gli ospiti e la verifica manuale Postman senza autenticazione ha
  confermato `401`. La firma Pusher/Reverb e' ora coperta dal feature test
  M2-003 eseguito nell'ambiente locale Lerd.
- M2-003 ha aggiunto Reverb diretto e il trasporto Pusher al backend, con
  `BROADCAST_CONNECTION=reverb`, configurazioni pubblicate e variabili di
  esempio senza credenziali reali. Host e porta del server sono ora distinti da
  quelli del broadcaster e le origini WebSocket sono configurabili. Il feature
  test controlla la firma Pusher/Reverb con credenziali fittizie disponibili
  prima del bootstrap soltanto per i test Channels.
- M2-004 ha installato `laravel-echo` 2.4.0 e `pusher-js` 8.6.0 e aggiunto il
  client browser lazy `frontend/lib/echo.ts`: configura Reverb, conserva il
  singleton attraverso HMR e autorizza `private-chat` tramite l'Axios/CSRF
  condiviso con `channelAuthorization.customHandler`. Il modulo non e' collegato
  alla UI; test, lint, typecheck e build sono eseguiti. Lo smoke locale
  autenticato del 2026-08-20, con Lerd/Reverb, ha completato la sottoscrizione
  a `private-chat`.
- M2-005 sottoscrive `private-chat`, valida difensivamente gli eventi Message
  e li normalizza senza aggiornare ancora la cache TanStack Query. Lo smoke
  locale autenticato del 2026-08-20 ha confermato autorizzazione privata,
  WebSocket Reverb e ricezione di `created`, `updated` e `deleted` su tre
  mutazioni reali. Lo script `pnpm dev:https` avvia il frontend HTTPS locale
  usando il CA di sistema di Node.
- ADR 0003 fissa HTTPS/WSS come profilo locale predefinito per SPA, API e
  browser-verso-Reverb. Il broadcaster Laravel mantiene il collegamento
  interno HTTP su `localhost:8080` verso Reverb; questa separazione evita
  mixed content e conserva semplice il traffico non esposto.
- Lerd configura PostgreSQL, Redis e Mailpit locali. Non sono ancora
  implementati/documentati chat completa, Echo, queue, Docker o CI.

## Test esistenti

- Backend: Pest verificato localmente con `composer test`: 13 test superati, 87 assertion (M1-007, 2026-08-10).
- Backend, M1-008: `composer test` verificato localmente con PHP 8.5 Lerd (20 test, 140 assertion); PHPStan con `--memory-limit=512M` riuscito (34/34, nessun errore). Smoke test Postman per Sanctum cookie/CSRF riuscito.
- Frontend: Vitest configurato con jsdom e React Testing Library; M1-005 verifica chat e schema Zod con 6 test.
- Frontend, M1-010: `pnpm test` riuscito con 10 file e 32 test; lint, typecheck e build riusciti. Smoke browser optimistic/infinite scroll da verificare localmente.
- Frontend: lint e typecheck verificati con Node `v24.19.0` e pnpm `11.20.0`; lint segnala un warning ESLint esistente ma nessun errore. Build Next.js `16.2.6` verificata localmente dallo sviluppatore: compilazione, TypeScript e generazione delle pagine statiche riusciti.
- Frontend, M2-004: `pnpm exec vitest run lib/echo.test.ts` (5 test), la
  regressione `auth.service.test.ts` (9 test), lint e typecheck sono riusciti
  nel sandbox. `pnpm build` e' riuscito localmente dallo sviluppatore con
  Next.js `16.2.6`. Lo smoke browser autenticato del 2026-08-20 ha mostrato
  `Subscribed to private-chat` con Lerd e Reverb attivi.
- Frontend, M2-005: i test mirati di schema/hook/ChatPage sono riusciti (23
  test), cosi' come lint e typecheck. La suite Vitest standard e' riuscita
  localmente dallo sviluppatore (13 file, 67 test), la build Next.js e' riuscita
  e lo smoke runtime autenticato ha ricevuto gli eventi create/update/delete.
  Una ripetizione finale nel sandbox ha confermato i 67 test, typecheck e lint;
  la build qui non puo' scaricare il font remoto `Outfit` da Google Fonts.
- Backend, M1-003: suite Pest (3 test, 10 assertion), Pint completo (28 file) e PHPStan con `--memory-limit=512M` verificati localmente dallo sviluppatore.
- Backend, M2-003: prima della revisione `composer test` era riuscito (28
  test, 170 assertion, 1 skipped), con Pint e PHPStan a 0 errori e smoke Reverb
  riuscito. Dopo la revisione `composer test` e' riuscito con 29 test e 172
  assertion, `./vendor/bin/pint --test` e
  `./vendor/bin/phpstan analyse --memory-limit=512M` sono riusciti senza errori.

## Problemi conosciuti

- Git e' inizializzato nella root e non ci sono repository annidati; ogni
  modifica del task va riesaminata nel diff prima dello staging.
- Il sandbox dell'agente non puo' raggiungere il D-Bus della sessione Lerd dello sviluppatore. I test locali Lerd sono comunque verificabili dallo sviluppatore e vanno riportati con output completo.
- Il sandbox non espone `composer`; per M1-003 i controlli backend non erano avviabili (exit 127).
- PHPStan richiede il limite CLI `--memory-limit=512M` nell’ambiente locale dello sviluppatore.
- Nel sandbox corrente PHP è `8.3.6`, mentre le dipendenze installate richiedono PHP `>= 8.4.1`; PHPStan non può quindi avviarsi. `composer` non è installato nel PATH del sandbox, perciò Pest non può essere eseguito qui.
- M1-008: Lerd non è avviabile nel sandbox perché non può raggiungere il D-Bus della sessione dello sviluppatore. Le verifiche locali di Pest e PHPStan e Pint completo nel sandbox sono riusciti. Lo smoke browser è rinviato al prossimo task frontend per decisione esplicita.
- M1-009: lint, typecheck, build e 28 test frontend sono riusciti; smoke browser Sanctum per login, register, logout, credenziali non valide, email già registrata ed errore sessione riuscito.
- M2-003: il post-script Composer `php artisan boost:update` fallisce perche'
  Boost non e' configurato, dopo che Composer ha gia' installato e bloccato le
  dipendenze Reverb/Pusher.
- M2-003: nel sandbox il wrapper PHP 8.5 non puo' avviare Lerd senza accesso al
  D-Bus; i controlli backend sono stati eseguiti tramite il runtime locale
  autorizzato.
- M2-005: lo smoke richiede backend, Reverb, Next.js e una sessione Sanctum
  autenticata, non disponibili nel sandbox; la prova e' stata eseguita
  localmente dallo sviluppatore con esito positivo.
- La build frontend nel sandbox puo' fallire prima della compilazione perche'
  non ha connettivita' verso Google Fonts; la verifica locale dell'ambiente di
  sviluppo resta necessaria per `next/font` remoto.

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
- M2-001, 2026-08-14: verifica locale PHP 8.5 Lerd riuscita per `composer test` (25 test, 158 assertion, inclusi i cinque `MessageBroadcastingTest`), `./vendor/bin/pint --test` e `./vendor/bin/phpstan analyse --memory-limit=512M` (0 errori).
