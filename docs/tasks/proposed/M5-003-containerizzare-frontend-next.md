# M5-003 — Containerizzare frontend Next.js

- **Stato:** proposta
- **Milestone:** Milestone 5 — Docker
- **Data di apertura:** 2026-09-03
- **Data di chiusura:**
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
- `docs/learning/docker-compose.md`
- Questo task

## File non modificabili

- Codice delle feature frontend/backend, `.lerd.yaml`, lockfile e dipendenze,
  salvo una correzione direttamente richiesta dalla configurazione Docker.

## Requisiti

- Il container usa package manager e lockfile esistenti; non cambia dipendenze
  per aggirare un problema di build.
- Il sorgente TypeScript e' montato per sviluppo e HMR funziona tramite una
  porta temporanea dedicata, non presentata come profilo HTTPS finale.
- `node_modules`, `.next` e file generati non vengono tracciati o prodotti come
  artefatti dell'host.
- Le variabili `NEXT_PUBLIC_*` contengono solo endpoint e chiavi Reverb
  pubbliche, mai password Laravel, segreti o certificati.
- Il task dichiara che l'avvio Next non prova Sanctum, HTTPS, WSS o backend.

## Strategia di test

Eseguire test, lint, typecheck e build nel container. Osservare HMR dopo un
edit non funzionale poi annullato; il test browser completo resta M5-005.

## Comandi da eseguire

- `git status --short`
- `docker compose --env-file compose.env build frontend`
- `docker compose --env-file compose.env up -d frontend`
- `docker compose --env-file compose.env ps`
- `docker compose --env-file compose.env exec frontend pnpm test`
- `docker compose --env-file compose.env exec frontend pnpm lint`
- `docker compose --env-file compose.env exec frontend pnpm typecheck`
- `docker compose --env-file compose.env exec frontend pnpm build`
- `docker compose --env-file compose.env down`
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [ ] Il frontend si costruisce e avvia senza Node, pnpm o Lerd dell'host.
- [ ] Test, lint, typecheck e build hanno un esito registrato o una limitazione
  riproducibile e circoscritta.
- [ ] Un edit e' visibile senza ricostruire l'immagine; dipendenze e output
  restano fuori da Git.
- [ ] Le porte temporanee non sono presentate come profilo HTTPS finale.

## Rischi e assunzioni

Il build puo' dipendere dal download remoto del font `Outfit`; se la rete lo
blocca, annotare il limite senza attribuirlo a Docker. La versione Node deve
essere compatibile con il lockfile, non dedotta da Lerd.

## Verifica manuale

1. Costruire e avviare solo il frontend Compose.
2. Aprire la porta temporanea, modificare un testo non funzionale e annullare
   la modifica dopo aver osservato HMR.
3. Eseguire i controlli nel container e verificare `git status`.
4. Arrestare il servizio senza toccare i dati PostgreSQL M5-001.

## Decisioni emerse

- Il frontend containerizzato serve sviluppo e HMR; l'accesso sicuro `.test`
  e' responsabilita' di M5-005.

## File modificati

## Risultati dei controlli

## Problemi residui

## Riepilogo finale
