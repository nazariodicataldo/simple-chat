# M5-003 — Containerizzare frontend Next.js

- **Stato:** completato
- **Milestone:** Milestone 5 — Docker
- **Data di apertura:** 2026-09-03
- **Data di chiusura:** 2026-09-07
- **Dipendenze:** M5-002

## Contesto

Il backend e le dipendenze locali sono disponibili in Docker. Questo task
aggiunge il processo Next.js di sviluppo, mantenendo modificabili i file
TypeScript e separando le dipendenze Node dal filesystem host.

## Obiettivo

Costruire e avviare il frontend Next.js in Compose con hot reload, variabili
pubbliche di sviluppo esplicite e controlli eseguiti nella Node dell'immagine.

## Fuori scope

- Certificati, domini `.test`, proxy Nginx e prova browser HTTPS/WSS.
- Reverb, Horizon, queue e ricezione realtime.
- Build immutabile di produzione, deploy o CI.
- Refactor UI, API o autenticazione non necessari al container.

## File modificabili

- `compose.yaml`
- `docker/frontend/Dockerfile`
- `docker/frontend/` per soli file di bootstrap necessari al container
- `.dockerignore`
- `compose.env.example`
- `frontend/.env.example`, solo per valori Compose non segreti
- `frontend/next.config.ts`, solo per un'origine di sviluppo dichiarata
- `frontend/tsconfig.json`, solo per collocare nel volume `.next` la cache
  incrementale generata dal typecheck containerizzato
- `docs/learning/docker.md`
- `docs/project/current-state.md`
- Questo task

## File non modificabili

- Codice delle feature frontend/backend, `.lerd.yaml`, lockfile e dipendenze,
  salvo una correzione direttamente richiesta dalla configurazione Docker.

## Requisiti

- L'immagine usa Node `24.19.0`, letto da `.nvmrc`, e pnpm `11.20.0`; il
  container usa package manager e lockfile esistenti, senza cambiare
  dipendenze per aggirare un problema di build.
- Il sorgente TypeScript e' un bind mount. `frontend-node-modules`,
  `frontend-next` e `pnpm-cache` sono volumi Docker nominati rispettivamente
  per dipendenze installate, output `.next` e store riusabile di pnpm.
- All'avvio il container esegue `pnpm install --frozen-lockfile`, poi il
  processo di sviluppo; non usa `node_modules` dell'host.
- HMR funziona sulla porta temporanea `127.0.0.1:3000:3000` in HTTP. Next ascolta su
  `0.0.0.0` nel container, mentre il browser apre `http://localhost:3000`;
  questa porta non e' il profilo HTTPS finale.
- `node_modules`, `.next` e la cache TypeScript incrementale non vengono
  tracciati o prodotti come artefatti dell'host dal container.
- Compose imposta `FRONTEND_URL=http://localhost:3000` e
  `NEXT_PUBLIC_BACKEND_URL=http://backend`; l'origine di sviluppo conserva
  `.test` e aggiunge `localhost:3000`. Le variabili `NEXT_PUBLIC_*`
  contengono solo endpoint e chiavi Reverb pubbliche, mai password Laravel,
  segreti o certificati.
- Il servizio frontend non ha `depends_on`: Next non accede a PostgreSQL o
  Redis e questa fase non prova la disponibilita' di Laravel.
- Il task dichiara che l'avvio Next non prova Sanctum, HTTPS, WSS o backend.
  Senza backend avviato, la pagina puo' mostrare `SessionError`: non e' una
  prova della chat ne' un errore dell'infrastruttura frontend.

## Strategia di test

Eseguire test, lint, typecheck e build in container temporanei dalla stessa
immagine prima di avviare `next dev`. Next 16 impedisce il build concorrente
con il server di sviluppo nello stesso progetto. Osservare HMR dopo un edit
non funzionale poi annullato; il test browser completo resta M5-005.

## Comandi da eseguire

- `git status --short`
- `docker compose --env-file compose.env config --quiet`
- `docker compose --env-file compose.env build frontend`
- `docker compose --env-file compose.env run --rm --no-deps frontend pnpm test`
- `docker compose --env-file compose.env run --rm --no-deps frontend pnpm lint`
- `docker compose --env-file compose.env run --rm --no-deps frontend pnpm typecheck`
- `docker compose --env-file compose.env run --rm --no-deps frontend pnpm build`
- `docker compose --env-file compose.env up -d frontend`
- `docker compose --env-file compose.env ps`
- `docker compose --env-file compose.env down`
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [x] Il frontend si costruisce e avvia senza Node, pnpm o Lerd dell'host.
- [x] Test, lint, typecheck e build hanno un esito registrato o una limitazione
  riproducibile e circoscritta.
- [x] Un edit e' visibile senza ricostruire l'immagine; dipendenze, output e
  store pnpm restano in volumi Docker e fuori da Git.
- [x] Le porte temporanee non sono presentate come profilo HTTPS finale.

## Rischi e assunzioni

Un bind mount puo' mascherare file prodotti nel build. Il task sceglie in modo
esplicito dove vivono `node_modules`, `.next` e lo store pnpm. Il build puo'
dipendere dal download remoto del font `Outfit`; se la rete lo blocca,
annotare il limite senza attribuirlo a Docker. Linux e' la sola piattaforma
verificata: su macOS e Windows il bind mount puo' rendere HMR sensibilmente
piu' lento.

## Verifica manuale

1. Costruire l'immagine ed eseguire i controlli nei container temporanei.
2. Avviare solo il frontend Compose e aprire la porta temporanea. Senza
   backend, `SessionError` e' atteso e non va interpretato come smoke chat.
3. Modificare un testo non funzionale e annullare la modifica dopo aver
   osservato HMR.
4. Verificare `git status`.
5. Arrestare il servizio senza toccare i dati PostgreSQL M5-001.

## Decisioni emerse

- Il frontend containerizzato serve sviluppo e HMR; l'accesso sicuro `.test`
  e' responsabilita' di M5-005.
- `.nvmrc` resta la fonte di verita' per Node `24.19.0`; pnpm e' fissato a
  `11.20.0` gia' verificato nel progetto.
- `.dockerignore` esclude selettivamente dipendenze, output, cache, file
  locali `.env`, certificati e log frontend; non esclude il sorgente.
- Il servizio usa bind mount per il sorgente e i volumi nominati
  `frontend-node-modules`, `frontend-next` e `pnpm-cache`. La cache pnpm
  conserva download riusabili, mentre `frontend-node-modules` contiene le
  dipendenze effettivamente usate dal processo.
- L'avvio esegue sempre `pnpm install --frozen-lockfile` prima di Next.
- L'install del container usa `--fetch-timeout 300000`: conserva lockfile,
  registry e retry predefiniti, ma tollera connessioni lente senza abortire
  un download ancora attivo.
- Il solo ingresso temporaneo e' `http://localhost:3000`, pubblicato
  esclusivamente su `127.0.0.1`; `0.0.0.0` e' l'indirizzo di ascolto interno
  al container, non l'URL del browser.
- `tsBuildInfoFile` porta la cache incrementale TypeScript in `.next`, il
  volume Docker che evita la sua creazione nel bind mount host.
- Il frontend non dipende da backend, PostgreSQL o Redis. Il valore interno
  `http://backend` consente il rendering server-side quando Laravel esiste,
  ma non e' risolvibile dal browser e non anticipa il proxy M5-005.
- I controlli precedono HMR in container `run --rm --no-deps`, per evitare il
  lock di Next 16 tra `next dev` e `next build`.

## File modificati

- `compose.yaml`
- `docker/frontend/Dockerfile`
- `docker/frontend/entrypoint.sh`
- `.dockerignore`
- `frontend/next.config.ts`
- `frontend/tsconfig.json`
- `docs/learning/docker.md`
- `docs/project/current-state.md`
- Questo task

## Risultati dei controlli

- `docker compose --env-file compose.env config --quiet`: riuscito.
- `docker compose --env-file compose.env build frontend`: riuscito con Node
  `24.19.0-bookworm-slim` e pnpm `11.20.0`.
- `docker compose --env-file compose.env run --rm --no-deps frontend pnpm test`:
  15 file e 86 test superati.
- I corrispondenti `pnpm lint`, `pnpm typecheck` e `pnpm build` nei container
  temporanei sono riusciti; la build ha compilato, controllato TypeScript e
  generato le quattro pagine.
- La correzione post-review limita il mapping a
  `127.0.0.1:3000->3000/tcp`, confermato da `docker compose port frontend
  3000`; Next continua ad ascoltare su `0.0.0.0` soltanto dentro il container.
- Dopo la correzione, `docker compose --env-file compose.env config --quiet` e
  `docker compose --env-file compose.env run --rm --no-deps frontend pnpm
  test`, `pnpm lint`, `pnpm typecheck` e `pnpm build` sono riusciti. La build
  ha generato `BUILD_ID` nel volume `.next`; la cache incrementale aggiornata
  e' risultata in `/app/.next/tsconfig.tsbuildinfo`, mentre l'eventuale
  artefatto host ignorato `frontend/tsconfig.tsbuildinfo` e' rimasto invariato.
- Dopo che i log Next hanno confermato `Ready`, una richiesta dall'host a
  `http://127.0.0.1:3000` ha risposto `200`. Il container di verifica e' stato
  poi fermato e rimosso senza toccare volumi o altri servizi.
- La verifica nel container ha trovato `/app/node_modules`, `/app/.next` e
  `/pnpm-cache/v11`. Dopo `docker compose down`, i tre volumi frontend erano
  ancora presenti insieme ai volumi esistenti.
- La verifica browser manuale ha confermato che una modifica temporanea al testo
  di `SessionError` appare senza refresh manuale ed e' stata annullata.

## Problemi residui

Nessuno per lo scope M5-003. HTTPS, domini `.test`, proxy, Sanctum, WSS e chat
con backend restano esplicitamente fuori scope e saranno affrontati in M5-005.

## Riepilogo finale

Il frontend di sviluppo ora usa Compose con bind mount del sorgente, volumi
persistenti per dipendenze, output Next e cache pnpm, e HMR HTTP temporaneo su
`localhost:3000`. Il servizio non avvia ne' attende backend, PostgreSQL o Redis.
