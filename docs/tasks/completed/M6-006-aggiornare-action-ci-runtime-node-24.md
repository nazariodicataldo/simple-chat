# M6-006 — Aggiornare le action CI al runtime Node 24

- **Stato:** completato
- **Milestone:** Milestone 6 — Test end-to-end e CI
- **Data di apertura:** 2026-09-18
- **Data di chiusura:** 2026-09-19
- **Dipendenze:** M6-003, M6-005

## Contesto

Il workflow e' verde, ma GitHub segnala che `actions/setup-node@v4.4.0` e
`actions/upload-artifact@v4.6.2` usano il runtime action Node 20, prossimo alla
dismissione. Questo runtime appartiene alle action eseguite dal runner e non e'
la versione Node `24.19.0` installata da `setup-node` per i comandi frontend.

`actions/checkout` e' gia' pin a `v7.0.1` con SHA
`3d3c42e5aac5ba805825da76410c181273ba90b1` e dichiara `runs.using: node24`,
quindi non richiede modifiche.

La verifica sui repository ufficiali del 2026-09-18 ha individuato:

- `actions/setup-node@v7.0.0`, SHA
  `820762786026740c76f36085b0efc47a31fe5020`, con runtime `node24` e supporto
  alla sintassi semver usata per installare Node `24.19.0`;
- `actions/upload-artifact@v7.0.1`, SHA
  `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`, con runtime `node24` e gli input
  `name`, `path` e `if-no-files-found` gia' usati dal workflow.

Le action non devono avere lo stesso major tra loro: la compatibilita' dipende
dal runner e dai rispettivi input, non dalla versione di `checkout`. I run
verdi correnti con `checkout@v7.0.1` dimostrano inoltre che il runner GitHub
hosted soddisfa gia' il requisito per eseguire action basate su Node 24.

## Obiettivo

Eliminare i warning di dismissione Node 20 aggiornando soltanto `setup-node` e
`upload-artifact` a release ufficiali con runtime Node 24, mantenendo SHA
immutabili e comportamento del workflow invariato.

## Fuori scope

- Modifiche alla versione Node `24.19.0` del progetto o all'immagine frontend.
- Aggiornamento di `actions/checkout`, gia' su `v7.0.1` e Node 24.
- Correzione dei warning PHPUnit sul `.env` assente: sono attribuiti al
  bootstrap Laravel/phpdotenv e non bloccano la suite.
- Diagnosi o correzione della race Reverb sulla tabella `cache`, da trattare in
  un task separato dopo aver raccolto un log che ne confermi lo stato attuale.
- Refactor del workflow, cache aggiuntive, nuove action o modifiche ai job.

## File modificabili

- `.github/workflows/ci.yml`, limitatamente ai due pin e ai commenti di
  versione di `setup-node` e `upload-artifact`.
- Questo task e `docs/project/current-state.md` per registrare stato ed
  evidenze.

## File non modificabili

- Codice applicativo, test, dipendenze e lockfile backend/frontend.
- File Compose, configurazione Playwright, TLS e topologia dei job.
- Pin di `actions/checkout`.

## Requisiti

- `setup-node` usa lo SHA completo di `v7.0.0` e continua a installare
  esattamente Node `24.19.0`.
- `upload-artifact` usa lo SHA completo di `v7.0.1` e conserva nome, path,
  condizione `failure()` e `if-no-files-found` correnti.
- Tutte le action restano pin a SHA immutabili con release annotata.
- Nessun comando, trigger, permesso o comportamento dei job viene cambiato.

## Strategia di test

Verificare prima tag, SHA e `runs.using: node24` nei repository ufficiali.
Applicare poi i soli due pin, validare il workflow e controllare il diff.
Infine eseguire il workflow GitHub sul commit e verificare che tutti i job
restino verdi e che i warning Node 20 delle due action non compaiano piu'.

## Comandi da eseguire

- `git status --short`
- `git ls-remote --tags https://github.com/actions/setup-node.git refs/tags/v7.0.0`
- `git ls-remote --tags https://github.com/actions/upload-artifact.git refs/tags/v7.0.1`
- Validazione YAML del workflow
- Controllo statico degli SHA completi e dei due `runs.using: node24`
- Run GitHub Actions sul commit della modifica
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [x] `setup-node` e `upload-artifact` usano gli SHA ufficiali concordati e
  dichiarano runtime Node 24.
- [x] `checkout@v7.0.1`, Node progetto `24.19.0`, input artifact, trigger,
  permessi e struttura dei job restano invariati.
- [x] Il workflow completo termina con successo sul commit della modifica.
- [x] Nei log non compaiono piu' i warning di dismissione Node 20 relativi a
  `setup-node` e `upload-artifact`.

## Rischi e assunzioni

`setup-node@v7` e `upload-artifact@v7` sono major upgrade, ma lo scope usa solo
input ancora documentati dalle release correnti. La verifica remota resta
necessaria per provare il comportamento effettivo del runner e non puo' essere
sostituita dal solo parsing YAML.

## Verifica manuale

1. Aprire il run GitHub Actions del commit.
2. Controllare che checkout, setup Node e upload diagnostica mostrino le
   release annotate nel workflow.
3. Verificare Node `24.19.0`, esito di tutti i job e assenza dei due warning
   Node 20.

## Decisioni emerse

- La manutenzione delle action resta separata da M6-005, perche' non ha
  contribuito al crash Turbopack o alla stabilizzazione Webpack.
- La race Reverb/cache non viene combinata con questo upgrade.

## File modificati

- `.github/workflows/ci.yml`: pin immutabili di `setup-node@v7.0.0` e
  `upload-artifact@v7.0.1`, con commenti di release aggiornati.
- `docs/project/current-state.md`: stato dell'implementazione e verifica remota.
- Questo task: criteri e risultati aggiornati.

## Risultati dei controlli

- `git status --short`: eseguito prima delle modifiche; erano gia' presenti
  variazioni documentali e lo spostamento dei task M6-004/M6-005 verso
  `completed/`, oltre a questo task attivo non tracciato.
- `git ls-remote --tags` sui repository ufficiali: superato; i tag risolvono a
  `820762786026740c76f36085b0efc47a31fe5020` e
  `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`.
- I manifest ufficiali di `setup-node@v7.0.0` e
  `upload-artifact@v7.0.1` dichiarano `runs.using: node24`.
- Parser YAML PyYAML: superato. `actionlint` e Ruby non sono disponibili
  nell'ambiente locale.
- Controllo statico: superato; restano `checkout@v7.0.1` in tre job, Node
  `24.19.0`, input artifact, `failure()` e `if-no-files-found: ignore`.
- `git diff --check`: superato. `git diff --stat` e revisione del diff:
  eseguiti.
- Run GitHub Actions `35434871868`: superato sul commit
  `7d77c28f41e5741b88561d976a0b1c67d499795a`; `Realtime Compose E2E`,
  `frontend` e `backend` sono terminati con successo.
- Verifica log: la ricerca di `node.js 20`, `node20` e `deprecat` non mostra
  warning delle action; le sole righe `deprecation` presenti riguardano nomi
  di pacchetti Composer (`symfony/deprecation-contracts` e
  `doctrine/deprecations`).

## Problemi residui

- Il warning PHPUnit e la race Reverb/cache restano fuori scope e documentati
  nello stato progetto.

## Riepilogo finale

I due pin sono stati implementati, verificati localmente e confermati dal run
GitHub completo sul commit della modifica. I warning Node 20 delle due action
non compaiono nei log; il task e' completato.
