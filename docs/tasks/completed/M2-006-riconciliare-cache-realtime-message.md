# M2-006 — Riconciliare cache realtime Message

- **Stato:** completato
- **Milestone:** Milestone 2 — Real-time diretto con Reverb ed Echo
- **Data di apertura:** 2026-08-13
- **Data di chiusura:** 2026-08-22

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

- [x] Create, update e delete remoti si riflettono senza refresh.
- [x] Un messaggio ha al massimo una bubble per ID.
- [x] Gara fra risposta HTTP e broadcast non crea duplicati dopo la risposta
      HTTP canonica; la breve finestra fra optimistic ID e broadcast e'
      documentata e accettata per questo profilo locale.
- [x] Paginazione e refetch mantengono la deduplicazione.
- [x] Delete rimuove anche l'eventuale copia locale.
- [x] La guida learning spiega riconciliazione e deduplicazione per un principiante.
- [x] Tutti i controlli sono registrati con evidenza, inclusi i limiti del sandbox.

## Rischi e assunzioni

La cache HTTP e' la fonte remota; la coda live e' una proiezione transitoria. Non viene introdotto uno stato globale aggiuntivo.

## Verifica manuale

In due browser autenticati, creare, modificare ed eliminare messaggi; creare anche nel browser locale e verificare l'assenza di doppie bubble dopo evento e refetch.

## Decisioni emerse

- `localMessages` e' la proiezione transitoria per optimistic create, risposta
  HTTP del proprio create e create WebSocket non ancora presenti nelle pagine.
  La cache TanStack Query resta il contenitore delle pagine HTTP.
- A parita' di ID, il rendering mostra prima la pagina HTTP. Create e delete
  sono idempotenti; update applica solo una copia con `updatedAt` non piu'
  vecchio di quella esistente.
- Il listener consegna ogni evento validato a una callback aggiornata con
  `useEffectEvent`, senza basarsi su un solo `lastEvent` tra un render e l'altro.
- I payload realtime con timestamp `null` non formano un `Message` UI: vengono
  ignorati e loggati soltanto in development.
- Non vengono introdotti tombstone, replay o `clientMutationId`. Un eventuale
  doppio render temporaneo tra optimistic ID e broadcast proprio converge alla
  risposta HTTP canonica.

## File modificati

- `frontend/app/features/messages/message.queries.ts` — operazioni di update/
  delete cache, merge di freschezza per refetch e mutation HTTP canoniche.
- `frontend/components/chat/chat-page.tsx` — proiezione live locale,
  riconciliazione callback Echo, deduplicazione per ID e mutation proprie.
- `frontend/app/features/messages/realtime/use-message-realtime.ts` — callback
  diretta e aggiornata per ogni evento validato.
- `frontend/app/__test__/messages/message-queries.test.tsx` — cache mutation,
  refetch stale e pagina cursor successiva.
- `frontend/app/__test__/messages/message-realtime.test.tsx` — consegna diretta
  della callback.
- `frontend/app/__test__/messages/chat-page-realtime.test.tsx` — integrazione
  QueryClient/Echo per create, update, delete, gara e deduplicazione.
- `frontend/app/__test__/messages/chat-page.test.tsx` — QueryClientProvider nel
  harness esistente, necessario al consumer della cache.
- `docs/learning/broadcasting-reverb-echo.md` — guida alla riconciliazione.
- Questo task — decisioni, evidenze e verifiche residue.

## Risultati dei controlli

- I test coprono la callback del listener aggiornata dopo un rerender,
  update/delete della cache HTTP, create remoto visibile, update/delete remoto,
  deduplicazione, refetch stale, optimistic create e broadcast proprio in
  entrambi gli ordini rispetto alla risposta HTTP canonica.
- Da `frontend/`, test mirati: 4 file e 39 test superati.
- Da `frontend/`, `pnpm test`: 14 file e 80 test superati in 49.37s.
- Da `frontend/`, `pnpm lint`: riuscito.
- Da `frontend/`, `pnpm typecheck`: riuscito.
- Da `frontend/`, `pnpm build`: non riuscito nel sandbox prima della
  compilazione per l'impossibilita' di raggiungere Google Fonts e scaricare
  `Outfit`; il codice del task non e' indicato nell'errore.
- Da `frontend/`, `pnpm build` eseguito localmente: riuscito (compilazione,
  TypeScript, raccolta dati e generazione pagine statiche completate).
- Smoke manuale completato in due browser autenticati: create, update e delete
  remoti senza refresh; create proprio con convergenza a una sola bubble dopo
  risposta HTTP e refetch.
- Revisione della guida: completata rispetto a cache HTTP TanStack Query,
  proiezione live, optimistic create, deduplicazione per ID, test, errore
  comune, produzione, esercizio e fonte ufficiale.

## Problemi residui

Nessuno.

## Riepilogo finale

Task completato: test, lint e typecheck freschi; build locale e smoke manuale
a due browser completati.
