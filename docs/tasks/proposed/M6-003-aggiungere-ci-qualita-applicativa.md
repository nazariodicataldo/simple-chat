# M6-003 — Aggiungere CI per la qualita' applicativa

- **Stato:** proposta
- **Milestone:** Milestone 6 — Test end-to-end e CI
- **Data di apertura:**
- **Data di chiusura:**
- **Dipendenze:** M5-005

## Contesto

Backend e frontend hanno gia' comandi di verifica distinti, ma non esiste una
GitHub Actions che li esegua dopo push o pull request. Il runtime del progetto
e' Compose, con PHP 8.5 e Node/pnpm fissati dalle immagini Docker; la CI non
deve tornare a Lerd o introdurre versioni implicite del toolchain.

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
- Il toolchain rispetta le versioni e i comandi dichiarati dal repository; se
  la CI usa i container Compose per questo, non deve dipendere da Lerd.
- Backend: `composer test`, Pint in sola verifica e PHPStan con il limite di
  memoria richiesto dal progetto.
- Frontend: `pnpm test`, lint, typecheck e build con lockfile rispettato.
- I job falliscono al primo controllo non superato e non richiedono segreti
  applicativi o credenziali reali.

## Strategia di test

Validare sintassi del workflow, poi eseguirlo tramite `workflow_dispatch` o
push su un branch di prova. Controllare che ogni comando riporti il suo esito e
che una failure sia attribuibile al controllo corretto. M6-004 aggiungera' in
seguito il job E2E reale, senza riscrivere questi controlli.

## Comandi da eseguire

- `git status --short`
- Validatore YAML o actionlint, se disponibile senza aggiungere dipendenze non
  necessarie
- Controlli backend e frontend corrispondenti alla CI, nel runtime deciso dal
  task
- Verifica del workflow su GitHub Actions
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [ ] Esiste un workflow CI essenziale per push su `master`, pull request e
  avvio manuale.
- [ ] Il backend e il frontend eseguono tutti i controlli previsti con output
  distinguibile nel run GitHub.
- [ ] La CI non usa Lerd, dati personali, certificati locali o secret reali.
- [ ] La documentazione indica trigger, job e limiti attuali del workflow.

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
- Il job realtime E2E non e' simulato qui: sara' aggiunto separatamente in
  M6-004 con il Compose completo.

## File modificati

## Risultati dei controlli

## Problemi residui

## Riepilogo finale
