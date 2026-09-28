# ISS-005 — Isolare il test Echo dalle variabili Compose della CI

- **Stato:** risolta
- **Priorita':** alta
- **Area:** frontend, test Echo, GitHub Actions
- **Data di apertura:** 2026-09-28
- **Data di chiusura:** 2026-09-28
- **Task collegato:** [M7-001](../tasks/completed/M7-001-costruire-immagine-production-unificata.md),
  [M7-002](../tasks/completed/M7-002-isolare-test-echo-variabili-compose-ci.md)
- **ADR collegato:** nessuno

## Contesto

M7-001 ha introdotto il fallback same-origin del client Echo quando host,
porta e schema Reverb non sono variabili pubbliche disponibili nella build
production. Dopo il commit del task, il job frontend della pipeline GitHub
Actions ha rilevato un fallimento nel test di questo fallback.

## Comportamento osservato

Il test si aspetta che Echo usi l'origine JSDOM
`https://chat.example.test/`, quindi host `chat.example.test`, porta `443` e
TLS attivo. Nel container Compose della CI, Echo riceve invece la
configurazione pubblica esplicita del profilo locale:

- host `api.simple-chat.test`;
- porta `8443`;
- schema `https`.

Il comportamento applicativo rispetta quindi la precedenza prevista per le
variabili esplicite, ma l'asserzione del test fallisce.

## Riproduzione

Da `frontend/`, eseguire il test mirato fornendo gli stessi valori presenti
nel servizio Compose:

```bash
env NEXT_PUBLIC_REVERB_HOST=api.simple-chat.test \
  NEXT_PUBLIC_REVERB_PORT=8443 \
  NEXT_PUBLIC_REVERB_SCHEME=https \
  corepack pnpm exec vitest run lib/echo.test.ts --maxWorkers=1
```

La riproduzione minima nel profilo Compose locale e':

```bash
docker compose --env-file compose.env run --rm --no-deps frontend pnpm test
```

La verifica locale equivalente al job CI unisce invece i due file Compose e
usa l'env file versionato dal workflow:

```bash
docker compose --project-name simple-chat-iss005 \
  -f compose.yaml \
  -f compose.ci.yaml \
  --env-file compose.env.example \
  run --rm --no-deps frontend pnpm test
```

## Evidenza

- Il job GitHub Actions frontend ha eseguito 16 file e 90 test: 15 file sono
  passati e uno e' fallito; 89 test sono passati e uno e' fallito.
- Il solo test fallito e'
  `uses the HTTPS browser origin when production Reverb values are not public build variables`.
- La chiamata Echo osservata usa `api.simple-chat.test:8443`, gli stessi valori
  dichiarati per il servizio frontend in `compose.yaml`.
- La riproduzione mirata con queste tre variabili presenti ha prodotto un test
  fallito e cinque superati, con la stessa differenza osservata in CI.
- La stessa suite mirata, con host, porta e schema realmente assenti, ha
  superato tutti i sei test.

## Impatto

Il difetto blocca il job frontend e quindi impedisce alla pipeline di
concludersi con successo. Non dimostra un errore runtime di Echo: il client sta
usando correttamente le variabili esplicite ricevute dal profilo Compose.

M7-002 e' il task prioritario che risolve ISS-005 prima di avviare M7-003.

## Causa

**Confermata.** Il test dichiara di verificare il caso in cui
`NEXT_PUBLIC_REVERB_HOST`, `NEXT_PUBLIC_REVERB_PORT` e
`NEXT_PUBLIC_REVERB_SCHEME` non sono definite, ma non rende esplicita questa
precondizione. `vi.unstubAllEnvs()` ripristina i valori originali del processo;
nel container della CI ripristina quindi proprio le variabili fornite da
Compose.

## Decisione e scope

L'issue e' emersa dopo il completamento di M7-001, che resta chiuso. M7-002 e'
il task completato dedicato alla risoluzione; M7-003 non viene avviato senza
una nuova attivazione esplicita.

La correzione e' stata limitata al setup del caso interessato in
`frontend/lib/echo.test.ts`, rendendo esplicitamente assenti le tre variabili
prima dell'import del modulo. Restano fuori scope:

- `frontend/lib/echo.ts`;
- `compose.yaml` e gli override Compose;
- `.github/workflows/ci.yml`;
- modifiche ad altri test o refactor non necessari.

Non serve un ADR, perche' la correzione riguarda l'isolamento di un test e non
introduce una decisione architetturale.

## Risoluzione applicata

M7-002 ha applicato la correzione impostando a `undefined`, tramite `vi.stubEnv`,
host, porta e schema Reverb nel solo test del fallback same-origin. La modifica
e' stata applicata prima dell'import di `echo.ts`, senza cambiare le
aspettative ne' il comportamento applicativo.

## Verifica

ISS-005 potra' essere dichiarata completata, corretta e risolta soltanto quando
tutte le verifiche seguenti saranno riuscite:

1. test mirato `frontend/lib/echo.test.ts` verde nell'ambiente locale isolato
   CI-equivalente, dopo aver registrato il RED con lo stesso comando;
2. suite frontend completa, lint, typecheck e build verdi nello stesso
   ambiente CI-equivalente;
3. intero workflow GitHub Actions verde sullo SHA della correzione; il job
   frontend resta la prova diretta del difetto ISS-005.

Un esito parziale non e' sufficiente a chiudere l'issue. Per ogni verifica
dovranno essere registrati comando o run, ambiente ed esito effettivo.

Verifiche locali eseguite il 2026-09-28: RED isolato 5/6, GREEN isolato 6/6,
suite frontend 16 file e 90 test, lint, typecheck, build Next e cleanup del
project `simple-chat-iss005` riusciti. Il workflow GitHub Actions `36446125369`
e' concluso con `success` sullo SHA
`bb9066d89ab0bdd865f35d365f75d324d84826ca`; i job `backend`, `frontend` e
`Realtime Compose E2E` sono tutti verdi.

## File coinvolti o modificati

Documentazione aggiornata:

- `docs/issues/ISS-005-isolare-test-echo-variabili-compose-ci.md`
- `docs/issues/README.md`

File corretto:

- `frontend/lib/echo.test.ts`

## Problemi residui

- Nessun problema residuo per ISS-005.

## Riepilogo finale

Il test del fallback Echo ora isola esplicitamente l'assenza delle variabili
pubbliche Reverb e supera le verifiche locali CI-equivalenti. Il workflow
GitHub Actions e' verde sullo stesso SHA della correzione; ISS-005 e' risolta.
