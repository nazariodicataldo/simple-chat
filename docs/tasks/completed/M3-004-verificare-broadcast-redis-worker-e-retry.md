# M3-004 — Verificare broadcast Redis, worker e retry

- **Stato:** completato
- **Milestone:** Milestone 3 — Redis e queue
- **Data di apertura:** 2026-08-26
- **Data di chiusura:** 2026-08-29
- **Dipendenze:** M3-001, M3-002, M3-003

## Contesto

M3 sostituisce il broadcast sincrono con il percorso:

```text
HTTP -> PostgreSQL -> Redis queue -> queue:work -> Reverb -> Echo -> browser
```

Il mittente puo' ricevere `201` prima che il worker invii il broadcast. Redis
conserva il job se il worker e' fermo; retry e `failed_jobs` gestiscono il
fallimento server-side del broadcast, non aggiungono un retry UI per un utente.

Una chiusura o un errore WSS mentre Reverb e' fermo volontariamente e' evidenza
attesa dello scenario. Non e' invece accettabile che, dopo il suo riavvio, Echo
resti disconnesso o che la chat mostri errori applicativi.

## Obiettivo

Dimostrare nel runtime locale, con due browser autenticati, che CREATE, UPDATE
e DELETE attraversano Redis e il worker, e che un broadcast fallito per Reverb
non raggiungibile puo' essere ripetuto con successo dopo il ripristino.

## Fuori scope

- Modifiche a UI, API, Echo, Reverb, policy, CORS, Docker, Horizon o CI.
- Retry UI, polling/refetch aggiuntivo o garanzie di consegna esattamente una
  volta.
- Concorrenza, piu' worker, code prioritarie, ordering globale e test di carico.
- Tombstone o versioning frontend per eventi riordinati.
- Uso di credenziali, cookie, token o payload sensibili nel report.

## File modificabili

- Questo task
- `docs/learning/redis-queues-workers.md`
- `docs/project/current-state.md` solo dopo il soddisfacimento completo della
  DoD M3
- `CHANGELOG.md` solo se il completamento della milestone lo rende opportuno

## File non modificabili

- Codice backend/frontend, configurazioni, `.env`, dipendenze e lockfile,
  salvo un difetto riproducibile autorizzato con un nuovo task.

## Requisiti

- Browser A: Chrome incognito; browser B: Firefox incognito; due utenti
  Sanctum distinti e gia' disponibili.
- Backend, Redis Lerd, Reverb e frontend HTTPS sono attivi. Il worker e'
  avviato esclusivamente con `composer queue:work`.
- Per il percorso sano, A crea, modifica e cancella un proprio messaggio;
  B osserva una sola elaborazione per evento senza refresh entro 5 s. A mostra
  lo stato canonico HTTP senza duplicati.
- Con worker fermo e Reverb attivo, A crea un messaggio: HTTP ha successo e B
  non riceve l'evento; avviando il worker, B riceve il job pendente e una sola
  bubble.
- Per il recupero, Reverb e' fermo mentre worker e browser sono attivi; A crea
  un messaggio, il broadcast esaurisce i tre tentativi e appare in
  `failed_jobs`. Prima dello scenario viene annotata la baseline dei failed
  job; il nuovo UUID e' verificato con una query Tinker read-only che espone
  anche payload ed eccezione, senza riportare dati sensibili nel task.
- Reverb viene riavviato senza refresh dei browser. Echo deve riconnettersi e
  risottoscrivere automaticamente `private-chat`; dopo WSS, auth `200` e
  `pusher_internal:subscription_succeeded`, `queue:retry <uuid-esatto>`
  riesegue il job e B riceve una sola bubble.
- Il report separa sempre HTTP/persistenza, job Redis/worker, Reverb/Echo e UI.

## Strategia di test

Questa e' una prova end-to-end reale, non sostituibile da Queue/Broadcast fake.
Prima eseguire i controlli backend di M3-001/M3-003; poi registrare per ogni
scenario timestamp, ID messaggio, stato worker e risultato in A/B.

I cinque secondi per la consegna healthy o dopo la ripartenza del worker sono
una soglia pratica dello smoke locale, non uno SLA. Il backoff configurato
resta 5 s, ma l'intervallo osservato tra retry puo' essere circa 8 s per
`block_for` e `--sleep`: annotare il tempo effettivo senza dichiarare errata la
configurazione per tale differenza.

La prova healthy usa una sola direzione A -> B: autorizzazione e bidirezionalita'
del canale erano gia' verificate in M2-008; qui il soggetto e' il nuovo
percorso server-side user-agnostic.

## Comandi da eseguire

- `git status --short`
- `git diff --stat`
- `git diff --check`
- Da `backend/`: `composer test`, `./vendor/bin/pint --test`,
  `./vendor/bin/phpstan analyse --memory-limit=512M`
- Da `backend/`: `composer queue:work`
- Da `backend/`: `php artisan queue:failed`
- Da `backend/`: `php artisan queue:retry <uuid-esatto-del-broadcast>`
- Da `backend/`: query Tinker read-only del solo UUID in `failed_jobs`
- Da `frontend/`: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`
- Runtime locale: `php artisan reverb:start` e `pnpm dev:https`

## Criteri di accettazione

- [x] Con worker sano, CREATE, UPDATE e DELETE A -> B arrivano una sola volta,
  entro 5 s, e A converge allo stesso stato senza duplicati.
- [x] A worker fermo, la persistenza HTTP riesce mentre B non vede l'evento;
  alla ripartenza del worker B riceve il job pendente una sola volta.
- [x] Con Reverb fermo, il job broadcast tenta tre volte con backoff 5 s e
  compare in `failed_jobs` come nuovo UUID rispetto alla baseline. La query
  read-only del solo record conferma connection, queue, payload ed eccezione
  senza riportare nel task contenuti sensibili.
- [x] Dopo il riavvio di Reverb, senza refresh dei browser, WSS, auth `200` e
  subscription `private-chat` sono ristabiliti; `queue:retry` del solo UUID
  verificato trasmette il broadcast e B riceve una sola bubble.
- [x] Dopo il retry e il cleanup, `queue:failed` torna alla baseline e non
  restano messaggi di prova. Eventuali record preesistenti restano intatti;
  cleanup e confronto sono tracciati con ID/UUID non sensibili.
- [x] Durante l'arresto volontario di Reverb sono annotate separatamente la
  disconnessione/errori WSS attesi e il fallimento worker. Dopo il recupero non
  restano errori applicativi o errori di connessione persistenti; auth `200`,
  subscription `private-chat` e socket Reverb WSS sono distinti da HMR.
- [x] Tutti i controlli automatici hanno esito o limitazione esplicita; lo
  stato progetto e il changelog cambiano solo dopo questa evidenza completa.

## Rischi e assunzioni

Se Reverb viene fermo, Echo deve potersi riconnettere e risottoscrivere
automaticamente prima di `queue:retry`, senza refresh della pagina; altrimenti
un broadcast riuscito ma non osservato non prova la catena completa. Il
reconnect resta una prova manuale reale: non e' dedotto dai test mockati.

Il limite accettato M3 e' l'ordinamento: una retry puo' far arrivare un evento
vecchio dopo uno successivo. In particolare create fallito -> delete riuscito
-> retry create puo' reinserire una bubble, perche' non esistono tombstone.
Non forzare questo caso nello smoke e non dichiarare ordering garantito.

## Verifica manuale

### Preparazione

1. Da `backend/`, eseguire `lerd start`: avvia PostgreSQL, Redis e il worker
   Reverb dichiarato da Lerd. Poi avviare il frontend HTTPS separatamente.
2. Aprire Chrome incognito A e Firefox incognito B; autenticare utenti
   distinti e verificare profili, auth del canale e subscription `private-chat`.
3. Aprire DevTools Network/Console in entrambi; distinguere Reverb WSS da
   `/_next/webpack-hmr`.
4. Avviare `composer queue:work` e mantenere visibile il suo output.
5. Eseguire `php artisan queue:failed` e annotare la baseline: i record
   preesistenti non sono bersagli del task.

### Percorso sano

1. A crea un messaggio di prova; annotare ID e orario HTTP. B deve ricevere
   una bubble entro 5 s; A e B devono averne una sola.
2. A modifica lo stesso messaggio; B osserva il nuovo testo entro 5 s.
3. A elimina il messaggio; B non lo vede piu' entro 5 s.

### Worker fermo

1. Arrestare il worker, lasciando Reverb e i browser attivi.
2. A crea un messaggio marcato `M3 worker pending`; HTTP deve rispondere con
   successo e A mostra il risultato canonico, B non deve ancora riceverlo.
3. Avviare `composer queue:work`; B deve ricevere esattamente una bubble.
4. Eliminare il messaggio di prova con worker attivo e verificare B.

### Fallimento Reverb e recupero

1. Con worker attivo, fermare solo Reverb. Annotare che il worker tenta il
   broadcast tre volte. Il backoff configurato e' 5 s, ma annotare il tempo
   effettivo tra i retry senza richiedere un intervallo esatto di cinque secondi.
2. A crea un messaggio marcato `M3 reverb retry`; HTTP deve riuscire. Usare
   `php artisan queue:failed` per trovare il nuovo UUID rispetto alla baseline,
   con connection `redis` e queue `default`. Verificare in Tinker, in sola
   lettura, il solo record selezionato:

   ```bash
   php artisan tinker --execute='dump(Illuminate\Support\Facades\DB::table("failed_jobs")->select("uuid", "connection", "queue", "payload", "exception", "failed_at")->where("uuid", "<UUID>")->first());'
   ```

   Il payload deve riferirsi al broadcast del messaggio di prova; non copiare
   nel report cookie, token, secret o altri contenuti sensibili.
3. Riavviare Reverb senza refresh di A o B. Attendere in entrambi connessione
   WSS, auth `200` e `pusher_internal:subscription_succeeded` per
   `private-chat`. La chiusura/errori WSS durante l'arresto erano attesi; dopo
   il recupero non devono persistere errori applicativi o di connessione.
4. Eseguire `php artisan queue:retry <uuid-esatto>`; B deve ricevere una sola
   bubble del messaggio. Verificare che A non introduca duplicati.
5. Eliminare il messaggio di prova con worker e Reverb attivi; verificare la
   delete in B, poi confrontare `php artisan queue:failed` con la baseline. Il
   UUID ritentato non deve restare e nessun record preesistente va rimosso. Non
   eseguire comandi bulk su failed jobs.

## Decisioni emerse

- Retry/failure sono server-side: non sono associati solo al mittente e non
  introducono UI retry.
- A worker fermo, PostgreSQL resta fonte di verita': HTTP riesce e Redis
  conserva il job finche' il worker torna disponibile.
- Il record di un broadcast fallito e' identificato dal confronto con la
  baseline e poi ispezionato per UUID in `failed_jobs`: `queue:failed` non
  espone da solo il payload o l'eccezione necessari a collegarlo al messaggio
  di prova.
- Il recupero riuscito e' provato con il vero job broadcast dopo ripristino
  Reverb, non con il fixture sempre fallente M3-003.
- Il reconnect WSS e la nuova autorizzazione privata avvengono senza refresh;
  una disconnessione mentre Reverb e' fermo e' attesa, un errore persistente
  dopo il riavvio e' un difetto da aprire separatamente.
- Il limite di riordinamento retry e' accettato e documentato per questa chat
  locale/toy; tombstone o versioning richiedono un task separato.

## File modificati

- `docs/tasks/completed/M3-004-verificare-broadcast-redis-worker-e-retry.md`
- `docs/learning/redis-queues-workers.md`
- `docs/project/current-state.md`

## Risultati dei controlli

### Percorso sano — 2026-08-29 — riuscito

- Con worker Redis, Reverb ed Echo attivi, Chrome -> Firefox ha verificato
  CREATE, UPDATE e DELETE del messaggio `38`: risposte HTTP rispettivamente
  `201`, `200` e `204`; Firefox ha ricevuto gli eventi Socket
  `MessageCreated` alle `10:35:57.300`, `MessageUpdated` alle `10:39:18.979`
  e `MessageDeleted` alle `10:41:53.924` (ora locale CEST). Mittente e
  ricevente hanno mostrato una sola bubble, aggiornamento e rimozione corretti,
  senza refresh né errori applicativi.
- La direzione aggiuntiva Firefox -> Chrome ha confermato CREATE (`messageId`
  `42`, Socket alle `10:52:05.307`), UPDATE (`messageId` `42`, Socket alle
  `10:54:24.308`) e DELETE (`messageId` `43`, creato ad hoc, Socket alle
  `10:56:49.339`). Anche qui Chrome ha applicato ogni evento una sola volta,
  senza refresh né errori applicativi.
- Gli header HTTP `Date` sono in GMT e hanno precisione al secondo: non
  misurano una latenza esatta in millisecondi. Tutti gli eventi osservati sono
  arrivati entro la soglia pratica locale di 5 s; CREATE e DELETE della seconda
  direzione sono stati osservati circa 3,3 s dopo il secondo indicato
  nell'header, UPDATE circa 0,3 s.
- Le richieste `GET /api/messages` viste negli strumenti browser sono refetch
  separati e non sono state usate come prova della consegna realtime; la prova
  e' il frame Socket sul canale `private-chat` con la modifica UI corrispondente.

### Worker fermo e ripartenza — 2026-08-29 — riuscito

- Con il worker fermo, Chrome ha creato un messaggio tramite `POST /api/messages`
  con risposta `201 Created` e header `Date` `Sat, 29 Aug 2026 09:08:08 GMT`.
  Firefox aveva gia' una subscription `private-chat` riuscita
  (`pusher_internal:subscription_succeeded`), quindi il client realtime era
  pronto mentre il consumer Redis non era attivo.
- Dopo la riaccensione del worker, il terminale ha registrato il job
  `App\\Events\\MessageCreated` come `DONE` in `11.98ms`; Firefox ha ricevuto il
  relativo broadcast alle `11:10:10.907`. Questo conferma che il job pendente
  e' stato consumato dopo la ripartenza, ma gli orari riportati usano riferimenti
  diversi e non consentono di calcolare una latenza precisa.
- Con worker attivo, Chrome ha poi eliminato il messaggio `47` tramite
  `DELETE /api/messages/47`, con risposta `204 No Content` (`Date`
  `Sat, 29 Aug 2026 09:11:54 GMT`); il worker ha registrato
  `App\\Events\\MessageDeleted` `RUNNING` e `DONE` alle `09:12:03`, mentre
  Chrome ha ricevuto il frame alle `11:12:03.334`.
- TanStack Query puo' eseguire una nuova fetch quando una tab torna attiva:
  questo puo' ripopolare la lista e alterare l'osservazione visiva. Per la
  prova realtime valgono quindi frame Socket, stato del worker e conteggio delle
  bubble senza refresh; il refetch viene annotato separatamente.
- E' stata confermata l'assenza della bubble in Firefox mentre il worker era
  fermo e la presenza di una sola bubble dopo la ripartenza del worker. Il job
  pendente non ha quindi prodotto duplicati.

### Worker fermo e ripartenza — seconda prova — 2026-08-29 — riuscito

- Firefox ha creato il messaggio `M3 worker pending` (`messageId` `48`) con
  `POST /api/messages` concluso con `201 Created` e header `Date` `Sat, 29 Aug
  2026 09:28:05 GMT`, mentre il worker era fermo.
- Dopo l'avvio di `composer queue:work`, il terminale ha registrato
  `App\\Events\\MessageCreated` per il payload dell'id `48` come `DONE` in
  `62.56ms`; il frame Socket e' stato osservato alle `11:28:54.246`. Firefox ha
  mostrato una sola bubble per il messaggio pendente.
- Con worker attivo, il messaggio `48` e' stato eliminato: HTTP `DELETE
  /api/messages/48` ha risposto `204 No Content` (`Date` `Sat, 29 Aug 2026
  09:30:44 GMT`), il worker ha registrato `App\\Events\\MessageDeleted` alle
  `09:30:46` e il frame Socket e' stato osservato alle `11:30:46`. Anche la
  rimozione e' comparsa una sola volta.
- Durante questa prova il refetch su ritorno alla tab era temporaneamente
  disabilitato in `useMessagesQuery` con `refetchOnWindowFocus: false`, quindi
  TanStack non ha alterato il risultato osservato. La prova principale resta
  il frame Socket associato al log del worker e alla singola bubble; il flag
  temporaneo non e' parte della modifica funzionale del task.

### Fallimento Reverb e recupero — 2026-08-29 — riuscito

- Con Reverb fermo, Chrome ha registrato il fallimento della connessione WSS;
  Firefox ha ricevuto `502 Bad Gateway` sul WebSocket e l'errore client
  corrispondente. Questi errori sono stati annotati come effetto atteso dello
  stop volontario, separato dal fallimento del job.
- Il messaggio di prova `50` ha risposto `201 Created` via HTTP (`Date` `Sat,
  29 Aug 2026 11:32:55 GMT`). Il worker ha eseguito tre tentativi di
  `App\\Events\\MessageCreated`, tutti falliti alle `11:32:55`, `11:33:03` e
  `11:33:11`, con intervalli osservati di circa 8 s rispetto al backoff
  configurato di 5 s.
- `queue:failed` ha identificato il nuovo UUID
  `5ff307ac-acba-4115-bf63-5b9f8d31e456`. La query Tinker read-only limitata a
  questo UUID ha confermato `connection` `redis`, `queue` `default`, payload
  `App\\Events\\MessageCreated` riferito al messaggio `50` ed eccezione di
  connessione Pusher verso Reverb non disponibile. Nel task non vengono copiati
  payload completo, firma, token, URL firmati o stack trace.
- Dopo la riattivazione di Reverb, senza refresh, Echo ha ristabilito il WSS:
  Chrome ha ricevuto `pusher:connection_established` alle `13:35:47.550` e
  `pusher_internal:subscription_succeeded` alle `13:35:47.754`; Firefox ha
  completato `pusher:subscribe` su `private-chat` e la subscription succeeded.
  Non sono rimasti errori WSS persistenti.
- `php artisan queue:retry 5ff307ac-acba-4115-bf63-5b9f8d31e456` ha rimesso in
  coda il solo record e si e' concluso con `DONE`. Il worker ha completato
  `MessageCreated` alle `11:37:06`; Firefox ha ricevuto il broadcast alle
  `13:37:06.479` e ha mostrato una sola bubble.
- Con worker e Reverb attivi, Chrome ha eliminato il messaggio `50` con
  `DELETE /api/messages/50` e risposta `204 No Content` (`Date` `Sat, 29 Aug
  2026 11:37:59 GMT`). Il worker ha completato `MessageDeleted` alle `11:37:59`,
  Firefox ha ricevuto il frame alle `13:37:59.476` e la bubble e' stata rimossa
  una sola volta.
- Il controllo finale `php artisan queue:failed` ha restituito `No failed jobs
  found`: il UUID ritentato non e' rimasto in `failed_jobs`.

### Controlli automatici backend — 2026-08-29 — riusciti

- `composer test`: `36 passed` e `194 assertions` in `3.70s`.
- `./vendor/bin/pint --test`: esito positivo su `58 files`.
- `./vendor/bin/phpstan analyse --memory-limit=512M`: `[OK] No errors` su
  `40/40` elementi analizzati.
- Un primo tentativo di PHPStan ha restituito `zsh: bad pattern` perché il
  comando era stato incollato con i caratteri di bracketed paste
  (`^[[200~...~`); il comando ripulito e' poi passato correttamente e non
  indica un problema del progetto.

### Controlli automatici frontend — 2026-08-29 — riusciti

- `pnpm test`: `15 passed` test files e `85 passed` test, durata `28.43s`.
- `pnpm lint`: esito positivo senza errori ESLint.
- `pnpm typecheck`: esito positivo con `tsc --noEmit`.
- `pnpm build`: build Next.js `16.2.6` completata; compilazione, TypeScript,
  raccolta dati e pagine statiche concluse correttamente.
- Dopo la rimozione del flag temporaneo `refetchOnWindowFocus: false`, gli
  stessi quattro controlli sono stati ripetuti sul codice ripristinato e hanno
  avuto tutti esito positivo.

## Problemi residui

- Nessun difetto bloccante emerso nei percorsi verificati.
- Gli errori WSS durante lo stop volontario di Reverb sono attesi e non si sono
  ripresentati dopo il reconnect; l'ordinamento di una retry rispetto a eventi
  successivi resta il limite gia' documentato per questa chat locale.
- La modifica temporanea `refetchOnWindowFocus: false` e' stata rimossa prima
  della chiusura; non restano modifiche di codice introdotte dallo smoke test.

## Riepilogo finale

La verifica end-to-end reale ha dimostrato il percorso
`HTTP -> PostgreSQL -> Redis -> queue:work -> Reverb -> Echo -> browser` con
worker attivo e fermo, senza duplicati. Con Reverb fermo il broadcast ha
esaurito i tre tentativi ed e' comparso in `failed_jobs`; la query Tinker
read-only ha confermato il job corretto senza esporre dati sensibili. Dopo il
reconnect automatico senza refresh, `queue:retry` ha consegnato una sola bubble,
il cleanup ha rimosso il messaggio e `queue:failed` e' tornato vuoto. Suite
backend e frontend, Pint, PHPStan, lint, typecheck e build sono riusciti.
