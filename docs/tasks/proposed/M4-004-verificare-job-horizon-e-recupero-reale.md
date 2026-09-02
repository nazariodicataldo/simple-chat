# M4-004 — Verificare job Horizon e recupero reale

- **Stato:** proposta
- **Milestone:** Milestone 4 — Horizon
- **Data di apertura:** 2026-08-31
- **Data di chiusura:**
- **Dipendenze:** M4-001, M4-002, M4-003, M3-004

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
- `docs/project/current-state.md` solo dopo il soddisfacimento completo della
  DoD M4
- `CHANGELOG.md` solo se il completamento della milestone lo rende opportuno

## File non modificabili

- Codice backend/frontend, configurazioni, `.env`, dipendenze e lockfile,
  salvo un difetto riproducibile autorizzato in un nuovo task.
- Job, record `failed_jobs` e messaggi di utenti preesistenti.

## Requisiti

- Backend, Redis Lerd, Reverb e frontend HTTPS sono attivi. Il solo consumer
  della queue `default` e' `composer horizon`; `composer queue:work` resta
  spento durante tutta la prova.
- La dashboard e' aperta esclusivamente con la sessione reale
  `admin@admin.com`; guest e utenti non autorizzati non sono usati per
  aggirare M4-002.
- Con Reverb attivo, l'admin crea, modifica e cancella un messaggio di prova.
  Horizon mostra l'elaborazione dei tre broadcast e il secondo browser applica
  CREATE, UPDATE e DELETE una sola volta, senza refresh.
- Prima dello scenario di fallimento registrare la baseline di job falliti.
  Fermare solo Reverb, con Horizon e i browser attivi, e creare un messaggio
  marcato in modo non sensibile. Il job esaurisce i tre tentativi M3 e diventa
  osservabile nella pagina Horizon dei failed jobs.
- Riavviare Reverb senza refresh. Attendere WSS, auth `200` e
  `pusher_internal:subscription_succeeded` per `private-chat`; poi eseguire il
  retry del solo job selezionato dalla dashboard Horizon. Il secondo browser
  riceve una sola bubble e il job non resta fallito.
- Eliminare il messaggio recuperato con Horizon e Reverb attivi, verificando
  la delete nel secondo browser. Il cleanup riguarda solo i messaggi di prova.
- Il report separa HTTP/persistenza, dashboard Horizon, log del worker,
  Reverb/Echo e risultato UI. Non riporta cookie, token, secret, stack trace o
  payload completi.

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
- Da `backend/`: `php artisan queue:failed` solo per stabilire e confrontare
  la baseline
- Da `backend/`: `composer test`, `./vendor/bin/pint --test` e
  `./vendor/bin/phpstan analyse --memory-limit=512M`
- Da `frontend/`: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`
- Runtime locale: `lerd start`, `php artisan reverb:start`, `pnpm dev:https`
  e due browser autenticati

## Criteri di accettazione

- [ ] Horizon e' attivo e mostra il supervisor locale della queue
  `redis/default`; nessun `queue:work` concorrente consuma la stessa queue.
- [ ] CREATE, UPDATE e DELETE di un messaggio di prova sono osservabili come
  job completati e il secondo browser applica ogni evento una sola volta senza
  refresh.
- [ ] Con Reverb volontariamente fermo, il nuovo broadcast fallisce dopo tre
  tentativi e compare nella dashboard Horizon come unico job nuovo rispetto
  alla baseline.
- [ ] Dopo il riavvio di Reverb, Echo riconnette e risottoscrive
  `private-chat` senza refresh; il retry dalla dashboard del solo job scelto
  consegna una sola bubble al secondo browser.
- [ ] Il messaggio recuperato viene eliminato con la queue sana; non restano
  messaggi di prova e i job falliti tornano alla baseline senza cancellare
  record preesistenti.
- [ ] Durante lo stop volontario, errori WSS sono annotati come attesi; dopo
  il recupero non restano errori applicativi o disconnessioni persistenti.
- [ ] Tutti i controlli automatici hanno esito o limitazione esplicita e
  `current-state.md`/changelog cambiano solo dopo l'evidenza completa.

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
   stato Horizon e che `composer queue:work` sia spento.
2. Aprire la dashboard con l'account admin. Aprire Chrome e Firefox in
   incognito con due utenti chat distinti; l'admin puo' essere il mittente.
3. Con Reverb sano, creare, aggiornare e cancellare un messaggio. Per ogni
   azione annotare status HTTP, job dashboard, log Horizon e singola modifica
   nel browser ricevente.
4. Annotare la baseline dei failed jobs. Fermare soltanto Reverb e creare il
   messaggio di recupero; individuare in Horizon il job nuovo senza copiare il
   payload completo.
5. Dopo i tre tentativi, riavviare Reverb. Attendere in entrambi i browser
   socket WSS, auth `200` e subscription `private-chat`, senza refresh.
6. Dalla dashboard eseguire il retry del job selezionato. Il browser ricevente
   deve mostrare una sola bubble; eliminare poi il messaggio recuperato e
   verificare la rimozione realtime.
7. Confrontare failed jobs e messaggi con la baseline, fermare Horizon e
   registrare gli esiti senza dati sensibili.

## Decisioni emerse

- La DoD osserva job completati, job falliti e retry selettivo reale dalla
  dashboard; non verifica `Forget` o cleanup bulk.
- M4 ripete CREATE, UPDATE e DELETE per associare l'osservabilita' Horizon a
  tutti i broadcast Message esistenti, senza modificare il loro contratto.
- Il recupero usa un vero `MessageCreated` fallito per Reverb fermo e non il
  fixture M3-003, che fallisce intenzionalmente a ogni tentativo.

## File modificati

## Risultati dei controlli

## Problemi residui

## Riepilogo finale
