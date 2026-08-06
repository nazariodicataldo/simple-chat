# M1-002 — Verificare e documentare il bootstrap frontend esistente

- **Stato:** completato
- **Milestone:** Milestone 1 — Chat HTTP autenticata
- **Data di apertura:** 2026-08-06
- **Data di chiusura:** 2026-08-06

## Contesto

Uno skeleton Next.js e' gia' presente in `frontend/`, ma il suo bootstrap non e' ancora stato verificato con i comandi del progetto ne' documentato con evidenze. Il bootstrap dell'app e' il secondo task della Milestone 1.

## Obiettivo

Verificare il solo frontend esistente tramite lint, controllo TypeScript e build, quindi documentare versioni, comandi effettivamente funzionanti e limiti dell'ambiente, senza introdurre funzionalita' della chat.

## Fuori scope

Autenticazione, chat, API Laravel, TanStack Query, PostgreSQL, Docker, CI, Reverb, Redis, queue, Horizon, test runner frontend e modifiche a codice, configurazione, dipendenze o lockfile.

## File modificabili

- Questo task.
- `docs/project/current-state.md`.
- `CHANGELOG.md` soltanto se lo stato documentato cambia al completamento.
- `.nvmrc` nella root del monorepo.

## File non modificabili

- `backend/`.
- `frontend/`, inclusi codice, configurazioni, dipendenze e lockfile.

## Requisiti

- Ispezionare le versioni e gli script effettivamente dichiarati prima di consultare documentazione esterna.
- Eseguire i comandi frontend da `frontend/`, senza assumere servizi esterni.
- Creare `.nvmrc` nella root con il contenuto esatto `v24.19.0`.
- Registrare esattamente comandi, esiti, versione Node/pnpm e limitazioni.
- Documentare che lo skeleton usa Next.js 16.2.6, React 19, TypeScript e App Router, e che non implementa ancora chat, autenticazione o integrazione API.

## Strategia di test

Non introdurre test artificiali: per il bootstrap sono appropriati lint, typecheck e build. Eseguire `nvm use` e poi i comandi in un ambiente con pnpm disponibile; verificare che Node sia `v24.19.0`. Se non eseguibili, registrare motivo, copertura mancante e istruzioni di riproduzione locale.

## Comandi da eseguire

Dalla root del monorepo:

- `nvm use`

Da `frontend/`, dopo `nvm use`:

- `node --version`
- `pnpm --version`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `git status --short`
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [x] Le versioni e gli script frontend effettivamente disponibili sono registrati.
- [x] `.nvmrc` nella root contiene esattamente `v24.19.0` e `nvm use` seleziona tale versione.
- [x] `pnpm lint`, `pnpm typecheck` e `pnpm build` sono eseguiti e il relativo esito e' documentato.
- [x] Nessuna configurazione, dipendenza o funzionalita' di chat e' stata introdotta.
- [x] Le modifiche sono limitate ai file dichiarati.
- [x] Al completamento, `current-state.md` riporta i comandi frontend verificati nella Milestone 1.

## Rischi e assunzioni

- Next.js 16.2.6 richiede Node `>=20.9.0`; il pin `v24.19.0` lo soddisfa.
- nvm non e' caricato automaticamente nella shell. Dopo averlo caricato, il pin Node `v24.19.0` e pnpm `11.20.0` sono disponibili nel runtime selezionato.
- Il monorepo e' interamente non tracciato dopo `git init`; nessun file deve essere messo in staging o committato da questo task.

## Verifica manuale

Da un ambiente con nvm e pnpm, eseguire `nvm use` dalla root, verificare `node --version` uguale a `v24.19.0`, quindi eseguire tutti i comandi indicati da `frontend/` e riportarne l'output completo.

## Decisioni emerse

- Il bootstrap frontend viene verificato come M1-002, dopo il bootstrap backend M1-001, all'inizio della Milestone 1.
- `.nvmrc` nella root fissa Node `v24.19.0`; non viene aggiunta una seconda policy in `package.json` finche' non emerge una necessita' concreta.

## File modificati

- `docs/tasks/completed/M1-002-verifica-bootstrap-frontend.md`.
- `docs/project/current-state.md`.
- `.nvmrc` era gia' presente e contiene invariato `v24.19.0`.

## Risultati dei controlli

- Versioni e script dichiarati: `frontend/package.json` dichiara Next.js `16.2.6`, React e React DOM `19.2.4`, TypeScript `^5`; gli script disponibili sono `dev`, `build`, `start`, `lint`, `format` e `typecheck`.
- Struttura: `frontend/app/layout.tsx` e `frontend/app/page.tsx` confermano l'uso dell'App Router. Lo skeleton mostra solo la pagina iniziale e non implementa chat, autenticazione o integrazione API.
- Primo tentativo dalla root, il 2026-08-06: `nvm use` non era eseguibile nel sandbox (`zsh:1: command not found: nvm`); da `frontend/`, `node --version` restituiva `v18.19.1` e `pnpm --version`, `pnpm lint`, `pnpm typecheck`, `pnpm build` restituivano `zsh: command not found: pnpm`.
- Secondo tentativo dalla root, il 2026-08-06: caricando l'installazione locale di nvm, `nvm use` rileva `.nvmrc` ma restituisce `N/A: version "v24.19.0" is not yet installed.`; suggerisce `nvm install` per installare e usare la versione richiesta. Nella stessa shell, `node --version` restituisce `v24.18.0` e `pnpm --version` restituisce `11.20.0`.
- Terzo tentativo dalla root, il 2026-08-06: dopo l'installazione del pin, `nvm use` riesce (`Now using node v24.19.0 (npm v11.17.0)`) e `node --version` restituisce `v24.19.0`. `pnpm --version` non e' eseguibile in questa installazione (`zsh: command not found: pnpm`). L'ispezione conferma che il binario esiste solo in `~/.nvm/versions/node/v24.18.0/bin/pnpm`, non in `~/.nvm/versions/node/v24.19.0/bin/pnpm`.
- Quarto tentativo, il 2026-08-06, con Node `v24.19.0` e pnpm `11.20.0`: `pnpm lint` termina senza errori ma segnala un warning ESLint esistente in `app/layout.tsx` (`Geist` definito ma non usato); `pnpm typecheck` termina senza output di errore.
- `pnpm build` avvia Next.js `16.2.6` con Turbopack, ma non produce un riepilogo o marker di build completata. Le successive esecuzioni, inclusa una in terminale persistente, terminano con codice `1`: `Another next build process is already running.` Non sono stati rimossi artefatti o lock in `frontend/`, che e' fuori dai file modificabili del task.
- Verifica locale conclusiva dello sviluppatore, il 2026-08-06, con Node `v24.19.0` e pnpm `11.20.0`: `pnpm build` e' riuscito. Next.js `16.2.6` ha compilato in 17.6s, completato TypeScript in 6.8s, raccolto i dati e generato le 4 pagine statiche, incluse `/` e `/_not-found`.

## Problemi residui

- Il warning ESLint esistente su `Geist` non blocca lint. Il fallimento transitorio della build nel sandbox e' stato seguito da una build locale riuscita; non restano blocchi per questo task.

## Riepilogo finale

- Task completato: Node `v24.19.0`, pnpm `11.20.0`, lint, typecheck e build sono verificati. Lo skeleton resta privo di chat, autenticazione e integrazione API, come previsto dallo scope.
