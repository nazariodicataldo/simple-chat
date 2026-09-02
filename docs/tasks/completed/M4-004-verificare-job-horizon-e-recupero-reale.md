# M4-004 — Verificare job Horizon e recupero reale

- **Stato:** completato
- **Milestone:** Milestone 4 — Horizon
- **Data di apertura:** 2026-09-02
- **Data di chiusura:** 2026-09-02
- **Dipendenze:** M4-001, M4-002, M4-003, M3-004,
  [ISS-004](../../issues/ISS-004-caricare-autore-risposte-create-update-message.md)

## Contesto

M3 ha gia' dimostrato la catena Redis, worker, Reverb ed Echo con
`queue:work`. M4 non deve riprogettarla: deve dimostrare che Horizon e' ora il
solo consumer locale, rende visibili il supervisor e i job reali, e permette di
ripetere selettivamente un broadcast fallito dopo il ripristino di Reverb.

La dashboard viene osservata come utente autorizzato `admin@admin.com`. Il
secondo browser usa un utente distinto della chat e dimostra la consegna
realtime, non l'accesso amministrativo.

## Obiettivo

Verificare nel runtime locale che Horizon gestisca un solo worker
`redis/default`, osservi i broadcast Message completati e falliti e consenta il
retry dalla dashboard di un solo broadcast fallito, fino alla consegna browser
senza refresh.

## Fuori scope

- Nuovi test fake per Redis, Horizon, Reverb o Echo.
- `Forget` dalla dashboard, cleanup bulk, `horizon:clear` e rimozione di job
  falliti preesistenti.
- Code ulteriori, piu' worker, metriche, scheduler, notifiche, Docker, CI e
  produzione.
- Modifiche a UI, API, eventi, policy, Reverb, Echo, retry policy o configurazione.
- Ordinamento globale, tombstone o versioning per retry di eventi datati.

## File modificabili

- `docs/learning/horizon.md`
- Questo task
- `docs/project/current-state.md` per l'attivazione e dopo il soddisfacimento
  completo della DoD M4
- `CHANGELOG.md` solo se il completamento della milestone lo rende opportuno
- `frontend/app/features/messages/message.queries.ts` e il relativo test, per
  disattivare il refetch della lista messaggi al focus durante lo smoke

## File non modificabili

- Codice backend/frontend, configurazioni, `.env`, dipendenze e lockfile,
  salvo la disattivazione autorizzata del refetch al focus della lista messaggi.
- Job, record `failed_jobs` e messaggi di utenti preesistenti.

## Requisiti

- Backend, Redis Lerd, Reverb e frontend HTTPS sono attivi. Il solo consumer
  della queue `default` e' `composer horizon`; `composer queue:work` resta
  spento durante tutta la prova. Prima e durante lo smoke, il controllo dei
  processi deve mostrare il master e il worker Horizon ma nessun
  `queue:work`, `queue:listen` o `composer dev` concorrente.
- La dashboard e' aperta esclusivamente con la sessione reale
  `admin@admin.com`; guest e utenti non autorizzati non sono usati per
  aggirare M4-002.
- La lista messaggi non esegue refetch automatici al ritorno del focus browser;
  la prova attribuisce quindi la bubble al solo evento realtime o al retry.
- Con Reverb attivo, l'admin crea, modifica e cancella un messaggio di prova.
  Per ciascuna azione la dashboard mostra il dettaglio del relativo
  `BroadcastEvent` con timestamp coerente alla risposta HTTP; il secondo
  browser applica CREATE, UPDATE e DELETE una sola volta, senza refresh.
- Prima dello scenario di fallimento registrare gli UUID della baseline di job
  falliti. Fermare solo Reverb, con Horizon e i browser attivi, e creare il
  messaggio `m4-004-recovery-b33073c8-c9c3-4f0a-b714-338f8c961879`. Il job
  esaurisce i tre tentativi M3 e diventa osservabile nella pagina Horizon dei
  failed jobs come sola nuova riga rispetto alla baseline.
- Riavviare Reverb senza refresh. Attendere WSS, auth `200` e
  `pusher_internal:subscription_succeeded` per `private-chat`. Prima del retry
  il secondo browser non deve ancora mostrare il messaggio di recupero; poi
  eseguire dalla dashboard Horizon il retry del solo job nuovo selezionato. Il
  browser riceve una sola bubble e lo stesso UUID non compare piu' ne' nella
  dashboard ne' in `queue:failed`; gli UUID della baseline restano invariati.
- Eliminare il messaggio recuperato con Horizon e Reverb attivi, verificando
  la delete nel secondo browser. Il cleanup riguarda solo i messaggi di prova.
- Durante lo smoke si osservano HTTP/persistenza, dashboard Horizon, log del
  worker, Reverb/Echo e risultato UI; nel report si registra soltanto una
  sintesi riuscita o le anomalie. Non riportare cookie, token, secret, stack
  trace o payload completi.

## Strategia di test

Questa e' una prova end-to-end reale. I test automatici esistenti continuano a
coprire contratti backend/frontend; non dimostrano processo Horizon, Redis,
Reverb ed Echo insieme. La dashboard e la ricezione nel secondo browser sono
entrambe necessarie: un job visibile non prova la consegna, mentre una bubble
senza dashboard non prova che Horizon lo abbia gestito.

I cinque secondi di consegna restano una soglia pratica dello smoke locale, non
uno SLA. Il backoff e' 5 s, ma annotare gli intervalli realmente osservati:
`block_for` e il ciclo del worker possono renderli diversi da cinque secondi.

## Comandi da eseguire

- `git status --short`
- `git diff --stat`
- `git diff --check`
- Da `backend/`: `composer horizon`
- Da `backend/`, in un secondo terminale: `php artisan horizon:status`
- Dal terminale locale: `ps -ef | rg '[p]hp artisan (horizon|horizon:work|queue:work|queue:listen)|[c]omposer (horizon|dev)'`
- Da `backend/`: `php artisan queue:failed` solo per stabilire e confrontare
  gli UUID della baseline
- Da `backend/`: `composer test`, `./vendor/bin/pint --test` e
  `./vendor/bin/phpstan analyse --memory-limit=512M`
- Da `frontend/`: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`
- Runtime locale: `lerd start`, `php artisan reverb:start`, `pnpm dev:https`
  e due browser autenticati

## Criteri di accettazione

- [x] Horizon e' attivo e mostra il supervisor locale della queue
  `redis/default`; il controllo processi esclude `queue:work`, `queue:listen`
  e `composer dev` concorrenti.
- [x] CREATE, UPDATE e DELETE di un messaggio di prova sono osservabili come
  `BroadcastEvent` completati con timestamp coerente alla risposta HTTP; il
  secondo browser applica ogni evento una sola volta senza refresh.
- [x] Con Reverb volontariamente fermo, il nuovo broadcast fallisce dopo tre
  tentativi e compare nella dashboard Horizon come unico UUID nuovo rispetto
  alla baseline.
- [x] Dopo il riavvio di Reverb, Echo riconnette e risottoscrive
  `private-chat` senza refresh; il messaggio non e' visibile prima del retry
  dalla dashboard del solo job scelto e poi compare in una sola bubble nel
  secondo browser.
- [x] Il messaggio recuperato viene eliminato con la queue sana; non restano
  messaggi di prova e il solo UUID nuovo scompare da dashboard e
  `queue:failed`, senza cancellare o modificare record preesistenti.
- [x] Durante lo stop volontario, errori WSS sono annotati come attesi; dopo
  il recupero non restano errori applicativi o disconnessioni persistenti.
- [x] Il focus browser non causa un refetch automatico della lista messaggi.
- [x] Tutti i controlli automatici hanno esito o limitazione esplicita e
  `current-state.md`/changelog registrano il completamento solo dopo
  l'evidenza completa.

## Rischi e assunzioni

Il retry di un broadcast vecchio puo' arrivare dopo eventi successivi. M4 non
forza questo caso e non dichiara ordering garantito: tombstone o versioning
richiederebbero un task separato.

Il retry dalla dashboard e' la sola azione distruttiva necessaria per la DoD.
`Forget` non viene verificato per non creare un job artificialmente
irrecuperabile. I record preesistenti sono fuori dal perimetro e non vanno mai
rimossi con comandi bulk.

## Verifica manuale

1. Avviare Lerd, Reverb, frontend HTTPS e `composer horizon`; verificare lo
   stato Horizon e, prima e durante lo smoke, che non esistano consumer
   concorrenti della queue.
2. Aprire la dashboard con l'account admin. Aprire Chrome e Firefox in
   incognito con due utenti chat distinti; l'admin puo' essere il mittente.
3. Con Reverb sano, creare, aggiornare e cancellare un messaggio. Per ogni
   azione verificare status HTTP, dettaglio `BroadcastEvent` e timestamp in
   dashboard, log Horizon e singola modifica nel browser ricevente; annotare
   solo eventuali anomalie.
4. Annotare gli UUID della baseline dei failed jobs. Fermare soltanto Reverb e
   creare il messaggio di recupero; individuare in Horizon il solo job nuovo
   senza copiare il payload completo.
5. Dopo i tre tentativi, riavviare Reverb. Attendere in entrambi i browser
   socket WSS, auth `200` e subscription `private-chat`, senza refresh.
6. Prima del retry confermare che il browser ricevente non mostra il
   messaggio. Dalla dashboard eseguire il retry del solo job selezionato: il
   browser deve mostrare una sola bubble; eliminare poi il messaggio recuperato
   e verificare la rimozione realtime.
7. Confrontare gli UUID dei failed jobs e i messaggi con la baseline, fermare
   Horizon e registrare gli esiti senza dati sensibili.

## Decisioni emerse

- La DoD osserva job completati, job falliti e retry selettivo reale dalla
  dashboard; non verifica `Forget` o cleanup bulk.
- M4 ripete CREATE, UPDATE e DELETE per associare l'osservabilita' Horizon a
  tutti i broadcast Message esistenti, senza modificare il loro contratto.
- Il recupero usa un vero `MessageCreated` fallito per Reverb fermo e non il
  fixture M3-003, che fallisce intenzionalmente a ogni tentativo.
- La baseline conserva gli UUID dei job preesistenti; il retry agisce solo sul
  job nuovo associato al marcatore non sensibile e la verifica finale confronta
  le identita', non il solo conteggio.
- La consegna e' attribuibile al retry soltanto se, dopo reconnect e
  risottoscrizione senza refresh, il messaggio e' ancora assente prima del
  click e compare una sola volta dopo.
- Un difetto runtime riproducibile interrompe M4-004 con evidenza minimale e
  richiede un nuovo task autorizzato: non e' corretto nel suo scope.

## File modificati

- `docs/tasks/completed/M4-004-verificare-job-horizon-e-recupero-reale.md`
- `docs/project/current-state.md`
- `docs/project/roadmap.md`
- `docs/learning/horizon.md`
- `CHANGELOG.md`
- `frontend/app/features/messages/message.queries.ts`
- `frontend/app/__test__/messages/message-queries.test.tsx`

## Risultati dei controlli

- Smoke runtime M4-004, 2026-09-02: con il solo `composer horizon` come
  consumer di `redis/default`, CREATE (`201`), UPDATE (`200`) e DELETE (`204`)
  sono risultati job Horizon completati e ogni evento e' stato applicato una
  sola volta nel secondo browser, senza refresh.
- Con Reverb fermo, un solo nuovo `MessageCreated` ha esaurito i tre tentativi
  ed e' rimasto l'unico UUID aggiunto rispetto alla baseline dei failed job.
  Dopo il riavvio, gli errori WSS `502` sono cessati, Echo ha completato la
  subscription `private-chat` senza refresh e il retry del solo job selezionato
  ha creato una sola bubble. Il messaggio e il relativo UUID non sono rimasti
  dopo la DELETE di recupero; la baseline non e' stata modificata.
- Il primo retry eseguito prima della nuova subscription non ha consegnato
  l'evento al browser, come atteso per un broadcast non persistente. Ripetuta
  la sequenza con subscription completata prima del retry, la consegna e'
  riuscita. Non e' emerso un difetto applicativo.
- `composer test`: 40 test, 210 assertion; `./vendor/bin/pint --test` e
  `./vendor/bin/phpstan analyse --memory-limit=512M`: riusciti.
- Frontend: `pnpm test` e `pnpm exec vitest run --maxWorkers=1
  --no-file-parallelism`: 15 file, 87 test riusciti; `pnpm lint`, `pnpm
  typecheck` e `pnpm build`: riusciti. Un primo tentativo di build e' stato
  bloccato soltanto dal download temporaneamente indisponibile di Google Fonts;
  la ripetizione ha completato compilazione, TypeScript e pagine statiche.

## Problemi residui

Nessuno per M4-004. [ISS-004](../../issues/ISS-004-caricare-autore-risposte-create-update-message.md)
e' risolta da M4-005.

## Riepilogo finale

M4-004 completa la prova reale di Horizon: il solo consumer locale gestisce
broadcast sani e falliti, il retry selettivo dopo la risottoscrizione Echo
consegna una sola bubble e il cleanup non altera la baseline dei failed job.
