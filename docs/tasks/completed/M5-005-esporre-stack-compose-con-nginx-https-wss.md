# M5-005 — Esporre stack Compose con Nginx, HTTPS e WSS

- **Stato:** completato
- **Milestone:** Milestone 5 — Docker
- **Data di apertura:** 2026-09-03
- **Data di chiusura:** 2026-09-08
- **Dipendenze:** M5-001, M5-002, M5-003, M5-004

## Contesto

Il progetto usa cookie Sanctum sicuri, CORS e private channel. Il profilo locale
resta HTTPS/WSS: un forwarding HTTP non dimostrerebbe il contratto browser.
Compose deve quindi fornire le risoluzioni locali, il trust TLS e il routing che
Lerd forniva in precedenza, senza riusarne DNS, rete o certificati.

## Obiettivo

Aggiungere un solo reverse proxy Nginx al Compose, esposto sulla porta host
`8443`, che termini TLS con certificati locali montati read-only e instradi
frontend, API Laravel e WebSocket Reverb. Verificare il flusso reale con due
browser senza Lerd.

## Fuori scope

- Certificati produzione, ACME, dominio pubblico, HTTP/3, caching, load
  balancing e deployment.
- Supporto verificato macOS/Windows, pur documentandone host mapping e trust CA.
- Playwright/CI della Milestone 6 o cambi a dominio Message, retry policy e API.
- Comandi distruttivi su volumi, job o dati fuori dallo scenario di prova.

## File modificabili

- `compose.yaml`
- `docker/nginx/` per la sola configurazione Nginx necessaria
- `compose.env.example`
- `backend/.env.example` e configurazioni direttamente necessarie a CORS,
  Sanctum, Reverb o URL Compose
- `frontend/.env.example` e `frontend/next.config.ts` direttamente necessari a
  `https://app.simple-chat.test:8443`
- Test backend e frontend direttamente interessati dalla modifica di origine,
  porta o configurazione pubblica
- `.gitignore`, solo per certificati e file locali Compose non tracciati
- `docs/learning/docker.md`
- `docs/project/current-state.md`
- Questo task

## File non modificabili

- Certificati, chiavi private e `.env` locali; codice di dominio, lockfile,
  dipendenze, `.lerd.yaml` e infrastruttura di produzione.

## Requisiti

- Nginx e' l'unico servizio con porte host dell'applicazione e pubblica soltanto
  `127.0.0.1:8443:443`; PostgreSQL, Redis, backend, Reverb e frontend restano
  privati alla rete Compose.
- I domini sono `app.simple-chat.test` e `api.simple-chat.test`; la guida
  richiede mapping a `127.0.0.1` senza dipendere dal DNS Lerd.
- La directory locale `.cert/` e' ignorata da Git. Contiene un certificato mkcert
  con SAN per entrambi i domini, la chiave privata e la CA pubblica locale;
  Nginx monta certificato e chiave read-only, il frontend monta soltanto la CA
  read-only per verificare l'API durante il rendering server-side.
- Nginx sceglie l'upstream dalla coppia host/percorso: `app.*` inoltra al
  frontend; `api.*` inoltra HTTP/FastCGI al backend, mentre `/app/...` e
  `/apps/...` inoltrano gli upgrade e le richieste Pusher/Reverb a Reverb.
  Preserva `Host`, `X-Forwarded-*` e gli header WebSocket necessari.
- Browser HTTPS e WSS usano rispettivamente
  `https://app.simple-chat.test:8443` e
  `https://api.simple-chat.test:8443`. Laravel e Horizon continuano a usare
  Reverb interno `http://reverb:8080`, senza passare da Nginx.
- CORS, `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN`, URL frontend/backend e
  origini Reverb riflettono esattamente schema, host e porta esposti. Il nome
  pubblico dell'API risolve anche dalla rete Compose verso Nginx, cosi' Next
  usa lo stesso URL per browser e rendering server-side senza bypass TLS.
- La guida contiene una nota non verificata per macOS/Windows: Compose resta
  uguale, host mapping e trust CA cambiano con il sistema operativo.

## Strategia di test

Prima validare Nginx e Compose. Poi, senza Lerd per questo progetto, eseguire
controlli backend/frontend nel container e smoke reale a due browser: login,
CREATE/UPDATE/DELETE, job Horizon, WSS, auth `private-chat` e una sola
riconciliazione per evento. Questa e' la prova DoD M5; fake e test unitari non
la sostituiscono.

## Comandi da eseguire

- `git status --short`
- `docker compose --env-file compose.env config --quiet`
- `docker compose --env-file compose.env build`
- `docker compose --env-file compose.env run --rm --no-deps frontend pnpm test`
- `docker compose --env-file compose.env run --rm --no-deps frontend pnpm lint`
- `docker compose --env-file compose.env run --rm --no-deps frontend pnpm typecheck`
- `docker compose --env-file compose.env run --rm --no-deps frontend pnpm build`
- `docker compose --env-file compose.env up -d`
- `docker compose --env-file compose.env ps`
- `docker compose --env-file compose.env logs --tail=100 nginx frontend backend reverb horizon`
- `curl --fail --cacert .cert/mkcert-root-ca.pem --resolve app.simple-chat.test:8443:127.0.0.1 https://app.simple-chat.test:8443/`
- `curl --fail --cacert .cert/mkcert-root-ca.pem --resolve api.simple-chat.test:8443:127.0.0.1 https://api.simple-chat.test:8443/up`
- `docker compose --env-file compose.env exec backend composer test`
- `docker compose --env-file compose.env exec backend ./vendor/bin/pint --test`
- `docker compose --env-file compose.env exec backend ./vendor/bin/phpstan analyse --memory-limit=512M`
- `docker compose --env-file compose.env down`
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [x] `docker compose up` avvia l'intero stack senza Lerd.
- [x] Entrambi i domini rispondono tramite Nginx HTTPS sulla sola `8443`; il
  browser considera attendibile il certificato SAN locale senza eccezioni TLS.
- [x] Login Sanctum e CSRF funzionano senza aggirare CORS, cookie secure o
  autorizzazione server-side.
- [x] Due browser autenticati ricevono CREATE, UPDATE e DELETE via WSS
  `private-chat` una sola volta, senza refresh; Horizon resta il consumer unico.
- [x] Controlli backend/frontend hanno esito registrato e lo smoke distingue
  HTTP/persistenza, Horizon, frame WebSocket e risultato UI.
- [x] I dati prova sono rimossi selettivamente; la documentazione non include
  certificati, chiavi, cookie, token, payload o stack trace.
- [x] La guida Linux e la nota macOS/Windows distinguono verificato e non.

## Rischi e assunzioni

Lerd usa normalmente HTTPS 443 e DNS `.test`; `8443` e `/etc/hosts` evitano
collisioni. Il certificato mkcert locale deve coprire entrambi i nomi con SAN;
il browser e Node devono fidarsi della stessa CA senza disabilitare TLS. La
route Laravel `/up` va verificata prima dello smoke e sostituita con
healthcheck esistente se il bootstrap non la espone. L'ADR 0003 descrive il
precedente profilo Lerd su `:3000` e `:443`; questo task definisce il profilo
Compose su `:8443` senza modificarlo fuori scope.

## Verifica manuale

1. Con Lerd non avviato per il progetto, configurare entrambi i domini verso
   `127.0.0.1`, installare la CA mkcert e verificare il certificato SAN trusted
   dal browser.
2. Costruire e avviare Compose; verificare log Nginx, backend, Reverb e Horizon.
3. In due browser/profili isolati, autenticare utenti e controllare CSRF, auth
   canale e WSS.
4. Creare, modificare e cancellare un messaggio: osservare HTTP, job Horizon e
   una sola modifica nell'altro browser senza refresh.
5. Eliminare solo messaggi prova, arrestare senza `-v` e registrare esiti senza
   dati sensibili.

## Decisioni emerse

- Compose mantiene HTTPS/WSS e domini `.test` per non alterare Sanctum/realtime.
- Nginx e' il solo proxy e ingresso host; `127.0.0.1:8443` evita conflitto con
  la 443 Lerd e non espone l'ambiente alla rete locale.
- La stessa porta host serve i due domini: Nginx usa l'header `Host` per
  distinguere frontend (`app.*`) e API/Reverb (`api.*`), non una porta per
  applicazione.
- `.cert/` e' un input locale ignorato. Un solo certificato SAN copre i due
  domini; la CA locale e' montata al frontend per le richieste server-side.
- Lo smoke elimina selettivamente i soli messaggi di prova; gli utenti creati
  nei due profili browser non fanno parte della pulizia obbligatoria.
- Linux e' verificato; macOS/Windows ricevono solo nota di adattamento.
- Nginx ascolta anche sulla `8443` interna oltre alla `443` usata dal mapping
  host: il nome pubblico dell'API risolve verso Nginx dalla rete Compose e Next
  puo' quindi usare lo stesso URL HTTPS durante il rendering server-side.

## File modificati

- `.gitignore`
- `backend/.env.example`
- `backend/phpunit.xml`
- `backend/tests/Feature/Http/ChannelsTest.php`
- `backend/tests/Feature/Http/Controllers/AuthControllerTest.php`
- `compose.yaml`
- `docker/nginx/nginx.conf`
- `frontend/.env.example`
- `frontend/next.config.ts`
- `docs/learning/docker.md`
- `docs/project/current-state.md`

## Risultati dei controlli

- `docker compose --env-file compose.env config --quiet`: riuscito.
- `docker compose --env-file compose.env build`: non completato; il primo
  tentativo non ha potuto scrivere lo stato Buildx nel sandbox, il tentativo
  autorizzato ha avuto timeout DNS verso Docker Hub per PHP/Composer.
- `docker compose --env-file compose.env run --rm --no-deps frontend pnpm test`:
  riuscito, 15 file e 86 test.
- `docker compose --env-file compose.env run --rm --no-deps frontend pnpm lint`:
  riuscito.
- `docker compose --env-file compose.env run --rm --no-deps frontend pnpm typecheck`:
  riuscito.
- `docker compose --env-file compose.env run --rm --no-deps frontend pnpm build`:
  non riuscito per il download remoto del font `Outfit` da Google Fonts.
- `docker compose --env-file compose.env run --rm --no-deps backend composer test`:
  riuscito dopo l'aggiornamento dei test all'origine `:8443`, 41 test e 213
  assertion.
- `docker compose --env-file compose.env run --rm --no-deps backend ./vendor/bin/pint --test`:
  riuscito, 62 file.
- `docker compose --env-file compose.env run --rm --no-deps backend ./vendor/bin/phpstan analyse --memory-limit=512M`:
  riuscito, 42/42 senza errori.
- `nginx -t` in un container temporaneo con certificati self-signed in `/tmp`:
  riuscito; la configurazione e' sintatticamente valida.
- `docker compose --env-file compose.env up -d`: servizi privati avviati, ma
  Nginx terminato per l'assenza dei file mkcert in `.cert/`.
- Dopo la generazione locale dei tre file mkcert, `docker compose ... up -d` ha
  avviato tutti i sette servizi; PostgreSQL, Redis e Reverb risultano healthy,
  Nginx e' `Up` con il solo mapping `127.0.0.1:8443->443`.
- La richiesta server-side dal container frontend a
  `https://api.simple-chat.test:8443/api/user` falliva con `ECONNREFUSED`,
  mentre la stessa richiesta sulla `443` interna restituiva `401`.
- Aggiunti i listener interni `8443` ai due server HTTPS Nginx: dopo il riavvio,
  la richiesta server-side su `8443` restituisce `401 Unauthenticated.` e la
  pagina pubblica mostra il normale gate `Welcome back`/`Sign in to continue`.
- `docker compose ... exec nginx nginx -t` e' riuscito dopo la modifica; il
  `curl` pubblico sull'app ha risposto con HTML Next.js e i log mostrano il
  passaggio della richiesta API a Laravel con risposta `401` anonima.
- Smoke manuale riportato dallo sviluppatore il 2026-09-08: registrazione,
  creazione, modifica e cancellazione hanno raggiunto Firefox via WSS; gli
  eventi alle 10:21 locali corrispondono ai job Horizon alle 08:21 UTC, tutti
  conclusi con `DONE`.
- `docker compose --env-file compose.env build` ripetuto il 2026-09-08: non
  riuscito per `network is unreachable` durante il recupero dei token da
  Docker Hub per le immagini PHP/Composer.
- `docker compose --env-file compose.env build` ripetuto successivamente il
  2026-09-08: riuscito, con immagini backend e frontend costruite.
- `docker compose --env-file compose.env run --rm --no-deps frontend pnpm build`:
  riuscito, compilazione Next.js completata con route `/` dinamica e
  `/_not-found` statica.
- `docker compose --env-file compose.env exec backend composer test`, Pint e
  PHPStan: riusciti rispettivamente con 41 test/213 assertion, 62 file senza
  modifiche e 42/42 senza errori.
- Controlli finali HTTPS app/API: riusciti con status `200`; `queue:failed`
  non contiene job falliti; `docker compose ... down` e' riuscito senza `-v`.
- `docker compose --env-file compose.env down`: riuscito senza `-v`; container
  e rete rimossi, volumi preservati.

## Problemi residui

- I tre input locali mkcert sono input locali ignorati da Git e non fanno parte
  della consegna versionata.

## Riepilogo finale

La configurazione Compose/Nginx e' implementata, i certificati locali sono
disponibili, la build completa e' riuscita e il percorso server-side HTTPS e'
stato corretto e verificato. Lo smoke browser con WSS e Horizon e' stato
riportato come riuscito, i dati prova sono stati rimossi selettivamente e tutti
i criteri di accettazione sono verificati. M5-005 e' completato.
