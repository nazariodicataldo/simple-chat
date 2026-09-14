# Docker Compose

Questa guida accompagna la Milestone 5. Compose descrive servizi, rete e volumi
di un'applicazione multi-container in un unico modello, poi li gestisce con
`docker compose`. M5-001 introduce soltanto le dipendenze persistenti;
Laravel, Next.js, Reverb, Horizon e il reverse proxy arriveranno nei task
successivi.

## Teoria e ruolo di M5-001

Lerd ha finora avviato PostgreSQL e Redis tramite Podman. M5 non aggiunge un
secondo ambiente da tenere acceso insieme a Lerd: definisce un ambiente Docker
autonomo, che chi clona il repository possa avviare con Docker Engine e il
plugin Compose.

Compose raggruppa le risorse sotto un nome progetto. M5-001 fissa il nome a
`simple-chat`: questo rende prevedibili rete, container e volume e li isola da
altri progetti Compose, invece di derivarli dalla directory corrente.

PostgreSQL rimane la fonte persistente di verita' della chat. Redis mantiene
invece dati temporanei della queue e di Horizon; in M5-001 non ricevera' un
volume. Nessuno dei due servizi pubblichera' porte sull'host: i futuri
container li raggiungeranno dai nomi DNS `postgres` e `redis` nella rete
privata Compose.

```text
Docker Engine
  -> progetto Compose simple-chat
     -> rete privata -> postgres (dato persistente)
                      -> redis (queue e metadati temporanei)
```

Un container avviato non e' necessariamente pronto a ricevere connessioni. Un
healthcheck esegue una verifica nel container e distingue `running` da
`healthy`. I servizi che M5 aggiungera' in seguito potranno dipendere da
`service_healthy`, evitando di provare a collegarsi a PostgreSQL o Redis troppo
presto.

## Configurazione minima

M5-001 introduce `compose.yaml` e `compose.env.example`; i punti seguenti
descrivono la configurazione da usare nel workflow locale.

- `name: simple-chat` identifica il progetto.
- I soli servizi sono `postgres` con immagine `postgres:17` e `redis` con
  immagine `redis:8-alpine`.
- PostgreSQL riceve il volume nominato `postgres-data`. `docker compose down` rimuove i
  container ma conserva il volume; solo `docker compose down -v` lo elimina.
- I due servizi hanno healthcheck reali: `pg_isready` per PostgreSQL e
  `redis-cli ping` per Redis.
- `compose.env` e' il file locale ignorato letto esplicitamente con
  `--env-file`; `compose.env.example` contiene solo valori di esempio. Il file
  Compose deve collegare esplicitamente le variabili che il container deve
  ricevere: un file `--env-file` serve prima di tutto a risolvere il modello
  Compose, non inietta automaticamente ogni valore nel container.
- La password PostgreSQL locale non entra in Git. Redis resta senza password,
  coerente con Lerd, perche' e' privato alla rete Compose e senza porte host.

Linux e' la sola piattaforma verificata per M5. Gli stessi comandi possono
essere utili su macOS e Windows, ma non costituiscono ancora una prova
supportata dal progetto.

## Verifica e test di M5-001

La prima prova e' statica: `docker compose --env-file compose.env config
--quiet` deve validare il modello risolto senza stampare o copiare i valori del
file locale. Questa prova non scarica immagini, non crea container e non prova
la disponibilita' dei servizi.

La prova runtime avvia solo `postgres` e `redis`, osserva che entrambi siano
`healthy`, quindi esegue `pg_isready` e `redis-cli ping` dall'interno dei
rispettivi container. Un record innocuo, estraneo alla chat, inserito in
PostgreSQL deve esistere anche dopo un `down` seguito da un nuovo `up`.
Dimostra la persistenza del volume nominato; non dimostra ancora migrazioni,
queue, broadcast, Horizon, autenticazione o browser.

Al termine della verifica il comando e' `docker compose down`, senza `-v`.
Il reset `down -v` e' intenzionalmente distruttivo: va eseguito soltanto se si
vuole eliminare il volume Docker di M5 e ricominciare da un database vuoto.

## Errori comuni

- Considerare `docker compose ps` con container `running` una prova di
  disponibilita'. Serve lo stato `healthy` e un controllo reale con
  `pg_isready` o `PONG`.
- Pubblicare `5432` o `6379` per abitudine. In M5-001 non servono client host:
  esporle allargherebbe inutilmente la superficie locale.
- Confondere `down` con `down -v`. Il primo conserva il volume PostgreSQL; il
  secondo elimina i dati del volume e non e' un normale arresto.
- Avviare Lerd e Compose aspettandosi che condividano DNS, rete, container o
  volumi. Sono ambienti indipendenti; M5 sostituisce Lerd nel workflow Docker.
- Trattare `compose.env` come un file sicuro da versionare. Resta locale e
  ignorato: il template contiene soltanto segnaposto. Inoltre le variabili
  della shell hanno precedenza su `--env-file`, quindi un valore esportato puo'
  modificare involontariamente la configurazione risolta.
- Usare `-p` o `COMPOSE_PROJECT_NAME` senza motivo. Entrambi prevalgono su
  `name: simple-chat` e cambiano il namespace delle risorse che il task rende
  intenzionalmente stabile.

## Differenze dalla produzione

M5 e' un ambiente locale di apprendimento. La password PostgreSQL locale e'
gestita in un file ignorato, Redis non ha autenticazione e non esistono backup,
rotazione di credenziali, monitoraggio, deploy, immagini applicative o TLS.
Nessuna di queste assenze e' una raccomandazione per un ambiente esposto.

In produzione le credenziali arrivano dal sistema di deploy o da un gestore di
secret, i dati richiedono backup e una strategia di ripristino, le immagini
vanno aggiornate e la rete deve essere definita rispetto all'infrastruttura
reale. Anche il modo di esporre HTTP/HTTPS e WSS sara' affrontato dal task
dedicato al reverse proxy, non anticipato qui.

## Backend Laravel di M5-002

L'immagine `backend` dichiara PHP 8.5, Composer e le estensioni necessarie a
Laravel, PostgreSQL e Redis. Non copia il sorgente Laravel, `vendor/` o le
directory runtime: il build produce soltanto l'ambiente PHP ripetibile.

In sviluppo Compose monta il sorgente e, separatamente, i dati generati:

```text
./backend                         -> /var/www/html
volume backend-vendor             -> /var/www/html/vendor
volume composer-cache             -> /tmp/composer-cache
volume backend-storage            -> /var/www/html/storage
volume backend-bootstrap-cache    -> /var/www/html/bootstrap/cache
```

Il primo mount e' un bind mount: un salvataggio nell'editor e' subito visibile
al container. PHP usera' il file aggiornato alla richiesta o al comando
successivo; non serve ricostruire l'immagine. I volumi successivi impediscono
invece che il bind mount nasconda le dipendenze e le cache create dal
container. `composer install` gira nel container, legge `composer.lock` e
scrive soltanto nel volume `backend-vendor`.

`.dockerignore` e `.gitignore` hanno ruoli diversi. Il primo evita che un
eventuale `vendor/` host entri nel contesto di build; il secondo resta una
protezione nel caso in cui la stessa cartella sia creata fuori da Docker.

Per il primo avvio, con PostgreSQL e Redis gia' attivi, copiare una volta il
file applicativo locale e generare esplicitamente la chiave:

```bash
cp backend/.env.example backend/.env
docker compose --env-file compose.env up -d postgres redis
docker compose --env-file compose.env run --rm backend php artisan key:generate
docker compose --env-file compose.env up -d backend
```

Ogni avvio del container backend esegue prima `composer install`; quindi al primo
`key:generate` le dipendenze vengono popolate nel volume. Il normale avvio
`php-fpm` esegue poi `php artisan migrate --force`. Grazie a
`depends_on: service_healthy`, PostgreSQL e Redis sono pronti prima di questa
sequenza. I comandi sono concatenati senza fallback: se Composer o migration
falliscono, PHP-FPM non parte.

Compose passa al container `DB_HOST=postgres`, i valori database da
`compose.env` e `REDIS_HOST=redis`. Queste variabili prevalgono sui valori
Lerd eventualmente presenti in `backend/.env`: il backend Docker non dipende
da host, DNS o database Lerd. Il servizio non pubblica porte host; Nginx sara'
aggiunto soltanto in M5-005.

## Implementazione M5-004: Reverb e Horizon

M5-004 estende Compose con due processi Laravel distinti
che riusano l'immagine backend. `reverb` eseguira' `php artisan reverb:start`;
`horizon` eseguira' `php artisan horizon`. Non sono due processi nello stesso
container: hanno log e ciclo di vita separati, ma condividono sorgente, `vendor`
e la configurazione locale gia' montati dall'immagine backend.

Il broadcaster non viene eseguito dal container PHP-FPM `backend` quando
l'evento e' in coda. Il controller HTTP salva prima il messaggio, poi dopo il
commit accoda `BroadcastEvent` su Redis. Horizon lo consuma e soltanto allora
usa la configurazione Reverb per inviare l'evento al server WebSocket:

```text
request HTTP autorizzata
  -> PostgreSQL
  -> BroadcastEvent in Redis/default
  -> Horizon
  -> HTTP interno a reverb:8080
  -> Reverb
```

`localhost` ha un significato diverso in ciascun container: punta sempre allo
stesso container. Per questo `horizon` deve ricevere
`REVERB_HOST=reverb`, `REVERB_PORT=8080` e `REVERB_SCHEME=http`: `reverb` e' il
nome DNS privato che Compose assegna al servizio Reverb. Le variabili
`NEXT_PUBLIC_REVERB_*` restano il contratto del browser e non cambiano in
questo task; il browser ricevera' il proprio WSS pubblico tramite Nginx in
M5-005.

Prima di avviare Horizon, Compose attendera' due segnali: Redis deve essere
`healthy` e Reverb deve avere la porta TCP `8080` in ascolto. L'healthcheck
Reverb gira *dentro* il suo container e tenta una breve connessione a
`127.0.0.1:8080`. In questo punto `127.0.0.1` e' corretto: verifica il processo
Reverb locale, non un altro servizio. Se il sistema operativo accetta la
connessione, Docker segna Reverb `healthy`; se la rifiuta o scade, rimane
`starting` o diventa `unhealthy`.

```text
redis healthy
  -> reverb avviato
     -> TCP 127.0.0.1:8080 accetta connessioni
        -> reverb healthy
           -> horizon avviato
```

Questo ordine evita che Horizon consumi il primo broadcast prima che Reverb
sia pronto. Non prova una consegna a Echo e non costituisce un controllo
continuo: se Reverb cade dopo l'avvio, Docker non riavvia automaticamente
Horizon. La prova runtime del task confrontera' un job Horizon completato e i
failed job prima/dopo; la prova browser resta esplicitamente M5-005.

Per evitare di interrompere il resto dell'ambiente durante una verifica,
M5-004 termina con `docker compose --env-file compose.env stop reverb horizon`
invece di `down`. `stop` lascia invariati gli altri servizi e i volumi del
progetto; un successivo `up` riavviera' soltanto i servizi fermati o necessari.

La verifica runtime del 2026-09-07 ha confermato PostgreSQL e Redis healthy,
Reverb healthy dopo l'apertura della porta TCP interna e Horizon avviato dopo
Reverb. Un `MessageCreated` marcato creato con Tinker ha prodotto un job
completato in Horizon, con `queues:default` vuota e nessun failed job nuovo.
Il messaggio e' stato poi eliminato per il solo ID di prova. Questa prova copre
il collegamento interno fino a Reverb; non copre la consegna a Echo dal browser,
che resta M5-005.

## Frontend Next.js di M5-003

M5-003 aggiunge soltanto il processo Next di sviluppo. `.nvmrc` resta la fonte
di verita' per Node `v24.19.0`; l'immagine usa pnpm `11.20.0` e il lockfile
resta invariato.

Come per Laravel, il sorgente resta un bind mount e i file generati vivono in
volumi Docker separati:

```text
./frontend                        -> /app
volume frontend-node-modules      -> /app/node_modules
volume frontend-next              -> /app/.next
volume pnpm-cache                 -> store riusabile degli archivi pnpm
```

`frontend-node-modules` contiene le dipendenze che Node usa; `pnpm-cache`
conserva invece gli archivi gia' scaricati, come `composer-cache` per il
backend. Sono due responsabilita' diverse: la cache rende piu' rapidi gli
install successivi quando cambia una dipendenza, ma non sostituisce
`node_modules`. L'avvio esegue sempre `pnpm install --frozen-lockfile`,
quindi il lockfile resta il contratto riproducibile e nessun `node_modules`
dell'host viene riusato.

`.dockerignore` non esclude l'intero sorgente frontend: filtra soltanto
dipendenze, output Next, cache TypeScript, file `.env`, certificati e log
locali. Oggi il Dockerfile copia solo l'entrypoint e il codice arriva con il
bind mount, ma questa selezione mantiene sicuro e utile il contesto di build
se in futuro sara' necessario copiare un file frontend nell'immagine.

TypeScript usa `incremental`, quindi anche con `noEmit` scrive una cache
`.tsbuildinfo`. `tsBuildInfoFile` la colloca in `/app/.next`, gia' coperta dal
volume `frontend-next`: il typecheck eseguito nel container non crea
`frontend/tsconfig.tsbuildinfo` nell'host.

Il comando imposta anche un timeout di fetch di cinque minuti. Non cambia
registry, dipendenze o retry: evita soltanto che pnpm interrompa un download
ancora attivo quando la rete Docker e' sotto la soglia di velocita' prevista
dal suo timeout predefinito di un minuto.

Next ascolta su `0.0.0.0` nel container: non e' un indirizzo da digitare
nel browser, ma significa che il processo accetta connessioni dalla rete
Docker. Il mapping temporaneo `127.0.0.1:3000:3000` permette di aprire
`http://localhost:3000` dall'host e osservare HMR, senza esporre il server di
sviluppo alla rete locale. Non sono ancora HTTPS, domini `.test`, Sanctum, API
o WSS: questi contratti restano M5-005.

Il frontend non ha `depends_on`. Next non apre connessioni a PostgreSQL o
Redis e dipende da Laravel soltanto via HTTP; avviare il database non sarebbe
una prova utile. Senza backend attivo, il rendering della pagina puo' mostrare
`SessionError`: e' previsto in questa prova isolata, non prova la chat.

Test, lint, typecheck e build sono eseguiti con `docker compose run --rm
--no-deps frontend ...` prima del server HMR. Questi container usano la stessa
immagine, bind mount e volumi del servizio, ma evitano il lock con cui Next 16
impedisce `next build` mentre `next dev` e' gia' in esecuzione.

Su Linux il flusso e' verificato: test (15 file, 86 test), lint, typecheck e
build sono riusciti nei container temporanei. Next dev ha risposto su
`localhost:3000` con il previsto `SessionError` senza backend e la prova browser
ha confermato HMR dopo una modifica temporanea poi annullata. Su macOS e Windows
il bind mount puo' rallentare HMR per il costo di accesso ai file condivisi: e' una
limitazione da annotare, non una ragione per introdurre polling o una seconda
configurazione prima di osservarne la necessita'.

## M5-005: Nginx, HTTPS e WSS

M5-005 non aggiunge una porta pubblica a ogni container. Espone una sola porta
locale, `127.0.0.1:8443`, del solo Nginx. Il numero dopo i due punti indica la
porta della macchina host; non identifica l'applicazione. Entrambi gli URL
usano quindi `:8443`, ma il browser invia anche il nome richiesto nell'header
`Host` e Nginx sceglie l'upstream corretto.

```text
browser
  -> https://app.simple-chat.test:8443 -> Nginx -> frontend:3000
  -> https://api.simple-chat.test:8443 -> Nginx -> backend:9000
                                             -> reverb:8080 per /app e /apps

backend e Horizon -> HTTP privato -> reverb:8080
backend/reverb/horizon -> rete privata -> postgres e redis
```

`app.simple-chat.test` e `api.simple-chat.test` sono quindi gia' i due nomi
distinti desiderati: non richiedono due porte. La porta `443` permetterebbe di
omettere `:8443` dagli URL, ma qui rimane libera per Lerd; `8443` evita la
collisione e il mapping su `127.0.0.1` impedisce l'esposizione alla rete locale.
PostgreSQL e Redis non ricevono porte host perche' nessun browser deve
raggiungerli: i soli container autorizzati li trovano tramite i nomi Docker
`postgres` e `redis`.

### Certificato locale e SAN

Un certificato TLS contiene i nomi per cui e' valido. SAN significa *Subject
Alternative Name*: una singola coppia certificato/chiave puo' dichiarare sia
`app.simple-chat.test` sia `api.simple-chat.test`. Nginx presenta quindi lo
stesso certificato a entrambi i nomi e il browser lo accetta se la CA che lo ha
emesso e' fidata.

Il profilo Linux richiede le due risoluzioni locali prima dell'avvio:

```text
127.0.0.1 app.simple-chat.test api.simple-chat.test
```

e una CA mkcert installata nel sistema. Il materiale locale andra' nella
directory ignorata `.cert/`:

```bash
mkdir -p .cert
mkcert -install
mkcert -cert-file .cert/simple-chat.test.pem -key-file .cert/simple-chat.test-key.pem app.simple-chat.test api.simple-chat.test
cp "$(mkcert -CAROOT)/rootCA.pem" .cert/mkcert-root-ca.pem
```

La chiave privata non entra mai in Git. Nginx monta certificato e chiave in
sola lettura; Next riceve soltanto `mkcert-root-ca.pem`, sempre in sola lettura.
Il secondo mount serve al rendering server-side: il processo Node contatta
l'API HTTPS e deve verificare la CA locale, non disabilitare TLS. Nel container
il nome pubblico `api.simple-chat.test` risolvera' verso Nginx nella rete
Compose, cosi' browser e rendering server-side usano lo stesso URL.

I tre file devono esistere prima di `docker compose up`: se un bind source
manca, Docker puo' creare una directory vuota con quel nome e Nginx terminera'
con un errore di certificato. Queste directory placeholder vanno rimosse prima
di generare i file mkcert.

### Routing e verifica

Nginx inoltra `app.*` a Next. Per `api.*`, inoltra le richieste Laravel
a PHP-FPM e solo i percorsi Pusher/Reverb `/app/...` e `/apps/...` a Reverb,
incluso l'upgrade WebSocket. Laravel e Horizon continueranno invece a chiamare
direttamente `http://reverb:8080`: TLS e il proxy sono necessari al browser,
non al traffico privato tra container.

Il test HTTP usa la CA, non il certificato server, perche' e' la CA a firmare
il certificato SAN:

```bash
curl --fail --cacert .cert/mkcert-root-ca.pem --resolve api.simple-chat.test:8443:127.0.0.1 https://api.simple-chat.test:8443/up
```

Questo prova TLS, risoluzione e raggiungibilita' API, ma non il realtime. La
prova completa richiede due browser con utenti distinti: login/CSRF,
autorizzazione `private-chat`, CREATE/UPDATE/DELETE e una sola riconciliazione
per evento nell'altro browser. Si eliminano selettivamente i soli messaggi di
prova; gli utenti di test non fanno parte della pulizia obbligatoria.

Il task completato registra la verifica Linux della configurazione Compose e
della sintassi Nginx, dei controlli frontend e backend, della build delle
immagini e dello smoke HTTPS/WSS a due browser. I primi errori erano dovuti
all'assenza dei tre file mkcert e alla rete verso Docker Hub e Google Fonts:
non sono un requisito da aggirare disabilitando TLS. Per rieseguire la prova,
servono prima i certificati locali e la connettivita' alle immagini e al font
remoto.

Linux e' l'unica piattaforma verificata. Su macOS e Windows Compose e' identico,
ma cambiano il file hosts e il trust della CA: questa e' una nota di
adattamento, non una verifica di supporto.

## Esercizio M5-001

1. Spiega perche' `postgres` e `redis` possono comunicare con i futuri servizi
   senza porte host pubblicate.
2. Descrivi che cosa prova ciascuna delle tre evidenze: `config --quiet`,
   stato `healthy` e persistenza dopo `down`/`up`.
3. Indica quale comando conserva il volume e quale lo elimina, e perche' il
   secondo non va usato come normale pulizia.
4. Spiega la differenza tra una variabile usata per interpolare Compose e una
   variabile effettivamente disponibile nel container PostgreSQL.
5. Spiega perche' `vendor/` ha un volume distinto dal bind mount del sorgente.

## Documentazione ufficiale

- [Docker Compose](https://docs.docker.com/compose/)
- [Nome progetto Compose](https://docs.docker.com/compose/how-tos/project-name/)
- [Variabili e `--env-file`](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/)
- [Ordine di avvio e `service_healthy`](https://docs.docker.com/compose/how-tos/startup-order/)
- [Volumi nominati](https://docs.docker.com/reference/compose-file/volumes/)
