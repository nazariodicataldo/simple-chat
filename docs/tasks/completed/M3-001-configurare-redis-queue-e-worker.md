# M3-001 — Configurare Redis queue e worker dedicato

- **Stato:** completato
- **Milestone:** Milestone 3 — Redis e queue
- **Data di apertura:** 2026-08-26
- **Data di chiusura:** 2026-08-27
- **Dipendenze:** nessuna

## Contesto

Redis locale Lerd e il client `phpredis` sono gia' configurati, ma Laravel usa
ancora `QUEUE_CONNECTION=database`. Il worker non fa ancora parte del workflow
del progetto: lo script Laravel generico `composer dev` avvia
`queue:listen --tries=1 --timeout=0`, che non rappresenta la politica M3.

La migration `0001_01_01_000002_create_jobs_table.php` contiene gia'
`failed_jobs`; Redis deve ospitare i job pendenti, mentre PostgreSQL conserva i
job definitivamente falliti.

## Obiettivo

Rendere Redis la queue predefinita documentata, configurare una sola queue
`default` e aggiungere il comando Composer `composer queue:work` che avvia il
worker M3 con la politica approvata.

## Fuori scope

- Conversione degli eventi Message a `ShouldBroadcast` (M3-002).
- Modifiche a controller, API HTTP, frontend, Reverb o Echo.
- Horizon, Docker, code prioritarie, code dedicate di produzione, cluster Redis
  o Redis come database della chat/cache.
- Modifica di `composer dev`.
- Modifica o commit di `backend/.env`, credenziali o secret.

## File modificabili

- `backend/.env.example`
- `backend/config/queue.php`
- `backend/composer.json`
- `docs/learning/redis-queues-workers.md`
- `docs/project/current-state.md`
- Questo task

## File non modificabili

- `backend/.env`
- Codice applicativo, eventi, controller, frontend e migration esistenti.
- `composer.lock` e dipendenze.

## Requisiti

- `.env.example` usa l'host Lerd `REDIS_HOST=lerd-redis`, imposta
  `QUEUE_CONNECTION=redis` e dichiara esplicitamente:
  `REDIS_QUEUE_CONNECTION=default`, `REDIS_QUEUE=default`,
  `REDIS_QUEUE_RETRY_AFTER=90`, `REDIS_QUEUE_BLOCK_FOR=5` e
  `QUEUE_FAILED_DRIVER=database-uuids`.
- La connection `redis` in `config/queue.php` legge tali variabili e conserva
  `retry_after=90`, `block_for=5`, `after_commit=false` come default della
  connection. L'after-commit selettivo degli eventi e' M3-002.
- Il timeout worker M3 e' 60 s; `retry_after=90` deve restare maggiore del
  timeout per non rendere nuovamente disponibile un job ancora in esecuzione.
- Aggiungere lo script Composer `queue:work` che esegue esattamente:

  ```bash
  @php artisan queue:work redis --queue=default --tries=3 --backoff=5 --timeout=60
  ```

- Nessun `--sleep` esplicito e nessuna modifica allo script `dev`.
- Il file locale ignorato `backend/.env` va allineato manualmente agli stessi
  valori prima dello smoke, senza inserirlo nel diff.

## Strategia di test

Questo e' wiring/configurazione: non introdurre test fittizi. Controllare la
configurazione risolta da Laravel nel runtime locale Lerd e avviare il worker
con il nuovo script. L'esecuzione di un vero broadcast e' demandata a M3-004.

## Comandi da eseguire

- `git status --short`
- `git diff --stat`
- `git diff --check`
- Da `backend/`: `composer validate --no-check-publish`
- Da `backend/`: `lerd start`
- Da `backend/`: `php artisan config:clear`
- Da `backend/`: `php artisan config:show queue`
- Da `backend/`: `composer queue:work` (avvio osservabile, poi arresto manuale
  senza job)
- Da `backend/`: `./vendor/bin/pint --test` e
  `./vendor/bin/phpstan analyse --memory-limit=512M`

## Criteri di accettazione

- [x] La queue di default risolta e' `redis`; queue, retry-after, block-for e
  `failed.driver=database-uuids` coincidono con i valori approvati.
- [x] `composer queue:work` avvia un worker Redis `default` con 3 tentativi,
  backoff 5 s e timeout 60 s.
- [x] `composer dev` e le dipendenze/lockfile restano invariati.
- [x] `backend/.env` non appare nel diff o nello staging.
- [x] I controlli configurativi, statici e il diff sono registrati con esito.

## Rischi e assunzioni

Il sandbox non puo' raggiungere Redis/Lerd o il runtime PHP richiesto; i
comandi Laravel devono quindi avere evidenza locale dello sviluppatore. Senza
Redis raggiungibile il worker puo' partire ma non costituisce una verifica
riuscita della connection.

`block_for=5` blocca Redis fino a cinque secondi solo quando la queue e'
vuota; un job nuovo sveglia subito il worker. Senza block-for il worker usa
polling e il suo sleep predefinito.

## Verifica manuale

1. Da `backend/`, eseguire `lerd start`: deve avviare i servizi dichiarati in
   `.lerd.yaml`, incluso Redis, oltre al worker Reverb gia' configurato.
2. Controllare che il file locale ignorato `backend/.env` usi
   `REDIS_HOST=lerd-redis`, `REDIS_PORT=6379` e i valori queue M3; cambiare
   `QUEUE_CONNECTION` da `database` a `redis` solo durante questo task.
   Non copiare o committare valori di Reverb o altri secret.
3. Eseguire `php artisan config:clear`.
4. Eseguire `php artisan config:show queue` e annotare connection `redis`,
   queue `default`, `retry_after=90`, `block_for=5` e
   `failed.driver=database-uuids`, senza riportare secret.
5. Avviare `composer queue:work`; verificare che resti in ascolto senza errori
   di connessione Redis, poi interromperlo con Ctrl-C.

## Decisioni emerse

- Una sola queue Redis `default`; nessuna priorita' o queue dedicata di
  produzione in M3.
- Worker: tre tentativi totali, 5 s di attesa tra tentativi, 60 s massimi per
  ciascun tentativo.
- `--timeout=60` limita la durata di un singolo tentativo del worker; il
  `retry_after=90` di Redis mantiene riservato il job piu' a lungo, cosi' Redis
  non lo rende nuovamente disponibile mentre il worker puo' essere ancora in
  esecuzione.
- PostgreSQL conserva i failed jobs tramite `database-uuids`.
- `composer dev` non e' il workflow M3; il comando dedicato e' `composer
  queue:work`.

## File modificati

- `backend/.env.example`
- `backend/config/queue.php`
- `backend/composer.json`
- `docs/learning/redis-queues-workers.md`
- `docs/project/current-state.md`
- Questo task

## Risultati dei controlli

- `composer validate --no-check-publish`: riuscito; restano solo i warning
  preesistenti sui vincoli Composer non vincolati `*` per Reverb e Pusher.
- `php -l config/queue.php`: riuscito senza errori di sintassi.
- `lerd start`: riuscito nel runtime locale, incluso il servizio Redis.
- `php artisan config:clear`: riuscito.
- `php artisan config:show queue`: riuscito; default `redis`, connection
  `default`, queue `default`, `retry_after=90`, `block_for=5`,
  `after_commit=false`, failed driver `database-uuids` e database PostgreSQL.
- `composer queue:work`: riuscito; il worker ha mostrato `Processing jobs from
  the [default] queue`, e' rimasto in ascolto oltre 10 secondi senza errori di
  connessione Redis ed e' stato arrestato con Ctrl-C, exit 0, senza job.
- `./vendor/bin/pint --test`: riuscito.
- `./vendor/bin/phpstan analyse --memory-limit=512M`: riuscito, 0 errori.
- `git diff --check`: riuscito.
- `composer dev` non e' stato modificato; `composer.lock` e `backend/.env` non
  compaiono nel diff.

## Problemi residui

- Nessun problema residuo del task. Nel sandbox i wrapper Lerd/PHP 8.5 non
  potevano accedere a D-Bus; i controlli runtime sono stati eseguiti nel
  runtime locale autorizzato.

## Riepilogo finale

Redis e' ora la queue predefinita documentata, con una sola queue `default` e
worker Composer dedicato ai parametri M3. La verifica ha confermato sia la
configurazione risolta sia la connessione Redis reale del worker senza
introdurre job o modifiche a `composer dev`, dipendenze, lockfile o `.env`.
