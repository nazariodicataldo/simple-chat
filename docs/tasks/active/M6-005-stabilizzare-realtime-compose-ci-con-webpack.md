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
- `NEXT_TURBOPACK_TRACING=1` viene rimosso dall'override CI insieme al passaggio
  a Webpack. Gli altri strumenti diagnostici e gli artifact di failure restano
  disponibili.
- Il primo esperimento remoto cambia soltanto il compilatore CI e il relativo
  tracing. Non combina upgrade delle action, dipendenze o correzioni Reverb.
- Prima di Playwright, il job verifica nuovamente che tutti i container
  richiesti siano in esecuzione e che quelli dotati di healthcheck siano sani.
- Se Reverb resta sano, non viene introdotta alcuna correzione preventiva. Se
  un nuovo run riproduce la race sulla tabella `cache` prima delle migration,
  la correzione minima viene preparata in un commit successivo e motivata dal
  nuovo log completo. Se richiede file fuori dallo scope autorizzato, il task
  viene aggiornato prima dell'implementazione.
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

Se il frontend resta vivo ma emerge un nuovo problema Reverb, non attribuire il
fallimento a Webpack: raccogliere il log completo e intervenire in un commit
separato. Quando il commit finale supera il workflow automatico, eseguire
`Re-run all jobs` sullo stesso commit e confrontare entrambe le esecuzioni.

## Comandi da eseguire

- `git status --short`
- Validazione di `compose.yaml:compose.ci.yaml` con l'environment CI
- Controllo del comando frontend nella configurazione Compose locale e in
  quella CI risolta
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

Un vecchio log remoto mostra inoltre Reverb interrogare la tabella `cache`
prima del completamento delle migration. Non e' dimostrato che il problema sia
ancora presente: viene verificato nel nuovo run e corretto soltanto se si
riproduce. Il warning sul runtime Node delle action e' considerato indipendente
perche' il frontend gira con Node `24.19.0` dentro il container e
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
- Configurazione locale risolta: nessun `command` frontend nell'override e
  `docker/frontend/Dockerfile` conserva `CMD pnpm dev`: superata.
- Parser YAML del workflow: superato con PyYAML; `actionlint` non e'
  disponibile nell'ambiente locale.
- `pnpm test`: 15 file e 86 test superati; `pnpm lint` e `pnpm typecheck`:
  superati.
- Prettier sui file Compose e workflow: superato.
- `git diff --check`: superato dopo l'implementazione.
- Run automatico GitHub Actions e `Re-run all jobs`: non eseguiti; il client
  `gh` locale ha una sessione autenticata con token non valido.

## Problemi residui

- Il workaround Webpack e' implementato e verificato staticamente/localmente,
  ma non e' ancora verificato su GitHub.
- M6-004 resta bloccato e non puo' essere dichiarato completo.
- La race Reverb/migration e' solo un rischio storico finche' un nuovo run non
  la riproduce.

## Riepilogo finale

Il workaround Webpack limitato alla CI e il controllo pre-Playwright sono stati
implementati senza modificare il profilo locale o il codice applicativo. Il
task resta attivo finche' un run automatico e il successivo `Re-run all jobs`
non completano verdi sullo stesso commit.
