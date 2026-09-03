# M5-005 — Esporre stack Compose con Nginx, HTTPS e WSS

- **Stato:** proposta
- **Milestone:** Milestone 5 — Docker
- **Data di apertura:** 2026-09-03
- **Data di chiusura:**
- **Dipendenze:** M5-001, M5-002, M5-003, M5-004

## Contesto

Il progetto usa cookie Sanctum sicuri, CORS e private channel. Il profilo locale
resta HTTPS/WSS: un forwarding HTTP non dimostrerebbe il contratto browser. L'host
dispone gia' delle risoluzioni `app.simple-chat.test` e `api.simple-chat.test` e
di un certificato locale non versionato per il primo dominio.

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
- `.gitignore`, solo per certificati e file locali Compose non tracciati
- `docs/learning/docker-compose.md`
- Questo task

## File non modificabili

- Certificati, chiavi private e `.env` locali; codice di dominio, lockfile,
  dipendenze, `.lerd.yaml` e infrastruttura di produzione.

## Requisiti

- Nginx e' l'unico servizio con porte host dell'applicazione e pubblica `8443`;
  PostgreSQL, Redis, backend, Reverb e frontend restano privati alla rete.
- I domini sono `app.simple-chat.test` e `api.simple-chat.test`; la guida
  richiede mapping a `127.0.0.1` senza dipendere dal DNS Lerd.
- I certificati locali sono montati read-only e ignorati da Git. La guida spiega
  come rigenerarli/affidarli con `mkcert`, senza inserire chiavi nel repository.
- Nginx inoltra frontend, API e upgrade WebSocket Reverb preservando host e
  header necessari. Browser HTTPS/WSS usa `8443`; Laravel usa Reverb interno.
- CORS, `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN`, URL frontend/backend e
  origini Reverb riflettono esattamente schema, host e porta esposti.
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
- `docker compose --env-file compose.env up -d`
- `docker compose --env-file compose.env ps`
- `docker compose --env-file compose.env logs --tail=100 nginx backend reverb horizon`
- `curl --fail --cacert <certificato-locale> --resolve api.simple-chat.test:8443:127.0.0.1 https://api.simple-chat.test:8443/up`
- `docker compose --env-file compose.env exec backend composer test`
- `docker compose --env-file compose.env exec backend ./vendor/bin/pint --test`
- `docker compose --env-file compose.env exec backend ./vendor/bin/phpstan analyse --memory-limit=512M`
- `docker compose --env-file compose.env exec frontend pnpm test`
- `docker compose --env-file compose.env exec frontend pnpm lint`
- `docker compose --env-file compose.env exec frontend pnpm typecheck`
- `docker compose --env-file compose.env exec frontend pnpm build`
- `docker compose --env-file compose.env down`
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [ ] `docker compose up` avvia l'intero stack senza Lerd.
- [ ] Entrambi i domini rispondono tramite Nginx HTTPS sulla sola `8443`; il
  browser considera attendibile il certificato locale.
- [ ] Login Sanctum e CSRF funzionano senza aggirare CORS, cookie secure o
  autorizzazione server-side.
- [ ] Due browser autenticati ricevono CREATE, UPDATE e DELETE via WSS
  `private-chat` una sola volta, senza refresh; Horizon resta il consumer unico.
- [ ] Controlli backend/frontend hanno esito registrato e lo smoke distingue
  HTTP/persistenza, Horizon, frame WebSocket e risultato UI.
- [ ] I dati prova sono rimossi selettivamente; la documentazione non include
  certificati, chiavi, cookie, token, payload o stack trace.
- [ ] La guida Linux e la nota macOS/Windows distinguono verificato e non.

## Rischi e assunzioni

Lerd usa normalmente HTTPS 443 e DNS `.test`; `8443` e `/etc/hosts` evitano
collisioni. Il certificato attuale e' input locale: se non copre entrambi i
nomi, rigenerarlo con SAN appropriati invece di disabilitare TLS. La route
Laravel `/up` va verificata prima dello smoke e sostituita con healthcheck
esistente se il bootstrap non la espone.

## Verifica manuale

1. Con Lerd non avviato per il progetto, controllare domini verso `127.0.0.1`
   e certificato trusted dal browser.
2. Costruire e avviare Compose; verificare log Nginx, backend, Reverb e Horizon.
3. In due browser/profili isolati, autenticare utenti e controllare CSRF, auth
   canale e WSS.
4. Creare, modificare e cancellare un messaggio: osservare HTTP, job Horizon e
   una sola modifica nell'altro browser senza refresh.
5. Eliminare solo messaggi prova, arrestare senza `-v` e registrare esiti senza
   dati sensibili.

## Decisioni emerse

- Compose mantiene HTTPS/WSS e domini `.test` per non alterare Sanctum/realtime.
- Nginx e' il solo proxy e ingresso host; `8443` evita conflitto con la 443 Lerd.
- Linux e' verificato; macOS/Windows ricevono solo nota di adattamento.

## File modificati

## Risultati dei controlli

## Problemi residui

## Riepilogo finale
