# M6-003 — Aggiungere CI per la qualita' applicativa

- **Stato:** attivo
- **Milestone:** Milestone 6 — Test end-to-end e CI
- **Data di apertura:** 2026-09-15
- **Data di chiusura:**
- **Dipendenze:** M5-005

## Contesto

Backend e frontend hanno gia' comandi di verifica distinti, ma non esiste una
GitHub Actions che li esegua dopo push o pull request. Il runtime del progetto
e' Compose, con PHP 8.5 e Node/pnpm dichiarati dalle immagini Docker; la CI
non deve tornare a Lerd o introdurre un toolchain alternativo implicito.

## Obiettivo

Aggiungere un workflow GitHub Actions essenziale per eseguire i controlli
automatici gia' previsti: test, Pint e PHPStan backend; test, lint, typecheck e
build frontend. Il workflow deve poter essere avviato su push a `master`, pull
request e manualmente.

## Fuori scope

- Playwright, certificati temporanei, host mapping e l'avvio dell'intero stack
  realtime in CI: M6-004.
- Publish di immagini, deploy, cache distribuite, matrix di sistemi/browser,
  badge, notifiche o regole di branch protection.
- Modifiche a codice applicativo, dipendenze di produzione, Lerd e servizi
  esterni o segreti GitHub.

## File modificabili

- `.github/workflows/` per il solo workflow CI essenziale.
- File di supporto CI strettamente necessari e non contenenti segreti.
- Documentazione del workflow e questo task.
- `docs/project/current-state.md` quando il task verra' attivato o completato.

## File non modificabili

- Logica backend/frontend, configurazione di dominio, certificati locali,
  file `.env` locali, Compose di runtime e configurazione di deployment.

## Requisiti

- Il workflow usa revisioni esplicite delle action e controlla il codice del
  commit in esecuzione.
- Il workflow usa due job indipendenti, `backend` e `frontend`, cosi' il log
  attribuisce ogni failure al controllo e al dominio corretti.
- Ogni job costruisce e usa il proprio servizio Compose con
  `compose.env.example` e `run --no-deps`: backend e frontend non richiedono
  PostgreSQL, Redis, Nginx, certificati o servizi realtime per questi
  controlli.
- Le action GitHub sono bloccate a commit SHA immutabili, con il tag di release
  annotato nel file; il workflow espone soltanto il permesso `contents: read`.
- Il toolchain rispetta immagini e comandi dichiarati dal repository e non
  dipende da Lerd.
- Backend: `composer test`, Pint in sola verifica e PHPStan con il limite di
  memoria richiesto dal progetto.
- Frontend: `pnpm test`, lint, typecheck e build con lockfile rispettato.
- I job falliscono al primo controllo non superato e non richiedono segreti
  applicativi o credenziali reali.

## Strategia di test

Validare sintassi del workflow, poi eseguirlo tramite `workflow_dispatch` o
push su un branch di prova. Ogni comando e' uno step distinto del proprio job:
una failure interrompe quel job e rende immediata la sua attribuzione.
M6-004 aggiungera' in seguito il job E2E reale, senza riscrivere questi
controlli.

## Comandi da eseguire

- `git status --short`
- Validatore YAML o actionlint, se disponibile senza aggiungere dipendenze non
  necessarie
- Build e controlli backend/frontend nei rispettivi container Compose, senza
  avviare dipendenze runtime
- Verifica del workflow su GitHub Actions
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [x] Esiste un workflow CI essenziale per push su `master`, pull request e
  avvio manuale.
- [ ] Il backend e il frontend eseguono tutti i controlli previsti con output
  distinguibile nel run GitHub; la struttura e' verificata localmente, ma il run
  remoto non e' ancora disponibile.
- [x] La CI non usa Lerd, dati personali, certificati locali o secret reali.
- [x] La documentazione indica trigger, job e limiti attuali del workflow.

## Rischi e assunzioni

GitHub Actions richiede rete per action, immagini e dipendenze: un timeout o
errore di registry non e' automaticamente un difetto del progetto e va
registrato separatamente. Si assume che il repository remoto `origin` sia
quello su cui l'utente puo' abilitare e osservare Actions.

## Verifica manuale

1. Aprire il run GitHub Actions del commit.
2. Controllare trigger, commit eseguito, versione dei tool e risultati separati
   backend/frontend.
3. Confrontare i comandi con quelli documentati nel repository.

## Decisioni emerse

- La CI iniziale privilegia controlli riproducibili e leggibili; cache e matrix
  restano fuori scope finche' non emerge un costo reale.
- La CI riusa i soli container `backend` e `frontend` gia' dichiarati dal
  repository. I due job non avviano lo stack Compose completo: il test backend
  forza SQLite in memoria e i controlli frontend non chiamano l'applicazione.
- Le action sono pin a SHA completi e immutabili, commentati con la release;
  `permissions` e' limitato a `contents: read`.
- Il job realtime E2E non e' simulato qui: sara' aggiunto separatamente in
  M6-004 con il Compose completo.

## File modificati

- `.github/workflows/ci.yml`: workflow con trigger push `master`, pull request e
  avvio manuale; job indipendenti backend/frontend e action checkout pin a SHA.
- `compose.ci.yaml`: override non applicativo che esclude il certificato locale
  dal servizio frontend mantenendo sorgente, dipendenze e cache; fornisce una
  `APP_KEY` fittizia al backend per i test dei cookie di sessione.
- `docs/learning/github-actions.md`: documentazione del workflow, dei comandi e
  dei limiti attuali.
- `docs/project/current-state.md`: stato corrente e verifica locale aggiornati.

## Risultati dei controlli

- `docker compose --env-file compose.env.example config --quiet` con
  `compose.yaml:compose.ci.yaml`: riuscito; il servizio frontend risultante ha
  i quattro mount necessari e non richiede `.cert`.
- Workflow YAML: validazione con PyYAML riuscita; `actionlint` e `yamllint` non
  sono installati nel workspace.
- `composer test` nel servizio Compose backend con `--no-deps`: 41 test e 213
  assertion riusciti.
- Lo stesso comando CI e' riuscito anche da una copia temporanea del repository
  senza `backend/.env`: 41 test e 213 assertion; il processo ha restituito exit
  code 0.
- `./vendor/bin/pint --test` nel servizio Compose backend: 62 file riusciti.
- `./vendor/bin/phpstan analyse --memory-limit=512M` nel servizio Compose
  backend: riuscito senza errori.
- `pnpm test` nel servizio Compose frontend con `--no-deps`: 15 file e 86 test
  riusciti.
- `pnpm lint`, `pnpm typecheck` e `pnpm build` nel servizio Compose frontend:
  tutti riusciti.
- La verifica GitHub Actions non e' stata ancora eseguita: il workflow corretto
  deve essere pubblicato e avviato su GitHub.

## Problemi residui

- La build Docker backend da immagini fresche e' riuscita dopo il primo blocco
  sandbox e il successivo timeout DNS transitorio verso Docker Hub.
- La copia senza `backend/.env` ha prodotto warning gia' emessi dalla suite per
  riferimenti al file assente, ma nessun test fallito e exit code 0.
- Prima di spostare il task in `completed/` serve un run GitHub Actions del
  commit, verificando trigger, commit controllato, due job e output separato.

## Riepilogo finale

Il workflow CI e il supporto Compose dedicato sono implementati, senza modifiche
al codice applicativo, alle dipendenze o allo stack runtime. La build da immagini
fresche e il test senza `backend/.env` sono verificati; il task resta attivo finche'
non sara' verificato il run remoto.
