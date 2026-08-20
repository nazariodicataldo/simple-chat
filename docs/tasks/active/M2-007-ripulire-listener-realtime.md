# M2-007 — Verificare lifecycle realtime con StrictMode

- **Stato:** proposta
- **Milestone:** Milestone 2 — Real-time diretto con Reverb ed Echo
- **Data di apertura:** 2026-08-13
- **Data di chiusura:**

## Contesto

M2-005 apre e rilascia ordinariamente il canale nel proprio effetto. Dopo che
M2-006 consuma gli eventi per riconciliare la cache, React StrictMode, HMR e la
navigazione possono comunque montare, pulire e rimontare il componente in
sequenza. Questo task dimostra che tale lifecycle non lascia listener duplicati
e non applica eventi dopo l'unmount.

## Obiettivo

Verificare e, solo se i test mostrano un difetto, correggere il lifecycle
realtime Message sotto React StrictMode: mount, cleanup, remount e callback
tardive.

## Fuori scope

- Backend.
- Regole di validazione Zod e contratto dei payload.
- Riconciliazione cache e mutation Message, salvo l'osservazione necessaria a
  dimostrare che un callback tardivo non la aggiorna.
- Componenti chat.
- Client Echo e dipendenze.

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
- In React StrictMode, dopo mount-cleanup-remount esiste un solo listener per
  ciascun evento e un evento valido viene elaborato una sola volta.
- Dopo unmount, un callback conservato dal mock non deve cambiare stato o cache.
- Il listener rimane stabile fra render che non cambiano la sottoscrizione.
- Aggiornare la guida learning con lifecycle del listener, cleanup, unmount e ruolo di React StrictMode nel rilevare doppie sottoscrizioni; includere configurazione minima pertinente, verifica/test, errore comune, differenza production, esercizio e documentazione ufficiale pertinente.

## Strategia di test

RED/GREEN/REFACTOR con mock Echo e React StrictMode:

1. mount, cleanup e remount con verifica dei listener effettivamente registrati;
2. emissione di un solo evento dopo remount e prova di una sola elaborazione;
3. emissione tramite un callback precedente dopo unmount, con prova di nessun
   aggiornamento osservabile;
4. un render ordinario che non ricrea listener.

## Comandi da eseguire

- `git status --short`
- `git diff --stat`
- `git diff --check`
- Revisione di `docs/learning/broadcasting-reverb-echo.md` rispetto ai requisiti didattici.
- Da `frontend/`: test mirati, `pnpm lint`, `pnpm typecheck`, `pnpm build`.

## Criteri di accettazione

- [ ] StrictMode non lascia listener duplicati dopo mount-cleanup-remount.
- [ ] Un evento valido dopo remount produce una sola elaborazione.
- [ ] Un callback precedente all'unmount non aggiorna stato o cache.
- [ ] Nessun render ordinario ricrea la sottoscrizione.
- [ ] Il cleanup non duplica quello gia' posseduto da M2-005.
- [ ] La guida learning spiega il lifecycle realtime e StrictMode per un principiante.
- [ ] Tutti i controlli sono registrati con evidenza.

## Rischi e assunzioni

Il singleton Echo e' condiviso: il task deve usare l'API pubblica del client,
senza modificarlo, e non deve introdurre una seconda proprieta' del canale.

## Verifica manuale

Aprire la chat in sviluppo con StrictMode, navigare fuori e rientrare; inviare un evento e verificare una sola bubble e nessun warning React.

## Decisioni emerse

- M2-005 possiede il cleanup ordinario `echo.leave('chat')`.
- M2-007 copre il comportamento di regressione StrictMode/HMR/post-unmount,
  senza duplicare la responsabilita' di acquisizione e rilascio del canale.

## File modificati

Da compilare durante l'implementazione.

## Risultati dei controlli

Da compilare durante l'implementazione.

## Problemi residui

Nessuno all'apertura.

## Riepilogo finale

Task pianificato, dipende da M2-006.
