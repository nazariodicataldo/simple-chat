# M6-005 — Stabilizzare realtime Compose CI con Webpack

- **Stato:** attivo
- **Milestone:** Milestone 6 — Test end-to-end e CI
- **Data di apertura:** 2026-09-17
- **Data di chiusura:**
- **Dipendenze:** M6-003
- **Task collegato:** M6-004, bloccato da questo task

## Contesto

M6-004 ha implementato il job `Realtime Compose E2E`, ma i run GitHub Actions
terminano il frontend durante la compilazione Turbopack. Il processo raggiunge
`✓ Ready` e in alcuni run completa una prima richiesta HTTPS con `200`, poi
Turbopack cerca `next/package.json` dalla directory inesistente `/app/app` e
termina con exit code 1. Nginx perde quindi l'upstream e Playwright riceve `502`
o non trova la UI.

Le prove locali con la stessa versione di Node e pnpm, `CI=true`, risorse
limitate e piu' esecuzioni Playwright consecutive non hanno riprodotto il
crash. Nel runner remoto `cwd`, `PWD`, `INIT_CWD` e `import.meta.dirname`
risultano `/app`; esistono un solo `package.json` e un solo `pnpm-lock.yaml`, e
il tracing raccolto non mostra il passaggio che produce `/app/app`. La causa
interna esatta resta quindi non identificata.

La catena processi remota ha mostrato lo shim pnpm avviare Next tramite
`/app/node_modules/.bin/../next/dist/bin/next`. Questo valore puo' comparire in
`argv[1]` ed e' l'unico indizio tecnico non escluso sul ricalcolo della root,
ma il path e' normale per pnpm e non esiste evidenza che Turbopack lo usi o lo
normalizzi in modo errato. Va conservato come pista per un'eventuale indagine
futura, non come causa dimostrata.

Il primo run remoto con Webpack, `35255596983` sul commit
`b7c215abbc94da418a8065275daebedbc6b8333e`, ha superato readiness frontend,
HTTPS pubblico e controllo pre-Playwright dei sette servizi. Lo smoke pubblico
e' riuscito, mentre lo scenario realtime ha fallito durante la prima
registrazione: tutti e tre i tentativi hanno ricevuto `422` da
`POST /api/register` e l'error context mostra il messaggio sulla presenza di
almeno una lettera maiuscola e una minuscola nella password.

Il locator `Group chat` e' corretto: il test resta sul form perche' usa
`playwright-e2e-password`, interamente minuscola. Nel checkout CI non esiste
`backend/.env` e Compose non imposta `APP_ENV`, quindi Laravel usa il fallback
`production` e applica `Password::defaults()` con `mixedCase()` e
`uncompromised()`. In locale `APP_ENV=local` richiede soltanto la lunghezza
minima. Il nuovo fallimento e' quindi una differenza di environment Laravel,
non una regressione Webpack o un timeout del titolo.

Il run remoto successivo, `35329235001` sul commit
`b7474522f370c42a2b01dafc3e2319df8dd360f7`, ha verificato la correzione della
registrazione: `POST /api/register` ha restituito `201`, `GET /api/user` ha
restituito `200`, la pagina `Group chat` e il WebSocket Reverb sono stati
raggiunti. La subscription privata non ha pero' ricevuto l'ack entro cinque
secondi in nessuno dei tre tentativi.

Il log completo esclude un errore di sessione o CSRF in quel passaggio:
`OPTIONS /broadcasting/auth` restituisce `204` e il successivo
`POST /broadcasting/auth` restituisce subito `200`, ma con un body di soli
cinque byte invece del JSON firmato atteso da Echo. Nel checkout CI manca
ancora `backend/.env`, `compose.ci.yaml` non imposta `BROADCAST_CONNECTION` e
`config/broadcasting.php` usa quindi il fallback `null`. Il `NullBroadcaster`
non genera la firma del canale e spiega il body nullo e l'assenza di
`pusher_internal:subscription_succeeded`.

La stessa differenza riguarda la coda: senza `QUEUE_CONNECTION=redis`, Laravel
usa il fallback `database`, mentre Horizon ascolta la connessione Redis. Il run
non e' arrivato alle mutazioni, quindi questa non e' la causa del fallimento
osservato, ma deve essere resa esplicita insieme al broadcaster per verificare
l'intera pipeline richiesta dal task.

M6-004 rimane bloccato finche' questo task non dimostra un percorso CI stabile.

## Obiettivo

Stabilizzare il job `Realtime Compose E2E` usando Webpack esclusivamente
nell'override CI e verificarlo con un run automatico e un successivo
`Re-run all jobs` verdi sullo stesso commit. Turbopack resta il compilatore del
profilo locale.

## Fuori scope

- Ulteriori tentativi di diagnosi o correzione interna di Turbopack.
- Aggiornamento di Next.js o di altre dipendenze applicative.
- Upgrade di `actions/setup-node` o `actions/upload-artifact`: gli SHA completi
  risolvono gia' il pinning, mentre il passaggio a release con runtime Node 24
  e' manutenzione separata e non una correzione dimostrata del crash.
- Modifiche al comando frontend del Compose locale o uso di Webpack fuori dal
  job GitHub Actions.
- Refactor del workflow, della topologia Compose o dei test Playwright.

## File modificabili

- `compose.ci.yaml`, per selezionare Webpack e rimuovere il tracing Turbopack
  ormai non pertinente.
- `.github/workflows/ci.yml`, soltanto per verificare subito prima di Playwright
  che i servizi richiesti siano ancora attivi e, dove previsto, healthy.
- Documentazione M6-004/M6-005 e `docs/project/current-state.md` per registrare
  avanzamento ed evidenze.

## File non modificabili

- Il comando frontend e il profilo TLS del Compose locale.
- `frontend/next.config.ts`: `turbopack.root` non viene modificato insieme al
  cambio di compilatore CI.
- Dipendenze e lockfile frontend/backend.
- Codice applicativo, autenticazione, API, CORS, cookie, Nginx e contratti
  WebSocket.
- Versioni delle GitHub Action durante l'esperimento Webpack.

## Requisiti

- Il frontend usa `next dev --webpack` soltanto tramite `compose.ci.yaml`; il
  Compose locale continua a usare il comando Turbopack esistente.
- I servizi Laravel CI impostano esplicitamente `APP_ENV=local`, coerente con
  il Compose di sviluppo verificato da M6-002. Il test E2E non deve dipendere
  dal controllo HTTP esterno attivato da `uncompromised()` in produzione.
- Il job backend mantiene `APP_ENV=testing` per il comando PHPUnit, così il
  profilo `local` dell'override E2E non abilita accidentalmente la verifica
  CSRF durante i test HTTP.
- Il solo override CI imposta `BROADCAST_CONNECTION=reverb` per backend e
  Horizon: il backend deve firmare l'accesso a `private-chat` e il worker deve
  trasmettere gli eventi accodati tramite Reverb.
- Il solo override CI imposta `QUEUE_CONNECTION=redis` per backend e Horizon,
  così gli eventi `ShouldBroadcast` prodotti dalle API vengono consumati dal
  worker Horizon gia' configurato sulla coda Redis `default`.
- L'aumento del timeout della subscription non viene considerato una
  correzione del run `35329235001`: l'endpoint di autorizzazione rispondeva
  subito, ma con un payload nullo.
- `NEXT_TURBOPACK_TRACING=1` viene rimosso dall'override CI insieme al passaggio
  a Webpack. Gli altri strumenti diagnostici e gli artifact di failure restano
  disponibili.
- Il primo esperimento remoto cambia soltanto il compilatore CI e il relativo
  tracing. Non combina upgrade delle action, dipendenze o correzioni Reverb.
- Prima di Playwright, il job verifica nuovamente che tutti i container
  richiesti siano in esecuzione e che quelli dotati di healthcheck siano sani.
- Poiche' anche il run `35329235001` riproduce la race sulla tabella `cache`
  prima delle migration, la correzione minima viene preparata in un commit
  successivo e separato dall'iniezione delle connessioni broadcast e queue. Se
  richiede file fuori dallo scope autorizzato, il task viene aggiornato prima
  dell'implementazione.
- Il successo remoto richiede due esecuzioni complete verdi sullo stesso
  commit: il run automatico del push e poi `Re-run all jobs` dall'interfaccia
  GitHub. Non viene aggiunto `workflow_dispatch`.
- Il workaround e' descritto come scelta pratica CI-only, non come correzione
  della causa Turbopack. Potra' essere rivalutato senza scadenze al prossimo
  aggiornamento di Next.js; non viene aperto ora un task ulteriore.

## Strategia di test

Prima verificare staticamente che la configurazione Compose risolta selezioni
Webpack soltanto per il frontend CI e che il Compose locale resti invariato.
Pubblicare poi il solo cambio di compilatore e osservare il run automatico
completo, conservando log Compose e report Playwright in caso di failure.

Dopo il `422` del run `35255596983`, impostare `APP_ENV=local` nei servizi
Laravel del solo override CI e verificare nella configurazione risolta che il
valore raggiunga backend, Reverb e Horizon. Il test Playwright conserva la
password e il flusso UI esistenti: la modifica deve eliminare la differenza
accidentale rispetto al Compose locale, non adattare il locator al sintomo.

Dopo il payload nullo del run `35329235001`, aggiungere al solo override CI
`BROADCAST_CONNECTION=reverb` e `QUEUE_CONNECTION=redis` per backend e
Horizon. Verificare prima la configurazione Compose risolta, quindi controllare
nel run remoto che `/broadcasting/auth` restituisca un JSON firmato, che Echo
riceva l'ack di `private-chat` e che le tre mutazioni attraversino
Redis/Horizon/Reverb. Non combinare questa modifica con un ulteriore aumento
del timeout o con la correzione della race di bootstrap Reverb.

Se il frontend resta vivo ma emerge un nuovo problema Reverb, non attribuire il
fallimento a Webpack: raccogliere il log completo e intervenire in un commit
separato. Quando il commit finale supera il workflow automatico, eseguire
`Re-run all jobs` sullo stesso commit e confrontare entrambe le esecuzioni.

## Comandi da eseguire

- `git status --short`
- Validazione di `compose.yaml:compose.ci.yaml` con l'environment CI
- Controllo del comando frontend nella configurazione Compose locale e in
  quella CI risolta
- Controllo di `APP_ENV=local` per backend, Reverb e Horizon nella
  configurazione CI risolta
- Controllo di `BROADCAST_CONNECTION=reverb` e `QUEUE_CONNECTION=redis` per
  backend e Horizon nella configurazione CI risolta
- Build e avvio del Compose completo nel job GitHub, senza `--no-deps`
- Verifica di stato/health di tutti i servizi subito prima di Playwright
- `pnpm e2e` nel job `Realtime Compose E2E`
- Raccolta dei log Compose e del report Playwright in caso di failure
- `docker compose down -v --remove-orphans` nel runner effimero
- Run automatico GitHub Actions sul commit finale
- `Re-run all jobs` sul medesimo commit
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [x] `compose.ci.yaml` avvia il frontend con Webpack, mentre il Compose locale
  continua a usare Turbopack.
- [x] Il tracing Turbopack viene rimosso dalla CI senza eliminare la diagnostica
  generica disponibile in caso di failure.
- [x] Subito prima di Playwright, tutti i servizi richiesti risultano ancora in
  esecuzione e quelli dotati di healthcheck risultano sani.
- [x] Backend, Reverb e Horizon ricevono esplicitamente `APP_ENV=local` dal
  solo override CI; il profilo locale e le regole applicative non cambiano.
- [x] La registrazione UI non riceve piu' il `422` dovuto alla
  regola password di produzione implicita.
- [x] Backend e Horizon ricevono `BROADCAST_CONNECTION=reverb` e
  `QUEUE_CONNECTION=redis` dal solo override CI.
- [ ] `/broadcasting/auth` restituisce la firma del canale privato ed Echo
  riceve `pusher_internal:subscription_succeeded` per `private-chat`.
- [ ] Il run automatico completa lo scenario M6-002 con due context Chromium,
  HTTPS/WSS reali e pipeline Redis/Horizon/Reverb/Echo.
- [ ] `Re-run all jobs` sullo stesso commit completa nuovamente lo scenario.
- [ ] Entrambi i run conservano la diagnostica prevista in caso di failure ed
  eseguono sempre `docker compose down -v --remove-orphans`.
- [ ] M6-004 registra le evidenze dei due run prima di essere riattivato e
  chiuso.

## Rischi e assunzioni

Il successo con Webpack dimostra la stabilita' del percorso CI scelto, non la
causa del crash Turbopack. I run locali verdi non sostituiscono la prova nel
runner GitHub-hosted.

I run `35255596983` e `35329235001` hanno riprodotto l'accesso di Reverb alla
tabella `cache` prima del completamento delle migration. Reverb si e' poi
ripreso ed era `healthy` prima di Playwright; nel secondo run ha anche accettato
il WebSocket, quindi la race non spiega il payload nullo di
`/broadcasting/auth`. La correzione minima resta necessaria in un commit
separato, senza combinarla con l'iniezione delle connessioni broadcast e queue.
Il warning sul runtime Node delle action e' considerato indipendente perche' il
frontend gira con Node `24.19.0` dentro il container e
`setup-node`/`upload-artifact` intervengono fuori dal processo che termina.

## Verifica manuale

1. Controllare nel log risolto di Compose che solo il profilo CI aggiunga
   `--webpack` e che `NEXT_TURBOPACK_TRACING` non sia piu' impostato.
2. Nel run automatico, verificare stato finale dei container, HTTPS `200`, test
   Playwright, log Horizon/Reverb e cleanup.
3. Dall'interfaccia GitHub selezionare `Re-run all jobs` sullo stesso commit.
4. Verificare gli stessi segnali nel secondo run e registrare ID e commit di
   entrambe le esecuzioni.

## Decisioni emerse

- M6-005 e' il task operativo; M6-004 resta bloccato e conserva la
  responsabilita' del risultato E2E complessivo.
- Webpack e' autorizzato come workaround esclusivamente per GitHub Actions;
  Turbopack resta attivo nello sviluppo locale.
- La causa Turbopack non identificata viene conservata come contesto, ma non e'
  piu' un requisito di uscita per M6-004.
- Due run completi verdi sullo stesso commit sono la soglia minima concordata:
  uno automatico e uno tramite `Re-run all jobs`.
- Il `422` del run `35255596983` viene corretto rendendo esplicito
  `APP_ENV=local` nel solo override CI, invece di cambiare il titolo atteso o
  introdurre nel test la verifica esterna `uncompromised()`.
- Il fallimento del run `35329235001` viene corretto rendendo espliciti
  `BROADCAST_CONNECTION=reverb` e `QUEUE_CONNECTION=redis` nel solo override
  CI per backend e Horizon, invece di trattare l'assenza dell'ack come un
  semplice timeout.
- L'implementazione e' stata autorizzata dalla richiesta di lavorare su M6-005;
  la chiusura resta subordinata ai due run remoti verdi.

## File modificati

- `docs/tasks/active/M6-005-stabilizzare-realtime-compose-ci-con-webpack.md`:
  implementazione e registrazione delle verifiche.
- `compose.ci.yaml`: comando frontend CI con Webpack e rimozione del tracing
  Turbopack.
- `.github/workflows/ci.yml`: controllo stato/health subito prima di
  Playwright.
- `docs/tasks/active/M6-004-eseguire-realtime-compose-in-ci.md`: task segnato
  come bloccato da M6-005 e aggiornato con la verifica residua.
- `docs/project/current-state.md`: M6-005 impostato come task attivo.

## Risultati dei controlli

- `git status --short` prima delle modifiche: presenti modifiche documentali
  preesistenti in `current-state.md` e M6-004, oltre a questo task non
  tracciato.
- `docker compose --env-file compose.env.example -f compose.yaml -f
  compose.ci.yaml config --quiet`: superato.
- Configurazione CI risolta: comando Webpack, tracing assente, sette servizi e
  mount TLS CI singoli senza source `.cert/`: superata.
- Configurazione CI risolta: `APP_ENV=local` raggiunge backend, Reverb e
  Horizon; il Compose locale non sovrascrive `APP_ENV`: superata.
- Configurazione CI risolta: backend e Horizon ricevono
  `BROADCAST_CONNECTION=reverb` e `QUEUE_CONNECTION=redis`, mentre il profilo
  locale resta invariato: superata.
- Il primo comando backend con `APP_ENV=local` ha riprodotto due `419` nei test
  stateful; lo stesso comando con `-e APP_ENV=testing`, ora presente nel
  workflow, ha superato 41 test e 213 assertion. Dopo l'aggiunta delle
  connessioni realtime CI, il comando PHPUnit completo usa anche
  `-e BROADCAST_CONNECTION=null -e QUEUE_CONNECTION=sync` e ha mantenuto lo
  stesso risultato.
- Stack E2E locale ricreato senza rimuovere volumi: backend e Horizon hanno
  ricevuto le connessioni realtime CI, Reverb e' rimasto healthy e Playwright
  HTTPS/WSS con pnpm `11.20.0` ha superato 2 test in 18,2 s.
- Configurazione locale risolta: nessun `command` frontend nell'override e
  `docker/frontend/Dockerfile` conserva `CMD pnpm dev`: superata.
- Parser YAML del workflow: superato con PyYAML; `actionlint` non e'
  disponibile nell'ambiente locale.
- `pnpm test`: 15 file e 86 test superati; `pnpm lint` e `pnpm typecheck`:
  superati.
- Prettier sui file Compose e workflow: superato.
- `git diff --check`: superato dopo l'implementazione.
- Run automatico GitHub Actions `35255596983` sul commit
  `b7c215abbc94da418a8065275daebedbc6b8333e`: Webpack ha raggiunto `✓ Ready`,
  HTTPS e controllo pre-Playwright sono riusciti e lo smoke pubblico e'
  passato. Lo scenario realtime ha fallito in tutti e tre i tentativi sulla
  prima registrazione: `POST /api/register` ha restituito `422` e l'error
  context mostra la regola mixed-case non soddisfatta dalla password E2E.
- Lo stesso run ha raccolto log Compose e report Playwright, quindi ha
  dimostrato che il locator `Group chat` non e' la causa: il form di
  registrazione e il relativo alert erano ancora visibili.
- Run automatico GitHub Actions `35329235001` sul commit
  `b7474522f370c42a2b01dafc3e2319df8dd360f7`: registrazione `201`, utente
  autenticato `200`, pagina chat e WebSocket raggiunti. In tutti e tre i
  tentativi `POST /broadcasting/auth` ha restituito subito `200` con un body di
  cinque byte, ma Echo non ha ricevuto l'ack di `private-chat` entro cinque
  secondi. La configurazione applicativa ricade su `BROADCAST_CONNECTION=null`
  perche' il checkout CI non contiene `backend/.env` e l'override non imposta
  ancora la connessione.
- Lo stesso run ha riprodotto nuovamente la race sulla tabella `cache`; Reverb
  si e' riavviato, e' diventato healthy e ha poi accettato il WebSocket.
- `Re-run all jobs`: non eseguito, perche' il run automatico non e' verde.

## Problemi residui

- Il workaround Webpack e' verificato sul runner GitHub fino all'avvio stabile
  del frontend, allo smoke HTTPS e alla registrazione autenticata.
- Il nuovo override delle connessioni Reverb e Redis deve ancora essere
  verificato nel run GitHub completo, compresa la subscription e le mutazioni;
  la prova locale reale e' riuscita.
- M6-004 resta bloccato e non puo' essere dichiarato completo.
- La race Reverb/migration e' ricomparsa anche nel nuovo log; non e' il
  bloccante dimostrato della subscription, ma richiede una correzione separata.

## Riepilogo finale

Il workaround Webpack limitato alla CI, il controllo pre-Playwright e
`APP_ENV=local` per i servizi Laravel CI sono stati implementati senza
modificare il profilo locale o il codice applicativo. La registrazione ora
riesce; il prossimo cambiamento proposto rende esplicite le connessioni Reverb
e Redis nel solo override CI. Dopo un run automatico completamente verde resta
necessario il `Re-run all jobs` sullo stesso commit.
