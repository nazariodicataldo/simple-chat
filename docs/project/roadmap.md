# Roadmap

## Milestone 0 — Preparazione

Documentazione, convenzioni, workflow agentico, roadmap e Definition of Done.

## Milestone 1 — Chat HTTP autenticata

Bootstrap Laravel e Next.js, PostgreSQL, Sanctum, messaggi (model/migration/API/Form Request/Resource/Policy), cursor pagination, frontend HTTP e primi test. **DoD:** due utenti usano la chat via HTTP e il refresh mostra i nuovi messaggi.

## Milestone 2 — Real-time diretto

`MessageSent`, `ShouldBroadcastNow`, private channel e autorizzazione, Reverb, Echo, validazione Zod, deduplicazione e cleanup listener. **DoD:** due browser autenticati comunicano senza refresh.

## Milestone 3 — Redis e queue

Redis, `ShouldBroadcast`, queue, `queue:work`, job broadcasting, retry, failed jobs e introduzione ragionata di `after_commit`. **DoD:** broadcasting effettivamente attraverso Redis e worker.

## Milestone 4 — Horizon

Installazione, dashboard protetta e worker gestiti/osservabili tramite Horizon. **DoD:** job completati e falliti sono osservabili e gestibili.

## Milestone 5 — Docker

In ordine: PostgreSQL/Redis, backend, frontend, Reverb, worker/Horizon ed eventuale reverse proxy. **DoD:** l'ambiente completo parte riproducibilmente con Compose.

## Milestone 6 — Test end-to-end e CI

Playwright con due browser context, test backend/frontend, lint, typecheck, build e GitHub Actions essenziale. **DoD:** il flusso real-time reale e' verificato senza mock di Redis, worker, Reverb o Echo.

## Milestone 7 — Deployment

Production, reverse proxy, HTTPS, processi persistenti, migration, backup, log e smoke test; deployment inizialmente manuale. **DoD:** deployment manuale documentato e verificabile.
