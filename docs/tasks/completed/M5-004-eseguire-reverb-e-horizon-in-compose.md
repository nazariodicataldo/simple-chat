# M5-004 — Eseguire Reverb e Horizon in Compose

- **Stato:** completato
- **Milestone:** Milestone 5 — Docker
- **Data di apertura:** 2026-09-03
- **Data di chiusura:** 2026-09-07
- **Data correzione:** 2026-09-07
- **Dipendenze:** M5-001, M5-002

## Contesto

M4 ha gia' dimostrato Redis, Reverb, Echo e Horizon con Lerd. Qui non si
riprogetta il flusso: si sostituiscono i processi Lerd con servizi Compose che
usano l'immagine Laravel M5-002 e Redis M5-001.

## Obiettivo

Eseguire Reverb e il solo consumer Horizon `redis/default` in Docker Compose,
configurando le connessioni interne tra Laravel, Redis e Reverb senza usare
`localhost`, Lerd o worker concorrenti.

## Fuori scope

- Proxy Nginx, certificati, domini host e WebSocket dal browser.
- Nuovi job, retry policy, supervisor, scheduler, code o scaling.
- Ripetere fixture M3-003 o cambiare eventi/payload Message.
- Modifiche a dashboard Horizon, UI o API.

## File modificabili

- `compose.yaml`
- `compose.env.example`
- `tests/compose/image-reuse-backend.sh`
- `backend/.env.example`, `backend/config/reverb.php` e
  `backend/config/horizon.php` solo per valori necessari alla rete Docker
- `docs/learning/docker.md`
- `docs/project/current-state.md`
- Questo task

## File non modificabili

- Dockerfile backend gia' funzionante, codice di dominio, frontend, policy,
  eventi, lockfile e configurazione Lerd, salvo un difetto bloccante approvato.

## Requisiti

- Reverb e Horizon riusano l'immagine backend e comandi espliciti; nessun
  container esegue piu' processi con shell, `supervisord` o `composer dev`.
- Reverb parte dopo Redis `healthy` e dichiara un healthcheck TCP interno su
  `127.0.0.1:8080`. Il controllo prova che il processo ascolta nella propria
  rete, senza pubblicare la porta sull'host.
- Horizon e' l'unico consumer di `redis/default`: non aggiungere `queue:work`,
  `queue:listen` o un secondo servizio Horizon.
- Horizon parte dopo Redis e Reverb `healthy`, cosi' un primo `BroadcastEvent`
  non viene consumato prima che Reverb possa riceverlo.
- Il broadcaster Laravel contatta Reverb con hostname e porta interni Compose;
  `backend` e `horizon` sovrascrivono quindi `REVERB_HOST=reverb`,
  `REVERB_PORT=8080` e `REVERB_SCHEME=http`. Reverb ascolta su
  `0.0.0.0:8080`; l'endpoint WSS pubblico e le variabili `NEXT_PUBLIC_*`
  restano separati fino a M5-005.
- Reverb e Horizon dipendono da Redis healthy e rendono consultabili log e
  stato con comandi Compose.
- Le credenziali Reverb restano locali: il template contiene solo valori fittizi.

## Strategia di test

Il feature test `MessageBroadcastingTest` resta la prova della mutazione HTTP
autenticata e autorizzata: verifica che il controller salvi il messaggio e
accodi il relativo `BroadcastEvent`. Non e' una prova della rete Compose.

Nel runtime Compose, Tinker crea un messaggio marcato e invia
`MessageCreated`: questa seconda prova osserva Redis, Reverb e un solo master
Horizon. Il job completato e l'assenza di un nuovo failed job provano che
Horizon ha ottenuto una risposta da Reverb; il test non dichiara consegna Echo
browser, che resta M5-005. Il cleanup riguarda soltanto il messaggio marcato,
identificato dal suo id, senza operazioni bulk.

## Comandi da eseguire

- `git status --short`
- `docker compose --env-file compose.env config --quiet`
- `bash tests/compose/image-reuse-backend.sh`
- `docker compose --env-file compose.env run --rm --no-deps backend php artisan test tests/Feature/Http/Controllers/MessageBroadcastingTest.php`
- `docker compose --env-file compose.env up -d postgres redis backend reverb horizon`
- `docker compose --env-file compose.env ps`
- `docker compose --env-file compose.env exec backend php artisan horizon:status`
- `docker compose --env-file compose.env logs --tail=100 horizon reverb`
- `docker compose --env-file compose.env exec backend php artisan tinker`
- `docker compose --env-file compose.env exec backend php artisan queue:failed`
- `docker compose --env-file compose.env stop reverb horizon`
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [x] Reverb e Horizon si avviano con immagine backend e rete Compose, senza
  servizi Lerd.
- [x] Reverb e' `healthy` soltanto dopo avere aperto `127.0.0.1:8080` nel
      proprio container; Horizon attende sia Redis sia Reverb `healthy`.
- [x] Horizon e' il solo consumer della queue `default`; nessun worker
  concorrente e' presente.
- [x] Il test HTTP autorizzato esistente passa. Un `MessageCreated` reale,
  creato con Tinker e marker non sensibile, e' completato da Horizon senza
  aggiungere failed job; l'esito prova il collegamento interno a Reverb.
- [x] Log e stato sono consultabili senza copiare payload, cookie, token,
  chiavi o stack trace nella documentazione.
- [x] La consegna browser non e' dichiarata prima di M5-005.

## Rischi e assunzioni

Reverb distingue il collegamento interno del broadcaster dall'URL pubblico
browser. Confonderli trasformerebbe `localhost` nel container stesso o
esporrebbe Reverb direttamente: il task dimostra soltanto la connessione
interna, senza pubblicare la porta Reverb. Un healthcheck TCP prova che Reverb
ascolta, non che consegni a un browser e non riavvia automaticamente Horizon
se Reverb cade dopo l'avvio.

## Verifica manuale

1. Eseguire il feature test HTTP `MessageBroadcastingTest`: la sua request
   Laravel attraversa autenticazione e policy, ma usa una queue fake e non
   prova la rete Compose.
2. Avviare backend, dipendenze, Reverb e Horizon senza Lerd. Verificare che
   Redis e Reverb siano `healthy`, poi lo status Horizon e l'assenza di
   consumer concorrenti.
3. Con Tinker creare un messaggio con marker non sensibile e inviare il suo
   `MessageCreated`; osservare il job completato e confrontare `queue:failed`
   con la baseline. Eliminare soltanto quel messaggio per id, senza cleanup
   bulk.
4. Fermare solo `reverb` e `horizon`; non modificare record Lerd o job
   preesistenti.

## Decisioni emerse

- Horizon resta il solo consumer locale anche in Docker.
- Reverb non pubblica porte host: l'unico ingresso WSS sara' Nginx M5-005.
- Il test HTTP esistente e la prova runtime hanno responsabilita' distinte:
  il primo copre autorizzazione e dispatch, Tinker copre Redis, Horizon e
  Reverb nel runtime Compose.
- Reverb ha un healthcheck TCP interno e Horizon attende anche Reverb
  `healthy`; il controllo non sostituisce la futura prova browser M5-005.
- Al termine della verifica si fermano soltanto `reverb` e `horizon`, per non
  interrompere gli altri servizi Compose eventualmente in uso.

## File modificati

- `compose.yaml`.
- `compose.env.example`.
- `docs/learning/docker.md`.
- `docs/project/current-state.md`.
- `tests/compose/image-reuse-backend.sh`.
- Questo task.

## Risultati dei controlli

- `docker compose --env-file compose.env config --quiet`: riuscito.
- `bash tests/compose/image-reuse-backend.sh`: inizialmente fallito perché
  `backend`, `reverb` e `horizon` risolvevano immagini distinte; dopo la
  correzione passa verificando l'immagine comune `simple-chat-backend` e
  l'assenza di build indipendenti per Reverb e Horizon.
- `docker compose --env-file compose.env config --images`: `backend`, `reverb`
  e `horizon` risolvono tutti `simple-chat-backend`.
- `docker compose --env-file compose.env build backend`: riuscito.
- `docker compose --env-file compose.env up -d postgres redis backend reverb horizon`:
  Reverb e Horizon usano l'immagine backend condivisa; PostgreSQL e Redis
  healthy, Reverb healthy e Horizon avviato dopo Reverb.
- `docker compose --env-file compose.env ps`: nessuna porta Reverb pubblicata
  sull'host; i servizi usano soltanto la rete Compose privata.
- `docker compose --env-file compose.env exec backend php artisan horizon:status`:
  Horizon e' running.
- `docker compose --env-file compose.env logs --tail=100 horizon reverb`:
  log consultabili; il primo avvio ha evidenziato che Reverb ereditava l'host
  PostgreSQL Lerd dal `.env` locale, poi gli override `DB_*` Compose hanno
  portato il servizio al boot corretto su `0.0.0.0:8080`.
- `docker compose --env-file compose.env run --rm --no-deps backend php artisan
  test tests/Feature/Http/Controllers/MessageBroadcastingTest.php`: 5 test e
  22 assertion superati.
- `queue:failed`: nessun failed job nella baseline e dopo il broadcast reale.
  Tinker ha creato il solo messaggio marcato con ID `1` e dispatchato
  `MessageCreated`; Redis ha riportato un job completato, la coda
  `queues:default` vuota, un master e un supervisor Horizon.
- `docker compose --env-file compose.env config --services`: nessun servizio
  `queue:work` o worker concorrente; sono presenti soltanto `reverb` e
  `horizon` per il flusso realtime/queue del task.
- Il messaggio di prova e' stato eliminato esclusivamente per ID `1`; il
  controllo successivo ha confermato che non esiste piu'.
- `docker compose --env-file compose.env stop reverb horizon` e stop
  successivo del solo Reverb: Reverb e Horizon fermi, mentre backend,
  PostgreSQL e Redis sono rimasti attivi.
- `git diff --check`: riuscito.

## Problemi residui

- Nessuno nello scope M5-004. La consegna al browser, HTTPS/WSS, proxy,
  certificati e domini host restano M5-005.

## Riepilogo finale

Task completato: Compose esegue Reverb e l'unico consumer Horizon
`redis/default` con connessioni interne a PostgreSQL/Redis/Reverb, healthcheck
TCP locale e credenziali Reverb fittizie nel template. La prova runtime ha
verificato il broadcast queued fino a Reverb senza failed job; non e' stata
dichiarata alcuna consegna browser.
