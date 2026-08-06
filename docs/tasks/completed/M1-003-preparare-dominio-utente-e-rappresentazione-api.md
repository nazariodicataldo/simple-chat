# M1-003 — Preparare il dominio utente e la rappresentazione API

- **Stato:** completato
- **Milestone:** Milestone 1 — Chat HTTP autenticata
- **Data di apertura:** 2026-08-06
- **Data di chiusura:** 2026-08-06

## Contesto

Il backend Laravel e' stato sottoposto al bootstrap iniziale, ma lo skeleton conserva ancora il campo `name` e non offre una rappresentazione API dell'utente. La chat richiede un'identita' utente con nome, cognome e username prima di introdurre registrazione e messaggi.

## Obiettivo

Preparare migration, modello, factory e API Resource dell'utente. La Resource espone dati pubblici in camelCase per il frontend.

## Fuori scope

Controller e rotte utente, registrazione, autenticazione, policy, Form Request, validazione dello username, messaggi, modifiche al bootstrap API e modifiche frontend.

## File modificabili

- `backend/database/migrations/0001_01_01_000000_create_users_table.php`.
- `backend/app/Models/User.php`.
- `backend/database/factories/UserFactory.php`.
- `backend/app/Http/Resources/UserResource.php`.
- Test backend pertinenti.
- Questo task e `docs/project/current-state.md` al completamento.

## File non modificabili

- `backend/bootstrap/app.php`, `backend/routes/api.php` e `backend/routes/web.php`: modifiche preesistenti del bootstrap fuori scope.
- Frontend, dipendenze, lockfile, controller, policy e Form Request.

## Requisiti

- La tabella `users` contiene `id`, `first_name`, `last_name`, `email` univoca, `username` univoco, `email_verified_at` nullable, `password` e timestamp; non contiene `remember_token`.
- Il modello consente mass assignment soltanto di `first_name`, `last_name`, `email`, `username` e `password`; password resta nascosta e hashata.
- La factory produce i nuovi attributi.
- `UserResource::toArray()` espone `id`, `firstName`, `lastName`, `email`, `username`, `emailVerifiedAt`, `createdAt` e `updatedAt`, senza dati sensibili.

## Strategia di test

TDD su due superfici concordate: `UserResource::toArray()` come contratto pubblico e `UserFactory::make()` come generatore dei dati del dominio. Scrivere un test RED per ogni superficie, introdurre l'implementazione minima GREEN e poi eseguire la suite backend e i controlli statici.

## Comandi da eseguire

- Da `backend/`: `composer test`, `./vendor/bin/pint --test`, `./vendor/bin/phpstan analyse`.
- Dalla root: `git status --short`, `git diff --stat`, `git diff --check`.

## Criteri di accettazione

- [x] Migration, modello e factory riflettono il nuovo dominio utente.
- [x] La Resource implementa il contratto camelCase senza password.
- [x] I test pertinenti e i controlli backend sono eseguiti e documentati.
- [x] Le modifiche restano nei file dichiarati e non alterano il bootstrap preesistente.

## Rischi e assunzioni

- `username` e' una stringa univoca senza regole di formato finche' non esiste il flusso di registrazione.
- I timestamp della Resource sono oggetti data Laravel e vengono serializzati dal response layer nel formato JSON standard.
- `email_verified_at` resta disponibile per una futura conferma email, senza implementarla in questo task.

## Verifica manuale

Eseguire i comandi backend dalla directory `backend/`; il test della Resource deve mostrare il payload camelCase e non contenere password.

## Decisioni emerse

Nessuna decisione architetturale; il task applica il contratto concordato per il dominio utente.

## File modificati

- `backend/database/migrations/0001_01_01_000000_create_users_table.php`.
- `backend/app/Models/User.php`.
- `backend/database/factories/UserFactory.php`.
- `backend/app/Http/Resources/UserResource.php`.
- `backend/tests/Feature/Http/Resources/UserResourceTest.php`.
- Questo task.
- `docs/project/current-state.md`.

## Risultati dei controlli

- Prima del test RED della Resource, `composer test -- tests/Feature/Http/Resources/UserResourceTest.php` da `backend/` non si avvia: `zsh:1: command not found: composer` (exit 127). Non e' quindi possibile osservare il RED o il GREEN nel sandbox.
- `php --version` e `php artisan --version` non sono eseguibili: `zsh:1: command not found: php` (exit 127). I binari vendor di Pest, Pint e PHPStan sono presenti, ma richiedono PHP.
- Primo tentativo nel sandbox: `./vendor/bin/pint --test` e `./vendor/bin/phpstan analyse` da `backend/` non si avviano: `/usr/bin/env: 'php': No such file or directory` (exit 127).
- Verifica locale dello sviluppatore, 2026-08-06: `composer test -- tests/Feature/Http/Resources/UserResourceTest.php` e' riuscito dopo il clear della configuration cache. Pest riporta 2 test superati: serializzazione camelCase della Resource e attributi della factory.
- Verifica locale dello sviluppatore, 2026-08-06: `composer test` termina con 1 fallimento e 3 test superati (11 assertion). Il solo test fallito e' `tests/Feature/ExampleTest.php`: richiede `/` e riceve 404, coerente con il bootstrap preesistente che registra soltanto le rotte API. Non e' una regressione introdotta da M1-003.
- Verifica locale dello sviluppatore, 2026-08-06: Pint rileva 2 problemi di stile, uno in `UserResource` (import/docblock, corretto in questo task) e uno in `bootstrap/app.php` (modifica preesistente, fuori scope). PHPStan termina con errore del worker parallelo (exit 255), senza la causa originale nell'output.
- Verifica locale dello sviluppatore, 2026-08-06: `./vendor/bin/pint --test app/Http/Resources/UserResource.php` e' riuscito (1 file).
- Verifica locale dello sviluppatore, 2026-08-06: `./vendor/bin/phpstan analyse --debug` identifica la causa del crash: il limite PHP configurato di 128 MB e' esaurito nel lexer di `phpstan/phpdoc-parser` durante l'analisi; nessun errore di analisi del codice e' stato prodotto.
- Verifica locale dello sviluppatore, 2026-08-06: `./vendor/bin/phpstan analyse --memory-limit=512M` e' riuscito: 21 file analizzati, nessun errore.
- Verifica locale dello sviluppatore, 2026-08-06: `composer test` e' riuscito: 3 test superati, 10 assertion. Il test di esempio non viene piu' eseguito.
- Verifica locale dello sviluppatore, 2026-08-06: prima della sua rimozione, `./vendor/bin/pint --test` terminava con 2 problemi fuori scope: `bootstrap/app.php` e `tests/Feature/ExampleTest.php`, allora commentato senza riga vuota finale.
- Lo sviluppatore ha poi eliminato autonomamente `tests/Feature/ExampleTest.php`; resta da verificare Pint dopo tale rimozione.
- `git diff --check` dalla root: riuscito, senza output.
- Verifica locale dello sviluppatore, 2026-08-06: dopo la correzione autonoma dello stile in `bootstrap/app.php` e l'eliminazione autonoma di `tests/Feature/ExampleTest.php`, `./vendor/bin/pint --test` e' riuscito su 28 file.

## Problemi residui

- Il test di esempio ereditato dal bootstrap API richiede `/`, che non e' piu' registrata; serve un task dedicato al completamento del bootstrap per riallinearlo. Il task M1-003 non modifica tale bootstrap.
- Nessuno.

## Riepilogo finale

Task completato: migration, modello, factory e Resource utente sono allineati al contratto concordato. La suite backend, Pint completo e PHPStan con 512 MB sono verificati localmente dallo sviluppatore.
