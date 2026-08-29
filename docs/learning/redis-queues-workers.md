# Redis, queue e worker

Questa guida accompagna M3 passo per passo. Dopo il real-time diretto della
Milestone 2, un broadcast eseguito nella richiesta HTTP puo' coinvolgerla se
Reverb e' lento o irraggiungibile. M3-001 usa Redis per conservare il lavoro
pendente e un worker per eseguirlo; M3-002 fa entrare in quel percorso i soli
broadcast Message; M3-004 verifica la catena reale fino al browser e il
recupero di un broadcast fallito. PostgreSQL resta la fonte persistente di
verita': Redis non diventa il database della chat e non sostituisce API HTTP,
policy, Reverb o Echo.

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

## M3-004: prova della catena reale e recupero

Un test con `Queue::fake()` puo' dimostrare che Laravel ha chiesto di accodare
un `BroadcastEvent`, ma non che Redis lo ha conservato, il worker lo ha
eseguito, Reverb lo ha ricevuto e Echo lo ha mostrato in un altro browser.
M3-004 non aggiunge codice alla chat: separa e osserva questi confini nel
runtime locale reale.

```text
HTTP riuscito -> PostgreSQL -> Redis/default -> queue:work -> Reverb -> Echo -> browser B
```

Un `201` o `200` prova la mutazione HTTP e la persistenza in PostgreSQL. Non
prova ancora che B abbia ricevuto l'evento. Allo stesso modo, un job prelevato
dal worker non prova da solo che Reverb sia raggiungibile o che B sia ancora
sottoscritto al canale privato.

### Tre scenari, tre osservabili

Nel percorso sano, A crea, modifica e cancella un proprio Message con worker
attivo; B deve osservare ogni evento una sola volta. Cinque secondi sono una
soglia pratica dello smoke locale, non una promessa di latenza o uno SLA.

Con worker fermo e Reverb attivo, A riceve comunque la risposta HTTP e vede lo
stato canonico: PostgreSQL e' la fonte di verita'. Redis conserva invece il
`BroadcastEvent` pendente; B non deve ancora vedere la nuova bubble. Quando
`composer queue:work` torna attivo, B riceve il lavoro pendente. Questo prova
che non serve ripetere la richiesta HTTP per recuperare un worker fermo.

Con Reverb fermo, il worker non riesce a completare il broadcast. Applica i tre
tentativi configurati e, dopo l'ultimo fallimento, Laravel salva il job in
PostgreSQL `failed_jobs`. Il backoff configurato e' 5 s; il tempo visibile nei
log puo' essere maggiore, per esempio circa 8 s, per l'interazione con
`block_for` e `--sleep`. Si annota quindi il tempo osservato, senza dedurre che
il valore di configurazione sia diverso.

### Failed job e retry selettivo

Prima dello scenario Reverb, eseguire `php artisan queue:failed` e annotare la
baseline. Dopo i tre fallimenti, la lista individua un nuovo UUID: connection
`redis`, queue `default` e job broadcast. Non scegliere o rimuovere job
preesistenti.

`queue:failed` non mostra il payload o l'eccezione completi. Per collegare il
record al Message di prova, ispezionare in Tinker soltanto il nuovo UUID, in
sola lettura:

```bash
php artisan tinker --execute='dump(Illuminate\Support\Facades\DB::table("failed_jobs")->select("uuid", "connection", "queue", "payload", "exception", "failed_at")->where("uuid", "<UUID>")->first());'
```

Il payload e l'eccezione servono per la diagnosi locale; nel task si riportano
solo UUID, connection, queue, ID del Message e metadati non sensibili. Non
copiarvi cookie, token, secret o contenuti non necessari.

Dopo il riavvio di Reverb, il retry riguarda esclusivamente quel record:

```bash
php artisan queue:retry <UUID>
```

Questo non e' il pulsante "riprova" della UI e non e' una garanzia di consegna
esattamente una volta. E' il recupero server-side di un job che prima non poteva
raggiungere Reverb. Al termine il failed job ritentato deve scomparire; la lista
dei failed job torna alla baseline e il Message di prova viene eliminato con
worker e Reverb attivi.

### Reverb, Echo e riconnessione

Fermare Reverb chiude intenzionalmente il socket WSS dei browser. Una
disconnessione o un errore di trasporto in quel momento e' atteso: documenta
che il server WebSocket non e' disponibile e non equivale a un errore
applicativo della chat.

Quando Reverb torna disponibile, Echo con il client Pusher prova a
riconnettersi e ripristina la sottoscrizione gia' registrata. Poiche'
`private-chat` e' privato, il nuovo socket richiede di nuovo
`POST /broadcasting/auth`; l'osservabile finale e' WSS ristabilito, auth `200`
e `pusher_internal:subscription_succeeded`, senza refresh di A o B. Solo dopo
questa sequenza il `queue:retry` prova che il browser B puo' ricevere il
broadcast recuperato.

Un refresh non e' una soluzione della prova: rimonta la pagina e nasconde se la
connessione originale non si e' ripresa. Se Echo non torna sottoscritto dopo
un'attesa ragionevole, e' un difetto riproducibile da registrare separatamente,
non una modifica da introdurre dentro M3-004.

### Limiti ed errori comuni

Redis e il worker non danno ordering globale o consegna exactly-once. Un create
fallito, poi una delete riuscita, seguito dal retry del create puo' mostrare un
evento vecchio dopo uno nuovo: questa chat non ha tombstone o versioning per
correggerlo. M3 accetta il limite, non lo forza nello smoke e non lo dichiara
risolto.

Non confondere inoltre: risposta HTTP con ricezione browser; disconnessione WSS
attesa durante lo stop con errore persistente dopo il recupero; UUID del job di
prova con un failed job preesistente; `queue:retry` server-side con un retry UI.
Non usare `queue:flush`, cleanup bulk o refresh dei browser per ottenere un
risultato apparente.

In produzione un supervisore mantiene worker e Reverb disponibili, monitora
log e failed job e definisce procedure di recovery. Questi strumenti operativi,
Horizon, code multiple, ordering affidabile e una UI per il retry restano fuori
scope di questa milestone locale.

### Esercizio M3-004

Per ciascuno scenario indica quale fatto prova separatamente HTTP,
PostgreSQL/Redis, worker, Reverb/Echo e browser B. Poi spiega perche' il
reconnect deve precedere `queue:retry`, e perche' un refresh non dimostra il
reconnect automatico.

## Documentazione ufficiale

- [Laravel 13 — Queues](https://laravel.com/docs/13.x/queues): Redis, worker,
  timeout, transazioni, failed job e test.
- [Laravel 13 — Broadcasting](https://laravel.com/docs/13.x/broadcasting):
  `ShouldBroadcast` ed eventi broadcast.
- [Pusher JS — Connection states](https://github.com/pusher/pusher-js#connection-states):
  reconnessione e stati del client usato da Echo/Reverb.
