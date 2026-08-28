# M3-002 — Accodare broadcast Message e proteggere after-commit

- **Stato:** completato
- **Milestone:** Milestone 3 — Redis e queue
- **Data di apertura:** 2026-08-26
- **Data di chiusura:** 2026-08-27
- **Dipendenze:** M3-001

## Contesto

I tre eventi `MessageCreated`, `MessageUpdated` e `MessageDeleted` implementano
`ShouldBroadcastNow`: la richiesta HTTP invia il broadcast direttamente a
Reverb. M3 deve renderli asincroni senza cambiare payload, channel, nomi FQCN,
policy o risposta HTTP.

Un worker puo' elaborare un job prima del commit di una futura transazione.
Per questo solo questi tre eventi devono chiedere che il loro job di broadcast
entri in Redis dopo il commit. I controller attuali non aprono transazioni
esplicite e non devono essere modificati per simulare questo caso.

## Obiettivo

Passare i tre broadcast Message a `ShouldBroadcast`, conservando il contratto
wire esistente, e provare con test automatici che il job viene accodato solo
dopo commit e non dopo rollback.

## Fuori scope

- Transazioni nuove nei controller o nel dominio Message.
- Modifiche API/UI, payload, nome evento, channel `private-chat`, Echo o Reverb.
- Retry e failed jobs reali (M3-003/M3-004).
- Tombstone, ordering o correzioni frontend.

## File modificabili

- `backend/app/Events/MessageCreated.php`
- `backend/app/Events/MessageUpdated.php`
- `backend/app/Events/MessageDeleted.php`
- `backend/tests/Feature/Http/Controllers/MessageBroadcastingTest.php`
- `backend/tests/Feature/Http/Controllers/MessageBroadcastAfterCommitTest.php`
- `docs/learning/redis-queues-workers.md`
- Test backend strettamente necessari
- Questo task

## File non modificabili

- `backend/app/Http/Controllers/MessageController.php`
- Configurazioni queue gia' definite da M3-001, frontend, migration,
  dipendenze e lockfile.

## Requisiti

- Tutti e tre gli eventi implementano `ShouldBroadcast`, non
  `ShouldBroadcastNow`.
- Ogni evento espone `public bool $afterCommit = true`, impostazione
  selettiva che Laravel copia nel `BroadcastEvent` accodato. La connection
  Redis conserva `after_commit=false` come default globale.
- `broadcastOn`, `broadcastWith` e i nomi FQCN restano identici:
  `private-chat`, payload create/update e `{ messageId }` delete.
- CREATE, UPDATE e DELETE HTTP persistono e rispondono come prima; il loro
  broadcast e' invece pendente finche' un worker non lo esegue.
- Il test deve prima fallire perche' attualmente gli eventi sono immediati,
  poi dimostrare il comportamento queued minimo.

## Strategia di test

Separare due osservabili:

- `Queue::fake()` osserva il contratto HTTP di dispatch del `BroadcastEvent`,
  senza fingere che un worker abbia elaborato Redis;
- i sei casi after-commit usano una connection queue `database` reale ma
  isolata nel test, con la tabella `jobs` come osservabile. La fake Laravel
  registra il push direttamente e non esercita il rinvio after-commit della
  queue reale.

1. RED: gli eventi attuali non soddisfano `ShouldBroadcast` e/o il job non
   rispetta after-commit.
2. GREEN HTTP: per tutti e tre gli eventi verificare con `Queue::fake()` che
   venga accodato un solo `BroadcastEvent` e che conservi FQCN esatto
   dell'evento, canale e payload.
3. GREEN after-commit: in un file separato, senza `RefreshDatabase` (che apre
   una transazione esterna), usare un reset tramite migration e una
   transazione root esplicita. Per ciascuno di create, update e delete:
   verificare zero job prima della chiusura, un job dopo commit e zero job
   dopo rollback.
4. Conservare o adattare le prove che validazione fallita e policy `403` non
   dispatchano eventi.

## Comandi da eseguire

- `git status --short`
- `git diff --stat`
- `git diff --check`
- Da `backend/`: `composer test -- --filter=MessageBroadcastingTest`
- Da `backend/`: `composer test`
- Da `backend/`: `./vendor/bin/pint --test`
- Da `backend/`: `./vendor/bin/phpstan analyse --memory-limit=512M`

## Criteri di accettazione

- [x] Il RED distingue inequivocabilmente `ShouldBroadcastNow` dal contratto
  queued richiesto.
- [x] CREATE, UPDATE e DELETE accodano esattamente un rispettivo broadcast
  senza cambiare payload, channel o nome wire.
- [x] Per CREATE, UPDATE e DELETE, prima del commit root il job non e'
  accodato; dopo il commit e' accodato una volta; dopo rollback non lo e'.
- [x] Controller e contratti HTTP restano invariati.
- [x] Test mirato, suite backend, Pint, PHPStan e diff hanno evidenza fresca
  oppure copertura mancante esplicita.

## Rischi e assunzioni

`Queue::fake()` prova il contratto applicativo di dispatch, non Redis, worker,
retry o `failed_jobs`; inoltre non prova il rinvio after-commit. I sei test
transazionali usano percio' la queue `database` reale isolata. Redis, worker,
retry e `failed_jobs` hanno verifiche locali separate.

Con gli attuali controller in autocommit, after-commit non ritarda visibilmente
il job. La garanzia impedisce invece un broadcast fantasma se una futura
mutazione viene inclusa in una transazione annullata.

## Verifica manuale

Non e' richiesta una prova browser in questo task. La prova reale del worker
e' M3-004. Annotare comunque che, a worker fermo, la risposta HTTP puo' avere
successo mentre il broadcast resta in Redis.

## Decisioni emerse

- After-commit e' per-evento: `public bool $afterCommit = true` sui soli tre
  eventi Message; la connection Redis conserva `after_commit=false`.
- Le transazioni esplicite sono ammesse solo per il test commit/rollback; non
  vengono aggiunte ai controller per attivare artificialmente after-commit.
- I sei test transazionali usano una queue `database` reale isolata, non
  `Queue::fake()`, per osservare la reale registrazione del callback al commit.
- Nessun cambiamento frontend: il mittente continua a convergere dalla risposta
  HTTP canonica; gli altri client ricevono il broadcast quando il worker lo
  esegue.

## File modificati

- `backend/app/Events/MessageCreated.php`
- `backend/app/Events/MessageUpdated.php`
- `backend/app/Events/MessageDeleted.php`
- `backend/tests/Feature/Http/Controllers/MessageBroadcastingTest.php`
- `backend/tests/Feature/Http/Controllers/MessageBroadcastAfterCommitTest.php`
- `docs/learning/redis-queues-workers.md`
- Questo task
- `docs/project/current-state.md`
- `CHANGELOG.md`

## Risultati dei controlli

- RED HTTP: `composer test -- --filter=MessageBroadcastingTest` ha fallito con
  i tre `BroadcastEvent` assenti e `afterCommit` non definito sugli eventi
  `ShouldBroadcastNow`.
- RED after-commit: `composer test -- --filter=MessageBroadcastAfterCommitTest`
  ha fallito nei tre casi commit per assenza del job; i tre rollback erano
  coerentemente verdi.
- GREEN HTTP: `composer test -- --filter=MessageBroadcastingTest` riuscito:
  5 test, 19 assertion.
- GREEN after-commit: `composer test -- --filter=MessageBroadcastAfterCommitTest`
  riuscito: 6 test, 12 assertion.
- `composer test`: riuscito nel runtime locale Lerd: 35 test, 185 assertion.
- `./vendor/bin/pint --test`: riuscito dopo l'ordinamento automatico dei soli
  import del test modificato.
- `./vendor/bin/phpstan analyse --memory-limit=512M`: riuscito, 0 errori.
- `git diff --check`, inclusi i file non tracciati con `git diff --no-index
  --check`: riusciti.
- Fix post-review, 2026-08-28: un secondo `MessageCreated::dispatch()`
  temporaneo ha lasciato verde il test HTTP precedente (5 test, 19
  assertion), dimostrando che `Queue::assertPushed()` richiedeva soltanto
  almeno un job compatibile. Aggiunte le asserzioni di cardinalita' uno e
  FQCN esatto per CREATE, UPDATE e DELETE; il RED ha rilevato 2
  `BroadcastEvent` invece di 1. Rimossa la mutazione temporanea, il GREEN
  mirato e' riuscito (5 test, 22 assertion); suite completa 35 test, 188
  assertion, Pint e PHPStan riusciti.

## Problemi residui

- Nessuno nel perimetro del task. La prova reale Redis/worker/Reverb, retry e
  failed jobs resta esplicitamente nei task M3-003/M3-004.

## Riepilogo finale

I tre eventi Message usano ora `ShouldBroadcast` e copiano
`afterCommit=true` nel job `BroadcastEvent`, lasciando invariati FQCN, canale,
payload, controller e contratti HTTP. I test HTTP verificano esattamente un
job queued con FQCN e contratto wire corretti; sei test con queue `database`
reale provano zero job prima del commit, uno dopo il commit e zero dopo
rollback per create, update e delete.
