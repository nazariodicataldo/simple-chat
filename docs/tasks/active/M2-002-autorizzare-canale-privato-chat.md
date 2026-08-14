# M2-002 — Autorizzare il canale privato chat

- **Stato:** proposta
- **Milestone:** Milestone 2 — Real-time diretto con Reverb ed Echo
- **Data di apertura:** 2026-08-13
- **Data di chiusura:**

## Contesto

Gli eventi Message del task M2-001 usano un unico canale di gruppo. L'autorizzazione deve restare una decisione server-side coerente con Sanctum.

## Obiettivo

Registrare `private-chat` e autorizzarne l'accesso per ogni utente autenticato tramite `auth:sanctum`.

## Fuori scope

- Frontend, Echo, Reverb e relative dipendenze.
- Controller, model, policy e Resource Message.
- Configurazione Redis e queue.

## File modificabili

- `backend/routes/channels.php`.
- Bootstrap/routing broadcasting strettamente necessario.
- Test autorizzazione backend.
- `docs/learning/broadcasting-reverb-echo.md`.
- Questo task.

## File non modificabili

- Frontend.
- Controller, model, policy e Resource Message.
- Configurazione e dipendenze Reverb.
- Migration.

## Requisiti

- Ogni utente autenticato via `auth:sanctum` puo' autorizzare esclusivamente `private-chat`.
- Un ospite riceve `401` dal channel authorization endpoint.
- Il client non prende decisioni autorizzative.
- Aggiornare la guida learning con problema, funzionamento e ruolo di canali pubblici e privati, autorizzazione server-side e Sanctum; includere configurazione minima, verifica/test, errore comune, differenza production, esercizio e documentazione Laravel ufficiale compatibile.

## Strategia di test

RED/GREEN/REFACTOR con richieste POST all'endpoint di autorizzazione: sessione Sanctum valida e sessione assente.

## Comandi da eseguire

- `git status --short`
- `git diff --stat`
- `git diff --check`
- Revisione di `docs/learning/broadcasting-reverb-echo.md` rispetto ai requisiti didattici.
- Da `backend/`: Pest mirato, `composer test`, `./vendor/bin/pint --test`, `./vendor/bin/phpstan analyse --memory-limit=512M`.

## Criteri di accettazione

- [ ] `private-chat` e' registrato.
- [ ] Utente Sanctum autenticato riceve autorizzazione valida.
- [ ] Ospite riceve 401.
- [ ] I test osservano l'endpoint pubblico di channel authorization.
- [ ] La guida learning spiega il confine autorizzativo server-side per un principiante.
- [ ] Tutti i controlli sono registrati con evidenza.

## Rischi e assunzioni

Il canale rappresenta la chat di gruppo, non una stanza per utente. L'accesso e' uniforme per tutti gli utenti autenticati.

## Verifica manuale

Effettuare una richiesta di channel authorization con e senza cookie Sanctum e verificare rispettivamente risposta positiva e 401.

## Decisioni emerse

Nessuna.

## File modificati

Da compilare durante l'implementazione.

## Risultati dei controlli

Da compilare durante l'implementazione.

## Problemi residui

Nessuno all'apertura.

## Riepilogo finale

Task pianificato, dipende da M2-001.
