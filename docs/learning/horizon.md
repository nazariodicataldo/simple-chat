# Horizon locale

M4 sostituisce il worker manuale come workflow locale corrente con Horizon.
Horizon mantiene un processo master, avvia il supervisor configurato e conserva
metadati utili per osservare worker e job. Non sostituisce Redis, PostgreSQL,
Reverb o Echo: ciascuno conserva il proprio ruolo nella chat.

## Ruoli e percorso

- PostgreSQL conserva i Message e i record `failed_jobs`: resta la fonte di
  verita' persistente della chat.
- Redis conserva i `BroadcastEvent` pendenti su `default`.
- Il master Horizon legge la configurazione, avvia `chat-default` e ne controlla
  il ciclo di vita.
- Il supervisor `chat-default` mantiene un solo worker figlio che preleva
  `redis/default`.
- Il worker esegue il broadcast; Reverb lo pubblica e Echo puo' consegnarlo ai
  browser sottoscritti.
- Horizon conserva inoltre in Redis i metadati della propria dashboard, separati
  dai job tramite il prefisso configurato.

```text
HTTP -> PostgreSQL -> BroadcastEvent -> Redis/default -> Horizon master
     -> chat-default -> worker figlio -> Reverb -> Echo
```

Un successo HTTP prova persistenza e risposta API, non l'esecuzione del worker
o la consegna realtime. La prova dei job completati, falliti e ritentati resta
in M4-004.

## Correzione del workflow M3

La guida `redis-queues-workers.md` documenta il worker introdotto in M3. Il
comando `composer queue:work` rimane disponibile solo per diagnosi M3, ma il
consumer locale canonico della queue chat e' ora `composer horizon`.

Non avviare insieme `composer horizon`, `composer queue:work` o `composer dev`:
gli ultimi due avviano worker concorrenti su Redis e renderebbero non
attribuibile a Horizon l'elaborazione dei job `default`. Questo task non
modifica `composer dev`; il suo `queue:listen` usa inoltre una politica diversa
da quella M3.

## Configurazione minima locale

`config/horizon.php` definisce solo l'ambiente `local` e un supervisor
`chat-default`. I parametri che riprendono M3 sono dichiarati nello stesso
blocco, senza ereditarieta' da `defaults`:

```php
'chat-default' => [
    'connection' => 'redis',
    'queue' => ['default'],
    'balance' => 'simple',
    'processes' => 1,
    'tries' => 3,
    'backoff' => 5,
    'timeout' => 60,
],
```

`simple` mantiene un numero fisso di processi: con una sola queue e
`processes => 1` non c'e' balancing automatico o scaling. I test PHP restano
in `testing` con `QUEUE_CONNECTION=sync`; non esiste un supervisor Horizon per
quell'ambiente.

I tempi standard di retention Horizon per job recenti e falliti restano
pubblicati: servono alla dashboard e non equivalgono alle metriche storiche. Non
viene configurato `horizon:snapshot` ne' uno scheduler locale.

## Avvio e verifica M4-001

Con Redis Lerd attivo e senza altri worker della chat:

```bash
composer horizon
```

Lasciare il terminale del master aperto. Da un secondo terminale:

```bash
php artisan horizon:status
```

Prima dell'avvio, controllare la configurazione risolta senza riportare secret:

```bash
php artisan config:clear
php artisan config:show horizon
```

`config:show horizon` mostra la configurazione risolta del supervisor;
`horizon:status` prova che il master e' attivo. Questi comandi non dimostrano il
consumo reale di un job, che appartiene a M4-004. Terminare Horizon con `Ctrl-C`
al termine della verifica.
M4-001 non invia job di prova e non dimostra dashboard, retry, Reverb o browser.

## Test, errori comuni e dashboard

`Queue::fake()` e la suite con queue `sync` non dimostrano un processo Horizon,
Redis reale o il worker figlio. Per questo M4-001 verifica manifest,
configurazione e processo locale; M4-004 completera' la prova end-to-end.

Un errore comune e' considerare `horizon:status` prova della consegna browser:
mostra soltanto lo stato del master. Un altro e' avviare due consumer sulla
stessa queue e attribuire erroneamente il job a Horizon.

## Accesso alla dashboard M4-002

Il provider pubblicato da Horizon autorizza di default la dashboard quando il
Gate `viewHorizon` permette l'utente **oppure** l'applicazione e' in `local`.
Per questo compilare soltanto il Gate non basta: il fallback locale manterrebbe
accessibili dashboard e rotte interne a guest e utenti chat non autorizzati.

M4-002 sostituisce tale callback con `Horizon::auth(...)` dopo il bootstrap del
provider padre. La callback riceve la request e valuta l'utente della sessione
web esistente: se manca, se la lista e' vuota o se la sua email non e' inclusa,
il middleware Horizon restituisce `403 Forbidden` senza redirect a una pagina
di login.

`HORIZON_ALLOWED_EMAILS` resta configurazione locale, non un ruolo applicativo.
La lista separata da virgole viene normalizzata con `trim` e minuscole, scarta i
valori vuoti e confronta strettamente l'email utente normalizzata. Cosi'
`admin@admin.com` e ` Admin@Admin.Com ` indicano lo stesso accesso esplicito,
mentre una configurazione assente o vuota non autorizza nessuno.

Il feature test visita la route reale `GET /horizon` per guest, utente fuori
lista, utente autorizzato e lista vuota. Questa route attraversa il middleware
condiviso dal gruppo Horizon; il retry effettivo dalla dashboard appartiene a
M4-004 e non va simulato qui.

## Differenza production ed esercizio

Questo progetto non configura process monitor, deploy, scaling, scheduler o
Horizon in produzione. Se il terminale locale termina, termina anche il master:
la persistenza del processo appartiene a milestone successive.

Esercizio: descrivi quale componente conserva un `BroadcastEvent` pendente,
quale processo lo esegue e perche' `composer queue:work` non puo' stare aperto
insieme a `composer horizon`.

Per i dettagli del pacchetto consulta la [documentazione ufficiale di Laravel
Horizon](https://laravel.com/framework/docs/13.x/horizon).
