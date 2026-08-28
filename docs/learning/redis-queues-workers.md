# Redis, queue e worker

Questa guida accompagna M3 passo per passo. Dopo il real-time diretto della
Milestone 2, un broadcast eseguito nella richiesta HTTP puo' coinvolgerla se
Reverb e' lento o irraggiungibile. M3-001 usa Redis per conservare il lavoro
pendente e un worker per eseguirlo; M3-002 fa entrare in quel percorso i soli
broadcast Message. PostgreSQL resta la fonte persistente di verita': Redis non
diventa il database della chat e non sostituisce API HTTP, policy, Reverb o Echo.

## Ruoli e percorso

- Laravel salva il Message in PostgreSQL ed emette un evento applicativo.
- `ShouldBroadcast` fa creare a Laravel un job `BroadcastEvent`.
- Redis conserva il job sulla queue finche' un worker non lo preleva.
- `queue:work` esegue il job; il broadcaster Laravel lo invia a Reverb e Echo
  puo' consegnarlo agli altri browser.

M3-002 usa quindi questo percorso:

```text
HTTP -> PostgreSQL -> BroadcastEvent -> Redis/default -> queue:work -> Reverb -> Echo
```

Un `201`/ `200` prova scrittura e risposta HTTP, non che il worker abbia gia'
inviato il broadcast o che un browser lo abbia ricevuto. M3-002 prova dispatch
e after-commit; la catena runtime completa resta una verifica successiva.

## M3-001: una connection Redis e una queue `default`

Una *connection* sceglie il backend; una *queue* e' la pila di job in quel
backend. La chat usa intenzionalmente una sola connection Redis e una sola
queue applicativa `default`: nessuna priorita', coda dedicata di produzione,
Horizon o Docker. M3-003 aggiunge soltanto `m3-failure-test`, isolata e
test/dev-only: non e' una seconda queue della chat e non cambia `default`.

La configurazione minima in `backend/.env.example` e':

```dotenv
QUEUE_CONNECTION=redis
REDIS_HOST=lerd-redis
REDIS_QUEUE_CONNECTION=default
REDIS_QUEUE=default
REDIS_QUEUE_RETRY_AFTER=90
REDIS_QUEUE_BLOCK_FOR=5
QUEUE_FAILED_DRIVER=database-uuids
```

Il `backend/.env` locale va allineato manualmente e resta ignorato da Git:
mai inserire credenziali o secret nel repository. `config/queue.php` legge
questi valori e mantiene `after_commit=false` come default della connection
Redis. Non e' un errore: gli altri job sono inseriti subito salvo un override
esplicito del job/evento.

### Worker applicativo locale

Da `backend/` il solo worker M3 e':

```bash
composer queue:work
```

Lo script esegue:

```bash
php artisan queue:work redis --queue=default --tries=3 --backoff=5 --timeout=60
```

`composer dev` non e' il workflow M3: usa una politica queue diversa. Avviare
prima i servizi locali con `lerd start`; poi controllare la configurazione
risolta con `php artisan config:clear` e `php artisan config:show queue`,
senza riportare secret.

## `timeout`, `retry_after` e `block_for`

- `--timeout=60`: massimo per un singolo tentativo eseguito dal worker.
- `retry_after=90`: durata della riserva Redis di un job prelevato prima che
  sia nuovamente disponibile se non viene completato.
- `block_for=5`: attesa del worker, fino a cinque secondi, quando la queue e'
  vuota; un job disponibile lo risveglia subito.

`retry_after` deve superare il timeout. Con `60 < 90`, Redis non rimette in
circolo un job mentre un worker potrebbe ancora terminarne il tentativo. I tre
tentativi e il backoff di 5 secondi sono la politica M3. M3-001/M3-002 non li
provano su Redis reale; quella prova isolata arriva in M3-003.

Un errore comune e' confondere `block_for=5` (queue vuota) con il backoff
(tentativo fallito), oppure impostare `retry_after <= timeout`, con possibile
esecuzione sovrapposta da worker diversi.

In produzione un supervisore deve mantenere vivo il worker; configurazione e
secret arrivano dal deploy. Il principio non cambia, ma Horizon, code multiple
e scaling restano fuori scope.

### Esercizio M3-001

Spiega perche' `90` deve superare `60`. Quale valore regola una queue vuota e
quale l'attesa tra tentativi falliti? Disegna poi il percorso di un job mentre il
worker e' fermo.

## M3-002: broadcast accodato

`ShouldBroadcastNow` esegue `BroadcastEvent` nella richiesta corrente;
`ShouldBroadcast` lo accoda. M3-002 cambia soltanto `MessageCreated`,
`MessageUpdated` e `MessageDeleted`: canale privato, FQCN,
`broadcastWith()` e contratti HTTP restano invariati.

Laravel avvolge l'evento applicativo in `BroadcastEvent`. I test devono quindi
osservare quel job e verificare evento interno, `PrivateChannel('chat')`
(sul filo `private-chat`) e payload invariati, non soltanto l'emissione
dell'evento Message. La queue resta Redis `default`.

## After-commit selettivo

Un worker puo' elaborare un job prima del commit di una transazione. Se poi
avviene rollback, il browser riceverebbe un broadcast per un Message inesistente:
un broadcast fantasma.

La protezione riguarda solo i tre eventi Message:

```php
public bool $afterCommit = true;
```

Laravel copia quella proprieta' dall'evento nel `BroadcastEvent` accodato. La
queue reale rimanda il push fino al commit; al rollback elimina il callback e non
inserisce il job. Il default Redis resta invece `after_commit=false`.

I controller correnti sono in autocommit e non cambiano. Senza una transazione
esplicita, la scrittura e' gia' confermata, quindi `afterCommit=true` non
introduce una pausa osservabile:

```text
autocommit:  salva Message -> commit implicito -> accoda BroadcastEvent
transazione: salva Message -> trattiene callback -> commit -> accoda BroadcastEvent
rollback:    salva Message -> trattiene callback -> rollback -> nessun job
```

L'assenza di transazioni future non giustifica `afterCommit=false`: quel valore
accoderebbe subito persino nel test che dimostra la garanzia. L'override
`true` e il default Redis `false` convivono per mantenere la protezione
selettiva e reversibile.

## Come testare il contratto

`Queue::fake()` e' corretta nei test HTTP: verifica che create, update e delete
accodino un solo `BroadcastEvent` corretto, senza Redis o worker. Prova il
dispatch applicativo, non Redis, worker, retry, failed job o consegna
Reverb/Echo.

Non usare `Queue::fake()` per after-commit. Nella versione Laravel del
progetto la fake registra il `push` direttamente in memoria e non attraversa
la logica della queue reale che rimanda il job al commit. La verifica "coda
vuota prima del commit" fallirebbe persino con `$afterCommit=true`: testerebbe
la fake, non il requisito.

I sei casi after-commit usano percio' una connection `database` reale isolata,
con la tabella `jobs` come osservabile, senza worker e senza Redis reale. Il
file evita `RefreshDatabase`: quel trait apre gia' una transazione esterna e
un commit esplicito diventerebbe annidato, non il commit root che esegue i
callback. Un reset tramite migration consente la matrice seguente:

| Evento | Prima della chiusura | Dopo commit | Dopo rollback |
|---|---|---|---|
| `MessageCreated` | 0 job | 1 `BroadcastEvent` | 0 job |
| `MessageUpdated` | 0 job | 1 `BroadcastEvent` | 0 job |
| `MessageDeleted` | 0 job | 1 `BroadcastEvent` | 0 job |

Il RED deve fallire sugli eventi `ShouldBroadcastNow`; il GREEN conserva le
prove che validazione fallita e policy `403` non emettono eventi.

Errori comuni: lasciare `ShouldBroadcastNow`, rendere
`after_commit=true` globale, provare after-commit con la fake, oppure
confondere la risposta HTTP con una ricezione browser.

### Esercizio M3-002

Per tutti e tre gli eventi completa: "prima del commit il job non e' in
`jobs` perche' ...". Poi spiega perche' il rollback lascia zero job, e quale
scenario esiste solo nel test invece che nei controller attuali.

## M3-003: failure job Redis isolato

Un job puo' fallire per un errore del suo `handle()`, per esempio una
dipendenza temporaneamente irraggiungibile. Il worker non rende quel fallimento
invisibile: applica il numero di tentativi e il backoff configurati; esauriti i
tre tentativi, Laravel salva il record in PostgreSQL `failed_jobs` tramite il
driver `database-uuids`.

M3-003 non simula il fallimento del broadcast e non coinvolge Reverb, Echo o il
browser. Usa invece il fixture test/dev `Tests\Fixtures\M3FailureTestJob`, che
implementa `ShouldQueue`, usa Redis / `m3-failure-test`, genera un marker non
sensibile e lancia sempre una `RuntimeException`. E' uno strumento di prova,
non un job applicativo sotto `app/` e non deve essere referenziato dal codice
di produzione.

Il percorso osservabile e':

```text
fixture -> Redis/m3-failure-test -> tentativo 1 fallisce
	        -> backoff configurato 5 s, poi retry osservabile
	        -> backoff configurato 5 s, poi retry osservabile
	        -> PostgreSQL/failed_jobs (UUID, connection, queue, eccezione)
```

`--backoff=5` e' l'attesa tra tentativi falliti. Non e' `block_for=5`, che
agisce soltanto mentre una queue e' vuota; `--timeout=60` e' invece il limite
di durata di ciascun singolo tentativo.

Il valore di backoff non coincide necessariamente con l'intervallo mostrato
nei log del worker. Un job ritardato puo' diventare disponibile durante
`block_for=5`; se il `BLPOP` termina senza job, il worker applica anche il suo
`--sleep` predefinito di 3 s prima del pop successivo. Quindi una prova puo'
mostrare circa 8 s tra i tentativi (o 9 s con timestamp stampati al solo
secondo), pur mantenendo `--backoff=5` correttamente configurato.

### Configurazione e worker di prova

Servono Redis e PostgreSQL Lerd avviati, `QUEUE_FAILED_DRIVER=database-uuids`
e l'autoload di sviluppo che mappa `Tests\` su `tests/`. Lo script dedicato e':

```bash
composer queue:failure-test
```

Esegue esattamente:

```bash
php artisan queue:work redis --queue=m3-failure-test --tries=3 --backoff=5 --timeout=60
```

Non sostituisce `composer queue:work`: quest'ultimo resta il worker della chat
su `default`. Prima della prova verificare che non sia gia' attivo un altro
worker su `m3-failure-test`, altrimenti i tentativi non sarebbero osservabili
nella finestra corretta.

### Prova manuale autorevole

La suite Pest standard usa SQLite in memoria e `QUEUE_CONNECTION=sync`;
`Queue::fake()` intercetta il dispatch ma non esegue un worker, il backoff o la
scrittura in `failed_jobs`. Il test automatico del fixture prova quindi solo il
suo contratto: `ShouldQueue`, connection/queue dedicate ed eccezione attesa.
Redis reale, tre tentativi e failed job richiedono questa procedura Lerd:

1. Da `backend/`, avviare `lerd start`.
2. Se necessario, eseguire `composer dump-autoload`; poi dispatchare il
   fixture con:

   ```bash
   php artisan tinker --execute='Tests\Fixtures\M3FailureTestJob::dispatch();'
   ```

3. In un altro terminale, avviare `composer queue:failure-test` e attendere i
   tre fallimenti. Verificare `--backoff=5` nello script; i retry sono
   disponibili dopo 5 s, ma nei log possono apparire circa 8 s dopo (o 9 s con
   timestamp arrotondati), per il ritardo operativo spiegato sopra.
4. Eseguire il comando Artisan nativo:

   ```bash
   php artisan queue:failed
   ```

   Laravel mostra ID/UUID, connection, queue, classe e data. Il flag nativo
   `--json` cambia soltanto il formato di questi stessi campi.
5. Copiare l'UUID del solo record con connection `redis`, queue
   `m3-failure-test` e classe del fixture. Per vedere il marker, che
   `queue:failed` non espone, interrogare read-only quel solo record:

   ```bash
   php artisan tinker --execute='dump(Illuminate\Support\Facades\DB::table("failed_jobs")->select("uuid", "connection", "queue", "exception")->where("uuid", "<UUID>")->first());'
   ```

6. Usare lo stesso UUID nel comando Artisan nativo di cleanup:

   ```bash
   php artisan queue:forget <UUID>
   php artisan queue:failed
   ```

   La seconda lista non deve piu' contenere il job di prova.

Non eseguire `queue:retry` in M3-003: il fixture fallisce sempre, quindi un
retry produrrebbe soltanto un nuovo fallimento. Il recupero riuscito dopo il
ripristino di Reverb e' la prova distinta di M3-004.

### Errori comuni e production

Non usare `default`, non scegliere un UUID di un failed job estraneo e non
dedurre il marker da `queue:failed`: il comando non mostra payload o eccezione.
Non attribuire inoltre retry, backoff o failed job alla fake Laravel.

In produzione un supervisore mantiene i worker applicativi in esecuzione e il
deploy configura il driver dei failed jobs. Il fixture e la queue
`m3-failure-test` restano locali e test/dev-only; non sono una policy di retry
o una coda di produzione. Horizon, dashboard e automazione CI restano fuori
scope.

### Esercizio M3-003

Spiega perche' il backoff di 5 s non e' `block_for=5`. Poi indica quale campo
di `queue:failed` useresti per `queue:forget` e perche' il marker richiede la
query read-only del record esatto.

## Documentazione ufficiale

- [Laravel 13 — Queues](https://laravel.com/docs/13.x/queues): Redis, worker,
  timeout, transazioni, failed job e test.
- [Laravel 13 — Broadcasting](https://laravel.com/docs/13.x/broadcasting):
  `ShouldBroadcast` ed eventi broadcast.
