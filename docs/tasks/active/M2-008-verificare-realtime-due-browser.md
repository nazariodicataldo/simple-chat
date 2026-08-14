# M2-008 — Verificare realtime in due browser

- **Stato:** proposta
- **Milestone:** Milestone 2 — Real-time diretto con Reverb ed Echo
- **Data di apertura:** 2026-08-13
- **Data di chiusura:**

## Contesto

Questo task chiude la Milestone 2 soltanto dopo che eventi, autorizzazione, Reverb, Echo, validazione, riconciliazione e cleanup siano stati completati e verificati.

## Obiettivo

Verificare la Definition of Done del realtime diretto con due browser e aggiornare lo stato progetto soltanto con evidenza effettiva.

## Fuori scope

- Codice backend e frontend.
- Configurazioni, dipendenze e lockfile.
- Nuove funzionalita' o correzioni fuori scope.

## File modificabili

- Questo task.
- `docs/project/current-state.md`.
- `CHANGELOG.md` solo se la milestone e' effettivamente chiusa.

## File non modificabili

- Tutto il codice backend/frontend.
- Configurazioni.
- Dipendenze e lockfile.

## Requisiti

- Usare due browser con utenti Sanctum distinti, entrambi su `private-chat`.
- Verificare CREATE, UPDATE e DELETE senza refresh.
- Verificare assenza di duplicati per un messaggio creato dall'utente locale.
- Verificare rifiuto del canale senza sessione.
- Verificare assenza di errori o leak dopo remount.
- Aggiornare `current-state.md` solo in presenza di evidenza della DoD.

## Strategia di test

Smoke end-to-end manuale con due browser, piu' riesecuzione dei controlli finali backend e frontend. Se un controllo non e' eseguibile, registrare motivo, copertura mancante e istruzioni di ripetizione.

## Comandi da eseguire

- `git status --short`
- `git diff --stat`
- `git diff --check`
- Da `backend/`: `composer test`, `./vendor/bin/pint --test`, `./vendor/bin/phpstan analyse --memory-limit=512M`.
- Da `frontend/`: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`.
- Avvio Reverb e smoke browser.

## Criteri di accettazione

- [ ] Due utenti autenticati ricevono CREATE, UPDATE e DELETE senza refresh.
- [ ] La creazione locale non produce duplicati.
- [ ] Channel authorization senza sessione e' rifiutata.
- [ ] Remount non causa errori, leak o doppie elaborazioni.
- [ ] Controlli backend e frontend hanno evidenza fresca.
- [ ] Stato progetto e changelog sono aggiornati solo se la DoD e' soddisfatta.

## Rischi e assunzioni

Lo smoke richiede Lerd, backend, frontend, Reverb e due sessioni browser. Il sandbox potrebbe non poter usare il D-Bus della sessione sviluppatore: in tal caso nessuna chiusura della milestone e' consentita senza verifica locale documentata.

## Verifica manuale

1. Avviare backend, frontend e Reverb nell'ambiente locale.
2. Accedere con due utenti distinti in due browser o profili separati.
3. Creare, modificare e cancellare messaggi da entrambi i browser e osservare l'altro senza refresh.
4. Creare localmente, attendere il broadcast e refetchare: verificare una sola bubble per ID.
5. Provare l'autorizzazione canale senza sessione e ripetere un mount/unmount/remount della chat.

## Decisioni emerse

Nessuna.

## File modificati

Da compilare durante l'implementazione.

## Risultati dei controlli

Da compilare durante l'implementazione.

## Problemi residui

Nessuno all'apertura.

## Riepilogo finale

Task pianificato, dipende da M2-001, M2-002, M2-003, M2-004, M2-005, M2-006 e M2-007.
