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
- [Neon: regioni](https://neon.com/docs/manage/regions)
- [Neon: connection pooling](https://neon.com/docs/connect/connection-pooling)
- [Neon: gestione dei compute e scale-to-zero](https://neon.com/docs/manage/endpoints)
- [Neon: verifica TLS con le CA di sistema](https://neon.com/blog/avoid-mitm-attacks-with-psql-postgres-16)
