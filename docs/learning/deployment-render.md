# Immagine production unificata e deploy Render

Questa nota accompagna M7-001. Descrive il contratto dell'immagine production
prima del deploy reale: non contiene secret, URL del servizio Render o istruzioni
per creare risorse cloud.

## Problema e ruolo di M7-001

In Compose locale i cinque processi della chat vivono in container separati:
Nginx, Next.js, PHP-FPM, Horizon e Reverb. Il piano gratuito di deployment usa
invece un solo web service e non offre un worker separato. L'immagine production
riunisce quindi questi processi dietro un solo Nginx.

E' un compromesso esplicito di costo e apprendimento. Riduce il numero di
servizi da gestire, ma aumenta il blast radius: se il container si ferma, si
fermano anche pagina, API, queue e realtime. Non e' un modello da estendere
automaticamente a un'applicazione con requisiti di disponibilita' elevati.

```text
browser HTTPS/WSS
  -> terminazione TLS della piattaforma
     -> Nginx HTTP :PORT nel container (default locale `8080`)
        -> Next.js       (/)
        -> PHP-FPM       (/api, /sanctum, /broadcasting, /horizon, /up)
        -> Reverb        (/app, /apps, upgrade WebSocket, loopback `8081`)
        -> Horizon       (consuma Redis/default, senza porta HTTP)
```

## Come funziona

Il build multi-stage installa le dipendenze PHP e Node dai rispettivi lockfile,
esegue `next build` e copia nel runtime soltanto cio' che serve. Al boot
l'entrypoint prepara le directory runtime ed esegue una sola volta
`php artisan migrate --force`. Se quella migration fallisce, il supervisore non
parte: una pagina `200` non deve nascondere un database non pronto.

`supervisord` e' il PID 1 e avvia Nginx, Next, PHP-FPM, Horizon e Reverb come
utente non-root `app`. Per ogni programma, `startsecs=10` richiede dieci secondi
di vita prima di dichiararlo avviato e `startretries=5` limita i fallimenti di
avvio consecutivi. Un listener osserva soltanto `FATAL` e arresta il container;
non reinventa il conteggio o i riavvii gia' gestiti da Supervisor. I log di
processi e listener arrivano su standard output/error, dove il PaaS puo'
raccoglierli senza file persistenti.

Al `SIGTERM`, Supervisor chiude Nginx con `QUIT`, per finire le richieste gia'
accettate, e invia i segnali agli interi gruppi di processi. Next, PHP-FPM e
Reverb hanno 10 secondi; Horizon ne ha 65, cioe' il timeout del job di 60
secondi piu' un margine operativo esplicito di 5 secondi. Oltre il limite il
kill forzato evita che il container resti bloccato.

## Configurazione minima

Il browser production non conosce in anticipo il dominio Render: chiama API e
WebSocket con percorsi relativi allo stesso host della pagina. Per questo il
dominio pubblico non viene inserito nel bundle in `next build` e nessun indirizzo
interno entra in `NEXT_PUBLIC_*`.

Il rendering server-side Next usa invece una variabile runtime solo-server per
raggiungere Nginx su loopback. Laravel pubblica verso Reverb su loopback HTTP.
Sono due collegamenti interni diversi dal browser, che continua a usare HTTPS e
WSS pubblici. Il profilo locale non viene adattato a questo modello: conserva i
suoi URL espliciti e il proprio TLS.

La piattaforma termina TLS; Nginx riceve HTTP sulla `PORT` assegnata, con un
default locale per lo smoke del container. L'immagine non contiene certificati.
Laravel deve fidarsi degli header di protocollo solo quando provengono dal Nginx
in loopback: fidarsi di header inviati direttamente da qualunque client
permetterebbe di dichiarare falsamente una richiesta HTTPS.

Le variabili e i secret reali appartengono al sistema di deploy. Il build non
deve copiare `.env`, certificati locali, credenziali, cache Git o dipendenze
dell'host. In particolare, non esegue `composer install` o `pnpm install` al
boot: queste operazioni devono fallire in build, in modo riproducibile.

## Verifica e test di M7-001

La verifica locale costruira' l'immagine da un checkout privo di file ignorati,
ispezionera' history e filesystem e la avviera' in una rete Docker isolata con
PostgreSQL e Redis controllati. Le prove devono restare distinte:

- `/up` prova Nginx -> PHP-FPM -> Laravel, non frontend, queue o realtime;
- `/` prova il routing verso Next;
- un endpoint `/api/*` prova il routing API; il relativo handshake su `/app/*`
  prova l'upgrade WebSocket verso Reverb;
- l'ordine nei log prova migration riuscita prima dei cinque processi;
- una migration fallita deve lasciare il container non disponibile;
- un crash di un figlio prova il riavvio Supervisor; i fallimenti di avvio fino
  a `FATAL` provano il listener che termina il container;
- `SIGTERM` prova l'arresto pulito e l'assenza di processi residui.

Il test raccogliera' anche un dato di memoria locale. Non puo' dimostrare il
limite effettivo della piattaforma gratuita, il suo retry o il suo tempo di
terminazione: queste sono prove del deploy successivo.

La verifica M7-001 ha costruito `simple-chat-production:manual` da questo
checkout con PostgreSQL 17 e Redis 8 temporanei su una rete Docker isolata.
L'immagine finale ha esposto l'utente `app` (UID/GID 1000), Node `24.19.0`,
PHP `8.5.11`, Nginx `1.26.3` e Supervisor `4.2.5`; il controllo filesystem non
ha trovato `.env`, `.cert`, lockfile, Git, Composer, sorgenti di test o
credenziali. I manifest `package.json` presenti sotto lo standalone Next sono
artefatti runtime necessari e non il workspace sorgente. La memoria osservata
nello smoke e' stata circa `248 MiB` su `11.15 GiB` disponibili: non e' una
previsione del limite Render.

Le richieste hanno restituito `200` su `/up` e `/`, `401` su `/api/messages` e
`101 Switching Protocols` su `/app/...`. I log hanno mostrato migration prima
dei cinque processi e lo stato `RUNNING` dopo `startsecs=10`. Un DB irrisolvibile
ha terminato l'entrypoint prima di Supervisor; un Nginx volutamente invalido ha
raggiunto `FATAL` e il listener ha inviato `SIGTERM` a PID 1; un crash SIGKILL
del gruppo Nginx e' stato riavviato da Supervisor. Lo shutdown finale ha
restituito exit `0` senza processi residui.

I controlli applicativi finali sono verdi: `composer test` passa con 41 test e
213 assertion dopo l'allineamento locale dell'origine Sanctum/CORS a
`app.simple-chat.test:8443`; Pint, PHPStan con `--memory-limit=512M`, test
frontend, lint, typecheck e `corepack pnpm build` host passano. Un precedente
tentativo della build host era stato bloccato dal download sandbox di Google
Fonts, ma la verifica manuale successiva ha completato correttamente la build.

## Errori comuni

- Trattare un build riuscito come una prova runtime: build, migration, routing,
  queue, WebSocket e shutdown richiedono osservazioni diverse.
- Inserire il dominio Render in `NEXT_PUBLIC_*`: il valore resta fissato nel
  bundle e obbliga a ricostruire l'immagine per cambiarlo.
- Far parlare il browser con `127.0.0.1`: per il browser sarebbe il computer
  dell'utente, non il container. Il loopback e' riservato ai processi interni.
- Copiare certificati o `.env` nel build context per far funzionare uno smoke.
  I secret arrivano al runtime, mentre TLS pubblico resta alla piattaforma.
- Usare uno script shell con processi in background come supervisore: non offre
  da solo retry, stato `FATAL`, inoltro segnali e raccolta coerente dei log.
- Fidarsi senza limite di `X-Forwarded-Proto` oppure far riprovare migration in
  silenzio: entrambe le scorciatoie nascondono un confine di sicurezza o un
  errore operativo utile.

## Differenza fra container locale e deploy pubblico

M7-001 dimostra l'immagine con dipendenze Docker controllate, HTTP interno e
variabili fittizie. Il deploy pubblico aggiungera' il dominio, il certificato
TLS della piattaforma, Neon, Upstash, secret, limiti reali di memoria e il ciclo
di vita effettivo del provider. Il fatto che il container passi lo smoke locale
non dimostra ancora una chat pubblica disponibile o una recovery automatica
remota.

## Contratto Neon PostgreSQL di M7-003

M7-003 ha collegato temporaneamente la stessa immagine production a Neon prima
del deploy Render. Le regole seguenti conservano il contratto operativo usato
per la prova; i risultati verificati sono riportati nel task completato.

Il progetto Neon usa il piano Free e Francoforte. PostgreSQL 17 conserva la
parita' con Compose quando resta selezionabile; in caso contrario si accetta
soltanto una versione dichiarata stabile dal provider, registrando la
divergenza senza aggiornare automaticamente l'ambiente locale.

Laravel continua a usare PDO PostgreSQL senza SDK Neon. La prima verifica usa
la connection string pooled sia per le migration sia per le normali query. Il
pooler riduce il numero di connessioni PostgreSQL effettive, ma introduce un
componente in piu' nel percorso: se le migration falliscono soltanto sul pooled,
il task resta aperto e la scelta viene rivalutata sull'errore reale. Non si
passa silenziosamente al diretto, che resta pianificato per `pg_dump`.

La cifratura non basta da sola a identificare il server. `sslmode=require`
impone TLS, ma il risultato finale richiede `sslmode=verify-full` e una CA
attendibile del container tramite `sslrootcert=system` o il percorso esplicito
del bundle. In questo modo `libpq` verifica anche certificato e hostname Neon.
La presenza del bundle e il supporto della versione `libpq` vanno provati
prima della connessione; il Dockerfile cambia soltanto se manca davvero un
archivio CA utilizzabile.

La URL contiene una password. Vive quindi in un file env temporaneo fuori dal
repository, leggibile soltanto dal proprietario, e non compare nella riga di
comando o negli output conservati. Docker copia le variabili nei metadati del
container: cancellare il file non basta finche' esiste ancora un container,
anche arrestato. Il cleanup rimuove prima tutti i container della prova e poi
il file env; un `docker inspect` completo non fa parte delle verifiche perche'
stamperebbe la sezione delle variabili.

Per isolare PostgreSQL da Redis, Horizon e Reverb, la prova usa container
one-shot dell'immagine M7-001 con entrypoint sostituito soltanto per eseguire
Laravel. Le migration vengono lanciate due volte. Un solo utente sintetico con
identificatore univoco viene poi creato tramite Laravel, senza importare dati
locali. Dopo la rimozione del primo container si attende che il Dashboard Neon
mostri il compute sospeso; un container nuovo deve rileggere il record e infine
eliminarlo selettivamente. Il progetto, lo schema e la cronologia delle
migration restano disponibili per i task di deploy successivi.

Una sola credenziale Neon dedicata a Simple Chat serve sia le migration sia il
runtime. E' una scelta semplice coerente con l'entrypoint attuale, ma amplia i
privilegi disponibili all'applicazione: separare ruolo migration e ruolo
runtime resta un possibile hardening futuro, non parte di M7-003.

## Contratto Upstash Redis di M7-004

M7-004 ha verificato Upstash prima del deploy Render. Esiste un solo database
permanente dedicato a Simple Chat, piano Free, provider AWS e regione
Francoforte. Non e' stato usato il database rapido che scade dopo 72 ore.
Replica globale, eviction e aggiornamento automatico a un piano a pagamento
sono disabilitati. Se la quota viene raggiunta, una scrittura deve fallire in
modo visibile invece di eliminare casualmente un job.

Laravel usa `phpredis` e una sola `REDIS_URL` con schema `rediss://`: e' il
protocollo Redis nativo protetto da TLS, non l'API REST Upstash. Endpoint e
password restano nello stesso secret per evitare copie incoerenti. Le variabili
non sensibili selezionano la connessione Redis, il database logico `0` e la
queue `default`. Nel file passato a `docker run --env-file` le URL non hanno
virgolette esterne: quel parser le conserverebbe nel valore e renderebbe lo
schema non valido, diversamente da parser dotenv che possono rimuoverle.

Upstash ha due responsabilita': conservare i job della queue `default` e i
metadati minimi di Horizon. Non e' la cache generale di Laravel.
`CACHE_STORE=database` continua a usare Neon anche per i segnali operativi di
Horizon e Reverb. Non servono quindi un secondo Redis o un secondo database
logico Redis. PostgreSQL resta inoltre l'unica fonte persistente dei messaggi.

Horizon resta un supervisore semplice: un processo, bilanciamento `simple`, tre
tentativi massimi, backoff di 5 secondi e timeout di 60 secondi. Snapshot,
monitoraggio aggiuntivo e dashboard non sono criteri di M7-004. Il piano Free
dichiara una quota mensile di comandi, ma il task non ha eseguito una proiezione
artificiale del consumo inattivo; il consumo reale verra' osservato dopo il
deploy senza promettere che la quota basti per ogni carico.

La prova ha usato due container separati della stessa immagine production. Il
primo ha avviato soltanto Laravel e, tramite Tinker, ha accodato tre
`QueuedCommand` numerati. E' stato poi rimosso lasciando i job in Upstash. Il
secondo ha avviato soltanto Horizon con `APP_ENV=production`: Nginx, Next,
Reverb, Supervisor e PostgreSQL locale non sono partiti. Entrambi hanno usato
Neon e Upstash remoti tramite un file env temporaneo `600` fuori dal repository.

Laravel/PhpRedis ha restituito `REDIS_PING_OK`. Prima e dopo la rimozione del
produttore, Upstash conteneva tre job pendenti e nessun marker gia' eseguito.
Horizon ha poi registrato tre sequenze `RUNNING`/`DONE`. I tre ID sono risultati
`completed` con `attempts = 1`, nessun fallimento, contatore `3`, ordine
`[1, 2, 3]` e queue vuota. Questa e' un'osservazione del caso normale, non una
garanzia exactly-once: un worker che termina dopo l'effetto del job ma prima
della conferma a Redis puo' causare una nuova esecuzione.

Il cleanup ha eliminato selettivamente contatore e lista, senza `FLUSHDB`, poi
ha rimosso tutti i container prima di cancellare il file con i secret. I
normali metadati Horizon seguono la retention gia' configurata. Con il Docker
CLI usato nella prova, `docker stop` accetta ancora `--time` ma lo segnala come
deprecato: i comandi successivi devono usare `--timeout`.

## Contratto Blueprint Render di M7-005

M7-005 ha aggiunto `render.yaml` come descrizione versionata del servizio, ma
non ha creato ne' sincronizzato risorse Render. La validazione e la build locale
non dimostrano un deploy remoto, che appartiene a M7-006.

Un Blueprint e' Infrastructure as Code: il repository descrive la forma del
servizio, mentre Render la interpreta. Il file contiene una sola risorsa, il
web service Docker Free `simple-chat-nazariodicataldo` in regione
`frankfurt`. Neon e Upstash restano provider esterni e compaiono soltanto
attraverso le rispettive URL runtime. Non servono progetti, environment group,
worker separati, database Render, custom domain o autoscaling.

Automazione del servizio e sincronizzazione del Blueprint sono due controlli
diversi. `autoDeployTrigger: off` evita un deploy a ogni push; `Auto Sync: No`
andra' impostato nel Dashboard durante M7-006 per evitare che una modifica al
file riconfiguri automaticamente il servizio. Anche preview environment e PR
preview restano disabilitate: consumerebbero build e istanze, e le variabili
`sync: false` non verrebbero propagate automaticamente. Il sottodominio
`onrender.com` resta invece esplicitamente abilitato ed e' l'unico ingresso
pubblico.

Render assegna al web service `RENDER_EXTERNAL_URL` e
`RENDER_EXTERNAL_HOSTNAME`. Il Blueprint le autoreferenziera' tramite
`fromService`: URL completo per `APP_URL`, `FRONTEND_URL` e CORS; solo hostname
per Sanctum e origini Reverb. In questo modo il dominio effettivo e' la sola
fonte di verita', anche se il sottodominio assegnato non coincide con quello
previsto dal nome del servizio.

Il browser non riceve un URL API o Reverb production. Axios usa percorsi
relativi ed Echo ricava host, porta e TLS da `window.location`; soltanto la
chiave pubblica `NEXT_PUBLIC_REVERB_APP_KEY` entra nel bundle durante
`next build`. `FRONTEND_URL` e `BACKEND_INTERNAL_URL` sono invece server-only:
la prima ricostruisce `Origin` e `Referer` pubblici nelle richieste SSR, la
seconda viene derivata dall'entrypoint per raggiungere Nginx su loopback.

Questa distinzione chiarisce build time e runtime. Durante il build dipendenze
e sorgenti producono artefatti immutabili; una variabile `NEXT_PUBLIC_*` usata
dal client viene incorporata nel JavaScript e richiede un nuovo build per
cambiare. A runtime Laravel, Next server, Horizon e Reverb leggono invece
configurazione e credenziali del container. `PORT` arriva da Render, mentre
host, porte e scheme loopback restano responsabilita' dell'immagine: duplicarli
nel Blueprint creerebbe due fonti di verita'.

`APP_KEY`, `DB_URL` e `REDIS_URL` sono gli unici placeholder `sync: false`:
il file dichiara i nomi, Render chiede i valori nella prima creazione e li
conserva nelle sync successive. La chiave Laravel va generata con un container
temporaneo e `php artisan key:generate --show`. Render generera' invece una
sola volta `REVERB_APP_SECRET` tramite `generateValue: true`. ID e chiave
Reverb non sono secret: `simple-chat-production` e
`simple-chat-production-key` saranno versionati, e la stessa chiave pubblica
servira' backend e browser.

Neon resta la fonte di database, sessioni, cache e job falliti. Il cookie di
sessione e' host-only perche' `SESSION_DOMAIN` resta assente; `Secure` limita
l'invio a HTTPS, `HttpOnly` impedisce a JavaScript di leggere il cookie di
sessione e `SameSite=Lax` conserva il flusso same-origin. Upstash continua a
contenere soltanto queue `default` e metadati Horizon. La Dashboard `/horizon`
resta chiusa: l'assenza di una allowlist non ferma il processo worker, mentre
la registrazione pubblica e senza verifica email non rende
`admin@admin.com` un'identita' amministrativa sicura in produzione.

I log Laravel useranno `stderr` a livello `info`. `/up` rimane una liveness
Nginx -> PHP-FPM -> Laravel e non prova Next, Neon, Upstash, Horizon o Reverb.
Il servizio Free mantiene il default Render di 30 secondi allo shutdown; il
Blueprint non imposta `maxShutdownDelaySeconds` perche' il CLI lo rifiuta sul
piano Free. Questo e' un limite operativo da verificare nel deploy, non una
garanzia dei 65 secondi concessi localmente a Horizon.

Il piano del servizio sara' `free`, ma il solo campo YAML non impedisce
eventuali addebiti oltre quota quando esiste un metodo di pagamento. M7-006
deve quindi verificare un workspace Hobby senza metodo di pagamento. Il
contratto zero euro accetta che Render sospenda il servizio o nuovi build fino
al periodo successivo.

La verifica M7-005 resta statica e non crea risorse: il Render CLI corrente
valida sintassi YAML e schema Blueprint con `render blueprints validate
render.yaml`, oltre a query programmatiche del contratto, scansione secret e
build del Dockerfile referenziato. I risultati sono registrati nel task; nessun
controllo remoto dimostra una risorsa Render esistente. Se un controllo
dimostra un difetto fuori scope, si documentano errore e probabile causa in un
task issue, poi si apre un task correttivo rinumerando i pending.

## Esercizio

Spiega con parole tue perche' `/up` non prova Reverb e perche' il browser usa
un percorso relativo mentre il rendering server-side usa loopback. Poi descrivi
cosa succede se Reverb termina prima di `startsecs=10` per cinque tentativi
consecutivi.

## Documentazione ufficiale

- [Docker: build multi-stage](https://docs.docker.com/build/building/multi-stage/)
- [Supervisor: configurazione dei programmi](https://docs.supervisord.org/configuration.html)
- [Supervisor: stati dei processi](https://www.dist.supervisord.org/subprocess.html)
- [Nginx: controllo dei processi](https://nginx.org/en/docs/control.html)
- [Laravel: deployment](https://laravel.com/docs/deployment)
- [Laravel: proxy fidati](https://laravel.com/docs/requests#configuring-trusted-proxies)
- [Next.js: environment variables](https://nextjs.org/docs/app/guides/environment-variables)
- [Render: deploy di servizi Docker](https://render.com/docs/docker)
- [Render: Infrastructure as Code con Blueprint](https://render.com/docs/infrastructure-as-code)
- [Render: riferimento Blueprint YAML](https://render.com/docs/blueprint-spec)
- [Render: variabili d'ambiente e secret](https://render.com/docs/configure-environment-variables)
- [Render: limiti dei servizi Free](https://render.com/docs/free)
- [Neon: regioni](https://neon.com/docs/manage/regions)
- [Neon: connection pooling](https://neon.com/docs/connect/connection-pooling)
- [Neon: gestione dei compute e scale-to-zero](https://neon.com/docs/manage/endpoints)
- [Neon: verifica TLS con le CA di sistema](https://neon.com/blog/avoid-mitm-attacks-with-psql-postgres-16)
- [Upstash: prezzi e limiti Redis](https://upstash.com/pricing/redis)
- [Upstash: compatibilita' Redis](https://upstash.com/docs/redis/overall/compatibility)
- [Upstash: eviction](https://upstash.com/docs/redis/features/eviction)
- [Upstash: integrazione Laravel](https://upstash.com/docs/redis/quickstarts/laravel)
