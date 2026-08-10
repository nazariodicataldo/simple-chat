# M1-008 — Autenticazione Sanctum per SPA

- **Stato:** proposta
- **Milestone:** Milestone 1 — Chat HTTP autenticata
- **Data di apertura:**
- **Data di chiusura:**

## Contesto

I messaggi usano ancora un utente placeholder. L'MVP richiede utenti browser autenticati senza token in localStorage.

## Obiettivo

Configurare Laravel Sanctum con cookie SPA e introdurre registrazione, login, logout e utente corrente, sostituendo il placeholder Message con l'utente autenticato.

## Fuori scope

Frontend di autenticazione, verifica email, reset password, token personali, realtime e standardizzazione degli errori API.

## File modificabili

- Dipendenze/configurazioni Sanctum e CORS pertinenti.
- Controller, Request, route, middleware e test backend pertinenti all'auth e Message.
- Task e stato progetto al completamento.

## Requisiti

- Esporre `POST /api/register`, `POST /api/login`, `POST /api/logout` e `GET /api/user` con Sanctum SPA cookie/CSRF.
- Registrazione e login restituiscono `UserResource`; logout conserva `204`.
- I messaggi usano l'utente autenticato e update/delete applicano la policy proprietario.
- Endpoint e messaggi protetti restituiscono 401 senza sessione.

## Strategia di test

Test di feature per registrazione, login/logout, utente corrente, sessione/CSRF, 401 e policy con due utenti.

## Comandi da eseguire

- Da `backend/`: `composer test`, `./vendor/bin/pint --test`, `./vendor/bin/phpstan analyse --memory-limit=512M`.
- Dalla root: `git status --short`, `git diff --stat`, `git diff --check`.

## Criteri di accettazione

- [ ] Sanctum SPA protegge le API previste senza token client-side.
- [ ] Il ciclo registrazione/login/logout/utente corrente è testato.
- [ ] Message deriva `user_id` dalla sessione e applica le policy.

## Rischi e assunzioni

- Sanctum richiede una nuova dipendenza, motivata dall'autenticazione browser dell'MVP.
- CORS e domini stateful saranno allineati agli URL locali effettivamente configurati.

## Verifica manuale

Da definire durante l'avvio del task.

## Decisioni emerse

Nessuna.

## File modificati

## Risultati dei controlli

## Problemi residui

## Riepilogo finale
