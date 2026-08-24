# M2-007 — Verificare lifecycle realtime con StrictMode

- **Stato:** completato
- **Milestone:** Milestone 2 — Real-time diretto con Reverb ed Echo
- **Data di apertura:** 2026-08-13
- **Data di chiusura:** 2026-08-24

## Contesto

M2-005 apre e rilascia ordinariamente il canale nel proprio effetto. Dopo che
M2-006 consuma gli eventi per riconciliare la cache, React StrictMode, HMR e la
navigazione possono comunque montare, pulire e rimontare il componente in
sequenza. Questo task dimostra che tale lifecycle non lascia listener duplicati
e non applica eventi dopo l'unmount.

Per questo task una sottoscrizione a `private-chat` contiene tre callback: una
per ciascuno degli eventi FQCN Created, Updated e Deleted. Il mock di Echo deve
distinguere le callback storiche, conservate soltanto per testare un callback
tardivo, da quelle attive dopo il piu' recente `leave`. Un evento realtime
ordinario e' consegnato soltanto alle callback attive.

## Obiettivo

Verificare e, solo se i test mostrano un difetto, correggere il lifecycle
realtime Message sotto React StrictMode: mount, cleanup, remount e callback
tardive. Una callback invocata dopo il proprio cleanup non deve chiamare il
consumer ne' aggiornare `lastEvent`; la correzione consentita e' una guard
locale nel hook, senza un secondo meccanismo di sottoscrizione o cleanup.

## Fuori scope

- Backend.
- Regole di validazione Zod e contratto dei payload.
- Riconciliazione cache e mutation Message, salvo l'osservazione necessaria a
  dimostrare che un callback tardivo non la aggiorna.
- Componenti chat.
- Client Echo e dipendenze.
- Simulazione automatica di HMR/Fast Refresh.
- Gestione di piu' consumer `useMessageRealtime` montati contemporaneamente.

HMR/Fast Refresh e' coperto da una checklist manuale. Il singleton Echo e la
proprieta' del canale restano di M2-004/M2-005: l'app corrente assume un solo
`ChatPage` e quindi un solo consumer del hook per tab. Supportare consumer
concorrenti richiederebbe ridefinire chi possiede `echo.leave("chat")` e non e'
parte di questo task.

## File modificabili

- Hook realtime e test associati.
- Integrazione strettamente necessaria fra hook e consumer M2-006.
- `docs/learning/broadcasting-reverb-echo.md`.
- Questo task.

## File non modificabili

- Backend.
- Cache e mutation Message.
- Componenti chat.
- Client Echo.
- Dipendenze.

## Requisiti

- Usare il cleanup base gia' definito in M2-005 come comportamento da provare,
  non introdurre un secondo meccanismo di subscribe/unsubscribe.
- In React StrictMode, dopo mount-cleanup-remount `private("chat")` e' chiamato
  due volte, i tre FQCN sono registrati in entrambe le fasi e il cleanup
  intermedio chiama una volta `leave("chat")`. Dopo il remount esiste una sola
  callback attiva per ciascun FQCN.
- Un evento valido ordinario consegnato dopo il remount viene elaborato una sola
  volta. Il test non deve inviare un evento ordinario a callback gia' rilasciate:
  quelle sono conservate solo per il caso tardivo esplicito.
- Dopo unmount, un callback conservato dal mock non deve chiamare `onEvent`.
  Non usare `lastEvent` dopo unmount come osservazione: React non rende
  affidabile lo stato di un hook gia' smontato. L'assenza di `onEvent` prova che
  cache e stato locale del consumer non vengono raggiunti.
- Il listener rimane stabile fra render che non cambiano la sottoscrizione: un
  nuovo `onEvent` deve ricevere l'evento, quello precedente no, senza nuove
  chiamate a `private`, `listen` o `leave`.
- Un test di integrazione con il vero hook e Echo mockato deve osservare una
  sola riconciliazione cache e una sola bubble per un evento valido; dopo
  unmount, un callback tardivo non deve avviare la riconciliazione.
- Aggiornare la guida learning con lifecycle del listener, cleanup, unmount e ruolo di React StrictMode nel rilevare doppie sottoscrizioni; includere configurazione minima pertinente, verifica/test, errore comune, differenza production, esercizio e documentazione ufficiale pertinente.

## Strategia di test

RED/GREEN/REFACTOR con mock Echo e React StrictMode:

1. il mock conserva, per ogni FQCN, le callback storiche e quelle attive; il
   cleanup simulato da `leave("chat")` rilascia soltanto le attive;
2. mount, cleanup e remount in `StrictMode`, con verifica delle due
   sottoscrizioni, dei sei `listen` complessivi, del cleanup intermedio e delle
   tre sole callback attive finali;
3. emissione di un evento valido ordinario dopo remount, con prova di una sola
   elaborazione `onEvent`;
4. emissione diretta tramite un callback catturato prima dell'unmount, con
   prova RED che `onEvent` viene ancora chiamato e GREEN con una guard locale
   che lo impedisce;
5. un rerender ordinario con un nuovo consumer, senza ricreare listener e con
   consegna solo al consumer aggiornato;
6. integrazione `ChatPage` con il vero hook e Echo mockato: una sola
   riconciliazione cache e una sola bubble; dopo unmount, nessuna
   riconciliazione dal callback tardivo.

## Comandi da eseguire

- `git status --short`
- `git diff --stat`
- `git diff --check`
- Revisione di `docs/learning/broadcasting-reverb-echo.md` rispetto ai requisiti didattici.
- Da `frontend/`: test mirati, `pnpm lint`, `pnpm typecheck`, `pnpm build`.

## Criteri di accettazione

- [x] StrictMode non lascia listener duplicati dopo mount-cleanup-remount.
- [x] Un evento valido dopo remount produce una sola elaborazione.
- [x] Un callback precedente all'unmount non chiama il consumer e quindi non
  aggiorna cache o stato locale.
- [x] Nessun render ordinario ricrea la sottoscrizione; il consumer aggiornato
  riceve l'evento al posto di quello precedente.
- [x] Il cleanup non duplica quello gia' posseduto da M2-005.
- [x] L'integrazione osserva una sola riconciliazione cache e una sola bubble
  per l'evento valido.
- [x] La checklist manuale HMR distingue il socket Reverb da quello HMR e
  conferma una sola bubble dopo Fast Refresh e dopo uscita/rientro nella chat.
- [x] La guida learning spiega il lifecycle realtime e StrictMode per un principiante.
- [x] Tutti i controlli eseguibili sono registrati con evidenza.

## Rischi e assunzioni

Il singleton Echo e' condiviso: il task deve usare l'API pubblica del client,
senza modificarlo, e non deve introdurre una seconda proprieta' del canale.
L'assunzione esplicita e' un solo consumer del hook per tab. Il caso di
consumer concorrenti richiederebbe una decisione separata sulla proprieta' di
`leave("chat")`.

## Verifica manuale

Aprire la chat autenticata in due browser in sviluppo. Nel primo:

1. aprire DevTools, quindi salvare una modifica frontend innocua per attivare
   Fast Refresh;
2. distinguere `/_next/webpack-hmr` dal socket Reverb
   `wss://api.simple-chat.test/app/...`; verificare console senza errori o
   warning React;
3. dal secondo browser inviare un messaggio con testo unico e verificare nel
   primo una sola bubble;
4. uscire e rientrare nella chat, ripetere l'invio e verificare ancora una sola
   bubble.

## Decisioni emerse

- M2-005 possiede il cleanup ordinario `echo.leave('chat')`.
- M2-007 copre il comportamento di regressione StrictMode/HMR/post-unmount,
  senza duplicare la responsabilita' di acquisizione e rilascio del canale.
- Il callback tardivo e' un caso esplicito del task: il test RED giustifica una
  guard locale nel hook che blocca sia il consumer sia `lastEvent` dopo il
  cleanup.
- HMR e' una verifica manuale: una simulazione automatica allargherebbe il
  task al singleton Echo e al bundler.
- Cache, mutation, client Echo e consumer concorrenti restano fuori scope;
  l'integrazione li osserva soltanto per dimostrare che il lifecycle non li
  raggiunge impropriamente.

## File modificati

- `frontend/app/features/messages/realtime/use-message-realtime.ts`
- `frontend/app/__test__/messages/message-realtime.test.tsx`
- `frontend/app/__test__/messages/chat-page-realtime.test.tsx`
- `docs/learning/broadcasting-reverb-echo.md`
- Questo task.

## Risultati dei controlli

- RED: il nuovo test post-unmount falliva con il hook originale, perche' la
  callback storica chiamava ancora `onEvent`.
- GREEN: `pnpm exec vitest run app/__test__/messages/message-realtime.test.tsx`
  riuscito (17 test); `pnpm exec vitest run
  app/__test__/messages/chat-page-realtime.test.tsx` riuscito (8 test).
- Test mirati combinati: 2 file, 25 test superati.
- Suite completa da `frontend/`: `pnpm test` riuscita (14 file, 83 test).
- `pnpm lint` riuscito con exit 0.
- `pnpm typecheck` riuscito con exit 0.
- `pnpm build` nel sandbox non ha potuto scaricare il font remoto Google
  `Outfit`; la stessa build ripetuta con accesso di rete autorizzato e' riuscita:
  compilazione, TypeScript, pagine statiche e ottimizzazione completati.
- `git diff --check` riuscito con exit 0; `git diff --stat` mostra 7 file
  modificati, 376 inserimenti e 43 cancellazioni.
- La revisione della guida ha verificato lifecycle, cleanup, unmount, StrictMode,
  configurazione minima, test, errore comune, produzione, esercizio e riferimenti
  React/Next ufficiali.
- Smoke manuale HMR/Reverb completato in due browser autenticati: il socket
  Reverb `wss://api.simple-chat.test/app/...` e il socket HMR
  `wss://app.simple-chat.test:3000/_next/webpack-hmr` hanno restituito `101
  Switching Protocols`; `POST /broadcasting/auth` ha restituito `200 OK`.
  Dopo `unsubscribe` e nuova subscription a `private-chat`, l'evento
  `MessageCreated` di `smoke-after-reentry-20260824` e' stato ricevuto e
  visualizzato in una sola bubble, senza errori in console.

## Problemi residui

Nessuno.

## Riepilogo finale

Implementata la guard locale per impedire che callback realtime tardive
raggiungano consumer, cache o stato dopo il cleanup; aggiunti test StrictMode,
rerender e integrazione ChatPage, oltre alla guida learning. I controlli
automatici e lo smoke manuale HMR/Reverb sono riusciti.
