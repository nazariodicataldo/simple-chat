# M7-004 — Collegare Upstash come queue Redis production

- **Stato:** completato
- **Milestone:** Milestone 7 — Deployment
- **Data di apertura:** 2026-09-30
- **Data di chiusura:** 2026-09-30
- **Dipendenze:** M7-003

## Contesto

Render Key Value Free e' volatile e il piano gratuito non offre un background
worker dedicato. Il container production include gia' Horizon; serve ora un
Redis esterno gratuito che esponga il protocollo nativo necessario alla queue.
Upstash offre TLS e persistenza, ma la compatibilita' reale con Horizon non va
dedotta dalla sola compatibilita' dichiarata con Laravel Queue.

## Obiettivo

Creare un database Upstash Redis Free a Francoforte, collegare il profilo
Horizon production introdotto da M7-001 alla queue `default`, quindi dimostrare
che tre job tecnici vengono inseriti e completati in ordine tramite protocollo
Redis nativo cifrato. Horizon resta il supervisore del singolo worker e conserva
su Upstash soltanto i metadati operativi necessari al proprio funzionamento.

## Fuori scope

- API REST Upstash, replica globale, ACL avanzate o piano a pagamento.
- Metriche avanzate, retention storica o dashboard Horizon come criterio.
- Misurazioni dedicate o proiezioni mensili del consumo di comandi Upstash; il
  limite Free viene documentato e sara' osservato normalmente dopo il deploy.
- Backup Redis: PostgreSQL resta l'unica fonte dei messaggi.
- Render Blueprint e deploy pubblico.
- Modifiche alla politica funzionale di retry M3/M4.

## File modificabili

- `backend/config/horizon.php` e configurazione Redis Laravel soltanto se una
  incompatibilita' reale con Upstash viene prima dimostrata da un test fallito.
- `docs/learning/deployment-render.md`, limitatamente a Redis gestito, queue e
  differenza tra dato persistente e stato operativo.
- Questo task e `docs/project/current-state.md` durante attivazione e chiusura.

## File non modificabili

- Eventi Message, API, retry/backoff/timeout gia' decisi e schema dati.
- `render.yaml`, workflow CI, Dockerfile locali e segreti reali.
- Configurazione Redis del Compose locale, salvo variabili production isolate.

## Requisiti

- Upstash usa il piano Free e una singola regione AWS `eu-central-1`; non usa
  read replica o database globale.
- Eviction resta disabilitata: al raggiungimento della quota le scritture
  devono fallire visibilmente invece di eliminare job casualmente.
- Laravel usa `phpredis` e il protocollo Redis TCP nativo con TLS, non l'API
  REST. La URL completa e la password restano secret non versionati.
- Una sola `REDIS_URL` nel formato TLS nativo `rediss://` contiene endpoint e
  password. Non si duplicano le credenziali in variabili separate e non si usa
  l'API REST Upstash.
- `REDIS_CLIENT=phpredis`, `REDIS_DB=0`, `QUEUE_CONNECTION=redis`,
  `REDIS_QUEUE_CONNECTION=default` e `REDIS_QUEUE=default` indirizzano a
  Upstash queue e metadati minimi di Horizon.
- `CACHE_STORE=database` resta su Neon: Upstash non diventa la cache generale
  Laravel e non servono due servizi Redis o due database logici.
- Il profilo Horizon `production` di M7-001 conserva un solo processo,
  bilanciamento `simple`, tre tentativi, backoff 5 secondi e timeout 60 secondi.
- Tre `QueuedCommand` tecnici, creati tramite Tinker production e numerati da 1
  a 3, entrano nella queue `default`. Un contatore finale pari a `3` e una lista
  finale pari a `[1, 2, 3]` rendono osservabili quantita' e ordine.
- I tre job risultano `completed` nei metadati Horizon, ciascuno con
  `attempts = 1`; nessuno dei relativi ID risulta fallito e la queue finale e'
  vuota. Il test osserva una singola esecuzione nel caso normale, ma non
  promette semantica generale exactly-once in presenza di crash.
- Il container Laravel che produce i job viene rimosso prima di avviare un
  secondo container con il solo Horizon. La persistenza dei tre job attraverso
  questo cambio di client non promette alta disponibilita' o replica Free.
- Nessuna credenziale compare nei log o nel diff.

## Strategia di test

Creare manualmente dal Dashboard il database permanente
`simple-chat-production`, piano Free, provider AWS, regione Francoforte,
nessuna replica globale, eviction e aggiornamento automatico a pagamento
disabilitati. Non usare il database temporaneo che scade dopo 72 ore.

Fornire all'immagine M7-001 `DB_URL` pooled Neon, `REDIS_URL` Upstash e una
`APP_KEY` temporanea condivisa tramite un file env esterno al repository con
permessi `600`. Neon mantiene `CACHE_STORE=database`; non viene avviato alcun
PostgreSQL locale e non vengono creati dati applicativi.

Verificare `PING` TLS con Laravel e `phpredis`, poi avviare un primo container
con il solo Laravel. `php artisan tinker --execute` usa la classe production
Laravel `QueuedCommand` per accodare i tre job numerati e registrarne gli ID;
non usa closure create dentro Tinker, fixture dev o script montati. Rimuovere il
produttore dopo aver osservato tre job pendenti. Avviare quindi un secondo
container della stessa immagine con il solo `php artisan horizon` e
`APP_ENV=production`, attendere il gate completo e raccogliere output
sanitizzato. Nginx, Next e Reverb non partecipano a questa prova; il broadcast
applicativo completo resta M7-007.

## Comandi da eseguire

- `git status --short`
- Connessione Redis TLS tramite PHP/Laravel senza stampare la URL.
- `php artisan tinker --execute=...` nel container produttore per accodare i tre
  `QueuedCommand` su `default` e registrarne gli ID non sensibili.
- `php artisan horizon` con `APP_ENV=production` nel runtime controllato.
- Ispezione sanitizzata di queue, contatore, ordine, metadati Horizon e log fino
  al completamento del gate.
- Stop e rimozione dei container, verifica dell'assenza di container residui e
  rimozione finale del file env e degli altri artefatti temporanei.
- Test backend mirati alla configurazione Horizon modificata.
- `./vendor/bin/pint --test`
- `./vendor/bin/phpstan analyse --memory-limit=512M`
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [x] Upstash Free esiste in regione singola Francoforte, con eviction
      disabilitata e TLS attivo.
- [x] Laravel usa il protocollo Redis nativo e riceve una risposta valida.
- [x] Horizon in `production` applica la politica M3/M4 con un solo processo.
- [x] Il container produttore viene rimosso con tre job ancora persistiti e un
      container nuovo con il solo Horizon li completa.
- [x] I tre ID risultano `completed`, ciascuno con `attempts = 1`, nessuno
      risulta fallito, il contatore vale `3`, l'ordine e' `[1, 2, 3]` e la
      queue `default` e' vuota. Solo l'insieme completo rende la prova GREEN.
- [x] Upstash contiene queue e metadati minimi Horizon; la cache Laravel resta
      su Neon con `CACHE_STORE=database`.
- [x] Secret e connection string non sono presenti in repository o output.
- [x] Nessun requisito di backup o persistenza dei messaggi viene attribuito a
      Redis.

## Rischi e assunzioni

Upstash documenta Laravel Queue ma non garantisce esplicitamente ogni uso
interno di Horizon: un comando incompatibile sarebbe stato bloccante e avrebbe
richiesto il log completo sanitizzato e la ripetizione dell'intera prova. La
verifica non ha incontrato incompatibilita' e non ha usato fallback verso
`queue:work`, queue sincrona o API REST.

Il piano Free dichiara un limite mensile di comandi. M7-004 non aggiunge una
misurazione artificiale del consumo inattivo e non promette che la quota basti
per qualsiasi carico: il consumo reale sara' osservato dal Dashboard dopo il
deploy.

## Verifica manuale

1. Controllare piano permanente Free, AWS Francoforte, TLS, assenza di repliche,
   eviction e auto-upgrade disabilitati nel Dashboard Upstash.
2. Preparare il file env `600` fuori dal repository con Neon, Upstash e la
   `APP_KEY` temporanea, senza stamparne il contenuto.
3. Verificare `PING` tramite Laravel/`phpredis`; avviare il solo container
   produttore, accodare tre job tramite Tinker, registrarne gli ID e rimuovere
   il container lasciando i job pendenti in Upstash.
4. Avviare un container nuovo con il solo Horizon production e verificare il
   gate completo: tre `completed`, tre `attempts = 1`, nessun fallito,
   contatore `3`, ordine `[1, 2, 3]` e queue vuota.
5. Arrestare Horizon, eliminare selettivamente contatore e lista senza
   `FLUSHDB`, rimuovere tutti i container e gli artefatti temporanei, quindi
   eliminare per ultimo il file env. I metadati Horizon seguono la retention
   gia' configurata. Con le versioni Docker correnti usare
   `docker stop --timeout 65` invece del flag deprecato `--time`.
6. Ispezionare output sanitizzati, stato Git e diff per escludere credenziali.

## Decisioni emerse

- Upstash e' un solo servizio dedicato alla queue `default` e ai metadati
  minimi di Horizon; `CACHE_STORE=database` resta su Neon.
- Horizon e' usato come supervisore del singolo worker. Snapshot, monitoraggio
  aggiuntivo e dashboard non fanno parte della DoD M7.
- La prova usa due container distinti dell'immagine production: Laravel
  produttore prima, Horizon consumatore dopo, senza stack completo o PostgreSQL
  locale.
- I tre job tecnici sono `QueuedCommand` creati con Tinker production; il gate
  richiede insieme ordine, contatore, tentativo singolo, assenza di failure e
  queue vuota.
- La compatibilita' Horizon deve avere evidenza runtime prima del deploy e non
  ammette fallback automatici.
- Il cleanup e' selettivo: niente `FLUSHDB`; container e artefatti temporanei
  vengono eliminati prima del file contenente i secret.

## File modificati

- `docs/tasks/completed/M7-004-collegare-upstash-queue-production.md`
- `docs/project/current-state.md`
- `docs/learning/deployment-render.md`

Non sono stati modificati codice applicativo, configurazione Laravel,
Dockerfile, Compose, dipendenze o lockfile.

## Risultati dei controlli

- Il Dashboard Upstash ha mostrato `Free Tier`, provider AWS, regione
  Frankfurt `eu-central-1`, una sola regione, eviction e auto-upgrade
  disabilitati e nessun metodo di pagamento configurato.
- Il file env temporaneo `/tmp/simple-chat-m7-004.env` aveva permessi `600` e
  conteneva una sola `REDIS_URL` nativa, la `DB_URL` pooled Neon e una
  `APP_KEY` temporanea. Il primo controllo ha rilevato le virgolette copiate
  dalla Console come parte dei valori Docker; dopo la loro rimozione i formati
  di `APP_KEY`, `DB_URL` e `REDIS_URL` sono risultati `OK`.
- Laravel con `phpredis` ha restituito `REDIS_PING_OK` tramite TLS. La
  configurazione risolta ha confermato `APP_ENV=production`, cache database,
  queue Redis `default`, Horizon su Redis `default`, bilanciamento `simple`, un
  processo, tre tentativi, backoff 5 secondi e timeout 60 secondi. La lettura
  della cache Neon ha restituito `NEON_CACHE_OK`.
- Il container produttore ha accodato gli ID
  `b5c34dd4-d0d1-433a-bd92-020d754f04cd`,
  `b1393ad4-5c34-4715-9bb0-be8c8b327f5c` e
  `fef33ec8-4e43-47a6-86a5-124439a71ea9`. Prima e dopo la sua rimozione la
  queue conteneva tre job, mentre contatore e lista non esistevano; il
  Dashboard Upstash mostrava i tre payload con stato `pending` e
  `attempts = 0`.
- Il container Horizon ha registrato avvio riuscito e tre sequenze
  `RUNNING`/`DONE`, rispettivamente in circa 588, 341 e 349 millisecondi. La
  verifica finale ha riportato per tutti e tre gli ID `completed`,
  `attempts = 1` e nessun fallimento; `QUEUE_SIZE=0`, `COUNTER=3`,
  `ORDER=[1,2,3]` e `FAILED_DB_MATCHES=0`.
- Un primo comando di lettura dei metadati ha usato il metodo Horizon
  inesistente `find()` ed e' fallito senza modificare dati; il controllo
  corretto con `getJobs(array $ids)` ha prodotto l'evidenza GREEN completa.
- Il cleanup ha eliminato esattamente i due marker (`DELETED=2`) senza
  `FLUSHDB`, lasciando contatore e lista assenti e la queue vuota. Horizon e'
  stato arrestato e rimosso; non restano container `simple-chat-m7-004` e il
  file env e' stato eliminato dopo i container.
- La scansione del repository non ha trovato URL Neon/Upstash o connection
  string reali. Test backend, Pint e PHPStan non sono stati ripetuti perche'
  nessun file PHP o di configurazione runtime e' cambiato.

## Problemi residui

- Il piano Free dichiara un limite mensile di comandi, ma M7-004 non misura ne'
  promette la sostenibilita' di un carico reale; il consumo verra' osservato
  dopo il deploy.
- La prova riguarda queue e Horizon nel caso normale. Non dimostra
  exactly-once durante un crash, il broadcast Reverb/Echo o il deploy pubblico;
  questi ultimi restano nei task successivi.

## Riepilogo finale

Un singolo Upstash Free a Francoforte ha accettato il protocollo Redis nativo
TLS usato da Laravel e tutti i comandi necessari a Horizon. Tre job tecnici
sono sopravvissuti alla rimozione del produttore e sono stati completati in
ordine, al primo tentativo, da un nuovo container con il solo Horizon. Neon e'
rimasto il backend della cache Laravel; cleanup e controllo finale non hanno
lasciato container, marker, file segreti o credenziali nel repository.
