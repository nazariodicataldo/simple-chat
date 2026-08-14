# M2-001 — Emettere eventi broadcast dei messaggi

- **Stato:** completato
- **Milestone:** Milestone 2 — Real-time diretto con Reverb ed Echo
- **Data di apertura:** 2026-08-13
- **Data di chiusura:** 2026-08-14

## Contesto

Il CRUD HTTP dei messaggi e' gia' protetto da Sanctum e dalla `MessagePolicy`. La prima parte della milestone deve notificare agli altri client le mutazioni persistite, senza cambiare il contratto HTTP `MessageResource`.

## Obiettivo

Emettere gli eventi tipizzati `MessageCreated`, `MessageUpdated` e `MessageDeleted` dal CRUD Laravel, in modo sincrono tramite `ShouldBroadcastNow` sul solo canale privato `chat`.

## Fuori scope

- Frontend e Echo.
- Autorizzazione o configurazione del canale, Reverb e broadcasting.
- Migration, model, policy, Resource API e dipendenze.

## File modificabili

- Eventi Message dedicati in `backend/app/Events/`.
- `backend/app/Http/Controllers/MessageController.php`.
- Test feature/eventi backend pertinenti.
- `docs/learning/broadcasting-reverb-echo.md`.
- Questo task.

## File non modificabili

- Frontend.
- `backend/routes/channels.php`.
- Configurazione Reverb e broadcasting.
- Migration, model, policy, API Resource e dipendenze.

## Requisiti

- I tre eventi implementano `ShouldBroadcastNow`.
- Create e update inviano `{ message: Message }`, con autore pubblico caricato.
- Delete invia `{ messageId: number }`.
- Gli eventi usano il canale privato `chat` e nomi evento tipizzati.
- Il payload broadcast resta separato da `MessageResource`, che non cambia.
- Nessun broadcast per risposta 403 o validazione fallita.
- Aggiornare la guida learning con problema, funzionamento e ruolo degli eventi, canale e payload; spiegare la scelta di `ShouldBroadcastNow`, la verifica, un errore comune, la differenza production, un piccolo esercizio e documentazione Laravel ufficiale compatibile.

## Strategia di test

RED/GREEN/REFACTOR a livello feature con un broadcaster fake nel driver Laravel. Verificare evento, canale, payload, autore pubblico e assenza di broadcast per autorizzazione o validazione non riuscite.

## Comandi da eseguire

- `git status --short`
- `git diff --stat`
- `git diff --check`
- Revisione di `docs/learning/broadcasting-reverb-echo.md` rispetto ai requisiti didattici.
- Da `backend/`: Pest mirato, `composer test`, `./vendor/bin/pint --test`, `./vendor/bin/phpstan analyse --memory-limit=512M`.

## Criteri di accettazione

- [x] Create, update e delete emettono il rispettivo evento sincrono. Verificati dai cinque test `MessageBroadcastingTest` nella suite Pest locale.
- [x] Il canale e i payload rispettano il contratto dichiarato. Verificati dai cinque test `MessageBroadcastingTest` nella suite Pest locale.
- [x] L'autore nel payload create/update e' pubblico. Verificato dai test create/update nella suite Pest locale.
- [x] 403 e validazione fallita non emettono eventi. Verificato dal test dedicato nella suite Pest locale.
- [x] La guida learning spiega gli eventi e `ShouldBroadcastNow` per un principiante. Revisionata rispetto a problema, ruoli, payload, verifica, errore comune, production, esercizio e documentazione Laravel 13.
- [x] Tutti i controlli sono registrati con evidenza.

## Rischi e assunzioni

L'evento viene emesso solo dopo la mutazione riuscita. `ShouldBroadcastNow` e' intenzionale: queue, Redis worker e Horizon appartengono alle milestone successive.

## Verifica manuale

Con broadcasting log/fake, eseguire create, update e delete autenticati e ispezionare i rispettivi eventi; provare anche un update non proprietario e testo non valido.

## Decisioni emerse

- [ADR 0002](../../decisions/0002-usare-eventi-message-separati-per-realtime.md): il real-time usa gli eventi distinti `MessageCreated`, `MessageUpdated` e `MessageDeleted`, non il precedente `MessageSent` della roadmap.

## File modificati

- `backend/app/Events/MessageCreated.php`
- `backend/app/Events/MessageUpdated.php`
- `backend/app/Events/MessageDeleted.php`
- `backend/app/Http/Controllers/MessageController.php`
- `backend/tests/Feature/Http/Controllers/MessageBroadcastingTest.php`
- `docs/learning/broadcasting-reverb-echo.md`
- Questo task.

## Risultati dei controlli

- 2026-08-14, root: `git status --short` ha rilevato modifiche preesistenti a `AGENTS.md` e i task M2 non tracciati; non sono state modificate intenzionalmente.
- 2026-08-14, `backend/`: RED/GREEN Pest mirato eseguito dopo ciascun incremento; ogni tentativo termina prima dei test, exit 1, perche' il wrapper Lerd non puo' raggiungere il D-Bus (`/run/user/1000/bus: connect: operation not permitted`).
- 2026-08-14, `backend/`: `/usr/bin/php8.3 vendor/bin/pest tests/Feature/Http/Controllers/MessageBroadcastingTest.php` termina exit 255 prima dei test: Composer richiede PHP `>= 8.5.0`, il sandbox espone PHP 8.3.6.
- 2026-08-14, `backend/`: `composer test`, `./vendor/bin/pint --test` e `./vendor/bin/phpstan analyse --memory-limit=512M` terminano exit 1 prima dell'avvio per lo stesso accesso D-Bus negato a Lerd.
- 2026-08-14, `backend/`: controllo sintattico supplementare con `/usr/bin/php8.3 -l` riuscito sui tre file evento, controller e feature test. Non sostituisce Pest, Pint o PHPStan.
- 2026-08-14, root: revisione manuale della guida learning completata rispetto ai requisiti didattici del task e alla documentazione ufficiale Laravel 13.
- 2026-08-14, `backend/`, verifica locale dello sviluppatore: `composer test` riuscito, inclusi i quattro test `MessageBroadcastingTest` (24 test, 153 assertion, 1.94 s).
- 2026-08-14, `backend/`, verifica locale dello sviluppatore: `./vendor/bin/pint --test` riuscito su 50 file.
- 2026-08-14, `backend/`, verifica locale dello sviluppatore: `./vendor/bin/phpstan analyse --memory-limit=512M` riuscito, 37/37 file, nessun errore.
- 2026-08-14, `backend/`, follow-up di revisione: il nuovo test del broadcaster ha inizialmente fallito perche' Laravel consegna al driver un oggetto `PrivateChannel`, non una stringa; l'asserzione e' stata corretta sul contratto del driver. `composer test` e' poi riuscito (25 test, 158 assertion, 1.72 s), `./vendor/bin/pint --test` e `./vendor/bin/phpstan analyse --memory-limit=512M` sono riusciti (0 errori).

## Problemi residui

Nessuno.

## Riepilogo finale

Implementati gli eventi sincroni e i test feature previsti, con payload broadcast separato da `MessageResource`. La suite Pest locale, Pint e PHPStan hanno verificato tutti i criteri di accettazione; il task e' spostato in `completed`.
