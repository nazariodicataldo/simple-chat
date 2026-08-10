# M1-008 — Autenticazione Sanctum per SPA

- **Stato:** completato
- **Milestone:** Milestone 1 — Chat HTTP autenticata
- **Data di apertura:** 2026-08-10
- **Data di chiusura:** 2026-08-10

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
- Registrazione, login e utente corrente restituiscono `UserResource` nel payload riuscito `ApiResponse`; logout conserva `204`.
- I messaggi usano l'utente autenticato e update/delete applicano la policy proprietario.
- Endpoint e messaggi protetti restituiscono 401 senza sessione.

## Strategia di test

Test di feature per registrazione, login/logout, utente corrente, sessione/CSRF, 401, contratto `ApiResponse` riuscito e policy con due utenti.

## Comandi da eseguire

- Da `backend/`: `composer test`, `./vendor/bin/pint --test`, `./vendor/bin/phpstan analyse --memory-limit=512M`.
- Dalla root: `git status --short`, `git diff --stat`, `git diff --check`.

## Criteri di accettazione

- [x] Sanctum SPA protegge le API previste senza token client-side.
- [x] Il ciclo registrazione/login/logout/utente corrente è testato.
- [x] Message deriva `user_id` dalla sessione e applica le policy.

## Rischi e assunzioni

- Sanctum richiede una nuova dipendenza, motivata dall'autenticazione browser dell'MVP.
- CORS e domini stateful saranno allineati agli URL locali effettivamente configurati.

## Verifica manuale

Con PHP 8.5 Lerd disponibile, configurare il client browser con `withCredentials: true`, poi:

1. `GET /sanctum/csrf-cookie` da `http://localhost:3000`;
2. registrare o autenticare un utente via API;
3. verificare `GET /api/user`, creazione Message, logout e il successivo `401`.

## Decisioni emerse

- Le risposte riuscite di registrazione, login e utente corrente usano `ApiResponse`, allineandosi al contratto già adottato dai Message. I dati utente restano trasformati da `UserResource`; errori auth e logout non cambiano.

## File modificati

- `backend/composer.json` e `backend/composer.lock`
- `backend/.env.example`, `backend/config/cors.php`, `backend/bootstrap/app.php`
- Controller, Request e route backend per Auth e Message
- Test di feature Auth e Message
- `backend/database/seeders/DatabaseSeeder.php` per l'ordinamento import richiesto da Pint

## Risultati dei controlli

- Verifica locale con PHP 8.5 Lerd: `composer test` riuscito (20 test, 140 assertion, 1.44s).
- Verifica locale con PHP 8.5 Lerd: `./vendor/bin/phpstan analyse --memory-limit=512M` riuscito (34/34, nessun errore).
- Sintassi PHP e `/usr/bin/php ./vendor/bin/pint --test` sui file del task: riusciti nel sandbox.
- Smoke test Postman del flusso Sanctum cookie/CSRF: riuscito. Postman deve inviare `Origin: http://localhost:3000`, conservare i cookie e inoltrare `X-XSRF-TOKEN` decodificato.
- `/usr/bin/php ./vendor/bin/pint --test` completo: riuscito nel sandbox.

## Problemi residui

- Lo smoke browser e l'integrazione frontend dell'autenticazione sono rinviati al prossimo task frontend per decisione esplicita. La verifica manuale backend equivalente in Postman è riuscita.

## Riepilogo finale

Sanctum SPA, CORS con credenziali, endpoint auth e protezione Message sono implementati e verificati con Pest, PHPStan, Pint e Postman. Il task è completato; il frontend auth sarà affrontato separatamente.
