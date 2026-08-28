# M3-003 — Documentare prova failure job Redis isolata

- **Stato:** completato
- **Milestone:** Milestone 3 — Redis e queue
- **Data di apertura:** 2026-08-26
- **Data di chiusura:** 2026-08-28
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
- `backend/composer.json`
- `docs/learning/redis-queues-workers.md`
- `docs/project/current-state.md`
- Questo task

## File non modificabili

- `backend/app/`, eventi Message, controller, frontend, `.env`, configurazioni
  di produzione, dipendenze e lockfile.

## Requisiti

- Il fixture implementa `ShouldQueue`, non `ShouldBroadcast`; il suo `handle()`
  lancia intenzionalmente un'eccezione riconoscibile e non contiene secret.
- Il fixture e' autoload-dev soltanto e non viene referenziato da codice
  applicativo.
- Il fixture genera automaticamente un marker non sensibile e lo include
  nell'eccezione; usa la vera connection `redis` e la queue dedicata
  `m3-failure-test`, mai `default`.
- Il worker di prova usa gli stessi valori M3: tre tentativi, backoff 5 s e
  timeout 60 s.
- Lo script Composer `queue:failure-test` avvia esattamente il worker Redis
  della queue `m3-failure-test` con quei valori, senza modificare
  `queue:work` o `composer dev`.
- `queue:failed` identifica il record esatto tramite UUID, connection, queue e
  classe; una query read-only sul solo UUID verifica il marker nell'eccezione.
  Il cleanup usa poi `queue:forget <uuid>`.
- La guida Redis estende M3-003 senza anticipare M3-004: spiega failed job,
  retry/backoff, UUID e cleanup, distingue test automatico da prova Lerd e
  include configurazione, verifica, errore comune, differenza production,
  esercizio e documentazione ufficiale come richiesto dall'indice Learning.

## Strategia di test

Il test automatico utile qui e' limitato al fatto che il fixture sia un job
queued test-only e lanci l'eccezione attesa. Non sostenere che tale test provi
retry o `failed_jobs`.

La prova autorevole e' manuale nel runtime Lerd, con worker vero e PostgreSQL
persistente. `queue:failed` non mostra l'eccezione o il payload: la procedura
interroga quindi il solo UUID gia' identificato per verificare il marker.
Se si desiderera' renderla automatica in futuro, servira' un task separato con
database persistente e Redis dedicati ai test.

## Comandi da eseguire

- `git status --short`
- `git diff --stat`
- `git diff --check`
- Da `backend/`: test mirato del fixture e `composer test`
- Da `backend/`: `./vendor/bin/pint --test`
- Da `backend/`: `./vendor/bin/phpstan analyse --memory-limit=512M`
- Da `backend/`, dopo `composer dump-autoload` se necessario: dispatch manuale
  del fixture su `redis` / `m3-failure-test` tramite Tinker.
- Da `backend/`: `composer queue:failure-test`
- Da `backend/`: `php artisan queue:failed`
- Da `backend/`: query Tinker read-only del record `failed_jobs` tramite UUID
  esatto, per verificare marker, connection e queue
- Da `backend/`: `php artisan queue:forget <uuid-esatto-del-fixture>`

## Criteri di accettazione

- [x] Il fixture e' esclusivamente test/dev, queued e non puo' emettere Echo.
- [x] Il worker Redis della queue dedicata esegue tre tentativi con backoff
      configurato a 5 s; l'intervallo osservato puo' includere il ritardo
      giustificabile di `block_for` e sleep prima del fallimento definitivo.
- [x] `composer queue:failure-test` ascolta soltanto `m3-failure-test` con i
      parametri M3, lasciando invariati `queue:work` e `composer dev`.
- [x] `queue:failed` mostra il record del fixture con UUID, connection Redis,
      queue `m3-failure-test` e classe; la query read-only di quel solo UUID
      mostra il marker nell'eccezione.
- [x] Il cleanup usa solo l'UUID verificato del fixture e non rimuove failed
      jobs estranei.
- [x] La guida Redis documenta M3-003 con confini e procedura coerenti con il
      task, senza attribuire a `Queue::fake()` o ai test automatici prove del
      worker reale, dei retry o di `failed_jobs`.
- [x] Suite/test mirato, controlli statici e diff hanno evidenza registrata;
      la prova Lerd e' riportata separatamente da quella sandbox.

## Rischi e assunzioni

Il fixture fallisce sempre: dopo `queue:retry` fallirebbe nuovamente. Non
usarlo per dimostrare recupero riuscito e non lasciare il job nella queue dopo
la prova.

La prova accede a Redis e PostgreSQL locali dello sviluppatore; il sandbox non
la puo' eseguire. Il marker e' una prova supplementare nell'eccezione; l'UUID
esatto mostrato da `queue:failed` resta l'unico identificatore usato per
`queue:forget`.

## Verifica manuale

1. Da `backend/`, eseguire `lerd start` per avviare PostgreSQL e Redis Lerd;
   verificare M3-001 e nessun worker su `m3-failure-test` gia' attivo.
2. In Tinker, dispatchare il fixture: genera il marker automaticamente e usa
   connection `redis` e queue `m3-failure-test`. Non inserire né annotare
   marker, cookie o secret manualmente.
3. Avviare `composer queue:failure-test` e attendere i tre tentativi:
   primo immediato e retry disponibili dopo il backoff di 5 s. Nei log
   l'intervallo puo' risultare maggiore per `block_for=5` e il sleep del worker;
   verificare il comando configurato, non un intervallo al secondo esatto.
4. Eseguire `php artisan queue:failed`; identificare il record tramite UUID,
   connection `redis`, queue `m3-failure-test` e classe del fixture.
5. In Tinker, interrogare read-only quel solo UUID in `failed_jobs` e
   verificare il marker nell'eccezione, senza stampare cookie o secret.
6. Eseguire `php artisan queue:forget <uuid-esatto-del-fixture>` e ripetere
   `queue:failed` per provare che il record di prova non resta presente.
7. Non eseguire `queue:retry` per questo job; M3-004 prova il retry che torna
   a successo dopo il ripristino di Reverb.

## Decisioni emerse

- Laravel non fornisce un fake worker ufficiale: `Queue::fake()` intercetta il
  dispatch ma non esegue job.
- La queue `m3-failure-test` e' una queue Redis reale, isolata dalla `default`.
- `composer queue:failure-test` e' il worker dedicato e non sostituisce
  `composer queue:work`, che resta assegnato alla queue `default`.
- Dopo la revisione, l'utente ha approvato esplicitamente l'estensione dello
  scope a `backend/composer.json` e `docs/project/current-state.md`.
- `queue:failed` non espone eccezione o payload; il marker si verifica con una
  query read-only del record individuato dal suo UUID.
- Questa e' una verifica manuale deterministica, non parte della suite Pest
  standard finche' non esistera' un ambiente Redis/DB dedicato ai test.

## File modificati

- `backend/tests/Fixtures/M3FailureTestJob.php`
- `backend/tests/Unit/Fixtures/M3FailureTestJobTest.php`
- `backend/composer.json`
- `docs/learning/redis-queues-workers.md`
- Questo task
- `docs/project/current-state.md`

## Risultati dei controlli

- RED nel runtime Lerd: `./vendor/bin/pest
  tests/Unit/Fixtures/M3FailureTestJobTest.php` ha fallito con 1 errore e 0
  assertion perche' `Tests\\Fixtures\\M3FailureTestJob` non esisteva.
- GREEN nel runtime Lerd: lo stesso test e' riuscito con 1 test e 6 assertion.
- Prova Lerd: `lerd start` e il controllo processi non hanno rilevato worker
  gia' attivi su `m3-failure-test`; il dispatch Tinker del fixture non ha
  richiesto marker manuale. `composer queue:failure-test` ha eseguito tre
  tentativi alle 10:00:16, 10:00:24 e 10:00:32. Il backoff configurato resta
  5 s, ma l'intervallo osservato puo' avvicinarsi a 8 s: un job ritardato puo'
  maturare durante `block_for=5`, dopo cui il worker senza job dorme per i 3 s
  predefiniti. La ripetizione dell'utente alle 10:52:56, 10:53:04 e 10:53:13
  ha quindi mostrato intervalli visualizzati di 8 s e 9 s; i timestamp sono
  arrotondati al secondo e restano compatibili con questo ritardo operativo.
- `php artisan queue:failed` ha identificato il solo record del fixture:
  UUID `30f9d5c4-11a8-4bd5-a9d3-ce299b991801`, connection `redis`, queue
  `m3-failure-test`, classe `Tests\\Fixtures\\M3FailureTestJob`. La query
  Tinker read-only di quel UUID ha trovato nell'eccezione il marker automatico
  `m3-failure-test-7fe6a1b1-5c33-307a-84fa-68169ec85050`. `php artisan
  queue:forget` sullo stesso UUID e il successivo `queue:failed` hanno
  restituito rispettivamente successo e `No failed jobs found`.
- `composer test`: riuscito nel runtime Lerd, 36 test e 194 assertion.
- `./vendor/bin/pint --test`: riuscito nel runtime Lerd.
- `./vendor/bin/phpstan analyse --memory-limit=512M`: riuscito nel runtime
  Lerd, 0 errori.
- `git diff --check`, incluso il controllo dei file non tracciati, e il diff
  finale: riusciti.

## Problemi residui

Nessuno nel perimetro del task. Il fixture fallisce sempre e non e' usato per
dimostrare `queue:retry` riuscito; questa prova resta M3-004.

## Riepilogo finale

M3-003 introduce il solo fixture dev/test `M3FailureTestJob`: viene accodato
su Redis nella queue isolata `m3-failure-test`, genera un marker non sensibile
e fallisce intenzionalmente. Il worker dedicato mantiene tre tentativi,
backoff 5 s e timeout 60 s. La guida distingue il contratto automatico del
fixture dalla prova Lerd autorevole, che ha verificato UUID, marker,
connection, queue e cleanup selettivo del failed job.
