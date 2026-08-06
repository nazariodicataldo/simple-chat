# M1-001 — Verificare e documentare il bootstrap backend esistente

- **Stato:** completato
- **Milestone:** Milestone 1 — Chat HTTP autenticata
- **Data di apertura:** 2026-08-05
- **Data di chiusura:** 2026-08-06

## Contesto

Uno skeleton Laravel 13 e' gia' presente in `backend/`, ma il suo bootstrap non e' ancora stato verificato e i comandi del progetto non sono documentati con evidenze.

## Obiettivo

Verificare il solo backend esistente con uno smoke test minimo e documentare i comandi effettivamente funzionanti nello stato corrente, senza introdurre funzionalita' della chat.

## Fuori scope

PostgreSQL, Docker, Sanctum, endpoint, migration dei messaggi, frontend, Reverb, Redis, queue, Horizon e modifiche alle dipendenze.

## File modificabili

- `backend/tests/` soltanto se serve un test smoke mirato.
- `docs/project/current-state.md`
- Questo task e gli eventuali documenti strettamente necessari al risultato.

## File non modificabili

- `frontend/`
- Configurazione applicativa Laravel, dipendenze e lockfile, salvo nuova autorizzazione esplicita.

## Requisiti

- Ispezionare le versioni effettivamente installate prima di consultare documentazione esterna.
- Eseguire un test/smoke command backend senza assumere servizi esterni non configurati.
- Registrare esattamente comandi, esiti e limitazioni.

## Strategia di test

Usare gli smoke test Laravel esistenti o aggiungere un solo test comportamentale minimo, con RED/GREEN solo se viene introdotto comportamento nuovo. Non creare test artificiali per configurazione.

## Comandi da eseguire

- `git -C backend status --short`
- `composer test` dalla directory `backend/`
- `git -C backend diff --check`

## Criteri di accettazione

- [x] Il comando di test backend e il relativo esito sono registrati.
- [x] I comandi backend effettivamente disponibili sono riportati in `current-state.md`.
- [x] Nessuna configurazione, dipendenza o funzionalita' di chat e' stata introdotta.
- [x] Le modifiche sono limitate ai file dichiarati o all'estensione Git autorizzata esplicitamente.

## Rischi e assunzioni

- I servizi o file d'ambiente possono non essere pronti; eventuali limiti vanno dichiarati, non aggirati.
- Su autorizzazione esplicita dello sviluppatore, il task include anche la migrazione dal Git annidato a un singolo repository nella root del monorepo.

## Verifica manuale

- Lo sviluppatore ha eseguito localmente da `backend/` `composer test` con Lerd attivo: Pest ha riportato `2 passed (2 assertions)` in 0.45s, inclusi unit test e feature test Laravel.

## Decisioni emerse

- Rimossi `backend/.git` e `frontend/.git`, quindi inizializzato un unico repository Git nella root. La modifica e' stata autorizzata esplicitamente dallo sviluppatore per includere entrambi i componenti nel monorepo.

## File modificati

- `backend/.git/` — rimosso (metadata Git annidata, autorizzazione esplicita).
- `frontend/.git/` — rimosso (metadata Git annidata, autorizzazione esplicita).
- `.git/` — inizializzato nella root del monorepo.
- `CHANGELOG.md`
- `docs/project/current-state.md`
- Questo task.

## Risultati dei controlli

- `git -C backend status --short` (prima della rimozione): file Laravel tutti non tracciati; nessuna modifica eseguita dal task a tali file.
- `composer test` da `backend/`: non ha raggiunto Pest. Il wrapper Lerd ha fallito prima dell'esecuzione per `dbus connect: dial unix /run/user/1000/bus: connect: operation not permitted` e per filesystem in sola lettura nella directory Lerd.
- `php artisan test`: stesso blocco, poiche' `php` nel PATH e' il wrapper Lerd.
- `/usr/bin/php artisan test`: non eseguibile; `/usr/bin/php` non esiste nell'ambiente.
- `git init` nella root: eseguito con successo dopo autorizzazione di scrittura in `.git/hooks`; `find . -type d -name .git -prune -print` riporta solo `./.git`.
- `git -C backend diff --check`: exit code 0; dopo la rimozione del Git annidato il comando usa correttamente il repository root e non riporta errori di whitespace nelle modifiche tracciate.
- `composer test` da `backend/`, eseguito localmente dallo sviluppatore con Lerd attivo: superato, `2 passed (2 assertions)`, durata 0.45s.

## Problemi residui

- Tutti i file del monorepo risultano non tracciati nel repository root appena inizializzato. Occorre una revisione intenzionale prima di un primo `git add` e commit.
- Il sandbox dell'agente non puo' raggiungere il D-Bus della sessione Lerd dello sviluppatore; i futuri test Lerd eseguiti localmente dovranno essere riportati con output completo.

## Riepilogo finale

Completato. Il bootstrap backend esistente e' stato verificato con `composer test` nell'ambiente locale dello sviluppatore. Non sono state introdotte funzionalita' della chat, configurazioni applicative o dipendenze. La migrazione Git alla root e' l'unica estensione autorizzata al task.
