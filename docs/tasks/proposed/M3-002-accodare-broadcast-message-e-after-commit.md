# M3-002 — Accodare broadcast Message e proteggere after-commit

- **Stato:** proposta
- **Milestone:** Milestone 3 — Redis e queue
- **Data di apertura:** 2026-08-26
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
- Test backend strettamente necessari
- Questo task

## File non modificabili

- `backend/app/Http/Controllers/MessageController.php`
- Configurazioni queue gia' definite da M3-001, frontend, migration,
  dipendenze e lockfile.

## Requisiti

- Tutti e tre gli eventi implementano `ShouldBroadcast`, non
  `ShouldBroadcastNow`.
- Ogni evento espone l'impostazione after-commit selettiva che Laravel copia
  nel `BroadcastEvent` accodato. Non impostare `after_commit=true` globalmente
  nella connection Redis.
- `broadcastOn`, `broadcastWith` e i nomi FQCN restano identici:
  `private-chat`, payload create/update e `{ messageId }` delete.
- CREATE, UPDATE e DELETE HTTP persistono e rispondono come prima; il loro
  broadcast e' invece pendente finche' un worker non lo esegue.
- Il test deve prima fallire perche' attualmente gli eventi sono immediati,
  poi dimostrare il comportamento queued minimo.

## Strategia di test

Usare `Queue::fake()` per osservare il dispatch del `BroadcastEvent`, non per
fingere che il worker abbia elaborato Redis.

1. RED: gli eventi attuali non soddisfano `ShouldBroadcast` e/o il job non
   rispetta after-commit.
2. GREEN: verificare per tutti e tre gli eventi che il job di broadcasting e'
   accodato e conserva evento/canale/payload.
3. Aprire una transazione esplicita nel solo test, dispatchare un evento e
   verificare che la fake queue resti vuota prima del commit; dopo commit il
   job deve risultare accodato.
4. Ripetere con rollback: il job non deve risultare accodato.
5. Conservare o adattare le prove che validazione fallita e policy `403` non
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

- [ ] Il RED distingue inequivocabilmente `ShouldBroadcastNow` dal contratto
  queued richiesto.
- [ ] CREATE, UPDATE e DELETE accodano i rispettivi broadcast senza cambiare
  payload, channel o nome wire.
- [ ] Prima del commit il job non e' accodato; dopo il commit e' accodato; dopo
  rollback non lo e'.
- [ ] Controller e contratti HTTP restano invariati.
- [ ] Test mirato, suite backend, Pint, PHPStan e diff hanno evidenza fresca
  oppure copertura mancante esplicita.

## Rischi e assunzioni

`Queue::fake()` prova il contratto applicativo di dispatch, non Redis, worker,
retry o `failed_jobs`; tali aspetti hanno verifiche locali separate.

Con gli attuali controller in autocommit, after-commit non ritarda visibilmente
il job. La garanzia impedisce invece un broadcast fantasma se una futura
mutazione viene inclusa in una transazione annullata.

## Verifica manuale

Non e' richiesta una prova browser in questo task. La prova reale del worker
e' M3-004. Annotare comunque che, a worker fermo, la risposta HTTP puo' avere
successo mentre il broadcast resta in Redis.

## Decisioni emerse

- After-commit e' per-evento, non una policy globale della connection Redis.
- Le transazioni esplicite sono ammesse solo per il test commit/rollback; non
  vengono aggiunte ai controller per attivare artificialmente after-commit.
- Nessun cambiamento frontend: il mittente continua a convergere dalla risposta
  HTTP canonica; gli altri client ricevono il broadcast quando il worker lo
  esegue.

## File modificati

Da compilare durante il task.

## Risultati dei controlli

Da compilare durante il task.

## Problemi residui

Da compilare durante il task.

## Riepilogo finale

Da compilare alla chiusura del task.
