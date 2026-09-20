# M6-007 — Eliminare la race Reverb/cache nell'avvio Compose

- **Stato:** attivo
- **Milestone:** Milestone 6 — Test end-to-end e CI
- **Data di apertura:** 2026-09-19
- **Data di chiusura:**
- **Dipendenze:** M5-002, M5-004, M6-005

## Contesto

Il commit `1a66eacd406332e71488d1dd52a2fe921f530279` ha aggiunto al job
`Realtime Compose E2E` un controllo non bloccante sui log Reverb. Il successivo
run GitHub e' rimasto verde, ma il controllo ha rilevato questa query eseguita
prima della creazione della tabella `cache`:

```text
SQLSTATE[42P01]: Undefined table: 7 ERROR: relation "cache" does not exist
SQL: select * from "cache" where "key" in (laravel-cache-laravel:reverb:restart)
```

La causa e' nell'ordine di bootstrap Compose. `backend` e `reverb` dipendono
direttamente dalla salute di PostgreSQL e Redis e possono partire in
concorrenza. Solo l'entrypoint del backend esegue `php artisan migrate --force`
prima di avviare PHP-FPM; PostgreSQL healthy indica che il database accetta
connessioni, non che le migration Laravel siano terminate.

Reverb usa il cache store `database` e legge subito il segnale
`laravel:reverb:restart`. L'attuale verifica dei container prima di Playwright
puo' rilevare un servizio non disponibile, ma non impone l'ordine migration →
Reverb e non considera bloccante la race quando lo stack riesce a recuperare.

## Obiettivo

Rendere deterministico l'avvio Compose facendo partire Reverb soltanto dopo il
completamento riuscito delle migration del backend, e rendere bloccante in CI
la ricomparsa anche singola dell'errore sulla tabella `cache`.

## Fuori scope

- Cambiare `CACHE_STORE` da database a Redis o modificare la semantica della
  cache applicativa.
- Introdurre un servizio migration separato o eseguire migration concorrenti
  da Reverb e Horizon.
- Aggiungere `sleep`, retry ciechi o una soglia che tolleri alcune occorrenze
  della race.
- Modificare API, schema applicativo, test funzionali o dipendenze.
- Intervenire sul workaround Webpack CI o sulla causa Turbopack `/app/app`.
- Refactor non necessari del workflow, dell'entrypoint o della topologia
  Compose.

## File modificabili

- `compose.yaml`, limitatamente all'healthcheck del backend e alla dipendenza
  di Reverb dal backend healthy.
- `.github/workflows/ci.yml`, limitatamente al controllo della race Reverb/cache.
- Questo task e `docs/project/current-state.md` per registrare stato ed
  evidenze.

## File non modificabili

- `compose.ci.yaml`.
- `docker/backend/entrypoint.sh`: l'ordine migration → PHP-FPM esistente e' il
  contratto usato dalla correzione.
- Codice applicativo, migration, test e lockfile backend/frontend.
- Configurazione Playwright, Nginx, TLS e comando frontend.

## Requisiti

- Il backend dispone di un healthcheck che verifica la disponibilita' di
  PHP-FPM sulla porta interna `9000`.
- L'healthcheck sfrutta l'ordine gia' garantito dall'entrypoint: con `set -e`,
  PHP-FPM puo' partire soltanto dopo il completamento riuscito di
  `php artisan migrate --force`.
- `reverb` dipende da `backend` con `condition: service_healthy`, oltre alle
  dipendenze necessarie gia' presenti.
- Horizon conserva la dipendenza gia' esistente da Reverb healthy e attende
  quindi il backend healthy in modo transitivo: backend → Reverb → Horizon.
- Se le migration falliscono, il backend non diventa healthy e Reverb non
  viene avviato.
- `start_period`, intervallo, timeout e retry dell'healthcheck tollerano il
  bootstrap piu' lento osservato nei cold start locali e in CI. La finestra
  viene calibrata con misure reali durante il task, usando i 180 secondi del
  workflow come riferimento di scala, non fissata con numeri arbitrari prima
  delle prove.
- Il controllo CI dei log Reverb conserva `if: ${{ always() }}`.
- Anche una sola occorrenza di `relation "cache" does not exist` produce
  un'annotazione di errore e termina lo step con esito non zero.
- L'impossibilita' di leggere i log Reverb rende la verifica non superata e
  termina lo step con esito non zero.
- La tolleranza ai runner lenti resta nella healthcheck; il controllo finale
  non tollera alcuna occorrenza della race.
- Il controllo pre-Playwright sullo stato dei servizi resta una rete di
  sicurezza distinta e non viene rimosso.

## Strategia di test

Validare prima la configurazione Compose risolta e verificare che Reverb
dipenda dal backend healthy. Eseguire poi tre cold start sequenziali con nomi
progetto Compose distinti e volumi usa-e-getta: ogni ciclo deve partire da un
database vuoto, misurare il tempo necessario al backend per diventare healthy
e controllare stato e log dei servizi. I volumi locali abituali del progetto
non devono essere rimossi.

In ciascun ciclo verificare che backend, Reverb e Horizon raggiungano lo stato
previsto e che i log Reverb e Horizon non contengano l'errore sulla tabella
`cache`. Nell'ultimo ciclo eseguire anche Playwright contro lo stack HTTPS/WSS
reale. Infine eseguire il workflow GitHub completo su un checkout pulito: il
job deve restare verde e il controllo bloccante con `always()` deve confermare
l'assenza della race nei log Reverb.

I tre cold start sono una verifica specifica di M6-007, non un nuovo requisito
per ogni normale avvio dell'applicazione. La garanzia principale resta la
dipendenza strutturale Compose; le ripetizioni verificano che il comportamento
runtime corrisponda alla configurazione.

I cold start locali usano il file reale e ignorato `compose.env`; il workflow
GitHub continua invece a usare `compose.env.example`, disponibile nel checkout
pulito e contenente soltanto valori fittizi.

## Comandi da eseguire

- `git status --short`
- `docker compose --env-file compose.env config --quiet`
- Ispezione della configurazione risolta per healthcheck backend e
  `reverb.depends_on.backend.condition`.
- Tre cicli sequenziali `docker compose --project-name simple-chat-m6-007-N
  --env-file compose.env up -d --build`, ciascuno con un valore `N` distinto e
  con verifica di health, tempi e log.
- Al termine di ogni ciclo, cleanup del solo progetto isolato
  `simple-chat-m6-007-N` con `down -v --remove-orphans`, dopo averne verificato
  esplicitamente nome e container.
- `cd frontend && corepack pnpm e2e` nell'ultimo cold start.
- Run GitHub Actions completo sul commit della modifica.
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [x] La configurazione risolta mostra un healthcheck backend sulla porta
  `9000` e `reverb → backend: service_healthy`.
- [x] Un fallimento delle migration impedisce al backend di diventare healthy
  e a Reverb di partire.
- [x] Tre cold start isolati con database e volumi nuovi raggiungono backend e
  Reverb healthy e Horizon running, senza `relation "cache" does not exist`
  nei log Reverb o Horizon.
- [ ] I tempi osservati giustificano i parametri finali dell'healthcheck sia
  per il percorso locale, che include Composer a volume vuoto, sia per quello
  CI con dipendenze gia' installate e `SKIP_COMPOSER_INSTALL=true`.
- [x] Playwright supera lo scenario HTTPS/WSS reale nell'ultimo cold start.
- [x] Il controllo CI conserva `always()`, fallisce alla prima occorrenza della
  race e fallisce se i log Reverb non sono leggibili.
- [ ] Il workflow GitHub completo termina con successo e il controllo
  bloccante conferma l'assenza della race.
- [x] I volumi locali abituali non vengono eliminati e non sono introdotte
  modifiche fuori scope.

## Rischi e assunzioni

La porta FastCGI `9000` non verifica direttamente la tabella `cache` e
`fsockopen` dimostra soltanto che il socket TCP e' in ascolto, non che un worker
abbia gia' servito una richiesta FastCGI completa. Per M6-007 resta una barriera
valida finche' l'entrypoint conserva l'ordine migration → PHP-FPM e `set -e`;
la readiness applicativa completa viene verificata successivamente tramite
HTTPS e Playwright. Questo confine deve restare esplicito nel task e nella
configurazione.

Una finestra healthcheck troppo breve produrrebbe timeout sui bootstrap lenti;
una finestra molto lunga ritarderebbe inutilmente la diagnosi di un backend
guasto. I parametri finali devono quindi derivare dai tempi osservati, con un
margine documentato. Un runner lento puo' causare attesa o timeout, ma non deve
mai rendere accettabile la race.

I cold start usano progetti Compose isolati per rendere nuova la tabella
PostgreSQL a ogni ciclo. Riavviare tre volte lo stesso volume non sarebbe una
prova equivalente, perche' dopo il primo avvio la tabella `cache` esisterebbe
gia'.

## Verifica manuale

1. Controllare nella configurazione risolta che Reverb attenda il backend
   healthy.
2. Per ciascun progetto temporaneo, osservare l'ordine degli eventi: migration
   completate, PHP-FPM disponibile, backend healthy, avvio Reverb.
3. Controllare i log completi di Reverb e Horizon e lo stato dei container
   prima del cleanup.
4. Nell'ultimo ciclo eseguire lo scenario Playwright realtime.
5. Nel run GitHub verificare esito del job e output del controllo anti-race,
   incluso il suo comportamento `always()`.

## Decisioni emerse

- La correzione appartiene al `compose.yaml` comune, perche' la race deriva
  dalla topologia condivisa e non e' esclusiva della CI.
- Il backend resta l'unico proprietario delle migration.
- La readiness di PHP-FPM e' usata come barriera successiva alle migration,
  evitando un nuovo servizio migration.
- Horizon resta protetto transitivamente dalla dipendenza gia' esistente da
  Reverb healthy; non viene aggiunta una dipendenza diretta ridondante.
- La pazienza per ambienti lenti appartiene alla healthcheck; la detection
  finale resta binaria e bloccante.
- I tre cold start appartengono soltanto alla verifica di M6-007.

## File modificati

- `compose.yaml`: aggiunto il healthcheck PHP-FPM del backend con finestra
  `start_period=60s`, `interval=5s`, `timeout=5s`, `retries=24`; Reverb attende
  il backend healthy.
- `.github/workflows/ci.yml`: il controllo `always()` ora fallisce per log
  Reverb illeggibili o per una sola occorrenza della race, con annotazione
  `::error`.
- `docs/project/current-state.md`: registrate implementazione ed evidenze.
- Questo task: criteri ed evidenze aggiornati; resta attivo finche' manca il run
  GitHub sul nuovo commit.

## Risultati dei controlli

Per ogni comando, registrare esito, durata rilevante e output utile. Se un
controllo non e' eseguibile, indicare comando, motivo, copertura mancante e
istruzione esatta per completarlo.

- `git status --short`: eseguito prima delle modifiche; erano preesistenti la
  modifica a `current-state.md` e il task non tracciato.
- `docker compose --env-file compose.env config --quiet`: riuscito prima e
  dopo la modifica.
- Configurazione risolta: healthcheck backend su `9000`; Reverb dipende da
  `backend: service_healthy`; Horizon conserva la dipendenza da Reverb healthy.
- Baseline `simple-chat-m6-007-0`: fallita dopo 5m07s per la race Composer
  concorrente sul volume `vendor`, problema gia' fuori scope; progetto e volumi
  isolati rimossi.
- Cold start `simple-chat-m6-007-1`: riuscito; Composer 31s, backend healthy
  64s dopo il bootstrap, Reverb healthy, Horizon running, race assente.
- Cold start `simple-chat-m6-007-2`: riuscito; Composer 24s, backend healthy
  56s dopo il bootstrap, Reverb healthy, Horizon running, race assente.
- Cold start `simple-chat-m6-007-3`: riuscito; Composer 26s, backend healthy
  54s dopo il bootstrap, Reverb healthy, Horizon running, race assente.
  Dopo l'attesa di `✓ Ready` e HTTPS, `corepack pnpm e2e` ha superato 2 test in
  15,2s. Il primo tentativo prematuro ha ricevuto `502` durante l'installazione
  iniziale delle dipendenze frontend ed e' stato ripetuto con readiness completa.
- Test negativo `simple-chat-m6-007-failure-3`: riuscito; una tabella `users`
  preesistente ha fatto fallire la migration con `SQLSTATE[42P07]`, backend
  `exited`/`unhealthy` e Reverb `created`, mai avviato.
- Controllo CI in shell: log illeggibili e race hanno restituito `1`, log puliti
  `0`; il controllo conserva `if: ${{ always() }}`.
- `docker compose --env-file compose.env.example -f compose.yaml -f
  compose.ci.yaml config --quiet`: riuscito; Webpack CI e nuovi depends_on
  risolti senza modificare `compose.ci.yaml`.
- `git diff --check`: riuscito.
- Workflow GitHub completo: non eseguito sul nuovo codice. L'ultimo run
  disponibile (`35438910383`) e' sul vecchio SHA
  `1a66eacd406332e71488d1dd52a2fe921f530279`; manca un commit remoto della
  modifica corrente. Per completare questa verifica: creare/pushare il commit
  M6-007 e controllare il job `Realtime Compose E2E` e il controllo anti-race.

## Problemi residui

- La verifica remota sul nuovo commit resta non eseguita; per questo il task
  non viene spostato in `completed`.
- L'avvio con volumi Composer completamente vuoti mantiene la race concorrente
  gia' nota e fuori scope; i tre cold start sono stati eseguiti con installazione
  Composer sequenziale prima dei servizi applicativi.

## Riepilogo finale

La correzione locale e il controllo CI sono implementati e verificati con
configurazione Compose, tre cold start isolati, test negativo migration e
Playwright HTTPS/WSS. Il task resta attivo soltanto per l'evidenza GitHub sul
nuovo commit.
