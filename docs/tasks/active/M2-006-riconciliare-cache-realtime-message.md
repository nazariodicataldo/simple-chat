# M2-006 — Riconciliare cache realtime Message

- **Stato:** proposta
- **Milestone:** Milestone 2 — Real-time diretto con Reverb ed Echo
- **Data di apertura:** 2026-08-13
- **Data di chiusura:**

## Contesto

La chat combina pagine HTTP cursor-paginate, risposte alle mutation e messaggi optimistic locali. Gli eventi realtime devono aggiornare questa vista senza duplicare bubble.

## Obiettivo

Riconciliare eventi, optimistic create e cache HTTP di TanStack Query per create, update e delete, con deduplicazione sempre basata sull'ID del messaggio.

## Fuori scope

- Backend.
- Client Echo e schema Zod.
- Componenti presentazionali.
- Dipendenze.

## File modificabili

- `frontend/app/features/messages/message.queries.ts`.
- `frontend/components/chat/chat-page.tsx`.
- Hook realtime strettamente necessari.
- Test Message/chat page.
- `docs/learning/broadcasting-reverb-echo.md`.
- Questo task.

## File non modificabili

- Backend.
- Client Echo.
- Schema Zod.
- Componenti presentazionali.
- Dipendenze.

## Requisiti

- Il create ricevuto entra nella coda live locale se non e' gia' presente.
- Update aggiorna cache e coda live.
- Delete rimuove cache e coda live.
- Il rendering deduplica sempre per ID tra pagine HTTP, risposta optimistic e broadcast.
- Le risposte HTTP proprie restano canoniche e l'evento equivalente non crea una seconda bubble.
- Aggiornare la guida learning con rapporto fra eventi realtime, cache TanStack Query, optimistic create, risposta HTTP canonica e deduplicazione per ID; includere configurazione minima pertinente, verifica/test, errore comune, differenza production, esercizio e documentazione ufficiale pertinente.

## Strategia di test

RED/GREEN/REFACTOR per create/update/delete remoti, evento duplicato, gara tra risposta HTTP e broadcast, refetch/infinite pagination e delete di messaggio locale.

## Comandi da eseguire

- `git status --short`
- `git diff --stat`
- `git diff --check`
- Revisione di `docs/learning/broadcasting-reverb-echo.md` rispetto ai requisiti didattici.
- Da `frontend/`: test mirati, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`.

## Criteri di accettazione

- [ ] Create, update e delete remoti si riflettono senza refresh.
- [ ] Un messaggio ha al massimo una bubble per ID.
- [ ] Gara fra risposta HTTP e broadcast non crea duplicati.
- [ ] Paginazione e refetch mantengono la deduplicazione.
- [ ] Delete rimuove anche l'eventuale copia locale.
- [ ] La guida learning spiega riconciliazione e deduplicazione per un principiante.
- [ ] Tutti i controlli sono registrati con evidenza.

## Rischi e assunzioni

La cache HTTP e' la fonte remota; la coda live e' una proiezione transitoria. Non viene introdotto uno stato globale aggiuntivo.

## Verifica manuale

In due browser autenticati, creare, modificare ed eliminare messaggi; creare anche nel browser locale e verificare l'assenza di doppie bubble dopo evento e refetch.

## Decisioni emerse

Nessuna.

## File modificati

Da compilare durante l'implementazione.

## Risultati dei controlli

Da compilare durante l'implementazione.

## Problemi residui

Nessuno all'apertura.

## Riepilogo finale

Task pianificato, dipende da M2-005.
