# M7-006 — Verificare e completare il primo deploy manuale su Render

- **Stato:** completato
- **Milestone:** Milestone 7 — Deployment
- **Data di apertura:** 2026-10-05
- **Data di chiusura:** 2026-10-05
- **Dipendenze:** M7-005

## Contesto

All'apertura del task, il primo sync del Blueprint era gia' stato eseguito il
2026-10-04 sul commit
`00d91f3ac1cbe6c5a3a443f2425a54e56b75a200`. Render lo mostra `Deployed` con
un solo servizio Docker `simple-chat-nazariodicataldo` a Francoforte; il run
GitHub Actions `37208495710` dello stesso SHA e' concluso con successo.

Queste evidenze dimostravano la creazione e la prima sync, ma non bastavano
ancora per chiudere il deploy. All'apertura `Auto Sync` risultava attivo, la
`APP_KEY` inserita era la stessa dell'ambiente locale e build, migration,
processi, health, memoria, log e cold start non erano ancora stati verificati
in modo completo e sanitizzato.
Le URL Neon e Upstash sono state inserite con virgolette esterne: Laravel le
rimuove quando legge le variabili con `env()`, quindi non sono un difetto
dimostrato, ma sono state normalizzate durante l'unico aggiornamento runtime.

## Obiettivo

Correggere in modo controllato la configurazione runtime del servizio gia'
creato e completare la prova remota del primo deploy. La verifica deve collegare
build e runtime allo SHA scelto, osservare migration e cinque processi, provare
HTTPS, autenticazione minima, memoria, log e cold start senza anticipare la
prova funzionale realtime completa di M7-007.

## Fuori scope

- Nuova risorsa Render, seconda sync Blueprint non necessaria, workflow deploy
  o automazioni GitHub.
- E2E CREATE -> UPDATE -> DELETE a due utenti, queue e consegna WebSocket:
  M7-007.
- Backup Neon: M7-008.
- Custom domain, staging, preview environment, keep-alive e piani a pagamento.
- Cancellazione dei due account e dei messaggi di prova gia' presenti.
- Correzioni a codice, immagine o Blueprint: un difetto dimostrato apre un
  issue/task correttivo dedicato prima di un nuovo deploy.

## File modificabili

- Documentazione del runbook manuale e delle sole evidenze non sensibili.
- `docs/learning/deployment-render.md`, limitatamente al deploy Render
  effettivamente osservato.
- Questo task e `docs/project/current-state.md` durante attivazione e chiusura.

## File non modificabili

- Codice applicativo, `render.yaml`, Dockerfile, entrypoint, Nginx, Supervisor,
  workflow, API, schema e dipendenze.
- Secret reali, file `.env`, valori completi delle URL, cookie e credenziali
  degli account di prova.
- Dati Neon/Upstash e dati di prova gia' presenti.

## Requisiti

- Il deploy resta collegato al commit
  `00d91f3ac1cbe6c5a3a443f2425a54e56b75a200` su `master`; il run CI completo
  `37208495710` e' la relativa prova verde.
- Il workspace resta Hobby senza metodo di pagamento e il servizio resta Free,
  in regione Francoforte, con il solo dominio HTTPS `onrender.com`. Questi
  valori vengono ricontrollati prima delle modifiche remote.
- `Auto Sync` del Blueprint viene portato da `Yes` a `No`; `Auto-Deploy` del
  servizio resta `Off`. Sync e deploy successivi sono quindi entrambi manuali.
- Una nuova `APP_KEY` dedicata alla produzione viene generata con Laravel e
  inserita direttamente dall'utente nel Dashboard. Non viene condivisa in chat,
  salvata in file o aggiunta ad `APP_PREVIOUS_KEYS`; la rotazione invalida le
  sessioni esistenti ma conserva account e messaggi.
- `DB_URL` conserva la URL pooled Neon gia' verificata, con
  `sslmode=verify-full` e `sslrootcert`; `REDIS_URL` conserva la URL nativa
  Upstash `rediss://`. Le sole virgolette esterne vengono rimosse come
  normalizzazione, senza attribuire loro un guasto non osservato.
- I tre valori runtime vengono salvati insieme con `Save and deploy`. Il nuovo
  deploy riusa la build iniziale dello stesso SHA; una nuova build e' richiesta
  soltanto se cambia il commit o viene dimostrato un difetto dell'immagine.
- Il deploy iniziale fornisce l'evidenza di build; quello correttivo fornisce
  l'evidenza runtime. ID e relazione fra i due eventi vengono registrati.
- I log mostrano migration riuscita e Nginx, Next, PHP-FPM, Horizon e Reverb in
  `RUNNING` oltre `startsecs=10`, senza `BACKOFF`, `FATAL`, restart imprevisti,
  crash silenziosi o OOM.
- `/up` raggiunge Laravel e `/` raggiunge Next in HTTPS con certificato valido.
  Un account di prova esistente completa login e logout; non viene eseguito CRUD
  dei messaggi.
- Horizon e Reverb vengono provati soltanto come processi avviati e stabili.
  Queue, handshake funzionale e consegna realtime restano non verificati fino a
  M7-007.
- Avvio, idle e prime richieste hanno osservazioni di memoria Render. I valori
  sono misure approssimative, non SLA; un OOM o un ciclo di crash e' bloccante.
- I log completi vengono letti nel Dashboard ma non copiati nel repository o in
  chat. Qualunque secret esposto e' bloccante: si interrompe la verifica, si
  ruota la credenziale interessata e si ripete il deploy prima di proseguire.
- Un errore di inserimento viene corretto soltanto nel relativo secret
  `sync: false`. Un difetto versionabile non viene mascherato con drift nel
  Dashboard e non provoca rollback verso la chiave condivisa o le URL precedenti.

## Strategia di test

Conservare le evidenze del primo sync e leggere il relativo log build. Prima del
redeploy, ricontrollare piano, pagamento e automazioni; generare la nuova chiave
senza riportarla negli output condivisi e salvare insieme i tre valori runtime.
Sorvegliare migration, health e tutti i processi del deploy correttivo, quindi
provare `/up`, `/` e login/logout.

Per il cold start, chiudere tutte le schede della chat e le connessioni
WebSocket, interrompere richieste manuali e attendere almeno 20 minuti e, se
visibile, lo stato di spin-down. Misurare la prima richiesta TLS a `/up`,
collegarla ai log di nuovo avvio e confrontarla con una seconda richiesta warm.
Registrare i tempi osservati senza presentarli come garanzia del provider.

## Comandi da eseguire

- `git status --short`
- Comandi `gh` read-only per confermare run e SHA.
- Operazioni guidate nel Dashboard per `Auto Sync`, secret e `Save and deploy`.
- Richieste HTTPS a `/up` e `/` senza bypass TLS, con codice e tempi.
- Lettura di log build/runtime e metriche CPU/memoria disponibili.
- Ricerca nei log di indicatori sensibili, senza copiarne i valori.
- Prova di spin-down/cold start con prima richiesta e confronto warm.
- Ispezione del deploy attivo e dello SHA pubblicato.
- `git status --short`
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [x] La prima sync usa lo SHA `00d91f3ac1cbe6c5a3a443f2425a54e56b75a200`
      su `master`, con run CI `37208495710` verde.
- [x] La prima sync risulta `Deployed` e ha creato un solo servizio Docker a
      Francoforte.
- [x] Workspace Hobby senza carta, servizio Free, `Auto Sync: No` e
      `Auto-Deploy: Off` sono ricontrollati.
- [x] La `APP_KEY` production e' separata da quella locale e le due URL sono
      normalizzate in un solo redeploy senza esporre valori.
- [x] Il deploy correttivo attivo usa lo stesso SHA; build iniziale, migration e
      avvio dei cinque processi sono collegati ai rispettivi eventi Render.
- [x] `/up` e `/` rispondono in HTTPS con certificato valido; login e logout con
      un account esistente riescono senza CRUD dei messaggi.
- [x] Il cold start recupera e i tempi cold/warm sono registrati senza essere
      presentati come SLA.
- [x] Memoria e stato non mostrano OOM, restart imprevisti o crash silenziosi.
- [x] I log dei cinque processi sono disponibili e non espongono secret; le
      evidenze conservate sono soltanto testuali e sanitizzate.
- [x] Queue e realtime restano esplicitamente non verificati fino a M7-007.

## Rischi e assunzioni

Il primo build e il cold start possono essere lenti. Aumentare timeout o
healthcheck e' ammesso soltanto dopo misure reali e richiede una correzione
versionata separata. Le 512 MB sono condivise: se il runtime non e' stabile, il
vincolo zero euro e la topologia scelta vengono riesaminati con l'utente invece
di dichiarare il deploy riuscito.

Render puo' terminare normalmente l'istanza durante redeploy e spin-down. Questi
eventi attesi devono essere distinti da crash spontanei; il limite Free di 30
secondi allo shutdown resta diverso dai 65 secondi concessi localmente a
Horizon.

## Verifica manuale

1. Ricontrollare piano Hobby senza carta, servizio Free e impostare
   `Auto Sync: No`, lasciando `Auto-Deploy: Off`.
2. Leggere il log del primo build e registrare SHA, run CI, sync e deploy ID.
3. Generare la nuova `APP_KEY`, normalizzare le due URL e usare una sola volta
   `Save and deploy` senza condividere i valori.
4. Seguire migration, cinque processi, health, log e memoria del deploy attivo.
5. Provare `/up`, `/`, login e logout senza modificare messaggi.
6. Chiudere il traffico, attendere lo spin-down e misurare cold e warm start.
7. Lasciare il servizio configurato per M7-007, senza keep-alive artificiale.

## Decisioni emerse

- Le operazioni autenticate e l'inserimento dei secret restano all'utente; il
  supporto procede con un solo passaggio alla volta e riceve solo output
  sanitizzato.
- La prima sync e' gia' avvenuta: il task verifica e completa il servizio
  esistente, senza crearne un secondo.
- Il vincolo zero euro e' bloccante; piano, assenza di carta e quote vengono
  controllati prima del redeploy.
- Blueprint sync e deploy del servizio sono due automazioni diverse ed entrambe
  restano disabilitate.
- La rotazione di `APP_KEY` e' necessaria; le virgolette delle URL sono soltanto
  una normalizzazione per chiarezza e portabilita'.
- Build iniziale e runtime corretto sono due evidenze distinte sullo stesso SHA.
- Lo smoke auth usa dati esistenti e non sostituisce M7-007.
- Il servizio, Neon e Upstash restano disponibili per M7-007 e seguono lo
  spin-down naturale del piano Free.
- Le evidenze versionate sono testuali e sanitizzate; niente screenshot, log
  completi o secret.

## File modificati

- `docs/tasks/completed/M7-006-verificare-completare-primo-deploy-render.md`
- `docs/project/current-state.md`
- `docs/learning/deployment-render.md`

## Risultati dei controlli

- Prima sync Render `exe-db15ufc9v7es73e3ucbg`: stato `Deployed` sul commit
  `00d91f3ac1cbe6c5a3a443f2425a54e56b75a200`, un servizio Docker
  `simple-chat-nazariodicataldo` a Francoforte.
- GitHub Actions: workflow `Application quality`, run `37208495710`, stato
  `completed`, conclusione `success` sullo stesso SHA.
- Verifica HTTPS del 2026-10-05: dopo oltre 20 minuti senza richieste,
  `/up` ha restituito `200` in `32,651 s` con TLS verificato; la richiesta
  warm successiva ha restituito `200` in `0,419 s` e `/` ha restituito `200`
  in `2,729 s`.
- I log dello stesso avvio mostrano migration production completata e
  `horizon`, `next`, `nginx`, `php-fpm` e `reverb` in `RUNNING` dopo dieci
  secondi; la scansione filtrata non ha rilevato `BACKOFF`, `FATAL`, OOM o
  pattern sensibili.
- Smoke autenticato del 2026-10-05: un account esistente ha completato login
  e logout sulla URL Render; non e' stato eseguito CRUD dei messaggi.
- Dashboard Render verificato il 2026-10-05: servizio Docker `Free` in
  Francoforte, workspace `Hobby`, `Auto-Deploy: Off` e `Auto Sync: No`.
- Billing Render verificato il 2026-10-05: `No card on file`.
- Redeploy correttivo del 2026-10-05: deploy `dep-db210i3bc2fs73eqotv0`,
  trigger `service_updated`, stato `live`, stesso SHA
  `00d91f3ac1cbe6c5a3a443f2425a54e56b75a200` e durata osservata di circa
  `40,7 s`.
- I log del redeploy correttivo mostrano migration production completata e
  `horizon`, `next`, `nginx`, `php-fpm` e `reverb` in `RUNNING` dopo dieci
  secondi; la scansione filtrata non ha rilevato `BACKOFF`, `FATAL`, OOM o
  pattern sensibili.
- Verifica HTTPS post-redeploy: `/up` ha restituito `200` in `0,306 s` e `/`
  ha restituito `200` in `0,645 s`, con TLS verificato.
- Smoke autenticato post-rotazione del 2026-10-05: un account esistente ha
  completato nuovamente login e logout sulla URL Render; non e' stato eseguito
  CRUD dei messaggi.
- Metriche Render osservate il 2026-10-05: memoria con picco precedente di
  circa `69%` e valore attorno al redeploy di `50-54%`; CPU con picco
  precedente di circa `42%` e valore successivo vicino al `5%`. L'utente non
  ha osservato OOM o restart imprevisti; i log filtrati non mostrano marker
  `OOM` o `BACKOFF`.

## Problemi residui

Nessuno. Queue e realtime restano intenzionalmente non verificati e sono lo
scope del task successivo M7-007.

## Riepilogo finale

M7-006 e' completato sullo SHA `00d91f3ac1cbe6c5a3a443f2425a54e56b75a200`.
Il primo deploy ha fornito l'evidenza di build; il redeploy correttivo
`dep-db210i3bc2fs73eqotv0` ha applicato la configurazione runtime dedicata e ha
fornito le evidenze di migration, processi, HTTPS, auth, cold start, metriche,
log sanitizzati e assenza di OOM/restart imprevisti. Queue e realtime non sono
stati eseguiti per mantenere il confine con M7-007.
