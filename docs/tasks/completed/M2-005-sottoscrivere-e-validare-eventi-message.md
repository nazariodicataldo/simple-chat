# M2-005 — Sottoscrivere e validare eventi Message

- **Stato:** completato
- **Milestone:** Milestone 2 — Real-time diretto con Reverb ed Echo
- **Data di apertura:** 2026-08-13
- **Data di chiusura:** 2026-08-20

## Contesto

Il client Echo e' pronto in `frontend/lib/echo.ts`, ma un evento WebSocket e'
input non fidato: puo' essere malformato per un bug oltre che per un attacco.
La feature Message deve validarlo prima che un task successivo lo usi per
aggiornare lo stato della chat.

Il backend trasmette sul `PrivateChannel('chat')` tre eventi senza
`broadcastAs()`. I nomi sul filo sono quindi i FQCN `App\\Events\\MessageCreated`,
`App\\Events\\MessageUpdated` e `App\\Events\\MessageDeleted`; Echo richiede il
prefisso `.` per non aggiungere automaticamente il proprio namespace.

## Obiettivo

Creare `frontend/app/features/messages/realtime/` con gli schemi Zod dei payload
WebSocket e un hook `useMessageRealtime()` che si sottoscrive al canale privato
`chat`, valida gli eventi e restituisce
`{ lastEvent: MessageRealtimeEvent | null }`. L'hook non legge ne' scrive la
cache TanStack Query e non modifica la UI.

## Fuori scope

- Backend e lockfile.
- Package, salvo lo script locale `dev:https` in `frontend/package.json`,
  autorizzato esplicitamente dall'utente per eseguire lo smoke HTTPS con il CA
  di sistema di Node.
- `frontend/lib/echo.ts`, che viene solo consumato.
- Componenti di rendering e dialog CRUD.
- Riconciliazione cache, deduplicazione e stato optimistic, che sono M2-006.
- Casi lifecycle di React StrictMode, HMR e callback dopo unmount, che sono
  verificati in M2-007.

## File modificabili

- `frontend/app/features/messages/realtime/` (schemi, tipi, hook e mapping
  nomi evento).
- `frontend/components/chat/chat-page.tsx` solo per invocare l'hook senza
  consumarne l'output.
- Test Message pertinenti, seguendo la convenzione esistente
  `frontend/app/__test__/messages/` quando appropriato.
- `docs/learning/broadcasting-reverb-echo.md`.
- Questo task.

## File non modificabili

- Backend.
- Lockfile.
- Package, salvo lo script locale `dev:https` autorizzato per lo smoke HTTPS.
- `frontend/lib/echo.ts`.
- Componenti presentazionali e dialog CRUD.

## Requisiti

- Usare `getEcho().private('chat')` e registrare soltanto:
  - `.listen('.App\\Events\\MessageCreated', ...)`;
  - `.listen('.App\\Events\\MessageUpdated', ...)`;
  - `.listen('.App\\Events\\MessageDeleted', ...)`.
- Usare schemi input distinti: un payload `{ message: ... }` comune a create e
  update, e un payload delete `{ messageId: number }`. Create e update hanno la
  stessa forma raw: il loro tipo e' determinato dal listener, non da una union
  Zod.
- Definire `RealtimeMessage` dal contratto WebSocket, separato dal tipo HTTP
  `Message`: le date possono essere ISO o `null` e il payload broadcast non
  contiene `deletedAt`.
- Normalizzare il risultato nel tipo discriminato
  `created`/`updated`/`deleted`, con `message` solo per i primi due casi e
  `messageId` solo per delete.
- Validare ID interi positivi, date ISO con offset o `null`, e campi testuali
  richiesti. Non duplicare regole della mutation HTTP; campi aggiuntivi
  sconosciuti non vengono propagati ma non rendono invalido il payload.
- Per un payload non valido, non aggiornare `lastEvent` ne' interrompere la
  sottoscrizione. Solo in development, usare `console.error` con payload ed
  errore Zod; nessun log in produzione.
- Al cleanup ordinario dell'effetto, rilasciare il canale con
  `echo.leave('chat')`. Le regressioni StrictMode/HMR restano M2-007.
- Montare `useMessageRealtime()` in `ChatPage` senza destrutturare, rendere o
  usare `lastEvent`; M2-006 sara' il primo consumer della cache.
- Aggiornare la guida learning per un principiante: input WebSocket non fidato,
  schemi message/delete, rifiuto non bloccante, naming con punto iniziale,
  test/smoke, errore comune, log in produzione, esercizio e fonti ufficiali.

## Strategia di test

Seguire RED/GREEN/REFACTOR senza nuove dipendenze:

1. Test degli schemi: create, update e delete validi; per ciascuno almeno un
   campo mancante e un tipo errato.
2. Test dell'hook con mock Echo: una sola chiamata a `private('chat')`,
   esattamente i tre listener FQCN con punto iniziale, e normalizzazione corretta
   di ogni payload valido in `lastEvent`.
3. Per ciascun listener, un payload invalido non cambia `lastEvent`, non chiama
   `leave` e un payload valido successivo viene ancora elaborato; verificare
   `console.error` solo in development e la sua assenza in production.
4. Testare il cleanup ordinario con `echo.leave('chat')`.
5. Nel test di `ChatPage`, mockare `useMessageRealtime` e verificare soltanto
   che sia invocato: nessuna sottoscrizione reale e nessun uso visibile di
   `lastEvent` nei test non pertinenti.

M2-007 aggiungera' la prova distinta StrictMode/remount/post-unmount.

## Comandi da eseguire

- `git status --short`
- `git diff --stat`
- `git diff --check`
- Revisione di `docs/learning/broadcasting-reverb-echo.md` rispetto ai requisiti didattici.
- Da `frontend/`: test mirati, `pnpm lint`, `pnpm typecheck`, `pnpm build`.

## Criteri di accettazione

- [x] Sono registrati soltanto i tre listener su `private-chat`, con FQCN e
      punto iniziale verificati da test e smoke runtime.
- [x] Gli schemi rispecchiano il contratto broadcast, incluso delete senza
      oggetto `message`, senza cambiare il contratto HTTP `MessageResource`.
- [x] `lastEvent` espone esclusivamente eventi validi nel tipo discriminato.
- [x] Un payload invalido e' ignorato e loggato solo in development.
- [x] Non esiste lettura o scrittura della cache TanStack Query ne' stato
      optimistic.
- [x] `ChatPage` monta l'hook senza un cambiamento UI.
- [x] Il cleanup ordinario usa `echo.leave('chat')`; i casi StrictMode/HMR sono
      coperti dal task M2-007.
- [x] La guida learning spiega la validazione difensiva per un principiante.
- [x] Tutti i controlli sono registrati con evidenza.

## Rischi e assunzioni

- La validazione client e' difensiva e non sostituisce autorizzazione e confini
  server-side.
- Il FQCN con punto iniziale e' verificato anche a runtime: se il wire protocol
  reale differisce, aggiornare implementazione e task con l'evidenza.
- Il cleanup base e' necessario nello stesso hook che apre il canale; la
  robustezza contro lifecycle ripetuti viene approfondita in M2-007.

## Verifica manuale

Con backend, Reverb, Next.js e una sessione Sanctum autenticata, produrre un
evento Message reale. Correlare il log Reverb con un breakpoint DevTools sul set
di `lastEvent`, senza aggiungere log temporanei o UI. La prova di payload
malformato resta nel test harness: deve essere ignorato senza interrompere
l'hook.

## Decisioni emerse

- L'API dell'hook e' `{ lastEvent: MessageRealtimeEvent | null }`.
- `RealtimeMessage`, inferito dagli schemi Zod, resta distinto da `Message` HTTP.
- I campi sconosciuti sono scartati dalla normalizzazione, non rifiutati; i
  campi usati sono validati con rigore di trasporto.
- I tipi created/updated sono aggiunti dal listener, non inferiti dalla forma
  raw identica.
- M2-005 possiede cleanup ordinario; M2-007 possiede la regressione lifecycle.
- L'utente ha autorizzato l'aggiornamento anticipato della pianificazione
  M2-007, per allinearla alla responsabilita' di cleanup gia' introdotta.

## File modificati

- `frontend/app/features/messages/realtime/message-realtime.schema.ts` —
  schemi Zod del contratto WebSocket e tipo `RealtimeMessage` separato dal
  contratto HTTP.
- `frontend/app/features/messages/realtime/use-message-realtime.ts` — hook,
  mapping FQCN, validazione, normalizzazione e cleanup ordinario.
- `frontend/components/chat/chat-page.tsx` — solo montaggio dell'hook.
- `frontend/app/__test__/messages/message-realtime.test.tsx` — test schemi e
  hook con mock Echo, incluso recupero dopo input invalido.
- `frontend/app/__test__/messages/chat-page.test.tsx` — mock e prova di
  montaggio dell'hook.
- `docs/learning/broadcasting-reverb-echo.md` — guida alla validazione
  difensiva lato browser.
- `docs/tasks/completed/M2-007-ripulire-listener-realtime.md` — verifica lifecycle completata
  aggiornata del lifecycle successivo, per autorizzazione esplicita dell'utente.
- `frontend/package.json` — script locale `dev:https`, autorizzato
  esplicitamente dall'utente, per avviare Next HTTPS con il CA di sistema Node.
- Questo task — stato, criteri ed evidenze.

## Risultati dei controlli

- `pnpm exec vitest run app/__test__/messages/message-realtime.test.tsx app/__test__/messages/chat-page.test.tsx`: rieseguito dopo la revisione, 2 file e 23 test superati.
- `pnpm typecheck`: riuscito.
- `pnpm lint`: riuscito.
- `pnpm test`: rieseguito localmente dallo sviluppatore, 13 file e 67 test
  superati in 24.11s.
- `pnpm build`: rieseguito localmente dallo sviluppatore, compilazione,
  TypeScript, raccolta dati e generazione delle quattro pagine completati.
- Riepilogo finale nel sandbox: `pnpm test` (13 file, 67 test), typecheck e
  lint rieseguiti con esito positivo. La build non e' ripetibile qui perche'
  l'ambiente non puo' raggiungere Google Fonts per scaricare `Outfit`; resta
  valida l'evidenza della build locale riuscita sopra, dove quella risorsa e'
  raggiungibile.
- Revisione della guida: completata rispetto a input non fidato, schemi
  message/delete, rifiuto non bloccante, FQCN con punto iniziale, test/smoke,
  logging per ambiente, errore comune, esercizio e fonti ufficiali.
- Smoke runtime autenticato, eseguito localmente dallo sviluppatore il
  2026-08-20: autorizzazione `POST /broadcasting/auth` per `private-chat` con
  risposta firmata, WebSocket Reverb `wss://api.simple-chat.test/app/...` con
  `101 Switching Protocols`, quindi breakpoint su `setLastEvent` raggiunto per
  gli eventi normalizzati `created`, `updated` e `deleted` dopo le rispettive
  mutazioni Message reali. Nessun segreto, cookie, firma o identificativo di
  socket e' registrato qui.

## Problemi residui

- Nessuno.

## Riepilogo finale

Implementazione, controlli frontend e smoke runtime autenticato completati;
dipende da M2-004.
