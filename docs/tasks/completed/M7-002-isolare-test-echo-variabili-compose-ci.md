# M7-002 — Isolare il test Echo dalle variabili Compose della CI

- **Stato:** completato
- **Milestone:** Milestone 7 — Deployment
- **Data di apertura:** 2026-09-28
- **Data di chiusura:** 2026-09-28
- **Dipendenze:** [ISS-005](../../issues/ISS-005-isolare-test-echo-variabili-compose-ci.md)

## Contesto

Dopo il completamento di M7-001, il job frontend GitHub Actions ha mostrato
che il test del fallback same-origin di Echo dipende dall'ambiente che esegue
Vitest. Il caso dichiara di verificare l'assenza delle variabili pubbliche
Reverb, ma il container frontend riceve da Compose host, porta e schema
espliciti. Echo usa correttamente questi valori e l'aspettativa del test
fallisce.

ISS-005 conferma la causa: `vi.unstubAllEnvs()` ripristina l'ambiente originale
del processo e quindi, nel container, ripristina le variabili Compose. Il test
deve rendere esplicitamente assente la configurazione che il proprio scenario
dichiara di non avere.

## Obiettivo

Rendere deterministico il test del fallback HTTPS same-origin di Echo
impostando a `undefined`, con `vi.stubEnv`, host, porta e schema Reverb prima
dell'import del modulo. Dimostrare la correzione nel profilo Compose locale,
in un ambiente locale isolato equivalente alla CI e infine nel workflow GitHub
Actions completo.

## Fuori scope

- Comportamento applicativo in `frontend/lib/echo.ts`.
- `compose.yaml`, `compose.ci.yaml` e `.github/workflows/ci.yml`.
- Configurazione Reverb, HTTPS/WSS, Nginx o immagine production.
- Nuovi test, refactor del setup Vitest o modifiche ad altri casi di test.
- Dipendenze, lockfile, API e codice backend.
- Implementazione o attivazione di M7-003 e dei task successivi.

## File modificabili

- `frontend/lib/echo.test.ts`
- `docs/issues/ISS-005-isolare-test-echo-variabili-compose-ci.md`
- `docs/issues/README.md`
- Questo task
- `docs/project/current-state.md`, soltanto durante attivazione e chiusura
  effettive

## File non modificabili

- `frontend/lib/echo.ts` e gli altri file applicativi frontend.
- `compose.yaml`, `compose.ci.yaml`, `compose.env.example` e Dockerfile.
- `.github/workflows/ci.yml`.
- Test frontend estranei a `frontend/lib/echo.test.ts`.
- Dipendenze, lockfile, backend e documentazione dei task completati.

## Requisiti

- Conservare l'origine JSDOM HTTPS `https://chat.example.test/` e le
  aspettative esistenti su host `chat.example.test`, porta `443` e TLS attivo.
- Prima dell'import di `echo.ts`, il solo test del fallback deve impostare
  `NEXT_PUBLIC_REVERB_HOST`, `NEXT_PUBLIC_REVERB_PORT` e
  `NEXT_PUBLIC_REVERB_SCHEME` a `undefined` tramite `vi.stubEnv`.
- Non impostare la stringa `"undefined"` e non sostituire `undefined` con una
  stringa vuota: entrambe rappresenterebbero valori definiti diversi dallo
  scenario da verificare.
- Conservare `NEXT_PUBLIC_REVERB_APP_KEY=production-public-key` nel caso
  interessato e il cleanup condiviso gia' esistente.
- Non cambiare le aspettative per adeguarle a `api.simple-chat.test:8443`: il
  test deve verificare realmente il ramo senza valori pubblici espliciti.
- Il commit e il push necessari ad avviare GitHub Actions saranno eseguiti
  dall'utente, salvo una nuova autorizzazione esplicita.
- M7-002 e ISS-005 restano aperti finche' tutte le verifiche locali e l'intero
  workflow remoto non sono verdi sul commit della correzione.

## Strategia di test

1. Riprodurre il fallimento nel profilo Compose locale con `compose.env` e
   registrare l'esito come confronto diagnostico, non come gate di chiusura.
2. Creare un ambiente isolato con project name `simple-chat-iss005`, unendo
   `compose.yaml` e `compose.ci.yaml` e usando `compose.env.example` come nel
   runner GitHub.
3. Ricostruire normalmente l'immagine frontend isolata, senza `--no-cache`.
4. Eseguire il test Echo mirato e registrare il RED con i valori Compose
   `api.simple-chat.test:8443`.
5. Applicare esclusivamente i tre `vi.stubEnv(..., undefined)` gia'
   individuati, prima dell'import del modulo.
6. Rieseguire lo stesso comando mirato e ottenere il GREEN dei sei test Echo.
7. Nello stesso ambiente isolato eseguire suite frontend completa, lint,
   typecheck e build.
8. Rimuovere soltanto container e volumi del progetto isolato
   `simple-chat-iss005`, anche dopo un fallimento registrato.
9. Dopo il commit e push dell'utente, attendere il workflow GitHub Actions e
   verificare che tutti i job siano verdi. Il job frontend e' la prova diretta
   di ISS-005; l'intero workflow verde e' il gate remoto di chiusura.

Il RED/GREEN deve usare lo stesso comando CI-equivalente. Un GREEN ottenuto
soltanto sull'host o dopo aver rimosso le variabili dalla shell non dimostra la
correzione richiesta.

## Comandi da eseguire

- `git status --short`
- Riproduzione locale minima dalla root:
  `docker compose --env-file compose.env run --rm --no-deps frontend pnpm exec vitest run lib/echo.test.ts --maxWorkers=1`
- Build CI-equivalente isolata dalla root:
  `docker compose --project-name simple-chat-iss005 -f compose.yaml -f compose.ci.yaml --env-file compose.env.example build frontend`
- RED e GREEN mirati CI-equivalenti:
  `docker compose --project-name simple-chat-iss005 -f compose.yaml -f compose.ci.yaml --env-file compose.env.example run --rm --no-deps frontend pnpm exec vitest run lib/echo.test.ts --maxWorkers=1`
- Suite frontend completa CI-equivalente:
  `docker compose --project-name simple-chat-iss005 -f compose.yaml -f compose.ci.yaml --env-file compose.env.example run --rm --no-deps frontend pnpm test`
- Lint CI-equivalente:
  `docker compose --project-name simple-chat-iss005 -f compose.yaml -f compose.ci.yaml --env-file compose.env.example run --rm --no-deps frontend pnpm lint`
- Typecheck CI-equivalente:
  `docker compose --project-name simple-chat-iss005 -f compose.yaml -f compose.ci.yaml --env-file compose.env.example run --rm --no-deps frontend pnpm typecheck`
- Build Next CI-equivalente:
  `docker compose --project-name simple-chat-iss005 -f compose.yaml -f compose.ci.yaml --env-file compose.env.example run --rm --no-deps frontend pnpm build`
- Cleanup isolato:
  `docker compose --project-name simple-chat-iss005 -f compose.yaml -f compose.ci.yaml --env-file compose.env.example down -v --remove-orphans`
- `git diff --stat`
- `git diff --check`
- Dopo il push dell'utente: ispezione del workflow GitHub Actions sullo SHA
  della correzione, registrando run, job ed esiti.

## Criteri di accettazione

- [x] La riproduzione locale minima registra il comportamento iniziale senza
      essere usata come unica prova di correzione.
- [x] Il RED CI-equivalente isolato fallisce sul test del fallback Echo con
      host `api.simple-chat.test` e porta `8443`.
- [x] Il solo caso interessato imposta a `undefined` host, porta e schema
      Reverb tramite `vi.stubEnv` prima dell'import di `echo.ts`.
- [x] Lo stesso test mirato CI-equivalente passa dopo la correzione con tutti
      i sei test Echo verdi.
- [x] Suite frontend completa, lint, typecheck e build passano nello stesso
      ambiente CI-equivalente isolato.
- [x] I volumi e i container del solo progetto `simple-chat-iss005` vengono
      rimossi senza toccare il normale ambiente Compose locale.
- [x] Nessun file applicativo, Compose, workflow, dipendenza o lockfile viene
      modificato.
- [x] Dopo il commit e push dell'utente, tutti i job del workflow GitHub
      Actions sono verdi sullo stesso SHA.
- [x] ISS-005 passa a `risolta` e M7-002 a `completato` soltanto dopo tutte le
      evidenze precedenti; M7-003 non viene avviato prima della chiusura.

## Rischi e assunzioni

Una suite host verde puo' nascondere il difetto perche' non eredita le stesse
variabili del container. Per questo il gate locale usa i due file Compose e
l'env file versionato del runner.

I volumi Compose locali possono contenere dipendenze o cache precedenti. Il
project name isolato evita di usarli e rende il cleanup selettivo. Non usare
`down -v` sul progetto Compose normale.

`vi.unstubAllEnvs()` ripristina l'ambiente originale, non cancella le variabili
fornite dal processo. I tre stub a `undefined` devono quindi restare nel caso
che verifica esplicitamente la loro assenza.

Il run remoto deve riferirsi allo stesso SHA che contiene la correzione. Un run
storico o relativo a un commit diverso non soddisfa il criterio.

## Verifica manuale

Non e' richiesto uno smoke browser: il problema riguarda l'isolamento
deterministico di un test Vitest. Controllare gli output RED/GREEN, la
configurazione Compose risolta senza stampare secret, il cleanup del progetto
isolato e la pagina del workflow GitHub Actions sullo SHA corretto.

## Decisioni emerse

- M7-002 e' stato attivato e completato il 2026-09-28 dopo la verifica del
  workflow GitHub Actions sullo SHA della correzione.
- La soluzione e' gia' individuata e non lascia aperte alternative:
  `vi.stubEnv(..., undefined)` sulle tre variabili nel solo test interessato.
- La riproduzione con il profilo locale viene registrata come evidenza
  diagnostica; solo la simulazione locale CI-equivalente consente di procedere
  verso il run remoto.
- La simulazione CI usa un'immagine frontend ricostruita e il project name
  isolato `simple-chat-iss005`.
- Test mirato, controlli frontend locali e workflow GitHub Actions completo
  devono essere verdi; un risultato parziale non chiude il task o ISS-005.
- Commit e push restano a carico dell'utente.
- Non serve un ADR perche' il task corregge l'isolamento del test senza
  cambiare l'architettura o il comportamento applicativo.

## File modificati

- `frontend/lib/echo.test.ts`
- `docs/issues/ISS-005-isolare-test-echo-variabili-compose-ci.md`
- `docs/issues/README.md`
- `docs/project/current-state.md`
- questo task

## Risultati dei controlli

- Riproduzione Compose locale: fallita come previsto con 5 test passati e 1
  fallito; il caso di fallback ha ricevuto `api.simple-chat.test:8443`.
- Build frontend CI-equivalente isolata `simple-chat-iss005`: riuscita.
- RED CI-equivalente isolato: 5 test passati e 1 fallito nello stesso caso.
- GREEN CI-equivalente isolato: 6 test passati.
- Suite frontend CI-equivalente: 16 file e 90 test passati.
- `pnpm lint`: riuscito.
- `pnpm typecheck`: riuscito.
- `pnpm build`: riuscito con compilazione, TypeScript e pagine statiche
  completati.
- Cleanup: riuscito con rimozione di rete e volumi del solo progetto
  `simple-chat-iss005`.
- Workflow GitHub Actions `36446125369`: concluso con `success` sullo SHA
  `bb9066d89ab0bdd865f35d365f75d324d84826ca`; `backend`, `frontend` e
  `Realtime Compose E2E` sono tutti `completed/success`.

## Problemi residui

- Nessun problema residuo nello scope di M7-002; M7-003 resta da attivare
  separatamente.

## Riepilogo finale

La precondizione del test Echo e' ora isolata nel solo caso di fallback con
tre `vi.stubEnv(..., undefined)` prima dell'import di `echo.ts`. Le verifiche
locali CI-equivalenti e il workflow GitHub Actions sullo SHA
`bb9066d89ab0bdd865f35d365f75d324d84826ca` sono riusciti; M7-002 e' completato
e M7-003 non e' stato avviato.
