# M3-003 — Documentare prova failure job Redis isolata

- **Stato:** proposta
- **Milestone:** Milestone 3 — Redis e queue
- **Data di apertura:** 2026-08-26
- **Dipendenze:** M3-001

## Contesto

La suite Pest standard usa SQLite in memoria e `QUEUE_CONNECTION=sync`; non
puo' condividere Redis, il worker esterno o la tabella `failed_jobs` del runtime
locale. `Queue::fake()` osserva il dispatch ma non esegue tentativi, backoff o
persistenza dei fallimenti.

Serve quindi una prova locale, ripetibile e isolata che dimostri la meccanica
Laravel Redis → worker → tre fallimenti → `failed_jobs`, senza coinvolgere
Echo/Reverb e senza avvelenare la queue chat `default`.

## Obiettivo

Fornire un fixture job solo test/dev e una procedura manuale precisa per
provare failed jobs su Redis reale, queue `m3-failure-test` e PostgreSQL locale.

## Fuori scope

- Un fake worker inesistente o un nuovo profilo automatico Redis/DB per Pest.
- Automazione CI, Docker, Horizon e dashboard dei failed jobs.
- Broadcast, Echo, Reverb o browser (M3-004).
- `queue:retry` riuscito per questo job sempre fallente: il recupero riuscito
  viene dimostrato con Reverb in M3-004.
- Modifiche a codice applicativo sotto `backend/app/`.

## File modificabili

- Fixture test/dev sotto `backend/tests/` con namespace `Tests\\`
- Test backend strettamente necessario a mantenere il fixture esplicito
- Questo task

## File non modificabili

- `backend/app/`, eventi Message, controller, frontend, `.env`, configurazioni
  di produzione, dipendenze e lockfile.

## Requisiti

- Il fixture implementa `ShouldQueue`, non `ShouldBroadcast`; il suo `handle()`
  lancia intenzionalmente un'eccezione riconoscibile e non contiene secret.
- Il fixture e' autoload-dev soltanto e non viene referenziato da codice
  applicativo.
- La procedura usa la vera connection `redis` e una queue dedicata
  `m3-failure-test`; non usare `default`.
- Il worker di prova usa gli stessi valori M3: tre tentativi, backoff 5 s e
  timeout 60 s.
- La verifica consulta il record esatto in `failed_jobs` mediante marker/UUID
  non sensibile e lo rimuove con `queue:forget <uuid>` al termine.

## Strategia di test

Il test automatico utile qui e' limitato al fatto che il fixture sia un job
queued test-only e lanci l'eccezione attesa. Non sostenere che tale test provi
retry o `failed_jobs`.

La prova autorevole e' manuale nel runtime Lerd, con worker vero e PostgreSQL
persistente. Se si desiderera' renderla automatica in futuro, servira' un task
separato con database persistente e Redis dedicati ai test.

## Comandi da eseguire

- `git status --short`
- `git diff --stat`
- `git diff --check`
- Da `backend/`: test mirato del fixture e `composer test`
- Da `backend/`: `./vendor/bin/pint --test`
- Da `backend/`: `./vendor/bin/phpstan analyse --memory-limit=512M`
- Da `backend/`, dopo `composer dump-autoload` se necessario: dispatch manuale
  del fixture su `redis` / `m3-failure-test` tramite Tinker.
- Da `backend/`: `php artisan queue:work redis --queue=m3-failure-test --tries=3 --backoff=5 --timeout=60`
- Da `backend/`: `php artisan queue:failed`
- Da `backend/`: `php artisan queue:forget <uuid-esatto-del-fixture>`

## Criteri di accettazione

- [ ] Il fixture e' esclusivamente test/dev, queued e non puo' emettere Echo.
- [ ] Il worker Redis della queue dedicata esegue tre tentativi con due attese
  di circa 5 s prima del fallimento definitivo.
- [ ] `queue:failed` mostra un record con marker del fixture, connection Redis
  e queue `m3-failure-test`.
- [ ] Il cleanup usa solo l'UUID verificato del fixture e non rimuove failed
  jobs estranei.
- [ ] Suite/test mirato, controlli statici e diff hanno evidenza registrata;
  la prova Lerd e' riportata separatamente da quella sandbox.

## Rischi e assunzioni

Il fixture fallisce sempre: dopo `queue:retry` fallirebbe nuovamente. Non
usarlo per dimostrare recupero riuscito e non lasciare il job nella queue dopo
la prova.

La prova accede a Redis e PostgreSQL locali dello sviluppatore; il sandbox non
la puo' eseguire. Il marker deve permettere di riconoscere con certezza il solo
record creato dal fixture prima di eseguire `queue:forget`.

## Verifica manuale

1. Da `backend/`, eseguire `lerd start` per avviare PostgreSQL e Redis Lerd;
   verificare M3-001 e nessun worker su `m3-failure-test` gia' attivo.
2. In Tinker, dispatchare il fixture con marker unico alla connection `redis`
   e queue `m3-failure-test`. Annotare marker e orario, mai cookie/secret.
3. Avviare il worker dedicato riportato sopra e attendere i tre tentativi:
   primo immediato, secondo dopo circa 5 s, terzo dopo altri circa 5 s.
4. Eseguire `php artisan queue:failed`; identificare il record tramite marker,
   UUID, connection e queue. Conservare solo UUID/marker nel report.
5. Eseguire `php artisan queue:forget <uuid-esatto-del-fixture>` e ripetere
   `queue:failed` per provare che il record di prova non resta presente.
6. Non eseguire `queue:retry` per questo job; M3-004 prova il retry che torna
   a successo dopo il ripristino di Reverb.

## Decisioni emerse

- Laravel non fornisce un fake worker ufficiale: `Queue::fake()` intercetta il
  dispatch ma non esegue job.
- La queue `m3-failure-test` e' una queue Redis reale, isolata dalla `default`.
- Questa e' una verifica manuale deterministica, non parte della suite Pest
  standard finche' non esistera' un ambiente Redis/DB dedicato ai test.

## File modificati

Da compilare durante il task.

## Risultati dei controlli

Da compilare durante il task.

## Problemi residui

Da compilare durante il task.

## Riepilogo finale

Da compilare alla chiusura del task.
