# M7-007 — Verificare il deploy pubblico con Playwright

- **Stato:** completato
- **Milestone:** Milestone 7 — Deployment
- **Data di apertura:** 2026-10-06
- **Data di chiusura:** 2026-10-06
- **Dipendenze:** M7-006

## Contesto

M7-006 dimostra che il servizio Render costruisce, parte e risponde, ma non che
il flusso reale attraversi Neon, Upstash, Horizon, Reverb ed Echo. Lo scenario
M6-002 offre gia' la prova a due browser context, ma la base URL e alcuni
messaggi diagnostici sono specifici del Compose locale.

Playwright resta uno strumento eseguito dal computer dello sviluppatore: con il
default visita il Compose locale, mentre con una variabile esplicita visita il
vero deploy pubblico tramite HTTPS e WSS. Il fatto che il runner sia locale non
rende locale la prova: HTTP, database, queue e realtime attraversano le risorse
production effettive.

## Obiettivo

Rendere configurabile e sicura la destinazione Playwright, mantenere invariato
il percorso Compose e riutilizzare lo scenario realtime esistente contro
Render. La prova deve distinguere readiness del provider, comportamento
funzionale osservato dal browser e segnali diagnostici disponibili sul piano
Free, senza attribuire ai log evidenze che non contengono.

## Fuori scope

- Nuovo scenario funzionale, browser aggiuntivi o matrice di ambienti.
- Mock, endpoint test-only, seed, reset Neon o cleanup diretto del database.
- Esecuzione automatica contro production da GitHub Actions.
- Modifica dell'autenticazione o creazione di una funzione delete-user.
- Nuovo deploy Render, build o sync Blueprint: il target resta il runtime M7-006
  sullo SHA `00d91f3ac1cbe6c5a3a443f2425a54e56b75a200`.
- Nuovo logging applicativo, apertura della dashboard Horizon, Reverb `--debug`,
  shell, SSH, one-off job o piano a pagamento.
- Backup e ripristino.

## File modificabili

- `frontend/playwright.config.ts`.
- Un global setup production sotto `frontend/e2e/`, dedicato alla readiness.
- Test E2E esistenti e relativi test mirati soltanto per configurazione,
  diagnostica, password e cleanup neutrali fra locale e deploy.
- Comando/documentazione frontend strettamente necessari all'override.
- `docs/learning/deployment-render.md`, limitatamente al runner esterno, smoke,
  TLS, cold start, dati E2E e limiti di osservabilita'.
- Questo task e `docs/project/current-state.md` durante attivazione e chiusura.

## File non modificabili

- API, autenticazione, eventi, queue, Reverb, Nginx production, immagine e
  Blueprint, salvo difetto bloccante riprodotto e autorizzato separatamente.
- Credenziali, database reset, utenti esistenti e workflow di deploy.
- Default locale HTTPS o uso CI esistente di
  `PLAYWRIGHT_IGNORE_HTTPS_ERRORS`.
- Configurazione remota Render, Neon e Upstash.

## Requisiti

- Senza variabili, `pnpm e2e` continua a usare
  `https://app.simple-chat.test:8443` con il Compose gia' avviato.
- `PLAYWRIGHT_BASE_URL=https://<render-service>.onrender.com` seleziona il
  deploy pubblico senza modificare file. Il config non contiene il dominio
  reale; la guida usa il segnaposto e i risultati finali registrano il target
  pubblico effettivamente verificato.
- L'override accetta soltanto la root HTTPS di un host `*.onrender.com`,
  normalizza la sola slash finale e rifiuta protocollo, host, porta, path,
  credenziali, query o fragment inattesi con un messaggio in inglese.
- Se `PLAYWRIGHT_IGNORE_HTTPS_ERRORS=true` accompagna un target Render, il
  caricamento del config fallisce in inglese. Il valore non viene ignorato in
  silenzio; il percorso CI Compose conserva il comportamento esistente.
- Un target Render forza sempre zero retry, anche se `CI` fosse presente. Il
  Compose manuale resta a zero e la CI Compose conserva i due retry attuali.
- Production disabilita esplicitamente trace, video e screenshot automatici.
  Il report conserva soltanto esito, tempi e messaggi sanitizzati, senza body,
  cookie, token o password.
- Prima dell'intera suite, un global setup attivo soltanto per production
  attende prima `/up` e poi `/` tramite condizioni osservabili, TLS rigoroso e
  limite complessivo di 120 secondi. Non usa un sonno fisso e non crea utenti
  prima della readiness.
- Un errore di configurazione o readiness riporta in inglese fase, endpoint,
  tempo e ultimo status o errore sicuro; non include body della risposta o
  valori sensibili.
- Lo scenario usa due `BrowserContext`, registra dalla UI due utenti univoci e
  attende per entrambi la subscription `private-chat` prima della mutazione.
- Node genera internamente due password distinte e crittograficamente casuali,
  con maiuscole, minuscole, numeri e simboli. Devono superare i requisiti
  production `mixedCase` e `uncompromised`, restare soltanto in memoria e non
  essere stampate, allegate, salvate o versionate.
- CREATE, UPDATE e DELETE attraversano il deploy reale; B osserva ogni stato
  una sola volta senza refresh. Soltanto dopo aver osservato DELETE realtime,
  un caricamento normale conferma che il messaggio non ricompaia.
- Il cleanup prova tramite UI sia il testo CREATE sia il testo UPDATE. Se la
  sessione corrente non e' utilizzabile, attende il recupero del servizio,
  apre un context nuovo, effettua login come A con la password ancora in
  memoria e riprova prima di chiudere i context.
- DELETE conserva il contratto applicativo di soft delete: il messaggio non e'
  piu' visibile nelle query normali, ma la riga con `deleted_at` puo' restare su
  Neon. Non viene eseguita una cancellazione fisica.
- Se il cleanup non puo' riuscire durante un guasto prolungato, il test resta
  fallito e riporta soltanto run ID e i due possibili marker. Non si rilancia
  subito la suite e non si usano SQL, Tinker o endpoint nascosti.
- Ogni tentativo puo' lasciare su Neon gli utenti gia' registrati. Un fallimento
  interrompe il flusso per la diagnosi; non si dichiara che restino esattamente
  due utenti quando tentativi precedenti ne hanno creati altri.
- Playwright e' la prova funzionale primaria. Configurazione versionata e Live
  Tail Render completano il quadro; i log devono essere esaminati per errori
  Redis, queue, broadcast, Reverb, crash, OOM e restart, ma non vengono descritti
  come traccia del singolo job quando il runtime non produce tale dettaglio.
- Dopo la modifica, il percorso Playwright locale viene rieseguito per evitare
  una regressione M6.

## Strategia di test

Introdurre con test mirati la selezione della base URL, la validazione Render,
il conflitto TLS e i retry, mantenendo il default locale. Aggiungere il global
setup production e verificarne successo, timeout e diagnostica senza contattare
Render nei test automatici.

Eseguire quindi la suite contro Compose con TLS mkcert. Con lo stesso runner,
passare l'URL Render reale soltanto tramite ambiente: la readiness assorbe il
cold start, poi la suite prova due sessioni, subscription, CRUD realtime e
cleanup. Seguire il Live Tail nella stessa finestra e registrare target, SHA,
data ed esiti sanitizzati. Il runtime M7-006 non viene ridistribuito.

## Comandi da eseguire

- `git status --short`
- Test mirati della configurazione e della readiness production.
- `docker compose --env-file compose.env up -d` e readiness locale.
- `cd frontend && corepack pnpm e2e` contro Compose.
- `PLAYWRIGHT_BASE_URL=https://<render-service>.onrender.com corepack pnpm e2e`
  dal computer dello sviluppatore contro Render.
- Live Tail e ricerca dei log Render relativi alla finestra del test.
- `corepack pnpm test`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `docker compose --env-file compose.env down` senza `-v`.
- `git status --short`
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [x] La base URL production e' selezionabile soltanto via variabile esplicita;
      default Compose, CI e dominio non hardcodato conservano i propri contratti.
- [x] URL Render invalide e conflitto con il bypass TLS falliscono in inglese;
      production usa TLS/WSS rigorosi, zero retry e nessun artifact sensibile.
- [x] La readiness globale verifica `/up` e `/` entro 120 secondi prima di
      creare utenti, senza ampliare i timeout realtime da 15 secondi.
- [x] Due context isolati, con due password casuali solo in memoria, completano
      CREATE, UPDATE e DELETE su production; B osserva ogni stato una sola volta
      senza refresh.
- [x] Il cleanup normale o di recupero soft-delete il messaggio via UI e il
      caricamento successivo non lo mostra; utenti residui e tentativi sono
      registrati senza affermarne un numero falso.
- [x] Output Playwright, configurazione e Live Tail forniscono una prova
      funzionale coerente della pipeline e dichiarano il limite dei log Free,
      senza fingere una correlazione per-job assente.
- [x] Il target pubblico reale, lo SHA runtime M7-006, la data e gli esiti
      sanitizzati sono registrati; M7-007 non avvia build o deploy Render.
- [x] La suite locale M6 e i controlli frontend pertinenti restano verdi.

## Rischi e assunzioni

Il cold start Render puo' superare i timeout pensati per Compose: il global
setup lo separa dallo scenario con un limite complessivo di 120 secondi. Le
asserzioni realtime restano a 15 secondi, perche' allargarle nasconderebbe un
possibile guasto della pipeline dopo che l'applicazione e' pronta.

L'esecuzione crea dati reali. Le password esistono soltanto nella memoria del
processo; i messaggi seguono il soft delete e gli utenti registrati restano su
Neon. Un tentativo fallito puo' lasciare uno o due utenti e, se anche il cleanup
di recupero non raggiunge l'applicazione, un messaggio identificato dal run ID.
In quel caso ci si ferma, si registra il residuo possibile e si diagnostica
prima di una nuova esecuzione.

Sul web service Free Render non sono disponibili shell Dashboard, SSH o one-off
job: non e' quindi possibile eseguire nel container live `php artisan tinker`,
`horizon:status` o `queue:failed`. Il Live Tail raccoglie stdout/stderr e il
workspace Hobby conserva i log per sette giorni, ma i request log HTTP con
request ID richiedono un workspace Pro.

Laravel permetterebbe di aggiungere listener `JobProcessing`, `JobProcessed` e
`JobFailed`; Reverb potrebbe partire con `--debug`; Horizon potrebbe essere
aperto a un'identita' allowlisted. Queste opzioni richiedono codice,
configurazione o accessi production aggiuntivi e possono esporre payload o
sessioni: non fanno parte della soluzione semplice di M7-007. Il test browser
dimostra il comportamento end-to-end; configurazione e log sostengono la
diagnosi senza essere presentati come telemetria del singolo job.

Se Render, Neon o Upstash sono sospesi o senza quota, si registra l'errore
sanitizzato e il task resta attivo. Un difetto applicativo riprodotto richiede un
task correttivo e un deploy autorizzato separatamente; non viene mascherato con
timeout piu' larghi o drift nel Dashboard.

## Verifica manuale

1. Eseguire test mirati e suite Playwright contro Compose, con il default locale.
2. Aprire il Live Tail Render senza copiare log completi o secret.
3. Avviare dalla workstation la suite con `PLAYWRIGHT_BASE_URL` esplicita.
4. Verificare readiness, due subscription, CRUD senza refresh e cleanup UI-only.
5. Ricaricare dopo DELETE e confermare che il messaggio soft-deleted non ritorni.
6. Correlare orario, run ID, target, SHA e soli esiti sanitizzati con i log.
7. Chiudere il task soltanto dopo percorso locale e remoto entrambi riusciti.

## Decisioni emerse

- Lo stesso runner M6 verifica locale e production; non nasce una suite
  parallela e il browser gira sulla workstation contro il vero deploy remoto.
- Il dominio Render e' obbligatoriamente esplicito, non e' hardcodato e viene
  registrato per esteso soltanto nelle evidenze finali del task.
- Production mantiene TLS rigoroso, rifiuta il bypass, usa readiness globale,
  zero retry e nessun artifact che possa contenere sessioni o password.
- I due utenti ricevono password distinte, robuste, casuali e solo in memoria.
- Il cleanup resta UI-only, prova entrambi i testi e puo' autenticarsi di nuovo
  durante la stessa esecuzione; il risultato documenta onestamente ogni residuo.
- DELETE significa soft delete verificato dalla UI e da una lettura successiva,
  non rimozione fisica della riga Neon.
- Il piano Free non offre comandi Artisan remoti ne' request log avanzati. Non
  si aggiungono logging, debug Reverb o accesso Horizon solo per questa prova.
- Il deploy M7-006 viene testato sullo SHA gia' pubblicato. Un difetto runtime
  apre un task correttivo prima di qualunque nuovo deploy.
- M7-007 si chiude soltanto con suite locale e remota entrambe riuscite; un
  limite temporaneo del provider lascia il task attivo.

## File modificati

- `frontend/playwright.config.ts`.
- `frontend/e2e/playwright-config.ts` e il test mirato associato.
- `frontend/e2e/production-global-setup.ts` e il test mirato associato.
- `frontend/e2e/test-data.ts` e il test mirato associato.
- `frontend/e2e/realtime-two-context.e2e.ts`.
- `frontend/e2e/smoke.e2e.ts`.
- `docs/learning/deployment-render.md`.
- `docs/project/current-state.md`.
- Questo task.

## Risultati dei controlli

- **Test mirati e qualita' frontend:** `corepack pnpm exec vitest run
  e2e/playwright-config.test.ts e2e/production-global-setup.test.ts
  e2e/test-data.test.ts` — 3 file, 15 test superati; `corepack pnpm test` —
  19 file, 105 test superati; `corepack pnpm lint` e `corepack pnpm typecheck`
  superati.
- **Configurazione:** `PLAYWRIGHT_BASE_URL` assente mantiene Compose;
  URL Render con slash finale, URL invalide e conflitto TLS verificati con
  messaggi inglesi; il config production e' stato caricato con `--list` e ha
  elencato i soli 2 test Chromium.
- **Correzione post-revisione del 2026-10-07:** il test di configurazione ha
  riprodotto in RED l'assenza del budget necessario al cleanup di recupero.
  Production usa ora un timeout complessivo di 150 secondi, mentre Compose resta
  a 30 secondi e le asserzioni realtime restano a 15 secondi. Il test mirato
  della configurazione (11 test), la suite frontend (19 file, 105 test), lint,
  typecheck e il caricamento del config locale e Render sono riusciti.
- **Correzione cleanup post-revisione del 2026-10-07:** un test Playwright
  isolato ha riprodotto in RED il ritorno anticipato del cleanup mentre la lista
  mostrava ancora `Loading messages...`; il marker compariva dopo, senza essere
  eliminato. Il cleanup attende ora la fine del caricamento prima di contare le
  righe. Il test mirato e' riuscito (`1 passed`); suite frontend (19 file, 105
  test), lint, typecheck e caricamento del config locale e Render con 3 test
  elencati sono riusciti. Le suite funzionali Compose e Render non sono state
  rieseguite per questa correzione isolata.
- **Prova locale:** `docker compose --env-file compose.env up -d`, smoke e
  realtime a due context Playwright superati (`2 passed`, 17,4 s) con
  registrazione, subscription, CREATE/UPDATE/DELETE, rilettura post-delete e
  cleanup UI. Il primo run freddo ha superato smoke ma ha raggiunto il timeout
  di compilazione Turbopack; ripetizione isolata e suite completa a stack caldo
  riuscite. `docker compose --env-file compose.env down` senza `-v` superato.
- **Prova remota:** il 2026-10-06, con
  `PLAYWRIGHT_BASE_URL=https://simple-chat-nazariodicataldo.onrender.com`, la
  suite ha superato readiness `/up` poi `/`, smoke e realtime (`2 passed`,
  19,3 s nell'ultima ripetizione), senza retry, sul runtime M7-006 allo SHA
  `00d91f3ac1cbe6c5a3a443f2425a54e56b75a200`.
- **Live Tail e log:** nella finestra `15:00-15:02 UTC` il servizio ha mostrato
  migration completata, Horizon/Next/Nginx/PHP-FPM/Reverb in `RUNNING`, due
  registrazioni, mutazioni HTTP ed eventi Message completati. La ricerca
  filtrata non ha trovato errori Redis/queue, OOM, restart o crash. I log Free
  restano evidenza di processo/finestra e non correlano un singolo job.

## Problemi residui

- Gli utenti creati dalla prova restano possibili residui su Neon per contratto;
  non e' stato eseguito alcun reset o conteggio globale. Il messaggio prova e'
  stato soft-deleted dalla UI e non ricompare nella rilettura normale.
- Il primo run locale freddo e' stato interrotto dal timeout della compilazione
  Turbopack; non e' un difetto riprodotto dopo il warm-up e non sono stati
  allargati i timeout realtime.
- Il piano Free non espone una correlazione per-job nei log: la prova funzionale
  primaria resta Playwright, mentre Live Tail e configurazione sostengono la
  diagnosi senza fingere telemetria aggiuntiva.

## Riepilogo finale

M7-007 e' completato il 2026-10-06. Lo stesso runner Playwright mantiene il
default Compose e seleziona soltanto tramite ambiente il dominio Render reale,
con readiness globale, TLS rigoroso, zero retry, password in memoria, CRUD
realtime a due context e cleanup UI-only. La prova locale e quella pubblica
sono riuscite sul runtime M7-006 senza build o deploy aggiuntivi.
