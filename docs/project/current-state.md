# Stato corrente

- **Milestone corrente:** Milestone 6 — Test end-to-end e CI (avviata 2026-09-14).
- **Ultimo task completato:** M6-007 — Eliminare la race Reverb/cache nell'avvio
  Compose; M6-004, M6-005 e M6-006 sono stati chiusi con evidenza remota.
- **Task attivo:** nessuno.
- **Compilatore frontend:** locale: Turbopack; job GitHub Actions Realtime
  Compose E2E: Webpack. L'override CI usa ora Webpack; il profilo locale resta
  invariato con Turbopack.
- **Prossimo task suggerito:** selezionare il prossimo task pianificato della
  Milestone 6.
- **Ultimo aggiornamento:** 2026-09-20.

## Funzionalita' esistenti

- Skeleton Laravel 13 rilevato in `backend/` (framework `^13.8`, PHP `^8.5` dichiarato); Lerd gestisce runtime PHP 8.5, Composer e web server locale.
- Skeleton Next.js rilevato in `frontend/` (Next `16.2.6`, TypeScript).
- Il frontend Next.js implementa la chat HTTP su `/`: TanStack Query, Axios configurato con `NEXT_PUBLIC_BACKEND_URL`, CRUD messages riusabile, stati loading/error/empty, invio con React Hook Form e Zod, avatar DiceBear e componenti shadcn Message/MessageScroller/Skeleton.
- M1-003 ha introdotto il dominio utente con `first_name`, `last_name`, `username` e `UserResource` camelCase; password e dati sensibili non sono inclusi nella Resource.
- M1-004 ha introdotto il dominio Message con soft-delete, CRUD HTTP, Resource camelCase, policy di proprietà e test; M1-008 associa ora la creazione all'utente autenticato. Migration e smoke test Postman sono verificati sul database PostgreSQL locale Lerd.
- M1-006/M1-007 standardizzano le risposte riuscite del CRUD Message con `success`, `data`, `timestamp`, `message` e `code`; `DELETE` conserva `204 No Content`. `GET /api/messages` restituisce 20 record in ordine cronologico con cursor pagination e autore pubblico eager-loaded, senza email.
- M1-008 ha implementato Sanctum 4.3.3 per SPA cookie/CSRF, CORS con credenziali per `https://app.simple-chat.test:3000`, endpoint register/login/logout/user con risposte riuscite `ApiResponse` e protezione `auth:sanctum` per Message. La verifica backend con test, PHPStan, Pint e Postman è riuscita.
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
  test controlla la firma Pusher/Reverb con credenziali fittizie impostate dopo
  il bootstrap dal fixture Channels, che rigenera il driver Reverb e ricarica la
  dichiarazione applicativa del canale.
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
- M2-006 completa la riconciliazione degli eventi realtime con le pagine TanStack Query e la
  proiezione `localMessages`: create entra una sola volta, update/delete
  aggiornano entrambe le proiezioni e `updatedAt` impedisce che un refetch stale
  sovrascriva una versione piu' recente. Test automatici, build locale e smoke
  a due browser sono riusciti.
- M2-007 ha aggiunto una guard locale per sottoscrizione nel hook realtime: dopo
  il cleanup una callback storica non raggiunge il consumer, `lastEvent` o la
  riconciliazione. I test coprono StrictMode mount-cleanup-remount, rerender,
  integrazione ChatPage e una sola bubble/cache reconciliation; lint, typecheck,
  suite frontend e build sono riusciti. Lo smoke manuale HMR/Reverb in due
  browser ha verificato socket Reverb e HMR distinti, autorizzazione del canale,
  unsubscribe/subscribe e una sola bubble dopo Fast Refresh e rientro nella chat.
- M2-008 ha completato la verifica end-to-end della Milestone 2: Chrome e
  Firefox incognito, utenti distinti, CRUD realtime bidirezionale, refetch,
  policy/guest channel auth, cleanup/logout-login e una sola subscription sono
  verificati. M2-009 elimina il flash cache post-logout annullando e rimuovendo
  le query messaggi dopo logout riuscito; RED/GREEN, suite frontend e smoke
  bidirezionale sono riusciti.
- M3-001 configura Redis come queue predefinita `default` e il worker locale
  `composer queue:work` con tre tentativi, backoff 5 s e timeout 60 s.
- M3-002 passa i broadcast `MessageCreated`, `MessageUpdated` e
  `MessageDeleted` a `ShouldBroadcast` con `afterCommit=true` selettivo.
  Payload, FQCN, canale privato e contratti HTTP restano invariati; test
  automatici coprono un solo `BroadcastEvent` queued con FQCN esatto e
  commit/rollback della queue `database` reale isolata.
- M3-003 aggiunge il fixture dev/test `Tests\Fixtures\M3FailureTestJob` e il
  worker Composer dedicato alla sola queue Redis `m3-failure-test`. La prova
  Lerd ha verificato tre fallimenti, il record `failed_jobs` con UUID,
  connection, queue e marker non sensibile nell'eccezione, quindi il cleanup
  selettivo con `queue:forget`; non coinvolge Reverb, Echo o browser.
- M4-001 installa Horizon `v5.48.3` e rende `composer horizon` il consumer
  locale canonico di `redis/default`: il solo supervisor `local.chat-default`
  usa `simple`, un processo e la politica M3 (3 tentativi, backoff 5 s,
  timeout 60 s). `composer queue:work` resta diagnostico e non va eseguito in
  parallelo; M4-003 ha reso il fixture Reverb indipendente dall'ordine dei
  feature test. M4-002 protegge la dashboard anche in `local` con una lista
  configurabile di email: guest e utenti fuori lista ricevono `403`, mentre la
  sessione SPA HTTPS di `admin@admin.com` accede alla dashboard.
- M4-005 risolve ISS-004: CREATE e UPDATE caricano l'autore pubblico prima
  della serializzazione HTTP. M4-004 completa la Milestone 4: Horizon resta il
  solo consumer locale, rende visibili job completati e falliti e consente il
  retry selettivo dopo il recupero di Reverb, con consegna Echo senza refresh.
- ADR 0003 fissa HTTPS/WSS come profilo locale predefinito per SPA, API e
  browser-verso-Reverb. Il broadcaster Laravel mantiene il collegamento
  interno HTTP su `localhost:8080` verso Reverb; questa separazione evita
  mixed content e conserva semplice il traffico non esposto.
- Lerd configura PostgreSQL, Redis e Mailpit locali. M5-001 introduce la base
  Docker Compose con `compose.yaml`, senza servizi applicativi: il progetto usa
  il nome `simple-chat`, `postgres:17`, `redis:8-alpine`, un `compose.env`
  locale e Redis senza password nella rete privata. La validazione statica e
  runtime Linux ha verificato entrambi gli healthcheck, PostgreSQL, Redis e la
  persistenza del volume dopo `down`/`up`, oltre alla raggiungibilita' DNS/TCP
  fra container temporanei e i servizi. Docker e CI non sono ancora implementati.
- M5-002 aggiunge il backend PHP 8.5-FPM interno: sorgente Laravel in bind
  mount, mentre `vendor/`, cache Composer, `storage/` e `bootstrap/cache/`
  vivono in volumi Docker. L'avvio esegue `composer install`, migration dopo
  gli healthcheck PostgreSQL/Redis e poi PHP-FPM; Compose sovrascrive i soli
  valori database/Redis necessari per non dipendere da Lerd, neutralizzando
  anche eventuali `DB_URL` e `REDIS_URL` locali. La suite PHPUnit forza anche
  `$_SERVER` e verifica una connessione PDO SQLite in memoria dalle variabili
  Compose.
- M5-003 aggiunge il frontend Next.js di sviluppo: Node `24.19.0` e pnpm
  `11.20.0` nell'immagine, sorgente in bind mount e volumi nominati separati per
  `node_modules`, `.next` (inclusa la cache TypeScript) e cache pnpm. Il
  servizio espone temporaneamente `http://localhost:3000` soltanto su
  `127.0.0.1`, ascolta internamente su `0.0.0.0` e non dipende da backend,
  PostgreSQL o Redis. L'origine di sviluppo conserva
  `app.simple-chat.test` e aggiunge `localhost:3000`; HTTPS, proxy e prova chat
  completa restano M5-005.
- M5-004 aggiunge i servizi Compose `reverb` e `horizon`, entrambi basati
  sull'immagine backend e con comandi separati. Reverb ascolta su
  `0.0.0.0:8080` senza porta host pubblicata e diventa healthy con un controllo
  TCP interno su `127.0.0.1:8080`; Horizon attende Redis e Reverb healthy ed e'
  l'unico consumer di `redis/default`. Backend e Horizon usano
  `REVERB_HOST=reverb`, `REVERB_PORT=8080` e `REVERB_SCHEME=http`; il browser,
  HTTPS, proxy e WSS restano M5-005.
- M5-005 e' completato e la configurazione Nginx e' presente. Il suo contratto
  Compose e' un solo ingresso Nginx su
  `127.0.0.1:8443`: `app.simple-chat.test` raggiunge Next, mentre
  `api.simple-chat.test` raggiunge Laravel o Reverb secondo il percorso.
  PostgreSQL, Redis, backend, frontend e Reverb restano privati. `.cert/` e'
  ignorato e contiene input locali mkcert non versionati; il percorso
  server-side HTTPS verso l'API passa ora dalla `8443` interna di Nginx. Login,
  CRUD, WSS e Horizon sono stati verificati nello smoke browser; M5-005 e'
  completato.
- M6-001 aggiunge Playwright `1.63.0` come dev dependency frontend, il comando
  `pnpm e2e` e uno smoke Chromium reale contro
  `https://app.simple-chat.test:8443`. La configurazione non avvia servizi con
  `webServer`, non usa mock o fallback HTTP e mantiene la verifica TLS
  predefinita; gli spec `.e2e.ts` restano fuori dalla suite Vitest.
- M6-002 aggiunge lo scenario Playwright Chromium a due `BrowserContext`
  distinti: due registrazioni dalla UI, poi CREATE, UPDATE e DELETE di A
  ricevuti una sola volta da B senza refresh. Il test usa il Compose reale,
  attende l'apertura del socket e la subscription `private-chat` di Reverb,
  quindi rimuove i messaggi prova tramite la UI senza toccare utenti o volumi.
- M6-004 implementa il job GitHub effimero per lo scenario M6-002: il job
  genera CA e certificato SAN, inietta i path nell'environment e riusa
  `compose.yaml:compose.ci.yaml` per rimpiazzare i mount TLS locali e fornire
  la CA a Node. Il bootstrap CI installa Composer in modo sequenziale, poi
  avvia i servizi saltando solo il secondo `composer install` sul volume
  condiviso; directory runtime e migration restano gestite dall'entrypoint.
  Prima dell'avvio verifica la configurazione risolta, senza mount mkcert
  residui o duplicati, attende health/`✓ Ready`/HTTPS e poi esegue Chromium con
  `ignoreHTTPSErrors` soltanto tramite variabile esplicita. I run reali GitHub
  Actions hanno rilevato un crash Turbopack del frontend dopo la richiesta di
  readiness HTTPS; la causa interna di `/app/app` non e' stata identificata.
  M6-005 ha stabilizzato il percorso remoto con Webpack soltanto in CI.
- M6-005 implementa Webpack soltanto nell'override CI del frontend e rimuove il
  tracing Turbopack dall'ambiente CI; il Compose locale conserva il comando
  Turbopack. Il workflow verifica tutti i container e gli healthcheck subito
  prima di Playwright. Dopo il `422` del run `35255596983`, l'override CI
  imposta anche `APP_ENV=local` per backend, Reverb e Horizon; il job PHPUnit
  lo sovrascrive esplicitamente con `APP_ENV=testing`, broadcast nullo e coda
  sincrona. Dopo il payload nullo del run `35329235001`, backend e Horizon
  ricevono inoltre `BROADCAST_CONNECTION=reverb` e `QUEUE_CONNECTION=redis`
  soltanto nell'override CI. Il run automatico `35354527754` e i run manuali
  `35354983412` e `35356225323`, tutti sul commit
  `2ed245f8a8f66bde397cb35ca3498bc79f3e7274`, hanno concluso tutti i job con
  successo e superato i 2 test Playwright.
- M6-006 aggiorna soltanto i pin CI di `setup-node` a `v7.0.0` e
  `upload-artifact` a `v7.0.1`, entrambi con SHA immutabile e runtime action
  Node 24; Node progetto `24.19.0`, checkout, input, trigger, permessi e job
  restano invariati. Il run GitHub `35434871868` sul commit
  `7d77c28f41e5741b88561d976a0b1c67d499795a` ha superato i job `Realtime Compose
  E2E`, `frontend` e `backend`; i warning Node 20 delle action non compaiono.
- M6-007 implementa nel `compose.yaml` un healthcheck PHP-FPM del backend su
  `9000` (`start_period=60s`, intervallo 5 s, timeout 5 s, 24 retry) e rende
  Reverb dipendente da `backend: service_healthy`; Horizon resta protetto in
  modo transitivo. Il controllo CI conserva `always()` e ora fallisce con
  annotazione `::error` sia per log Reverb illeggibili sia per una sola
  occorrenza di `relation "cache" does not exist`. Tre cold start isolati hanno
  raggiunto backend/Reverb healthy e Horizon running senza race; il terzo ha
  superato Playwright HTTPS/WSS con 2 test. Il test negativo ha confermato che
  una migration fallita lascia backend `unhealthy` e Reverb non avviato. Il run
  GitHub `35518906231` sul commit `1865335ed0ecde98919281be057825397ba6592d`
  ha completato con successo i job `backend`, `frontend` e `Realtime Compose
  E2E`; quest'ultimo ha superato 2 test Playwright e il controllo anti-race ha
  confermato l'assenza di `relation "cache" does not exist`. M6-007 e'
  completato.

## Test esistenti

- M6-003, 2026-09-15: la configurazione Compose con override CI e' valida;
  backend (41 test, 213 assertion), Pint (62 file), PHPStan, frontend (15 file,
  86 test), lint, typecheck e build sono riusciti nei servizi dedicati con
  `--no-deps`. La build backend da immagini fresche e' riuscita; il test
  backend e' riuscito anche da una copia senza `backend/.env` grazie alla
  `APP_KEY` fittizia dell'override CI. Il run GitHub Actions `35000393537` e'
  riuscito sul commit `47baedd0aac3121f08f61f5c3c0b1f1ce1cd60f4`, con entrambi i
  job backend e frontend verdi.

- M6-001, 2026-09-14: con il Compose gia' avviato, `pnpm e2e` ha superato 1
  smoke Chromium in 8,1 s sulla pagina pubblica HTTPS reale; `pnpm test` ha
  superato 15 file e 86 test, `pnpm lint` e `pnpm typecheck` sono riusciti.
  `docker compose ... up -d`, `ps` e `down` senza `-v` hanno verificato avvio,
  stato dei servizi e arresto con volumi preservati.

- M6-002, 2026-09-15: `docker compose ... config --quiet`, avvio e stato dei
  sette servizi, `cd frontend && pnpm e2e` con 2 test Chromium superati in
  15,4 s, log backend/Reverb/Horizon/Nginx e `down` senza `-v` sono riusciti.
  Il percorso reale ha verificato registrazione UI, isolamento dei context,
  CREATE/UPDATE/DELETE via HTTP, Redis/default, Horizon, Reverb ed Echo,
  subscription privata, consegna singola a B e cleanup UI. `pnpm test` ha
  superato 15 file e 86 test; lint, typecheck, Prettier e `git diff --check`
  sono riusciti.

- M6-004, 2026-09-16: la validazione locale della CA/SAN e della configurazione
  risolta con `compose.yaml:compose.ci.yaml` ha verificato i tre mount TLS CI
  singoli e l'assenza di source `.cert/`; il filtro `jq` gestisce anche servizi
  senza `volumes` e continua a rifiutare residue `.cert/`. Il controllo statico
  delle action verifica SHA Git completi. La prima prova di avvio concorrente
  ha riprodotto una race Composer sul volume `backend-vendor`; il bootstrap CI
  sequenziale e il flag CI che salta solo Composer negli entrypoint la eliminano. Build/avvio
  completo locale, HTTPS `200`, Playwright realtime (`2 passed`), `pnpm test`
  (15 file, 86 test), test backend (41 test), Pint (62 file), PHPStan, lint,
  typecheck, parsing YAML e `git diff --check` sono riusciti. Il primo run
  GitHub Actions `35099896680` e `35103530177` hanno eseguito la richiesta di
  readiness HTTPS con esito `200`, poi Next terminava durante la compilazione
  Turbopack con l'errore `/app/app` e `next/package.json`; Nginx restituiva
  quindi `502` alle navigazioni Playwright. La root Turbopack esplicita non ha
  cambiato il secondo run. In quei run non era ancora presente un compilatore
  alternativo; M6-005 ha poi scelto Webpack esclusivamente per la CI, lasciando
  Turbopack in locale. Il run automatico `35354527754` e i due run manuali
  `35354983412` e `35356225323` sullo stesso commit sono poi riusciti; M6-004
  e' completato.
  La riproduzione manuale successiva ha superato mount TLS (`jq: true`),
  build/avvio, health, HTTPS e Playwright realtime (`2 passed`); una prima
  attesa `✓ Ready` è scaduta mentre il log frontend mostrava già la readiness,
  poi il controllo diretto ha restituito
  `docker compose exit=0; grep exit=0`. Il cleanup `down -v` ha rimosso tutti i
  container, volumi e la rete del progetto manuale.
  Lo stress test successivo ha passato `CI=true` nel frontend e limiti
  temporanei (frontend 2 CPU/2 GB, servizi dipendenti limitati), ha raggiunto
  `✓ Ready` in 7 s dopo la ricreazione del frontend e ha superato tre run E2E
  consecutivi (`2 passed`, `failures=0/3`) senza cleanup intermedio. Il run
  monitorato ha superato Playwright (`2 passed`), ha osservato il frontend a
  circa 1,06 GiB su 2 GiB e nessun container in OOM o riavvio; HTTPS ha
  risposto in 24,3 s, quindi la variabilità di readiness resta un indizio di
  timing ma non una prova di esaurimento risorse. I log hanno separato la
  prima richiesta (`GET / 200 in 21,2 s`: Next 18,7 s, application-code 2,5 s)
  dalla seconda (`289 ms`: Next 17 ms), confermando una compilazione a freddo
  lenta ma riuscita, non un ritardo DNS/TLS o un crash.
È stato aggiunto temporaneamente un marker in `frontend/next.config.ts`; il run
GitHub `35204557100` ha registrato `cwd` e `import.meta.dirname` uguali a
`/app`, mentre Turbopack ha comunque cercato `next/package.json` in `/app/app`.
Il run `35206662901` ha raccolto `.next/dev/trace-turbopack`: la trace mostra
attivita' e risoluzioni sotto `/app`, ma non contiene un evento filtrabile con
`/app/app`; la causa interna resta non identificata.

- M6-005, 2026-09-17: l'override Compose CI risolve `pnpm exec next dev
  --webpack` e non imposta `NEXT_TURBOPACK_TRACING`; il Compose locale conserva
  il `CMD` `pnpm dev` dell'immagine. La configurazione con environment CI
  verifica i tre mount TLS singoli senza source `.cert/` e ora consegna
  `APP_ENV=local` a backend, Reverb e Horizon; il profilo locale resta
  invariato. Il job backend passa `APP_ENV=testing` soltanto a PHPUnit dopo
  aver riprodotto due `419` con il valore `local`; il test completo locale ora
  supera 41 test e 213 assertion. L'override aggiunge inoltre
  `BROADCAST_CONNECTION=reverb` e `QUEUE_CONNECTION=redis` a backend e
  Horizon; il job PHPUnit forza `null` e `sync` per non dipendere da Redis
  quando viene eseguito con `--no-deps`. Il workflow YAML e' valido e il
  controllo pre-Playwright richiede i sette servizi `running` e gli healthcheck
  `healthy`. Dopo la ricreazione locale dei soli servizi backend, Reverb e
  Horizon con le nuove variabili, Playwright reale HTTPS/WSS ha superato 2 test
  in 18,2 s. Il run automatico GitHub `35354527754` e i run manuali
  `35354983412` e `35356225323` sullo stesso commit hanno poi superato tutti i
  job e i 2 test realtime.

- M6-006, 2026-09-19: i tag ufficiali `setup-node@v7.0.0` e
  `upload-artifact@v7.0.1` risolvono agli SHA previsti e i manifest dichiarano
  `runs.using: node24`. Il parser PyYAML, il controllo statico dei pin e
  `git diff --check` sono riusciti. Il run GitHub `35434871868` sul commit
  `7d77c28f41e5741b88561d976a0b1c67d499795a` ha completato con successo tutti
  i job; la ricerca dei marker Node 20 non ha trovato warning delle action.

- M6-007, 2026-09-20: `docker compose config --quiet` locale e CI sono
  riusciti. Tre cold start con progetti e volumi usa-e-getta hanno misurato
  Composer 24-31 s e backend healthy 54-64 s dopo il bootstrap; Reverb e'
  diventato healthy solo dopo il backend e Horizon e' rimasto running. I log
  Reverb/Horizon sono privi della race cache. Il test negativo con conflitto
  sulla tabella `users` ha lasciato backend `exited`/`unhealthy` e Reverb
  `created`. L'ultimo ciclo ha superato `corepack pnpm e2e` con 2 test in 15,2 s
  dopo la readiness `✓ Ready` di Next e HTTPS. Il controllo shell anti-race ha
  restituito esito non zero per log illeggibili e race, zero per log puliti. Il
  workflow GitHub `35518906231` sul commit `1865335ed0ecde98919281be057825397ba6592d`
  ha completato con successo tutti i job. Il job `Realtime Compose E2E` ha
  verificato i servizi prima di Playwright, superato 2 test in 8,8 s e stampato
  `Race Reverb/cache non rilevata nei log del servizio.`; il teardown con volumi
  e' riuscito.

- La suite backend nei tre run verdi completa 213 assertion ma mostra 39
  warning non bloccanti. La riproduzione da checkout senza `.env` li attribuisce
  al bootstrap Laravel tramite `vlucas/phpdotenv`: PHPUnit 13 registra il
  `file_get_contents()` soppresso del file assente per ogni Feature test. Le
  ipotesi Roster, PAO e Boost sono escluse dal codice installato. La race
  Reverb sulla tabella `cache` resta separata e non e' verificabile dai run
  verdi, che raccolgono i log Compose completi soltanto in caso di failure.

- M5-004, 2026-09-07: `docker compose config --quiet`, build e avvio di
  PostgreSQL, Redis, backend, Reverb e Horizon riusciti. PostgreSQL e Redis
  sono healthy, Reverb e' healthy dopo il suo healthcheck TCP interno e
  `horizon:status` riporta Horizon running. Il feature test
  `MessageBroadcastingTest` ha superato 5 test e 22 assertion. Tinker ha creato
  un messaggio marcato, `MessageCreated` e' stato completato da Horizon,
  `queues:default` e' tornata vuota, `masters=1`, `supervisors=1` e
  `queue:failed` e' rimasta vuota; il messaggio e' stato eliminato per ID.
  Reverb e Horizon sono stati poi fermati lasciando attivi backend, PostgreSQL
  e Redis. Non e' stata dichiarata la consegna browser.

- M5-005, 2026-09-07: `docker compose config --quiet`, suite frontend (15 file,
  86 test), lint, typecheck, suite backend (41 test, 213 assertion), Pint (62
  file), PHPStan (42/42) e `nginx -t` con certificati temporanei in `/tmp` sono
  riusciti. Il build Compose non ha potuto risolvere inizialmente le immagini
  Docker Hub e la build Next non ha potuto scaricare `Outfit` da Google Fonts.
  L'avvio Compose ha verificato PostgreSQL, Redis, backend, frontend, Reverb e
  Horizon, ma Nginx si e' fermato per i file mkcert locali assenti; nessun
  dominio HTTPS, login browser, WSS o smoke a due browser e' quindi dichiarato.

- M5-005, 2026-09-08: dopo la generazione locale dei certificati mkcert,
  Compose ha avviato tutti i sette servizi e Nginx e' rimasto `Up` sul solo
  mapping `127.0.0.1:8443->443`. Il rendering server-side falliva perche'
  `api.simple-chat.test:8443` raggiungeva Nginx dalla rete Compose ma Nginx
  ascoltava solo sulla `443` interna; la configurazione e' stata corretta con
  un listener interno aggiuntivo su `8443`. `nginx -t` e' riuscito, la richiesta
  Node dal frontend a `/api/user` ha restituito `401 Unauthenticated.` e la
  pagina pubblica ha mostrato il gate di autenticazione. Login, WSS e smoke a
  due browser restano da verificare.

- M5-003, 2026-09-06/07: Compose config e build dell'immagine frontend sono
  riusciti. Nei container temporanei `pnpm test` ha superato 15 file e 86 test;
  lint, typecheck e build Next.js sono riusciti e sono stati rieseguiti dopo la
  revisione. La revisione ha limitato la porta host a `127.0.0.1:3000` e
  collocato la cache incrementale TypeScript in `.next`, il volume frontend:
  typecheck, build, mapping loopback e richiesta HTTP `200` sono verificati.
  Next dev ha risposto su `localhost:3000` con il previsto `SessionError` senza
  backend e la prova browser ha confermato HMR dopo una modifica temporanea poi
  annullata. I tre dati generati sono risultati nei volumi e sono rimasti dopo
  `docker compose down` senza `-v`.

- M5-002, 2026-09-03: build backend PHP `8.5.10` riuscito con estensioni
  PostgreSQL/Redis/Laravel; PostgreSQL e Redis healthy, quattro migration
  applicate e PHP-FPM attivo senza porta host. `composer test` (40 test, 210
  assertion), Pint (61 file) e PHPStan (42 file, 0 errori) sono riusciti nel
  container. Il primo run ha rivelato la precedenza di `$_SERVER` Docker sul
  test SQLite; la riproduzione mirata e il fix PHPUnit sono verificati prima
  della suite finale. Il follow-up di revisione del 2026-09-04 ha neutralizzato
  `DB_URL` e `REDIS_URL` locali e aggiunto il test PDO SQLite; `composer test`
  ha poi superato 41 test e 213 assertion, Pint 62 file e PHPStan 42 file.

- M5-001, 2026-09-03: `docker compose config --quiet` riuscito; PostgreSQL e
  Redis avviati `healthy`, `pg_isready` e `PONG` riusciti. Il record innocuo
  `5001` e' rimasto nel volume PostgreSQL dopo `down` e un nuovo `up`; client
  temporanei hanno verificato DNS/TCP verso `postgres` e `redis`.

- M4-004, 2026-09-02: smoke runtime Horizon riuscito con CREATE/UPDATE/DELETE,
  job fallito dopo tre tentativi e retry selettivo dopo la risottoscrizione
  `private-chat`; `composer test` 40/210, Pint, PHPStan, Vitest normale e
  seriale 15/87, lint, typecheck e build Next.js riusciti. Un primo download
  Google Fonts ha bloccato la build, poi riuscita alla ripetizione.

- Backend, M4-001: `composer test` ha superato 36 test e 194 assertion nel
  runtime Lerd; Pint e PHPStan sono riusciti senza errori. `composer horizon`
  e `horizon:status` hanno verificato il master locale, poi arrestato con
  `horizon:terminate`.
- Backend, M4-002: il test della route reale Horizon (4 test, 6 assertion),
  Pint, PHPStan e la suite (40 test, 200 assertion) sono riusciti nel runtime
  Lerd. Lo smoke SPA HTTPS ha verificato `403` per guest e utente fuori lista,
  oltre ai `200` delle richieste dashboard per `admin@admin.com`.
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
- Frontend, M2-006: 39 test mirati, `pnpm test` (14 file, 80 test), lint e
  typecheck sono riusciti nel sandbox. La build nel sandbox resta bloccata dal
  download remoto di `Outfit`, ma `pnpm build` e lo smoke a due browser sono
  riusciti localmente il 2026-08-22.
- Frontend, M2-007, 2026-08-24: test mirati hook/integration (25 test), `pnpm
  test` (14 file, 83 test), `pnpm lint`, `pnpm typecheck` e `pnpm build` sono
  riusciti. La prima build sandbox e' fallita soltanto sul download remoto di
  `Outfit`; la build ripetuta con rete autorizzata e' riuscita. Smoke manuale
  HMR/Reverb in due browser riuscito: Reverb WSS e HMR WSS hanno restituito
  `101 Switching Protocols`, `/broadcasting/auth` `200 OK`, il canale
  `private-chat` ha completato unsubscribe/subscribe e il messaggio di prova
  dopo il rientro e' apparso in una sola bubble, senza errori in console.
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
- M5-005: i certificati locali mkcert sono input ignorati e disponibili solo
  nel workspace; non fanno parte della consegna versionata. Build Compose,
  build Next, login Sanctum, WSS e smoke a due browser sono verificati.

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
- M2-007, 2026-08-24: da `frontend/`, test mirati (25 test) e suite `pnpm
  test` (14 file, 83 test) riusciti; `pnpm lint`, `pnpm typecheck` e `pnpm build`
  riusciti. La build ha richiesto accesso di rete per il font remoto `Outfit`.
  Smoke manuale HMR/Reverb riuscito con handshake WSS `101`, autorizzazione
  `200`, nuova subscription `private-chat`, evento `MessageCreated` ricevuto
  e una sola bubble dopo il rientro nella chat.
- M3-002, 2026-08-28: il fix post-review ha dimostrato in RED che un doppio
  dispatch passava il test HTTP precedente; ora CREATE, UPDATE e DELETE
  verificano un solo `BroadcastEvent` e FQCN esatto. Nel runtime Lerd,
  `composer test` e' riuscito con 35 test e 188 assertion, cosi' come
  `./vendor/bin/pint --test` e PHPStan con `--memory-limit=512M`.
- M3-003, 2026-08-28: RED/GREEN del fixture riusciti nel runtime Lerd; la
  prova Redis/PostgreSQL locale ha prodotto tre tentativi e un failed job
  isolato, poi ha verificato marker, UUID, connection e queue prima del
  cleanup. `composer test` e' riuscito con 36 test e 194 assertion; Pint e
  PHPStan non hanno segnalato errori.
- M3-004, 2026-08-29: smoke end-to-end riuscito con worker fermo/attivo e
  Reverb fermo/riavviato. Sono verificati job pendente, tre failure Redis,
  `failed_jobs`, Tinker read-only, reconnect Echo, `queue:retry`, cleanup e
  assenza di duplicati. `composer test` (36 test, 194 assertion), Pint,
  PHPStan, `pnpm test` (15 file, 85 test), lint, typecheck e build sono
  riusciti.

- M5-004, 2026-09-07: `docker compose --env-file compose.env config --quiet`,
  test statico di riuso immagine RED/GREEN, feature test HTTP mirato (5 test,
  22 assertion), build/avvio runtime,
  `horizon:status`, log Reverb/Horizon, prova Tinker con job completato,
  `queue:failed`, controllo dei conteggi Horizon e stop selettivo dei due
  servizi sono riusciti. Il controllo ha trovato e corretto l'ereditarieta'
  dell'host PostgreSQL Lerd nel boot Reverb aggiungendo gli override DB Compose;
  la verifica successiva ha riportato Reverb healthy e log di avvio su
  `0.0.0.0:8080`.

- M5-005, 2026-09-07: `docker compose --env-file compose.env config --quiet`,
  `docker compose ... build` (bloccato inizialmente dal DNS Docker Hub),
  test/lint/typecheck frontend riusciti, build frontend bloccata dal download
  di Outfit, suite backend riuscita dopo l'allineamento dei test all'origine
  `:8443`, Pint, PHPStan, `nginx -t` con certificato temporaneo e `docker
  compose ... down` riusciti. `docker compose ... up -d` ha avviato i servizi
  privati ma Nginx ha terminato per l'assenza dei certificati mkcert locali;
  smoke HTTPS/WSS e verifica browser non eseguiti.

- M5-005, 2026-09-08: `docker compose ... up -d`, `ps`, log, `nginx -t`,
  richiesta HTTPS server-side dal frontend su `api.simple-chat.test:8443` e
  richiesta pubblica alla pagina app riusciti dopo l'aggiunta del listener
  Nginx interno su `8443`; il gate sessione mostra ora il form di login invece
  dell'errore di verifica sessione.

- M5-005, 2026-09-08: lo sviluppatore ha riportato smoke browser con
  registrazione, creazione, modifica e cancellazione; Firefox ha ricevuto gli
  eventi WSS alle 10:21 locali, corrispondenti ai job Horizon `RUNNING` e
  `DONE` delle 08:21 UTC. La build Compose ripetuta non e' riuscita per
  `network is unreachable` verso Docker Hub; pulizia selettiva dei dati prova,
  stop finale e chiusura del task restano da registrare.

- M5-005, 2026-09-08: build Compose e build Next.js riuscite; suite backend (41
  test, 213 assertion), Pint (62 file), PHPStan (42/42), controlli Nginx,
  HTTPS app/API e `queue:failed` sono riusciti. Lo stack e' stato arrestato con
  `docker compose ... down` senza `-v`; resta solo da registrare la pulizia
  selettiva dei messaggi prova prima della chiusura del task.

- M5-005, 2026-09-08: lo sviluppatore ha confermato la rimozione selettiva dei
  messaggi prova. Tutti i criteri di accettazione sono verificati e il task e'
  stato spostato in `docs/tasks/completed/`.
