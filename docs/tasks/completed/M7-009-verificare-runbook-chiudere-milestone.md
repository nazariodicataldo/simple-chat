# M7-009 — Verificare il runbook e chiudere la Milestone 7

- **Stato:** completato, con correzioni documentali dopo la revisione del
  2026-10-12
- **Milestone:** Milestone 7 — Deployment
- **Data di apertura:** 2026-10-11
- **Data di chiusura:** 2026-10-12
- **Dipendenze:** M7-008

## Contesto

I task precedenti hanno prodotto l'immagine production, collegato Neon e
Upstash, definito il Blueprint, pubblicato il servizio Render, verificato il
realtime con Playwright e provato backup e restore. Le evidenze restano pero'
distribuite tra task e guida learning: manca un README root che presenti Simple
Chat e manca un runbook operativo autonomo che raccolga una procedura manuale
ripetibile.

M7-009 chiude la milestone con un audit finale e due documenti con ruoli
distinti:

- `docs/learning/deployment-render.md` conserva teoria, motivazioni e limiti;
- `docs/runbooks/deployment-render.md` conterra' soltanto la procedura
  operativa.

Il nome ufficiale del progetto e' **Simple Chat**. Gli usi di `Group Chat` come
nome proprio nei documenti correnti vanno corretti; le espressioni descrittive
"chat di gruppo" e i riferimenti storici alla stringa UI `Group chat` restano
invariati.

## Baseline all'attivazione

- Il deploy Render attivo indicato dal Dashboard e' lo SHA
  `b93537b5b171dc6894fde5f2916ed7fd97443907`, stato `Live`, avviato
  manualmente l'8 ottobre 2026 alle 00:46:59 Europe/Rome e completato in circa
  2 minuti e 19 secondi.
- `master` e `origin/master` puntano allo SHA
  `132005717b047db8684bf813cc24b6a0ceb41cc5`; l'utente ha confermato la CI
  verde. Tra lo SHA Render e questo SHA sono presenti soltanto modifiche
  documentali relative a M7-008.
- Lo SHA runtime Render e lo SHA dal quale partono i controlli sono evidenze
  distinte. Una differenza dovuta soltanto a documentazione o strumenti di
  verifica non richiede un nuovo deploy.
- Dopo il commit e il push dell'attivazione, la prima run automatica completa e
  verde sul nuovo SHA sara' la prova CI di M7-009; non serve un rerun manuale
  duplicato sullo stesso commit.

Questi dati sono una baseline, non l'evidenza finale: stato, SHA, run e diff
vanno ricontrollati durante l'implementazione.

## Obiettivo

Creare la documentazione di ingresso del repository e un runbook operativo
autonomo, quindi eseguire il percorso di verifica finale contro il deploy
pubblico. Se tutti i criteri hanno evidenza coerente, chiudere M7-009 e la
Milestone 7 come deployment pubblico dimostrativo Free, non come produzione
durevole con SLA.

## Fuori scope

- Nuove funzionalita', modifiche a codice applicativo o test, refactor e
  aggiornamenti dipendenze.
- Nuova topologia, automazione del deploy, custom domain, staging, scaling,
  keep-alive o monitoraggio esterno.
- Nuovi provider, piani a pagamento o inserimento di una carta.
- Correzioni nascoste di problemi tecnici: un difetto dimostrato mantiene il
  task aperto e richiede un task tecnico autorizzato.
- Nuovo backup se l'evidenza M7-008 e il relativo archivio restano validi.
- Screenshot, log completi, payload, secret o valori del Dashboard versionati.
- Scelta o aggiunta di una licenza open source.
- Nuova milestone o task successivo non ancora concordato.

## File modificabili durante l'implementazione

- `README.md`, nuovo ingresso principale del repository.
- `docs/runbooks/deployment-render.md`, nuovo runbook operativo autonomo.
- `docs/README.md`, per collegare il runbook e la documentazione principale.
- `docs/learning/deployment-render.md`, limitatamente alla teoria e al
  collegamento verso il runbook.
- `AGENTS.md`, `docs/project/overview.md` e `CHANGELOG.md`, per correggere
  `Group Chat` quando e' usato impropriamente come nome del progetto.
- `docs/project/current-state.md` e `docs/project/roadmap.md`.
- Questo task, poi spostato in `docs/tasks/completed/` soltanto a criteri
  soddisfatti.

## File non modificabili

- Codice backend e frontend, test Playwright, Dockerfile, Blueprint, workflow,
  dipendenze e configurazione runtime, salvo nuova autorizzazione dopo un
  difetto dimostrato.
- Secret e valori del Dashboard.
- Task completati precedenti. In particolare, i riferimenti storici al locator
  UI `Group chat` non vengono rinominati.

## Contratto del README root

Il nuovo `README.md` deve essere una pagina di ingresso autonoma e sintetica,
non una copia dell'intera documentazione. Deve includere:

- descrizione e obiettivo didattico di Simple Chat;
- link alla demo Render, con avvisi su cold start, assenza di SLA, dati di
  prova e password da non riutilizzare;
- funzionalita' e stack principali;
- mappe ASCII della pipeline di preparazione locale, dei confini host/container
  in Compose e dei confini Internet/container/provider in production;
- Docker Compose come quickstart locale principale e Lerd soltanto come
  alternativa storica;
- prerequisiti, URL locali, controlli e comandi essenziali;
- link evidente al runbook, alla guida learning e all'indice documentale;
- stato e limiti reali del progetto;
- dichiarazione che non esiste ancora una licenza open source.

Screenshot, badge decorativi, guida CONTRIBUTING e istruzioni operative
duplicate integralmente restano fuori scope.

## Contratto del runbook

Il runbook deve usare placeholder riconoscibili e nessun valore sensibile. Le
istruzioni permanenti descrivono campi, risultati attesi, condizioni di arresto
e fonti ufficiali, senza dipendere dalla posizione grafica dei pulsanti nei
Dashboard.

Deve separare:

1. **Prima configurazione**, eseguita una sola volta: account, repository,
   Neon, Upstash, Blueprint, secret, branch `master`, regione, piano Free,
   Auto Sync e Auto-Deploy.
2. **Deploy manuale ordinario**: scelta SHA, CI, controllo migration, deploy,
   stato `Live`, health, pagina, login/logout, Playwright, log, metriche ed
   evidenze.
3. **Rollback del codice**: ridistribuzione dello SHA precedente soltanto se il
   database resta compatibile.
4. **Backup e restore**: collegamento alla procedura M7-008 e spiegazione del
   punto di recupero, senza trattarlo come rollback automatico.

Il runbook deve contenere anche una mappa ASCII sintetica:

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

## Regole per SHA, deploy e CI

- Registrare separatamente lo SHA eseguito da Render e lo SHA usato per i
  controlli.
- Non ridistribuire Render soltanto per allinearlo a commit documentali.
- Eseguire un deploy manuale se tra il runtime attivo e il candidato esistono
  modifiche che cambiano l'artefatto o la configurazione runtime.
- Associare la prova CI allo SHA di verifica e richiedere verdi tutti i job
  `backend`, `frontend` e `Realtime Compose E2E`.
- Una run verde storica su uno SHA diverso non sostituisce la prova richiesta.

## Regole per migration e rollback

Prima di ogni deploy confrontare lo SHA attivo e quello candidato e verificare
se sono presenti nuove migration. Il rollback Render ripristina il codice, ma
non annulla le modifiche gia' applicate al database Neon.

- Senza nuove migration, il rollback del codice puo' ridistribuire lo SHA
  precedente.
- Con migration compatibili con entrambe le versioni, compatibilita' e prova
  devono essere documentate per il rilascio specifico.
- Con rename, drop, cambi di tipo o altre migration distruttive/incompatibili,
  il deploy si ferma finche' non esiste un piano dedicato.
- Il runbook non deve proporre un generico
  `php artisan migrate:rollback --force`.
- Il dump M7-008 e' una fotografia datata dell'intero database: ripristinarlo
  puo' perdere tutti i dati successivi e non e' un normale rollback del deploy.

## Verifica production guidata dall'utente

I controlli che raggiungono production e tutte le azioni nei Dashboard sono
eseguiti dall'utente, un passo alla volta. Per ogni passo vanno forniti scopo,
risultato atteso e condizione di arresto; si procede soltanto dopo aver
valutato l'output sanitizzato.

L'agente puo' eseguire direttamente soltanto controlli locali e documentali
privi di credenziali. Nessun secret viene richiesto, stampato, conservato o
inserito nel repository.

## Prove funzionali finali

- `/up` deve provare Nginx -> Laravel e `/` deve provare Nginx -> Next, senza
  presentarli come prova di queue o realtime.
- Non si forza un nuovo cold start. Se Render si risveglia naturalmente viene
  registrato; altrimenti si dichiara soltanto la readiness warm osservata.
- L'utente esegue login e logout manuali con un account di prova esistente,
  senza condividere le credenziali.
- Playwright verifica pagina pubblica, due registrazioni reali, due context
  autenticati, subscription privata e CREATE/UPDATE/DELETE realtime.
- Il run production resta singolo, senza retry. I messaggi di prova vengono
  rimossi dalla UI; due utenti sintetici possono restare su Neon e questo
  limite viene dichiarato.
- Un fallimento interrompe la sequenza: non si avviano automaticamente retry,
  deploy, rollback o cleanup distruttivi.

## Log e metriche

L'evidenza riguarda soltanto una finestra esplicita dall'inizio della readiness
al controllo successivo al cleanup Playwright. Annotare orari Europe/Rome,
risultato del test e valori approssimativi disponibili.

Leggere i log della finestra per errori applicativi e segnali di `BACKOFF`,
`FATAL` reale, restart, OOM, processo `Killed`, errori Neon, Redis o Reverb. Il
nome del listener Supervisor che contiene la parola `FATAL` non e' da solo un
errore. Dichiarare soltanto che non sono stati rilevati problemi nei log
effettivamente letti e nella finestra osservata.

Non versionare screenshot, log completi, payload o dati degli utenti.

## Evidenza backup M7-008

Non creare un nuovo dump se il controllo conferma:

- stesso progetto/database Neon;
- nessuna nuova migration pertinente;
- dump e checksum ancora presenti fuori dal repository;
- directory `700` e file `600`;
- checksum ancora valido;
- nessun dump, checksum o secret tracciato da Git.

Il risultato deve distinguere una procedura di backup/restore verificata da un
punto di recupero aggiornato: il dump del 10 ottobre 2026 non contiene dati
creati successivamente. Un archivio mancante o corrotto, un database diverso o
una migration rischiosa richiedono una nuova decisione e mantengono il task
aperto.

## Limiti Free e fonti

Confrontare i limiti documentati con fonti ufficiali correnti di Render, Neon e
Upstash e registrare la data del controllo. Aggiornare numeri o descrizioni
stale; se un cambiamento impedisce i criteri senza pagamento, fermare il task.

Zero euro e nessuna carta restano vincoli bloccanti. Non cambiare piano,
provider o architettura e non aggiungere keep-alive per ottenere un risultato
verde.

## Strategia di test

1. Audit read-only di Git, task, documentazione e differenze tra SHA.
2. Verifica della run GitHub Actions completa sullo SHA di controllo.
3. Verifica guidata dello SHA e dello stato Render.
4. Controllo migration e decisione esplicita sulla necessita' del deploy.
5. Finestra production con `/up`, `/`, login/logout, Playwright, log e metriche.
6. Controllo non distruttivo dell'evidenza M7-008.
7. Confronto di ogni criterio con un output effettivo.
8. Aggiornamento dei soli documenti autorizzati, poi diff completo.

## Comandi e controlli previsti

- `git status --short`
- confronto tra SHA Render, SHA di verifica e file cambiati
- stato GitHub Actions completo sullo SHA di verifica
- ispezione manuale dello SHA/deploy attivo Render
- richieste TLS a `/up` e `/`
- login/logout manuali con account di prova esistente
- Playwright production con `PLAYWRIGHT_BASE_URL` esplicita
- lettura Live Tail e metriche della finestra osservata
- verifica locale di presenza, permessi e checksum dell'archivio M7-008
- scansione dei documenti per `Group Chat` usato come nome proprio
- controllo dei link Markdown aggiunti
- `git diff --stat`
- `git diff --check`
- diff completo di tutti i documenti modificati
- `git ls-files --others --exclude-standard`

## Criteri di accettazione

- [x] Il README root presenta Simple Chat, demo, funzionalita', stack,
      architettura, quickstart Docker, test, documentazione e limiti.
- [x] Le mappe ASCII distinguono pipeline di setup e confini dentro/fuori i
      container in locale e production.
- [x] Il runbook autonomo permette prima configurazione e deploy ordinario
      senza conoscenze rimaste soltanto nel Dashboard o nella conversazione.
- [x] Learning guide e runbook mantengono distinti teoria e procedura.
- [x] CI, deploy, health, pagina, login/logout, registrazione, realtime, log,
      metriche e backup hanno evidenze appropriate e non vengono confusi.
- [x] SHA Render, SHA di verifica e run GitHub Actions sono registrati con i
      rispettivi ruoli.
- [x] Rollback del codice e compatibilita' delle migration sono spiegati senza
      promettere un rollback automatico del database.
- [x] Limiti Free e compromessi del container unico sono documentati senza
      chiamarli produzione affidabile.
- [x] Il link pubblico avverte di non usare dati personali o password
      riutilizzate.
- [x] `Simple Chat` e' il nome proprio nei documenti correnti; descrizioni e
      locator UI storici restano corretti.
- [x] README, indice docs, learning guide, current state, roadmap e changelog
      sono coerenti.
- [x] Non esistono modifiche fuori scope, secret, dump o checksum nel diff.
- [x] M7 viene marcata completata soltanto se M7-001..M7-009 sono completati e
      nessun controllo pertinente fallisce.

## Rischi e assunzioni

- Le UI e i limiti dei provider possono cambiare: il runbook privilegia campi,
  risultati attesi e fonti ufficiali verificate rispetto a indicazioni visuali
  fragili.
- Una CI verde non prova il runtime Render; `/up` e `/` non provano realtime;
  Playwright e log forniscono evidenze complementari.
- Il servizio pubblico consente registrazioni e non e' progettato per dati
  personali, moderazione, disponibilita' garantita o carico non controllato.
- Il singolo container ferma insieme pagina, API, queue e realtime.
- Il backup e' manuale e datato; non esistono scheduling, retention, PITR o
  disaster recovery con perdita dati nulla.

## Stato progetto dopo la chiusura

Se tutti i criteri riescono:

- Milestone 7 viene marcata completata con la data effettiva;
- M7-009 passa in `completed/`;
- non resta alcun task o milestone attiva;
- il prossimo task resta da definire, senza inventare M8.

Se un controllo fallisce, M7-009 e la milestone restano attive e il problema
viene registrato senza indebolire i criteri.

## Decisioni emerse

- README root, learning guide e runbook hanno ruoli distinti.
- Docker Compose e' il percorso locale portabile e principale.
- Lo SHA runtime non deve inseguire commit soltanto documentali.
- Le operazioni production sono manuali e guidate un passo alla volta.
- Il rollback del codice non equivale al rollback del database.
- La prova Playwright puo' lasciare due utenti sintetici, non messaggi visibili.
- M7-008 prova il meccanismo di backup/restore, non un backup sempre aggiornato.
- La chiusura descrive una demo pubblica Free senza SLA.

## File modificati

Attivazione documentale del 2026-10-11:

- `docs/tasks/proposed/M7-009-verificare-runbook-chiudere-milestone.md`, spostato
  in `docs/tasks/active/` e aggiornato con il contratto emerso dal grill-me;
- `docs/project/current-state.md`;
- `docs/learning/deployment-render.md`, soltanto con il contratto teorico.

README, runbook e gli altri documenti sono stati creati nell'implementazione.

Implementazione documentale del 2026-10-12:

- `README.md`, con descrizione, demo, mappe architetturali, quickstart Compose,
  controlli, documentazione e limiti;
- `docs/runbooks/deployment-render.md`, con prima configurazione, deploy,
  migration, rollback, verifica production e collegamento a M7-008;
- `docs/README.md`, `docs/learning/deployment-render.md`, `AGENTS.md`,
  `docs/project/overview.md`, `docs/project/roadmap.md` e `CHANGELOG.md`, per
  collegamenti e nomenclatura coerenti;
- `docs/project/current-state.md`, aggiornato per distinguere deliverable
  documentali creati da audit runtime ancora aperto.

## Risultati dei controlli

Controlli documentali locali del 2026-10-12:

- `git diff --check`: riuscito;
- controllo dei target locali del README, indice, learning guide, runbook,
  M7-008, current state, overview, roadmap e changelog: riuscito;
- scansione del nome `Group Chat`/`Group chat` nei documenti correnti: nessuna
  occorrenza impropria; i locator storici dei task completati restano invariati.

La baseline sopra e questi controlli non sostituiscono le prove finali. SHA,
run, deploy, smoke, log, metriche e backup saranno registrati soltanto dopo
output sanitizzati effettivi.

Evidenze runtime sanificate del 2026-10-12:

- CI `Application quality`: run `38074253567`, SHA
  `132005717b047db8684bf813cc24b6a0ceb41cc5`; `backend`, `frontend` e
  `Realtime Compose E2E` sono tutti `success`;
- Render: stato `Live`, SHA runtime
  `b93537b5b171dc6894fde5f2916ed7fd97443907`, avvio 2026-10-08 alle 00:46:59
  Europe/Rome, durata `2m19s`;
- tra SHA runtime e SHA di verifica cambiano soltanto documenti e il task M7-008;
  non risultano migration nuove;
- `/up` ha restituito `200` con `application/json` e `/` `200` con `text/html`;
- login e logout manuali riusciti;
- Playwright production: `3 passed` in `23.9s`, due worker;
- Live Tail nella finestra 2026-10-12 19:19:20–19:20:42 Europe/Rome: registrazioni
  `201`, autorizzazione privata `200`, WebSocket `101`, eventi
  `MessageCreated`, `MessageUpdated` e `MessageDeleted` `DONE`, soft delete
  `204`; osservati alcuni `499` di client-abort su richieste statiche/API;
- nessun `BACKOFF`, `FATAL` reale, OOM, `Killed`, restart o errore esplicito
  Neon/Redis/Reverb nei log incollati;
- metriche Render: un punto banda di circa `1.1 MB` alle 19:00, CPU circa `5%`
  alle 19:20, memoria circa `47%` alle 19:15; il grafico ha risoluzione oraria.
- backup M7-008: directory fuori repository `700`, dump candidato `600`,
  dimensione `22304` byte e SHA-256 coincidente con
  `c4cea239c25d5b5fed2b501bf0c73d829610ef22b083bb44212675b9c9f94fc7`; il
  file vuoto del tentativo fallito precedente è stato escluso dal candidato.

Correzioni dopo la revisione read-only del 2026-10-12:

- Il quickstart crea `backend/.env` e genera `APP_KEY` prima di avviare Compose.
- Playwright viene preparato ed eseguito sull'host, dove il quickstart installa
  Chromium; il container frontend non include il browser.
- La decisione sulle migration precede ora l'azione di deploy nel runbook.

Verifiche mirate delle correzioni:

- Test temporaneo del contratto documentale: RED prima della modifica su tutti
  i punti rilevati; GREEN dopo la modifica.
- Playwright con `PLAYWRIGHT_BROWSERS_PATH` diretto a una directory vuota: RED
  atteso, tutti e tre i test hanno segnalato l'eseguibile Chromium assente. La
  prova ha isolato il motivo del fallimento prima di raggiungere l'applicazione.
- Prova Laravel con `backend/.env` temporaneamente rinominato: non raggiunta.
  Il wrapper `php` ha tentato di avviare PHP-FPM Lerd, ma l'immagine PHP 8.5 non
  è installata; inoltre il socket Docker non è accessibile in questo ambiente.
  Il file `.env` è stato ripristinato. La correzione è verificata dal contratto
  documentale; il test runtime Laravel resta da eseguire in un ambiente locale
  con PHP/Lerd o Docker disponibile.
- `git diff --check`: riuscito dopo le correzioni; i nuovi documenti non hanno
  righe con spazi finali.
- `corepack pnpm exec playwright install --dry-run chromium`: riuscito; Playwright
  ha risolto il browser Chromium richiesto senza scaricarlo.

## Problemi residui

Nessun problema documentale residuo per i tre rilievi della revisione. Resta
non eseguita la prova runtime Laravel del quickstart in questo ambiente, per
l'assenza dell'immagine PHP 8.5 Lerd e l'accesso negato al socket Docker. I
`499` osservati nella finestra Live Tail sono stati registrati come client-abort
su richieste statiche/API; non sono stati accompagnati da fallimenti Playwright,
OOM, restart o errori applicativi espliciti.

## Riepilogo finale

M7-009 è completato il 2026-10-12. Le correzioni successive alla revisione
read-only sistemano il quickstart, l'esecuzione locale Playwright e l'ordine dei
controlli migration/deploy. README, runbook, learning guide, stato, roadmap e
changelog sono coerenti; la prova runtime Laravel del quickstart va ancora
eseguita in un ambiente con PHP 8.5 Lerd o Docker disponibile. Il risultato è
una demo pubblica Free senza SLA, quote o backup schedulato.
