# Runbook operativo — deployment Render

Questo documento descrive la procedura manuale per la demo pubblica di Simple
Chat. Usa placeholder, non secret e non dipende dalla posizione grafica dei
pulsanti del Dashboard. Le azioni su GitHub, Render, Neon e Upstash sono
eseguite dall'operatore, un passo alla volta; dopo ogni comando o schermata si
conservano soltanto esiti sanitizzati.

## Vincoli e fonti correnti

Il risultato è una demo Free senza SLA, non produzione durevole. Il 12 ottobre
2026 le fonti ufficiali riportavano:

- [Render Free](https://render.com/docs/free): web service con 512 MB, spin-down
  dopo 15 minuti, circa un minuto per il risveglio e 750 ore Free mensili;
  [log Render](https://render.com/docs/logging): retention Hobby di 7 giorni;
- [Neon Free](https://neon.com/blog/neon-free-plan-1-gb-per-project): 1 GB di
  storage per progetto e 100 CU-ore mensili;
- [Upstash Redis Free](https://upstash.com/pricing/redis): 256 MB, 500.000
  comandi mensili e 10 GB di banda.

Se le fonti ufficiali cambiano in modo incompatibile con zero euro e nessuna
carta, fermare il percorso e registrare la decisione. Non aggiungere keep-alive,
un provider diverso o un piano a pagamento.

## Mappa della procedura

```text
CI verde
  -> scelta SHA
  -> deploy manuale se necessario
  -> stato Live
  -> /up e /
  -> login/logout e Playwright
  -> log e metriche
  -> controllo backup
  -> evidenze finali
```

## 1. Prima configurazione — una sola volta

### Prerequisiti

Verificare di avere:

- account GitHub, Render, Neon e Upstash senza metodo di pagamento;
- repository GitHub e branch `master` già disponibili;
- CI verde sui job `backend`, `frontend` e `Realtime Compose E2E`;
- accesso al repository senza inserire token o password in questo documento;
- regione concordata `frankfurt` e piano Free.

Annotare gli identificativi non sensibili in un registro locale privato:

```text
RENDER_SERVICE_ID=<service-id>
RENDER_PUBLIC_URL=https://<service>.onrender.com
NEON_PROJECT_ID=<neon-project-id>
UPSTASH_DATABASE_ID=<upstash-database-id>
```

### Provider e Blueprint

1. Creare o selezionare il progetto Neon in regione compatibile e PostgreSQL
   17, mantenendo autosuspend/scale-to-zero per il piano Free. Copiare il
   valore `DB_URL` soltanto nel campo secret di Render; non incollarlo in Git,
   shell history, issue o chat.
2. Creare un solo database Upstash Redis Free in AWS Francoforte, con TLS,
   eviction e auto-upgrade coerenti con il contratto del progetto. Copiare il
   valore `REDIS_URL` soltanto nel campo secret di Render.
3. Importare `render.yaml` come Blueprint nel repository GitHub, selezionando
   `master`, regione `frankfurt` e piano `free`.
4. Verificare che Auto Sync e Auto-Deploy siano disattivati. Un push non deve
   avviare un deploy senza scelta manuale.
5. Compilare soltanto i secret richiesti dal Blueprint: `APP_KEY`, `DB_URL` e
   `REDIS_URL`. `REVERB_APP_SECRET` viene generato da Render; non sostituire
   secret già funzionanti senza un motivo documentato.
6. Attendere il primo sync e verificare che il servizio Docker abbia `/up` come
   health check, il sottodominio Render attivo e una sola risorsa web.

Condizione di arresto: secret mancanti, piano/regione errati, Auto-Deploy
attivo, carta richiesta, sync fallito o valori presenti nei log. Non procedere
al deploy finché il problema non è chiarito.

## 2. Deploy manuale ordinario

### 2.1 Scegliere e verificare lo SHA

Lo SHA Render e lo SHA di verifica hanno ruoli diversi:

```text
SHA_RUNTIME_RENDER=<sha costruito ed eseguito dal servizio>
SHA_VERIFICA=<sha dal quale partono CI e audit>
GITHUB_RUN_ID=<run completo sullo SHA_VERIFICA>
```

Prima di scegliere il candidato:

1. confrontare `SHA_RUNTIME_RENDER` e `SHA_VERIFICA`;
2. leggere i file cambiati tra i due SHA;
3. cercare nuove migration in `backend/database/migrations/`;
4. associare la prova CI allo `SHA_VERIFICA`, non a una run storica su un altro
   commit.

Una differenza soltanto documentale o di strumenti di verifica non richiede un
nuovo deploy. Se cambia codice, Dockerfile, Blueprint o configurazione runtime,
selezionare il candidato e pianificare il deploy manuale.

### 2.2 CI e migration

Nel run GitHub completo registrare solo:

```text
GITHUB_RUN_ID=<id>
GITHUB_SHA=<sha>
backend=success
frontend=success
Realtime Compose E2E=success
```

Una run parziale o uno SHA diverso non è sufficiente.

Prima di avviare il deploy, applicare questa decisione alle migration trovate
nel candidato:

- nessuna migration nuova: il deploy può proseguire;
- migration additiva compatibile con entrambe le versioni: documentare la
  compatibilità per quello SHA e proseguire solo dopo averla verificata;
- rename, drop, cambio tipo o altra migration incompatibile: fermare il deploy
  e preparare un task dedicato.

### 2.3 Dashboard e readiness

Nel Dashboard Render selezionare manualmente il commit candidato soltanto dopo
la CI verde e la decisione sulle migration. Avviare il deploy e attendere lo
stato `Live`. Registrare orari Europe/Rome, SHA mostrato, stato finale e durata
approssimativa; non salvare screenshot o payload.

Il container production esegue `php artisan migrate --force` prima dei processi.
Un deploy in stato `Live` senza migration riuscita non è accettato.

### 2.4 Smoke pubblico senza credenziali

Sostituire `<render-service>` con il solo host pubblico, senza slash finale:

```sh
curl --fail --silent --show-error \
  -H 'Accept: application/json' \
  https://<render-service>.onrender.com/up
curl --fail --silent --show-error \
  https://<render-service>.onrender.com/
```

`/up` prova Nginx verso Laravel e, con l'header JSON, deve restituire uno stato
`up`; `/` prova Nginx verso Next. Nessuno dei due prova queue, Horizon, Redis,
Reverb o WebSocket. Se il primo `/up` mostra il cold start, registrarlo e
attendere il risultato del percorso previsto; non indebolire TLS, timeout o
retry e non forzare uno spin-down.

### 2.5 Login/logout e Playwright

L'operatore usa manualmente un account di prova già esistente, senza comunicare
credenziali. Verificare login, caricamento della chat e logout dalla UI. Un
fallimento interrompe la sequenza.

Poi, dal computer dello sviluppatore e dalla directory `frontend/`, eseguire una
sola run production:

```sh
PLAYWRIGHT_BASE_URL=https://<render-service>.onrender.com corepack pnpm e2e
```

Il test deve usare TLS rigoroso, zero retry, due BrowserContext, due
registrazioni dalla UI, subscription privata e CREATE/UPDATE/DELETE realtime
senza refresh. Il cleanup elimina i messaggi dalla UI con soft delete; gli
utenti sintetici possono restare su Neon. Un fallimento ferma il percorso:
non rilanciare automaticamente, non eseguire SQL/Tinker e non cancellare dati
direttamente.

### 2.6 Log, metriche ed evidenze

Definire la finestra da readiness a controllo dopo il cleanup Playwright.
Leggere nel Live Tail e nelle metriche soltanto quella finestra e registrare:

```text
FINESTRA_EUROPE_ROME=<inizio/fine>
PLAYWRIGHT=<passed/failed + durata>
RENDER_STATUS=<Live o altro>
MEMORIA=<valore approssimativo se esposto>
ERRORI_RILEVATI=<nessuno oppure descrizione sanitizzata>
```

Cercare `BACKOFF`, `FATAL` reale, restart, OOM, `Killed`, errori Neon, Redis o
Reverb. Il nome del listener Supervisor che contiene `FATAL` non è da solo un
errore. Dichiarare assenza di problemi soltanto per i log letti e la finestra
osservata; non copiare log completi, token, cookie o dati utenti.

## 3. Rollback del codice

Un rollback Render ridistribuisce `SHA_PRECEDENTE`, ma non annulla lo schema o
i dati già modificati in Neon.

1. fermare il percorso se il candidato contiene migration incompatibili;
2. senza migration nuove, ridistribuire manualmente `SHA_PRECEDENTE`;
3. con migration additive, procedere soltanto se entrambe le versioni sono
   compatibili e la compatibilità è documentata per il caso concreto;
4. con rename, drop, cambi tipo o trasformazioni distruttive, fermarsi e usare
   un piano dedicato.

Non usare il generico `php artisan migrate:rollback --force`: potrebbe rimuovere
migration condivise con il codice attivo e non rappresenta un rollback sicuro.

## 4. Backup e restore

Seguire il task completato
[M7-008](../tasks/completed/M7-008-verificare-backup-ripristino-neon.md) per la
procedura manuale con `pg_dump`, `pg_restore`, endpoint direct Neon,
`sslmode=verify-full`, restore atomico e container PostgreSQL isolato.

Il dump del 10 ottobre 2026 è un punto di recupero datato e verificato, non un
backup aggiornato né un rollback automatico. Ripristinarlo può perdere i dati
creati dopo quella data. Prima di riutilizzarlo controllare progetto/database,
presenza fuori Git, directory `700`, file `600`, checksum valido e assenza di
migration pertinenti nuove. Se uno di questi controlli fallisce, fermare il
percorso e decidere se produrre un nuovo dump.

## Scheda finale di evidenza

Compilare questa scheda fuori dal repository oppure nel task, senza secret,
payload, screenshot, log completi o dati personali:

```text
DATA_EUROPE_ROME=<yyyy-mm-dd>
SHA_RUNTIME_RENDER=<...>
SHA_VERIFICA=<...>
GITHUB_RUN_ID=<...>
RENDER_STATUS=<...>
HEALTH_UP=<...>
ROOT_NEXT=<...>
LOGIN_LOGOUT=<...>
PLAYWRIGHT_PRODUCTION=<...>
LOG_METRICHE_FINESTRA=<...>
BACKUP_M7_008=<...>
PROBLEMI_RESIDUI=<...>
```

Chiudere M7-009 e la Milestone 7 soltanto quando ogni criterio del task ha
un'evidenza fresca e coerente. Il risultato finale va descritto come demo
pubblica Free, con container unico, quote, cold start, backup manuale e nessuno
SLA.
