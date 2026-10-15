# Simple Chat

Simple Chat è un progetto personale per imparare, con incrementi verificabili,
Laravel, Next.js, PostgreSQL, Redis, WebSocket e Docker. L'MVP è una sola chat
di gruppo per utenti autenticati: registrazione, login/logout, cronologia,
invio, modifica ed eliminazione dei propri messaggi e aggiornamenti realtime.

La [demo Render](https://simple-chat-nazariodicataldo.onrender.com)
può impiegare circa un minuto per risvegliarsi dopo l'inattività. Non inserire
dati personali, segreti o password riutilizzate: la registrazione è aperta e i
dati di prova possono restare nel database.

## Funzionalità e stack

- Laravel 13, PHP 8.5, Sanctum e API HTTP;
- Next.js 16, TypeScript, TanStack Query, React Hook Form e Zod;
- PostgreSQL come fonte persistente dei messaggi;
- Redis, Horizon e Reverb per queue e realtime;
- Docker Compose e Nginx con HTTPS/WSS locale;
- Playwright a due BrowserContext, Vitest, PHPUnit, Pint, PHPStan, lint e
  typecheck;
- immagine production Docker unica pubblicata su Render Free, con Neon e
  Upstash come provider esterni.

## Architettura in tre mappe

Preparazione locale:

```text
checkout Git
  -> Docker / Compose
     -> immagini e volumi locali
        -> migration PostgreSQL
           -> Nginx HTTPS
              -> test HTTP, queue e realtime
```

Confini host/container in locale:

```text
HOST
  .cert/ + compose.env + codice montato
       |
       v
CONTAINER NETWORK: Nginx :443
  -> frontend Next.js
  -> backend PHP-FPM -> postgres
  -> Reverb -> redis
  -> Horizon -> redis/default

HOST pubblica solo 127.0.0.1:8443; postgres, redis, PHP-FPM e Reverb restano
privati nella rete Compose.
```

Confini Internet/container/provider in production:

```text
Browser HTTPS/WSS
  -> TLS Render
     -> container Docker unico
        -> Nginx -> Next.js / Laravel / Reverb / Horizon
           -> Neon PostgreSQL
           -> Upstash Redis/TLS
```

Neon conserva i dati persistenti; Upstash conserva i job Redis. Il container
Render unico concentra pagina, API, queue e realtime: un suo riavvio li rende
indisponibili insieme.

## Quickstart locale con Docker Compose

Prerequisiti: Docker Compose, `mkcert` e la CA locale installata. Il percorso
principale è Compose; Lerd è soltanto l'alternativa storica già usata nelle
prime milestone.

Dalla root del repository:

```sh
cp compose.env.example compose.env
cp backend/.env.example backend/.env
docker compose --env-file compose.env run --build --rm --no-deps backend \
  php artisan key:generate
mkdir -p .cert
mkcert -install
mkcert -cert-file .cert/simple-chat.test.pem \
  -key-file .cert/simple-chat.test-key.pem \
  app.simple-chat.test api.simple-chat.test
cp "$(mkcert -CAROOT)/rootCA.pem" .cert/mkcert-root-ca.pem
docker compose --env-file compose.env config --quiet
docker compose --env-file compose.env up -d
docker compose --env-file compose.env ps
```

`backend/.env` contiene la chiave locale ed è ignorato da Git: non condividerlo.

Gli host locali devono risolvere a `127.0.0.1`:

```text
127.0.0.1 app.simple-chat.test api.simple-chat.test
```

URL utili:

- applicazione: `https://app.simple-chat.test:8443/`;
- health Laravel: `https://api.simple-chat.test:8443/up`;
- API: `https://api.simple-chat.test:8443/api`.

Controlli essenziali:

```sh
curl --fail --cacert .cert/mkcert-root-ca.pem \
  -H 'Accept: application/json' \
  --resolve api.simple-chat.test:8443:127.0.0.1 \
  https://api.simple-chat.test:8443/up
docker compose --env-file compose.env run --rm --no-deps frontend pnpm test
docker compose --env-file compose.env run --rm --no-deps frontend pnpm lint
docker compose --env-file compose.env run --rm --no-deps frontend pnpm typecheck
docker compose --env-file compose.env exec backend composer test
```

Per lo smoke realtime reale, autenticato e a due sessioni:

Con i servizi Compose già avviati, prepara Chromium una volta sul computer
host. Servono Node.js 24.19.0 e Corepack; dalla root esegui:

```sh
(
cd frontend
corepack pnpm install --frozen-lockfile
corepack pnpm exec playwright install chromium
corepack pnpm e2e
)
```

Al termine usa `docker compose --env-file compose.env down`, senza `-v`, per
conservare i volumi locali. Il comando `down -v` è distruttivo.

## Documentazione e deploy

- [Runbook deployment Render](docs/runbooks/deployment-render.md): procedura
  manuale per provider, deploy, rollback, verifica e backup;
- [Guida learning Render](docs/learning/deployment-render.md): teoria,
  motivazioni, compromessi ed evidenze delle milestone M7;
- [Indice documentale](docs/README.md): stato, architettura, roadmap, task e
  decisioni;
- [Stato corrente](docs/project/current-state.md): ciò che è stato verificato e
  ciò che resta aperto.

## Stato e limiti

La Milestone 7 è un deployment pubblico dimostrativo su piani gratuiti. Render
può fare spin-down, riavviare il servizio e limitare memoria, ore, banda e
log; Neon e Upstash hanno quote Free proprie. l backup verificato di M7-008 è manuale e
datato.

Il repository non ha ancora una licenza open source. L'uso del codice resta
quindi soggetto alle condizioni applicabili al progetto personale, senza
assumere una licenza permissiva.
