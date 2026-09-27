# M7-004 — Definire il deployment Render con un Blueprint

- **Stato:** proposta
- **Milestone:** Milestone 7 — Deployment
- **Data di apertura:**
- **Data di chiusura:**
- **Dipendenze:** M7-003

## Contesto

L'immagine production e i due datastore esterni sono definiti e verificati. Il
deployment deve ora essere riproducibile senza affidarsi a una sequenza di
click non versionata. Render Blueprints permette di descrivere il web service
in `render.yaml`, lasciando i valori sensibili al Dashboard.

## Obiettivo

Aggiungere un Blueprint Render per un unico web service Docker Free a
Francoforte, collegato a `master`, con deploy automatico disabilitato,
healthcheck `/up` e contratto completo delle variabili production senza valori
segreti.

## Fuori scope

- Creazione o sincronizzazione effettiva del servizio Render: M7-005.
- Valori reali di Neon, Upstash, APP_KEY o Reverb.
- GitHub Actions di deploy, registry immagini o immagini prebuildate.
- Custom domain, preview environment, staging, autoscaling e servizi separati.
- Modifiche al codice applicativo non richieste dalla validazione statica.

## File modificabili

- `render.yaml` nella root del repository.
- Documentazione operativa strettamente necessaria al Blueprint.
- `docs/learning/deployment-render.md`, limitatamente a PaaS, IaC, secret,
  healthcheck e deploy manuale.
- Questo task e `docs/project/current-state.md` durante attivazione e chiusura.

## File non modificabili

- `.github/workflows/ci.yml`, Compose locale/CI e Dockerfile non production.
- File `.env`, secret reali, credenziali o output dei generatori.
- Codice di dominio, API, schema e dipendenze.

## Requisiti

- Il Blueprint definisce un solo servizio `web`, runtime Docker, piano `free`,
  regione `frankfurt`, branch `master` e il Dockerfile M7-001.
- `autoDeploy` e' disabilitato: push e merge non pubblicano automaticamente.
- `healthCheckPath` e' `/up`; la documentazione lo descrive come liveness
  Nginx -> PHP-FPM -> Laravel, non come readiness completa.
- Le variabili production non sensibili fissano almeno `APP_ENV=production`,
  `APP_DEBUG=false`, log su stderr, HTTPS/same-origin, queue Redis e parametri
  pubblici Reverb coerenti con `https://<render-service>.onrender.com`.
- L'URL browser di API e Reverb usa il dominio Render pubblico; l'URL
  server-only di Next punta a Nginx su loopback e il broadcaster Laravel punta
  a Reverb su loopback HTTP. Porte e scheme interni non vengono riutilizzati
  nelle variabili `NEXT_PUBLIC_*`.
- `APP_KEY`, `DB_URL`, `REDIS_URL`, `REVERB_APP_ID`, `REVERB_APP_KEY`,
  `NEXT_PUBLIC_REVERB_APP_KEY` e `REVERB_APP_SECRET` sono dichiarati con
  `sync: false` o meccanismo Blueprint equivalente verificato; nessun valore
  reale entra nel YAML. Le due variabili della app key ricevono lo stesso
  valore pubblico durante la prima sync.
- `NEXT_PUBLIC_*` contiene soltanto valori realmente pubblici. Nessun secret e'
  usato come Docker `ARG` o incorporato nel build frontend.
- Cookie Sanctum e sessione sono host-only, `Secure` e same-origin; non viene
  aggiunto un dominio personalizzato.
- Il nome del servizio e il relativo sottodominio sono deterministici oppure il
  runbook spiega come sostituire il placeholder prima della prima sync.
- Il file e' validato con schema/CLI Render corrente e confrontato con la
  documentazione ufficiale al momento dell'implementazione.

## Strategia di test

Validare YAML e schema Blueprint senza creare risorse. Ispezionare
programmaticamente tipo, piano, regione, branch, Dockerfile, healthcheck,
auto-deploy e lista delle variabili. Cercare pattern di credenziali, URL Neon o
Upstash e chiavi generate. Costruire ancora l'immagine indicata dal Blueprint
per evitare un riferimento staticamente valido ma inesistente.

## Comandi da eseguire

- `git status --short`
- Parser YAML disponibile senza aggiungere dipendenze di produzione.
- Validazione Blueprint tramite schema o Render CLI corrente.
- Query YAML per i campi critici e per tutti i secret `sync: false`.
- Ricerca di password, URL reali e valori Reverb nel diff.
- Build del Dockerfile referenziato dal Blueprint.
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [ ] `render.yaml` descrive un solo web service Docker Free a Francoforte.
- [ ] Branch `master`, health `/up` e deploy manuale sono espliciti.
- [ ] Tutti i secret richiesti sono dichiarati senza valore versionato.
- [ ] La configurazione usa un solo dominio `onrender.com` per app, API e WSS.
- [ ] Il Blueprint supera la validazione corrente senza creare risorse remote.
- [ ] La documentazione distingue Blueprint versionato, secret manuali e stato
      remoto non ancora creato.

## Rischi e assunzioni

La specifica Blueprint puo' cambiare. Tag, nomi dei campi e disponibilita' del
piano Free vanno verificati live durante il task. Una validazione statica non
dimostra che build, migration o runtime remoto funzionino; tale prova appartiene
a M7-005.

## Verifica manuale

1. Aprire `render.yaml` e seguire ogni riferimento al file reale.
2. Controllare che nessuna variabile sensibile abbia un valore.
3. Validare il Blueprint senza sincronizzarlo.
4. Confrontare i campi critici con la documentazione Render corrente.

## Decisioni emerse

- Il deployment e' Infrastructure as Code, ma l'avvio resta manuale.
- Esiste un solo servizio e un solo dominio Render gratuito.
- I secret vengono inseriti nel Dashboard durante M7-005.

## File modificati

Da compilare durante l'implementazione.

## Risultati dei controlli

Da compilare distinguendo validazione statica e assenza di deploy runtime.

## Problemi residui

Da compilare.

## Riepilogo finale

Da compilare dopo tutti i criteri verificati.
