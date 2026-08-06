# M0-001 — Configurare il Git ignore del monorepo

- **Stato:** completato
- **Milestone:** Milestone 0 — Preparazione del repository e del workflow
- **Data di apertura:** 2026-08-06
- **Data di chiusura:** 2026-08-06

## Contesto

Il repository Git root e' stato inizializzato dopo l'unione di backend e frontend. Serve una configurazione unica per escludere segreti locali e artefatti rigenerabili prima del primo commit.

## Obiettivo

Creare `.gitignore` nella root del monorepo con regole convenzionali per Laravel/PHP e Next.js/Node, mantenendo versionabili codice, lockfile e file `.env.example`.

## Fuori scope

Modifiche a codice, dipendenze, lockfile, configurazione Laravel/Next.js, Lerd, Docker, CI e file gia' tracciati.

## File modificabili

- `.gitignore`
- `CHANGELOG.md`
- `docs/project/current-state.md`
- Questo task.

## File non modificabili

- `backend/` e `frontend/`, salvo il comportamento delle rispettive regole gia' presenti.

## Requisiti

- Ignorare environment locali, senza ignorare `.env.example`.
- Ignorare dipendenze installate, cache/build output, log e file locali editor/OS.
- Non ignorare `composer.lock`, `package-lock.json`, `pnpm-lock.yaml`, sorgenti o documentazione.

## Strategia di test

Configurazione: verificare le regole con `git check-ignore -v`, verificare che un `.env.example` non sia ignorato e revisionare lo stato Git. Nessun test unitario artificiale.

## Comandi da eseguire

- `git status --short`
- `git check-ignore -v backend/.env backend/.env.example backend/vendor frontend/node_modules frontend/.next`
- `git diff --check`
- `git diff --stat`

## Criteri di accettazione

- [x] `.gitignore` root ignora `.env` e `.env.*`, ma non `.env.example`.
- [x] Artefatti locali Laravel e Next.js sono ignorati.
- [x] Sorgenti e lockfile non sono ignorati.
- [x] Le regole sono verificate con Git e documentate.

## Rischi e assunzioni

- Le regole si applicano solo ai file non tracciati; nessun file gia' tracciato verra' rimosso dall'indice.

## Verifica manuale

- Controllare che `backend/.env` non compaia in `git status` e che `backend/.env.example` possa essere aggiunto intenzionalmente.

## Decisioni emerse

- Il `.gitignore` root integra le convenzioni necessarie al monorepo senza eliminare i `.gitignore` specifici gia' presenti in backend e frontend.

## File modificati

- `.gitignore`
- `CHANGELOG.md`
- `docs/project/current-state.md`
- Questo task.

## Risultati dei controlli

- `git check-ignore -v --no-index`: `backend/.env`, `backend/vendor`, `frontend/node_modules`, `frontend/.next`, log Laravel e `frontend/.env.local` sono ignorati dalle regole root o dalle convenzioni frontend esistenti.
- `git check-ignore -q --no-index` su `backend/.env.example`, `backend/composer.lock`, `frontend/pnpm-lock.yaml` e `backend/app/Models/User.php`: tutti exit code 1, quindi non ignorati.
- `git status --short`: il repository e' ancora interamente non tracciato dopo il recente `git init`; gli artefatti verificati non compaiono come file singoli non/ tracciati.

## Problemi residui

- Prima del primo commit occorre revisionare intenzionalmente tutti i file non tracciati del monorepo.

## Riepilogo finale

Completato. Il monorepo dispone di una regola Git ignore root per segreti locali e artefatti rigenerabili, senza nascondere template di environment, sorgenti o lockfile.
