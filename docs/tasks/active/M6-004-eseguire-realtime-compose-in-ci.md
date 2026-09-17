# M6-004 — Eseguire realtime Compose in CI

- **Stato:** attivo
- **Milestone:** Milestone 6 — Test end-to-end e CI
- **Data di apertura:** 2026-09-15
- **Data di chiusura:**
- **Dipendenze:** M6-001, M6-002, M6-003

## Contesto

M6-002 ha automatizzato il percorso reale della chat in due context Chromium
contro il Compose locale. M6-003 ha introdotto la CI per i controlli
applicativi. Resta da far eseguire lo stesso scenario in un runner GitHub
effimero, con PostgreSQL, Redis, Horizon, Reverb e Nginx effettivi.

## Obiettivo

Estendere la GitHub Actions con un job E2E che prepari input temporanei non
segreti, avvii il Compose completo con `compose.yaml:compose.ci.yaml` e lanci
Playwright Chromium sul percorso HTTPS/WSS reale della chat. Al termine, il job
rimuove lo stack e i volumi del solo runner CI.

## Fuori scope

- Trust del certificato mkcert personale, certificati di produzione o gestione
  di una CA persistente nel browser/runner.
- Browser Firefox/WebKit, test visuali, parallelo E2E, servizi cloud, cache o
  deploy.
- Cambi a codice applicativo, autenticazione, CORS, cookie Secure, Nginx o
  contratti WebSocket per adattarli al test.
- Operazioni `down -v` sul computer locale dello sviluppatore.
- Un ulteriore file Compose o una topologia E2E separata: M6-004 estende il
  solo `compose.ci.yaml` gia' usato dalla CI.

## File modificabili

- Workflow GitHub Actions introdotto da M6-003 e `compose.ci.yaml` per
  sostituire i soli input TLS locali e `NODE_EXTRA_CA_CERTS` nel runner CI.
- File di supporto minimi per generare valori Compose, CA e certificato
  temporanei con SAN, senza chiavi o segreti versionati.
- Configurazione Playwright strettamente necessaria a distinguere runner CI e
  macchina locale.
- Documentazione CI/E2E e questo task.
- `docs/project/current-state.md` quando il task verra' attivato o completato.

## File non modificabili

- `.cert/`, `compose.env`, `.env` locali, certificati mkcert, configurazioni di
  produzione e logica di dominio.

## Requisiti

- Prima di Compose, il job genera nel proprio workspace una CA effimera e un
  certificato foglia con SAN per `app.simple-chat.test` e
  `api.simple-chat.test`, oltre ai valori Compose fittizi indispensabili ma
  non sensibili. La chiave privata non e' versionata ne' raccolta come
  artifact.
- Il job esporta esplicitamente i path host di certificato, chiave e CA nel
  proprio environment; `compose.ci.yaml` li monta nei rispettivi container e
  imposta nel Node `NODE_EXTRA_CA_CERTS` sul path interno della CA. Il job usa
  i valori runtime fittizi di `compose.env.example`, non `compose.env` locale,
  e non introduce un secondo override E2E.
- Prima di avviare lo stack, il job rende la configurazione Compose risolta con
  `compose.yaml:compose.ci.yaml` e verifica concretamente che ogni target TLS
  sia montato una sola volta: CA nel frontend, certificato e chiave in Nginx.
  I tre source devono essere quelli CI generati; nessun mount `.cert/` mkcert
  locale puo' sopravvivere al merge dell'override.
- Il runner risolve entrambi i domini a `127.0.0.1`, avvia lo stesso
  `compose.yaml` della chat e attende readiness osservabile: health Compose,
  `✓ Ready` di Next e una richiesta HTTPS pubblica validata contro la CA
  effimera, senza sleep fissi.
- Playwright Chromium visita HTTPS/WSS reali. Il solo job E2E imposta una
  variabile esplicita, ad esempio `PLAYWRIGHT_IGNORE_HTTPS_ERRORS=true`, che
  abilita `ignoreHTTPSErrors` esclusivamente per il certificato CI non trusted
  dal browser. Il profilo locale mkcert non legge tale variabile e non usa
  fallback HTTP.
- Il test resta quello a due context di M6-002 e non usa mock di Redis, Horizon,
  Reverb, Echo o HTTP.
- Log Compose e artifact Playwright utili sono disponibili in caso di failure,
  senza cookie, token, chiavi private o dati sensibili. Le trace che potrebbero
  contenere dati di sessione non sono caricate come artifact CI.
- Il cleanup `docker compose down -v` e' eseguito solo nel runner GitHub
  effimero, anche quando il test fallisce.

## Strategia di test

Provare dapprima i passaggi di preparazione in una CI manuale: generazione CA e
SAN, environment del job, mapping host e configurazione Compose risolta. La
prova sui mount deve precedere build e avvio: controlla i tre target TLS e che
non resti alcun source mkcert locale dopo il merge dei volumi. Poi eseguire lo
scenario Playwright di M6-002 e verificare nei log Horizon/Reverb che la
pipeline reale sia stata percorsa. Una failure TLS deve distinguere il trust
del browser dalla connessione HTTPS/WSS: Node e la readiness HTTPS usano la CA
effimera, mentre il bypass Playwright resta limitato al job E2E.

## Comandi da eseguire

- `git status --short`
- Generazione di CA e certificato SAN, poi export dei loro path nel job
- Validazione di `compose.yaml:compose.ci.yaml` con environment CI: ogni target
  TLS compare una volta e non monta `.cert/` locale
- Build e avvio del Compose completo nel job GitHub, senza `--no-deps`
- Attesa health, `✓ Ready` frontend e richiesta HTTPS con `--cacert`
- Comando Playwright Chromium E2E
- Raccolta log dei servizi Compose e report Playwright in caso di failure
- `docker compose down -v` soltanto nel job effimero
- Verifica del workflow su GitHub Actions
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [ ] Il job CI avvia lo stack Compose completo e risolve i due domini pubblici
  senza usare Lerd, input locali dello sviluppatore o un secondo override E2E.
- [ ] La CA e il certificato SAN sono generati prima dell'avvio;
  `compose.ci.yaml` riceve i loro path dall'environment del job e Node valida
  l'API con quella CA.
- [ ] La configurazione Compose risolta prova che l'override rimpiazza, invece
  di sommare, i bind mount TLS: CA frontend, certificato e chiave Nginx hanno
  ciascuno un solo source CI e nessun source mkcert locale.
- [ ] Chromium esegue con successo lo scenario M6-002 su HTTPS/WSS, con due
  browser context e pipeline Redis/Horizon/Reverb/Echo reali.
- [ ] Il solo bypass del trust del certificato temporaneo e' limitato a
  Playwright CI tramite una variabile esplicita; HTTP e modifiche ai
  cookie/CORS non sono introdotti.
- [ ] Failure di E2E conserva evidenze sufficienti alla diagnosi e il runner
  effettua il cleanup dei propri volumi anche in caso di errore.

## Rischi e assunzioni

La CA e il certificato CI effimeri provano TLS, routing e WSS, ma non la trust
chain della CA mkcert personale: quella resta coperta dallo smoke locale M5.
L'avvio di sette servizi e browser puo' superare i timeout predefiniti della
CI; tempi e readiness devono essere basati su stato, log e richiesta HTTPS
osservabili, non su sleep fissi. Si assume un runner Linux GitHub-hosted con
Docker Compose e gli strumenti di generazione OpenSSL disponibili.

## Verifica manuale

1. Avviare il workflow manualmente e aprire il job E2E.
2. Controllare la configurazione Compose risolta: i mount TLS CI devono
   rimpiazzare quelli mkcert locali senza duplicati; quindi verificare che i
   domini risolvano localmente nel runner e Nginx esponga soltanto il percorso
   HTTPS previsto.
3. Leggere log Horizon/Reverb e il report Playwright del run riuscito.
4. Per una failure controllata, verificare che log e report siano disponibili e
   il cleanup finale sia comunque eseguito.

## Decisioni emerse

- La CI riusa la topologia di `compose.yaml` con il solo `compose.ci.yaml` gia'
  presente, senza un'architettura di test o un override E2E ulteriore. I path
  dei mount TLS e la CA Node sono iniettati dall'environment del job CI.
- Una CA CI effimera firma il certificato SAN. Node usa la CA montata tramite
  `NODE_EXTRA_CA_CERTS`; il browser non la importa e Playwright ignora il trust
  solo quando il job imposta la variabile E2E esplicita. Il trust mkcert locale
  resta un controllo distinto.
- Il merge dei volumi non e' presunto: il job controlla la configurazione
  Compose risolta e dimostra che ogni target TLS usa una sola sorgente CI,
  senza bind mount mkcert residui.
- Readiness non equivale a `up`: prima del browser il job richiede health
  Compose, Next `✓ Ready` e HTTPS pubblico validato con la CA generata.
- `down -v` e' sicuro solo nel runner effimero; i volumi locali non vengono
  mai cancellati automaticamente dagli E2E.

## File modificati

- `.github/workflows/ci.yml`: job E2E Compose, TLS effimero, readiness,
  diagnostica e cleanup.
- `compose.ci.yaml`: sostituzione dei mount TLS locali e path CA interno a Node.
- `frontend/playwright.config.ts`: bypass TLS esplicito solo per CI e trace
  disattivate nel runner.
- `frontend/next.config.ts`: marker diagnostico temporaneo per confrontare la
  root effettiva del processo Next nel runner GitHub.
- `docs/learning/github-actions.md` e `docs/project/current-state.md`.

## Risultati dei controlli

- La riproduzione iniziale del filtro `jq` falliva prima del build con
  `Cannot iterate over null`, perche' Redis non espone `volumes`; dopo la
  correzione con `volumes[]?` la stessa validazione ha restituito `true`.
  Un fixture con source `.cert/forbidden.pem` continua a essere rifiutato con
  exit code 1.
- Il controllo statico delle action ha rifiutato due riferimenti sintetici
  `@v4` e ha accettato il workflow reale con SHA Git completi da 40 caratteri.
- La prima prova runtime con `docker compose up -d --build` ha riprodotto una
  race: backend e Reverb eseguivano `composer install` nello stesso volume e
  terminavano con `End-of-central-directory signature not found`. Il workflow
  ora costruisce le immagini, installa Composer una sola volta e avvia i
  servizi CI con il solo `composer install` disabilitato nell'entrypoint. La
  creazione delle directory runtime e le migration restano attive. La riprova
  sequenziale ha mantenuto tutti i servizi `Up`, healthcheck sani, HTTPS `200`
  e Playwright realtime `2 passed`. Con lo stesso override, il backend ha
  superato 41 test, Pint su 62 file e PHPStan senza errori.
- Validazione locale con CA e certificato SAN temporanei: `docker compose
  config --format json` ha mostrato un solo source CI per CA frontend,
  certificato e chiave Nginx, senza source `.cert/`; `openssl verify` e'
  riuscito e il certificato contiene entrambi i domini richiesti.
- La configurazione Compose senza variabili TLS CI mantiene vuoto
  `NODE_EXTRA_CA_CERTS`, preservando i job di qualita' M6-003.
- Il workflow YAML e' stato analizzato con PyYAML; `git diff --check` e'
  riuscito.
- Gli script `run` del workflow hanno superato `bash -n`.
- Frontend: `pnpm test` (15 file, 86 test), `pnpm lint` e `pnpm typecheck`
  sono riusciti.
- I run remoti `35099896680` e `35103530177` hanno raggiunto `✓ Ready` e la
  richiesta di readiness HTTPS `200`, ma il frontend ha poi terminato durante
  la compilazione Turbopack: il log segnala `/app/app` e `next/package.json`.
  La root esplicita in `next.config.ts` non ha cambiato il secondo run e viene
  rimossa. Non viene introdotto un compilatore alternativo: il rerun GitHub
  resta necessario per una diagnosi riproducibile sul runner.
- La riproduzione manuale senza workaround alternativo ha superato la
  validazione mount TLS (`jq: true`), build/avvio, health, HTTPS e Playwright
  realtime (`2 passed`); una prima attesa `✓ Ready` è scaduta mentre il log
  frontend mostrava già la readiness, poi il controllo diretto ha restituito
  `docker compose exit=0; grep exit=0`. Il cleanup `down -v` ha rimosso tutti
  i container, volumi e la rete del progetto manuale.
- Lo stress test senza modifiche al repository ha passato `CI=true` al frontend
  tramite override temporaneo e ha applicato limiti risorse (frontend 2 CPU/2
  GB, servizi dipendenti limitati). Dopo una ricreazione il frontend ha raggiunto
  `✓ Ready` in 7 s; tre run E2E consecutivi senza cleanup hanno restituito
  `2 passed` con `failures=0/3`. Non sono comparsi crash Turbopack. Il run
  monitorato ha superato Playwright (`2 passed`), il frontend è rimasto circa
  a 1,06 GiB su 2 GiB e tutti i container hanno riportato `oom=false` e
  `restarts=0`; HTTPS ha risposto in 24,3 s, lasciando aperto solo l’indizio
  di variabilità temporale. I log hanno mostrato la prima richiesta in 21,2 s
  (Next 18,7 s, application-code 2,5 s) e la seconda in 289 ms (Next 17 ms),
  confermando una compilazione a freddo lenta ma riuscita, non un ritardo
  DNS/TLS o un crash.
- Il marker diagnostico in `next.config.ts` è pronto per il prossimo run remoto;
  lint e typecheck locali non sono partiti perché pnpm ha fallito prima con
  `ERR_SQLITE_ERROR: unable to open database file` nella cache locale.

## Problemi residui

- Il bloccante del filtro `jq`, la regressione dei tag mobili delle action e la
  race Composer del bootstrap Compose sono stati corretti e verificati; non
  restano problemi statici o runtime locali di questo scope.
- Due run reali GitHub Actions hanno rilevato il difetto Turbopack; il task
  rimane attivo finche' un rerun conferma lo scenario e il cleanup dopo
  eventuali failure.
- La verifica residua richiede pubblicare la correzione e controllare nel nuovo
  runner effimero log Horizon/Reverb, report E2E e cleanup `down -v`.

## Riepilogo finale

L'implementazione del job CI e dei relativi override/configurazione e' stata
completata e verificata staticamente. M6-004 non viene spostato in `completed`
finche' il run reale GitHub Actions non conferma lo scenario HTTPS/WSS a due
context e il cleanup del runner.
