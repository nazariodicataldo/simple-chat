# M2-007 — Ripulire listener realtime

- **Stato:** proposta
- **Milestone:** Milestone 2 — Real-time diretto con Reverb ed Echo
- **Data di apertura:** 2026-08-13
- **Data di chiusura:**

## Contesto

Il listener realtime e la riconciliazione cache sono disponibili. React StrictMode puo' montare, pulire e rimontare il componente durante lo sviluppo: il lifecycle del canale deve essere sicuro.

## Obiettivo

Gestire cleanup, unmount e React StrictMode per il listener realtime Message.

## Fuori scope

- Backend.
- Cache e mutation Message.
- Componenti chat.
- Client Echo e dipendenze.

## File modificabili

- Hook realtime e test associati.
- `docs/learning/broadcasting-reverb-echo.md`.
- Questo task.

## File non modificabili

- Backend.
- Cache e mutation Message.
- Componenti chat.
- Client Echo.
- Dipendenze.

## Requisiti

- Il listener resta stabile fra render.
- Il canale viene annullato/abbandonato all'unmount.
- Non esiste doppio listener dopo il ciclo StrictMode.
- Nessun aggiornamento di stato avviene dopo unmount.
- Aggiornare la guida learning con lifecycle del listener, cleanup, unmount e ruolo di React StrictMode nel rilevare doppie sottoscrizioni; includere configurazione minima pertinente, verifica/test, errore comune, differenza production, esercizio e documentazione ufficiale pertinente.

## Strategia di test

RED/GREEN/REFACTOR con mock Echo e React StrictMode: mount, cleanup, remount e singola elaborazione di un evento.

## Comandi da eseguire

- `git status --short`
- `git diff --stat`
- `git diff --check`
- Revisione di `docs/learning/broadcasting-reverb-echo.md` rispetto ai requisiti didattici.
- Da `frontend/`: test mirati, `pnpm lint`, `pnpm typecheck`, `pnpm build`.

## Criteri di accettazione

- [ ] Cleanup registra leave/unsubscribe del canale.
- [ ] StrictMode non lascia listener duplicati.
- [ ] Un solo evento provoca una sola elaborazione dopo remount.
- [ ] Nessun callback aggiorna stato dopo unmount.
- [ ] La guida learning spiega il lifecycle realtime e StrictMode per un principiante.
- [ ] Tutti i controlli sono registrati con evidenza.

## Rischi e assunzioni

Il cleanup deve rispettare l'API pubblica di Echo e non deve modificare il client condiviso fuori scope.

## Verifica manuale

Aprire la chat in sviluppo con StrictMode, navigare fuori e rientrare; inviare un evento e verificare una sola bubble e nessun warning React.

## Decisioni emerse

Nessuna.

## File modificati

Da compilare durante l'implementazione.

## Risultati dei controlli

Da compilare durante l'implementazione.

## Problemi residui

Nessuno all'apertura.

## Riepilogo finale

Task pianificato, dipende da M2-006.
