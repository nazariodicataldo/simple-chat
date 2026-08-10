# M1-006 — Standardizzare le risposte API e paginare i messaggi

- **Stato:** completato
- **Milestone:** Milestone 1 — Chat HTTP autenticata
- **Data di apertura:** 2026-08-10
- **Data di chiusura:** 2026-08-10

## Contesto

Il CRUD Message espone attualmente payload Laravel non uniformi e `GET /api/messages` restituisce tutti i record senza autore né paginazione. Il frontend sarà adeguato in un task dedicato.

## Obiettivo

Introdurre un envelope riutilizzabile per le risposte API riuscite e applicare cursor pagination ai messaggi, includendo l'autore tramite Resource quando è stato eager-loaded.

## Fuori scope

Frontend, standardizzazione di errori/validation/404, autenticazione, modifica delle policy, realtime, nuove dipendenze e modifica del `DELETE` 204.

## File modificabili

- `backend/app/Traits/`, controller e Resource pertinenti alle API Message.
- Test backend pertinenti.
- Questo task e `docs/project/current-state.md` al completamento.

## File non modificabili

- Frontend, dipendenze e lockfile.
- Rotte, modelli, migration, policy, bootstrap e configurazioni non pertinenti.

## Requisiti

- `ApiResponse` restituisce sempre, per i successi, `success`, `data`, `timestamp`, `message` nullable e `code` uguale allo status HTTP.
- Le Resource/Resource Collection sono risolte prima di entrare nel campo `data`, senza esporre attributi dei modelli.
- Le risposte riuscite di index, store, show e update Message usano l'envelope; destroy conserva `204 No Content` senza body.
- L'index usa `with('user')`, ordine `id` crescente e `cursorPaginate(20)`.
- Solo l'index aggiunge `pagination` con `nextCursor`, `previousCursor`, `hasMorePages` e `perPage`; non espone totale o numero pagina.
- `MessageResource` include l'autore pubblico solo con relazione caricata e conserva `userId`.

## Strategia di test

TDD sulle superfici HTTP CRUD e sul contratto di `MessageResource`: envelope dei successi, eccezione destroy 204, prima pagina, cursore successivo senza duplicati, metadati e autore caricato condizionalmente.

## Comandi da eseguire

- Da `backend/`: `composer test`, `./vendor/bin/pint --test`, `./vendor/bin/phpstan analyse --memory-limit=512M`.
- Dalla root: `git status --short`, `git diff --stat`, `git diff --check`.

## Criteri di accettazione

- [x] L'envelope dei successi è riutilizzabile e adottato dalle API Message applicabili.
- [x] `GET /api/messages` restituisce pagine cursor di 20 messaggi in ordine cronologico con metadati corretti.
- [x] Ogni messaggio della lista include il proprio autore pubblico, senza caricarlo quando MessageResource è usata isolatamente.
- [x] Test e controlli richiesti sono eseguiti e documentati.

## Rischi e assunzioni

- Il timestamp usa il formato locale `Y-m-d H:i:s` richiesto dal contratto.
- Il cursor paginator non conosce totale o numero pagina; tali campi non sono simulati.
- L'unica API applicativa presente è il CRUD Message; il trait sarà il riferimento per controller futuri.

## Verifica manuale

Creare almeno 21 messaggi e richiedere `/api/messages`: verificare 20 record, autore, envelope e `nextCursor`; richiedere il cursore restituito e verificare il record restante senza duplicati.

## Decisioni emerse

- Il `DELETE` conserva il contratto REST `204` e resta l'eccezione al nuovo envelope.

## File modificati

- `backend/app/Traits/ApiResponse.php`.
- `backend/app/Http/Controllers/MessageController.php`.
- `backend/app/Http/Resources/MessageResource.php`.
- Test Resource e controller Message.
- `CHANGELOG.md` e documentazione del task/stato.

## Risultati dei controlli

- RED: il primo avvio del test mirato ha eseguito 6 test, 5 superati e 1 fallito perché l'asserzione ometteva i timestamp pubblici null di `UserResource`; corretto il test rispetto al contratto già esistente.
- `composer test -- tests/Feature/Http/Resources/MessageResourceTest.php tests/Feature/Http/Controllers/MessageControllerTest.php`: riuscito, 6 test superati e 43 asserzioni.
- `composer test`: riuscito, 13 test superati e 61 asserzioni.
- `./vendor/bin/pint --test`: fallito esclusivamente su `database/seeders/DatabaseSeeder.php` (`ordered_imports`), file preesistente e fuori scope.
- `./vendor/bin/pint --test` sui cinque file backend modificati: riuscito.
- `./vendor/bin/phpstan analyse --memory-limit=512M`: riuscito, 0 errori.
- `git diff --check`: riuscito.

## Problemi residui

- Pint completo resta non verde per l'ordinamento import preesistente di `backend/database/seeders/DatabaseSeeder.php`; la correzione richiede un task separato o autorizzazione esplicita perché è fuori scope.

## Riepilogo finale

Il CRUD Message adotta l'envelope dei successi, eccetto il delete 204 concordato. Il listing restituisce 20 messaggi in ordine cronologico con cursor pagination e autore pubblico eager-loaded. Contratto e test sono stati corretti da M1-007.
