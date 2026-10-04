# M7-005 — Definire il deployment Render con un Blueprint

- **Stato:** completato
- **Milestone:** Milestone 7 — Deployment
- **Data di apertura:** 2026-10-04
- **Data di chiusura:** 2026-10-04
- **Dipendenze:** M7-004

## Contesto

L'immagine production e i due datastore esterni sono definiti e verificati. Il
deployment deve ora essere riproducibile senza affidarsi a una sequenza di
click non versionata. Render Blueprints permette di descrivere il web service
in `render.yaml`, lasciando i valori sensibili al Dashboard.

## Obiettivo

Aggiungere un Blueprint Render per un unico web service Docker Free a
Francoforte, collegato a `master`, con deploy automatico disabilitato,
healthcheck `/up` e contratto completo delle variabili production senza valori
segreti.

## Fuori scope

- Creazione o sincronizzazione effettiva del servizio Render: M7-006.
- Valori reali di `APP_KEY`, `DB_URL` o `REDIS_URL`; lettura o conservazione
  del `REVERB_APP_SECRET` generato da Render.
- GitHub Actions di deploy, registry immagini o immagini prebuildate.
- Custom domain, preview environment, staging, autoscaling e servizi separati.
- Correzioni a immagine, Dockerfile, entrypoint, Nginx, Supervisor o codice
  applicativo anche se un controllo ne dimostra la necessita'. Un difetto
  osservato segue il workflow issue -> task correttivo dedicato; M7-005 resta
  attivo e i task pending vengono rinumerati prima di ampliare lo scope.

## File modificabili

- `render.yaml` nella root del repository.
- Documentazione operativa strettamente necessaria al Blueprint.
- `docs/learning/deployment-render.md`, limitatamente a PaaS, IaC, secret,
  healthcheck e deploy manuale.
- Questo task e `docs/project/current-state.md` durante attivazione e chiusura.

## File non modificabili

- `.github/workflows/ci.yml`, Compose locale/CI, Dockerfile, entrypoint,
  configurazione Nginx e Supervisor.
- File `.env`, secret reali, credenziali o output dei generatori.
- Codice di dominio, API, schema e dipendenze.

## Requisiti

- Il Blueprint definisce una sola risorsa: il servizio `web`
  `simple-chat-nazariodicataldo`, runtime Docker, piano `free`, regione
  `frankfurt`, branch `master`, `dockerContext: .` e il Dockerfile M7-001. Non
  definisce progetti, environment group, datastore Render o servizi separati.
- `autoDeployTrigger: off` disabilita il deploy su push e merge. M7-006 deve
  inoltre impostare `Auto Sync: No` nel Dashboard: deploy del servizio e sync
  del Blueprint restano due azioni manuali distinte.
- `previews.generation: off` disabilita le preview environment; l'assenza della
  configurazione preview del servizio disabilita anche le PR preview.
  `renderSubdomainPolicy: enabled` conserva l'unico ingresso pubblico
  `onrender.com`, senza custom domain.
- `healthCheckPath` e' `/up`; la documentazione lo descrive come liveness
  Nginx -> PHP-FPM -> Laravel, non come readiness completa.
- Il Blueprint non imposta `maxShutdownDelaySeconds`: Render CLI rifiuta questo
  campo sui servizi `free`, quindi vale il default Free di 30 secondi. Il
  margine di shutdown di Horizon resta una limitazione documentata del piano.
- La configurazione applicativa esplicita `APP_NAME=Simple Chat`,
  `APP_ENV=production`, `APP_DEBUG=false`, `LOG_CHANNEL=stderr` e
  `LOG_LEVEL=info`.
- `APP_URL`, `FRONTEND_URL` e `CORS_ALLOWED_ORIGINS` autoreferenziano
  `RENDER_EXTERNAL_URL`; `SANCTUM_STATEFUL_DOMAINS` e
  `REVERB_ALLOWED_ORIGINS` autoreferenziano `RENDER_EXTERNAL_HOSTNAME` tramite
  `fromService`. Il dominio effettivo assegnato da Render e' l'unica fonte di
  verita'.
- Il browser usa API e WebSocket relativi alla propria origine. Il Blueprint
  non definisce `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_REVERB_HOST`,
  `NEXT_PUBLIC_REVERB_PORT` o `NEXT_PUBLIC_REVERB_SCHEME`; l'unica variabile
  pubblica di build e' `NEXT_PUBLIC_REVERB_APP_KEY`.
- `PORT` resta responsabilita' di Render; `BACKEND_INTERNAL_URL` viene derivata
  dall'entrypoint. Host, porte e scheme loopback di Reverb restano default
  dell'immagine e non vengono duplicati nel Blueprint.
- Neon resta PostgreSQL, sessione, cache e archivio dei job falliti tramite
  `DB_CONNECTION=pgsql`, `CACHE_STORE=database`, `SESSION_DRIVER=database` e
  `QUEUE_FAILED_DRIVER=database-uuids`. Il cookie e' host-only per assenza di
  `SESSION_DOMAIN`, con `SESSION_SECURE_COOKIE=true`,
  `SESSION_HTTP_ONLY=true` e `SESSION_SAME_SITE=lax`.
- Upstash resta dedicato a queue e metadati Horizon tramite
  `QUEUE_CONNECTION=redis`, `REDIS_CLIENT=phpredis`, `REDIS_DB=0`,
  `REDIS_QUEUE_CONNECTION=default`, `REDIS_QUEUE=default`,
  `REDIS_QUEUE_RETRY_AFTER=90` e `REDIS_QUEUE_BLOCK_FOR=5`.
- Il broadcasting usa `BROADCAST_CONNECTION=reverb`,
  `REVERB_APP_ID=simple-chat-production` e la stessa chiave pubblica
  `simple-chat-production-key` per `REVERB_APP_KEY` e
  `NEXT_PUBLIC_REVERB_APP_KEY`. Questi identificatori sono versionati;
  `REVERB_APP_SECRET` usa `generateValue: true`.
- `APP_KEY`, `DB_URL` e `REDIS_URL` sono gli unici valori `sync: false` e
  vengono inseriti nel Dashboard durante la prima sync. `APP_KEY` viene
  generata con un container temporaneo tramite `php artisan key:generate
  --show`; nessun valore reale entra nel repository o negli output conservati.
- La Dashboard `/horizon` resta chiusa a tutti per assenza di
  `HORIZON_ALLOWED_EMAILS`; il processo Horizon continua a consumare la queue.
  L'attuale registrazione pubblica e senza verifica email non rende sicuro
  usare `admin@admin.com` come identita' amministrativa production.
- M7-006 verifica un workspace Hobby senza metodo di pagamento. Il vincolo zero
  euro accetta sospensione di servizio o build al termine delle quote e non
  ammette upgrade automatici.
- Il file e' validato senza creare risorse tramite parser YAML, schema Render
  corrente, `render blueprints validate render.yaml` e controlli
  programmatici del contratto. Non viene aggiunto un workflow CI.

## Strategia di test

Validare YAML e schema Blueprint senza creare risorse, poi eseguire il
validatore ufficiale Render CLI. Ispezionare programmaticamente risorsa unica,
piano, regione, branch, Dockerfile, context, healthcheck, shutdown, policy del
sottodominio, preview, deploy manuale e contratto completo delle variabili.
Cercare pattern di credenziali, URL Neon o Upstash e chiavi generate.
Costruire ancora l'immagine indicata dal Blueprint, fornendo soltanto la chiave
Reverb pubblica come build argument, per evitare un riferimento staticamente
valido ma inesistente.

## Comandi da eseguire

- `git status --short`
- Parser YAML e validazione contro lo schema Render corrente senza aggiungere
  dipendenze di produzione.
- `render blueprints validate render.yaml` con Render CLI corrente.
- Query YAML per i campi critici e per tutti i secret `sync: false`.
- Ricerca di password, URL reali e valori Reverb nel diff.
- Build del Dockerfile referenziato dal Blueprint.
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [x] `render.yaml` descrive un solo web service Docker Free a Francoforte.
- [x] Branch `master`, health `/up`, shutdown compatibile con Free, sottodominio
      Render, assenza di preview e deploy manuale sono espliciti.
- [x] Tutti i secret richiesti sono dichiarati senza valore versionato.
- [x] ID e chiave Reverb pubblici sono versionati, il secret e' generato da
      Render e nessun secret entra nel build frontend.
- [x] URL e hostname pubblici derivano dalle variabili automatiche Render; il
      browser conserva API e WSS same-origin senza endpoint pubblici nel bundle.
- [x] Neon e Upstash mantengono le responsabilita' gia' verificate; cookie,
      queue, logging e Dashboard Horizon rispettano il contratto concordato.
- [x] Parser, schema, Render CLI, query del contratto, scansione secret e build
      dell'immagine indicata sono verdi senza creare risorse remote.
- [x] La documentazione distingue Blueprint versionato, secret manuali e stato
      remoto non ancora creato.

## Rischi e assunzioni

La specifica Blueprint, le quote e i piani possono cambiare. Tag, nomi dei
campi e disponibilita' del piano Free vanno verificati live durante
l'implementazione. Una validazione statica non dimostra che migration, runtime
remoto, cold start o realtime funzionino; tali prove appartengono a M7-006 e
M7-007.

Se un controllo dimostra un difetto fuori scope, documentare errore, probabile
causa, impatto e riproduzione in un task issue. Aprire poi un task correttivo
dedicato, rinumerare i pending e mantenere M7-005 attivo finche' tutti i suoi
requisiti e criteri non tornano verdi.

## Verifica manuale

1. Aprire `render.yaml` e seguire ogni riferimento al file reale.
2. Controllare che nessuna variabile sensibile abbia un valore.
3. Controllare autoreferenze Render, sole tre variabili `sync: false`, secret
   Reverb generato e assenza degli endpoint browser duplicati.
4. Validare schema e semantica con Render CLI senza sincronizzare il Blueprint.
5. Confrontare i campi critici con la documentazione Render corrente.

## Decisioni emerse

- Blueprint sync e deploy sono entrambi manuali; si usa
  `autoDeployTrigger: off`, non il deprecato `autoDeploy`.
- Esiste un solo servizio Docker Free, senza preview, custom domain, progetti,
  environment group o datastore Render.
- URL e hostname applicativi autoreferenziano le variabili automatiche Render;
  il browser usa same-origin e l'immagine possiede i collegamenti loopback.
- `APP_KEY`, `DB_URL` e `REDIS_URL` sono manuali con `sync: false`; Render genera
  soltanto `REVERB_APP_SECRET`. ID e chiave Reverb sono pubblici e versionati.
- Cookie host-only, logging stderr, responsabilita' Neon/Upstash e Dashboard
  Horizon chiusa sono parte esplicita del contratto production.
- Il servizio Free usa il default Render di 30 secondi per lo shutdown; il
  vincolo zero euro richiede in M7-006 un workspace Hobby senza metodo di
  pagamento e accetta sospensioni.
- La validazione e' locale e statica; nessun workflow CI o risorsa remota viene
  creato in M7-005.
- Un difetto fuori scope segue issue -> task correttivo -> rinumerazione; il
  task corrente non viene chiuso con criteri mancanti.

## File modificati

- `render.yaml`
- `docs/learning/deployment-render.md`
- questo task
- `docs/project/current-state.md`

## Risultati dei controlli

- Blueprint: un solo servizio `web` Docker Free in `frankfurt`, branch
  `master`, context root e `docker/production/Dockerfile`; autoreferenze Render,
  preview disabilitate, sottodominio attivo, healthcheck `/up`, assenza del
  campo shutdown non supportato da Free e deploy su push disabilitato verificati
  con query strutturali.
- Contratto variabili: tre soli `sync: false` (`APP_KEY`, `DB_URL`, `REDIS_URL`),
  `REVERB_APP_SECRET` con `generateValue: true`, chiave Reverb pubblica
  versionata e nessun endpoint browser pubblico duplicato verificati con
  assert programmatici.
- Scansione secret e URL Neon/Upstash reali: nessuna corrispondenza nei file
  modificati.
- Build Docker con `docker build --build-arg
  NEXT_PUBLIC_REVERB_APP_KEY=simple-chat-production-key -t
  simple-chat-m7-005-blueprint -f docker/production/Dockerfile .`: riuscita.
- Documentazione Render ufficiale: campi Blueprint, autoreferenze
  `fromService`, `sync: false`, `generateValue` e build args Docker verificati
  sulla documentazione corrente del provider il 2026-10-04.
- `render blueprints validate render.yaml`: riuscito nel terminale dello
  sviluppatore con Render CLI; output: file valido, 1 servizio e 2 azioni.
  Il comando valida anche sintassi YAML e schema Blueprint, senza sincronizzare
  risorse.

## Problemi residui

- Nessun problema di validazione Blueprint resta aperto. Nessuna risorsa Render
  e' stata creata o sincronizzata; la creazione e sincronizzazione effettiva
  restano a M7-006.

## Riepilogo finale

Il Blueprint versionato e la documentazione operativa sono stati aggiunti. La
validazione ufficiale Render CLI e' verde; il servizio resta Free e usa il
default Render di 30 secondi per lo shutdown. M7-006 resta fuori scope.
