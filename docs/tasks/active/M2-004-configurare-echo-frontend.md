# M2-004 — Configurare Echo frontend

- **Stato:** proposta
- **Milestone:** Milestone 2 — Real-time diretto con Reverb ed Echo
- **Data di apertura:** 2026-08-13
- **Data di chiusura:**

## Contesto

Reverb e il canale privato sono disponibili lato Laravel. Il frontend necessita di un solo client browser che usi la stessa autenticazione cookie/CSRF della chat HTTP.

## Obiettivo

Installare Echo e creare un modulo client browser Reverb dedicato.

## Fuori scope

- Backend.
- Componenti chat e feature Message.
- Migration, model e controller Laravel.

## File modificabili

- `frontend/package.json` e lockfile.
- `frontend/.env.example`.
- Modulo client realtime dedicato.
- Test del wiring.
- `docs/learning/broadcasting-reverb-echo.md`.
- Questo task.

## File non modificabili

- Backend.
- Componenti chat.
- Feature Message.
- Migration, model e controller Laravel.

## Requisiti

- Aggiungere esclusivamente `laravel-echo` e `pusher-js`.
- Le variabili `NEXT_PUBLIC_` contengono solo endpoint, host, porta, schema e app key pubblica.
- L'authorizer usa l'istanza Axios esistente con cookie e CSRF Sanctum.
- Nessun user ID, token o segreto e' inviato o salvato dal client.
- Aggiornare la guida learning con problema, funzionamento e ruolo di Echo nel browser, authorizer Axios con cookie/CSRF e confini delle variabili `NEXT_PUBLIC_`; includere configurazione minima, verifica/test, errore comune, differenza production, esercizio e documentazione Laravel ufficiale compatibile.

## Strategia di test

Controllo sintattico/typecheck e test mock del client e dell'authorizer. Eseguire inoltre uno smoke browser di connessione autenticata quando il runtime locale e' disponibile.

## Comandi da eseguire

- `git status --short`
- `git diff --stat`
- `git diff --check`
- Revisione di `docs/learning/broadcasting-reverb-echo.md` rispetto ai requisiti didattici.
- Da `frontend/`: test mirati, `pnpm lint`, `pnpm typecheck`, `pnpm build`.

## Criteri di accettazione

- [ ] Echo e Pusher JS sono le sole nuove dipendenze frontend.
- [ ] Il client e' browser-only e riusabile.
- [ ] L'authorizer usa Axios con credenziali Sanctum.
- [ ] Nessun segreto o token e' esposto lato client.
- [ ] La guida learning spiega Echo e l'authorizer per un principiante.
- [ ] Test e smoke pertinente sono documentati.

## Rischi e assunzioni

La app key Reverb e' pubblica per definizione del protocollo; il segreto resta esclusivamente nella configurazione Laravel.

## Verifica manuale

Con un utente autenticato, aprire il browser e confermare l'autorizzazione e la connessione a `private-chat`.

## Decisioni emerse

Nessuna.

## File modificati

Da compilare durante l'implementazione.

## Risultati dei controlli

Da compilare durante l'implementazione.

## Problemi residui

Nessuno all'apertura.

## Riepilogo finale

Task pianificato, dipende da M2-003.
