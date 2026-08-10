# M1-007 — Correggere il contratto di paginazione e autore Message

- **Stato:** completato
- **Milestone:** Milestone 1 — Chat HTTP autenticata
- **Data di apertura:** 2026-08-10
- **Data di chiusura:** 2026-08-10

## Contesto

La review di M1-006 ha rilevato che il fix locale per l'ordine cronologico crescente non è allineato con test e documentazione. Inoltre il listing pubblico espone l'email tramite `UserResource` e i test non verificano autori distinti né `previousCursor`.

## Obiettivo

Allineare il contratto di `GET /api/messages` a cronologia crescente, rendere pubblico soltanto il profilo autore necessario alla chat e coprire interamente il contratto cursor/envelope rilevante.

## Fuori scope

Autenticazione, protezione delle rotte, modifica del contratto degli endpoint utente, frontend, dipendenze, lockfile e refactor non correlati.

## File modificabili

- Controller, Resource e test backend pertinenti a Message.
- Documentazione M1-006, M1-007 e stato progetto.

## Requisiti

- La prima pagina restituisce i 20 messaggi meno recenti in ordine `id` crescente; il `nextCursor` restituisce i messaggi successivi, più recenti.
- La risposta espone e testa `previousCursor`, `nextCursor`, `hasMorePages`, `perPage` e i campi envelope obbligatori.
- L'autore di un messaggio espone `id`, `firstName`, `lastName` e `username`, ma non email o altri dati dell'account.
- I test dimostrano la corrispondenza corretta autore-messaggio per almeno due utenti.

## Strategia di test

TDD sui confini HTTP di `GET /api/messages` e Resource autore: prima pagina cronologica, pagina cursore successiva e precedente, envelope e assenza di email.

## Comandi da eseguire

- Da `backend/`: `composer test`, `./vendor/bin/pint --test`, `./vendor/bin/phpstan analyse --memory-limit=512M`.
- Dalla root: `git status --short`, `git diff --stat`, `git diff --check`.

## Criteri di accettazione

- [x] Ordine cronologico e navigazione cursor sono dimostrati da test.
- [x] L'autore pubblico non contiene email ed è corretto per messaggi di utenti diversi.
- [x] Documentazione e test sono coerenti con il contratto effettivo.
- [x] Controlli backend e Git sono eseguiti e documentati.

## Rischi e assunzioni

- Il profilo completo dell'utente resta disponibile soltanto dove il suo contratto sarà esplicitamente autorizzato.
- L'ordine crescente è scelto per il rendering attuale dall'alto verso il basso.

## Verifica manuale

Creare 21 messaggi di almeno due utenti e verificare prima pagina, cursore successivo, cursore precedente e assenza di email nel payload autore.

## Decisioni emerse

- L'autore della chat è un sottoinsieme pubblico del profilo utente; l'email non è un dato necessario al rendering.

## File modificati

- `backend/app/Http/Resources/MessageAuthorResource.php`.
- `backend/app/Http/Resources/MessageResource.php`.
- `backend/app/Http/Controllers/MessageController.php`.
- Test controller e Resource Message.
- M1-006, M1-007, stato progetto e changelog.

## Risultati dei controlli

- RED: `composer test -- tests/Feature/Http/Controllers/MessageControllerTest.php tests/Feature/Http/Resources/MessageResourceTest.php` ha eseguito 6 test, 4 superati e 2 falliti: email esposta dall'autore e payload Resource non conforme al profilo autore minimo.
- GREEN mirato: lo stesso comando è riuscito con 6 test superati e 69 asserzioni.
- `composer test`: riuscito, 13 test superati e 87 asserzioni.
- Pint sui file backend modificati: riuscito.
- `./vendor/bin/phpstan analyse --memory-limit=512M`: riuscito, 0 errori.
- `./vendor/bin/pint --test`: fallito esclusivamente per l'ordinamento import preesistente di `database/seeders/DatabaseSeeder.php`, fuori scope.
- `git diff --check`: riuscito, senza output.

## Problemi residui

- Pint completo resta non verde per `backend/database/seeders/DatabaseSeeder.php`, file preesistente fuori scope.

## Riepilogo finale

M1-007 riallinea la cronologia crescente, protegge l'email degli autori e rende il contratto cursor/envelope osservabile dai test.
