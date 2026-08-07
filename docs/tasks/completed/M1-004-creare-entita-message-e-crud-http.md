# M1-004 — Creare l’entità Message e il CRUD HTTP provvisorio

- **Stato:** completato
- **Milestone:** Milestone 1 — Chat HTTP autenticata
- **Data di apertura:** 2026-08-07
- **Data di chiusura:** 2026-08-07

## Contesto

Il dominio utente è disponibile, ma non esistono ancora messaggi, endpoint API o autenticazione. Questa task prepara il modello persistente e il primo CRUD HTTP per la chat.

## Obiettivo

Introdurre Message con soft-delete, relazione utente, Resource camelCase, CRUD API, validazione, factory e policy di proprietà. Finché non esiste auth, la creazione assegna l’utente placeholder con ID 1.

## Fuori scope

Autenticazione e applicazione delle policy nelle richieste, paginazione, restore o visualizzazione di messaggi eliminati, realtime, frontend, dipendenze e modifiche al database PostgreSQL di produzione.

## File modificabili

- `backend/database/migrations/` e `backend/database/factories/` pertinenti a Message.
- `backend/app/Models/`, `backend/app/Http/Controllers/`, `backend/app/Http/Requests/`, `backend/app/Http/Resources/` e `backend/app/Policies/` pertinenti a Message, oltre a `User.php`.
- `backend/routes/api.php`.
- Test backend pertinenti.
- Questo task e `docs/project/current-state.md` al completamento.

## File non modificabili

- Frontend, dipendenze e lockfile.
- Bootstrap, configurazione auth e infrastruttura realtime.

## Requisiti

- `messages` contiene `id`, `user_id` nullable con FK e `nullOnDelete`, `text`, timestamp e `deleted_at` per soft-delete.
- Message ha fillable `text` e `user_id`, factory, soft-delete e relazione al suo User; User ha una relazione ai propri messaggi.
- `MessageResource::toArray()` espone `id`, `userId`, `text`, `createdAt`, `updatedAt` e `deletedAt`.
- Il Form Request accetta soltanto `text`, obbligatorio, stringa e massimo 300 caratteri; `user_id` del client viene ignorato.
- `/api/messages` espone il CRUD REST; create restituisce 201, delete 204 e i record soft-deleted non sono accessibili dal CRUD ordinario.
- Store forza `user_id = 1` finché non sarà disponibile l’utente autenticato.
- La policy consente create e consente update/delete soltanto al proprietario; il controller non la applica prima dell’autenticazione.

## Strategia di test

TDD sulle superfici pubbliche: Resource, CRUD HTTP, persistenza/soft-delete e policy. Ogni test verifica un payload o comportamento osservabile, senza mock interni.

## Comandi da eseguire

- Da `backend/`: `composer test`, `./vendor/bin/pint --test`, `./vendor/bin/phpstan analyse --memory-limit=512M`.
- Dalla root: `git status --short`, `git diff --stat`, `git diff --check`.

## Criteri di accettazione

- [x] Migration, modello, factory e relazioni persistono correttamente Message e soft-delete.
- [x] Resource e CRUD espongono il contratto JSON camelCase stabilito.
- [x] Validazione e assegnazione server-side dell’utente placeholder sono dimostrate da test.
- [x] Policy proprietario/non proprietario è dimostrata da test.
- [x] Controlli backend e Git sono eseguiti e documentati.
- [x] Migration sul database PostgreSQL locale Lerd e smoke test CRUD con Postman sono eseguiti e documentati.

## Rischi e assunzioni

- Il placeholder richiede che l’utente con ID 1 esista: i test lo creano esplicitamente. Con auth, questo valore sarà sostituito dall’utente autenticato e le policy saranno applicate.
- Il vincolo di 300 caratteri è nel Form Request; il database usa `text` come richiesto.
- `deletedAt` fa parte della Resource, pur restando normalmente `null` perché i record eliminati non vengono serviti dal CRUD ordinario.

## Verifica manuale

Con database migrato e utente ID 1 presente, inviare POST `/api/messages` con `text`; verificare risposta 201 camelCase. Poi DELETE del messaggio e verificare che GET non lo restituisca.

## Decisioni emerse

Nessuna decisione architetturale: si applica il placeholder temporaneo concordato fino all’introduzione dell’autenticazione.

## File modificati

- `backend/database/migrations/2026_08_07_000000_create_messages_table.php`.
- `backend/app/Models/Message.php` e `backend/app/Models/User.php`.
- `backend/database/factories/MessageFactory.php`.
- `backend/app/Http/Resources/MessageResource.php`.
- `backend/app/Http/Requests/MessageRequest.php`.
- `backend/app/Http/Controllers/MessageController.php`.
- `backend/app/Policies/MessagePolicy.php`.
- `backend/routes/api.php`.
- Test backend pertinenti.
- Questo task e `docs/project/current-state.md`.

## Risultati dei controlli

- RED tentato: `composer test -- tests/Feature/Http/Resources/MessageResourceTest.php` da `backend/` non si avvia nel sandbox: `zsh:1: command not found: composer`.
- `composer test` da `backend/` non si avvia per lo stesso motivo; l’intera suite Pest non è verificata nel sandbox.
- `./vendor/bin/pint --test` da `backend/`: riuscito (`{"tool":"pint","result":"passed"}`).
- `./vendor/bin/phpstan analyse --memory-limit=512M` da `backend/`: non avviabile; le dipendenze installate richiedono PHP `>= 8.4.1`, mentre il sandbox espone PHP `8.3.6`.
- `php -l` su tutti i file PHP aggiunti o modificati: riuscito, nessun errore di sintassi.
- `git diff --check`: riuscito, senza output.
- Verifica locale dello sviluppatore, 2026-08-07: `composer test` riuscito; Pest riporta 10 test superati, inclusi CRUD, Resource, relazioni, soft-delete e policy Message.
- Verifica locale dello sviluppatore, 2026-08-07: `./vendor/bin/phpstan analyse --memory-limit=512M` riuscito; 28/28 file analizzati, nessun errore.
- Verifica manuale dello sviluppatore, 2026-08-07: migration applicata al database PostgreSQL locale Lerd e smoke test CRUD eseguito con Postman, senza anomalie riportate.

## Problemi residui

- Nessuno.

## Riepilogo finale

Task completata: test automatizzati, controlli statici, migration PostgreSQL locale Lerd e smoke test CRUD tramite Postman sono stati verificati.
