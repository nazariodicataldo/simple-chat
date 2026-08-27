# M3-004 — Verificare broadcast Redis, worker e retry

- **Stato:** proposta
- **Milestone:** Milestone 3 — Redis e queue
- **Data di apertura:** 2026-08-26
- **Dipendenze:** M3-001, M3-002, M3-003

## Contesto

M3 sostituisce il broadcast sincrono con il percorso:

```text
HTTP -> PostgreSQL -> Redis queue -> queue:work -> Reverb -> Echo -> browser
```

Il mittente puo' ricevere `201` prima che il worker invii il broadcast. Redis
conserva il job se il worker e' fermo; retry e `failed_jobs` gestiscono il
fallimento server-side del broadcast, non aggiungono un retry UI per un utente.

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
  `failed_jobs`. Reverb viene riavviato, entrambi i browser completano una
  subscription `private-chat`, poi `queue:retry <uuid-esatto>` riesegue il job
  e B riceve una sola bubble.
- Il report separa sempre HTTP/persistenza, job Redis/worker, Reverb/Echo e UI.

## Strategia di test

Questa e' una prova end-to-end reale, non sostituibile da Queue/Broadcast fake.
Prima eseguire i controlli backend di M3-001/M3-003; poi registrare per ogni
scenario timestamp, ID messaggio, stato worker e risultato in A/B.

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
- Da `frontend/`: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`
- Runtime locale: `php artisan reverb:start` e `pnpm dev:https`

## Criteri di accettazione

- [ ] Con worker sano, CREATE, UPDATE e DELETE A -> B arrivano una sola volta,
  entro 5 s, e A converge allo stesso stato senza duplicati.
- [ ] A worker fermo, la persistenza HTTP riesce mentre B non vede l'evento;
  alla ripartenza del worker B riceve il job pendente una sola volta.
- [ ] Con Reverb fermo, il job broadcast tenta tre volte con backoff 5 s e
  compare in `failed_jobs` con UUID identificabile.
- [ ] Dopo Reverb attivo e subscription ristabilite, `queue:retry` del solo
  UUID verificato trasmette il broadcast e B riceve una sola bubble.
- [ ] Non restano failed jobs o messaggi di prova creati dalla verifica;
  eventuali cleanup sono tracciati con ID/UUID non sensibili.
- [ ] Console senza errori applicativi, auth `200`, subscription
  `private-chat` e socket Reverb WSS sono osservati separatamente da HMR.
- [ ] Tutti i controlli automatici hanno esito o limitazione esplicita; lo
  stato progetto e il changelog cambiano solo dopo questa evidenza completa.

## Rischi e assunzioni

Se Reverb viene fermo, Echo deve potersi riconnettere e risottoscrivere prima
di `queue:retry`; altrimenti un broadcast riuscito ma non osservato non prova
la catena completa.

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
   broadcast tre volte, con due attese di circa 5 s.
2. A crea un messaggio marcato `M3 reverb retry`; HTTP deve riuscire. Usare
   `php artisan queue:failed` per individuare il solo UUID del suo broadcast.
3. Riavviare Reverb; attendere in A e B connessione WSS, auth `200` e
   `pusher_internal:subscription_succeeded` per `private-chat`.
4. Eseguire `php artisan queue:retry <uuid-esatto>`; B deve ricevere una sola
   bubble del messaggio. Verificare che A non introduca duplicati.
5. Eliminare il messaggio di prova e controllare che `queue:failed` non mostri
   job di test residui. Non eseguire comandi bulk su failed jobs.

## Decisioni emerse

- Retry/failure sono server-side: non sono associati solo al mittente e non
  introducono UI retry.
- A worker fermo, PostgreSQL resta fonte di verita': HTTP riesce e Redis
  conserva il job finche' il worker torna disponibile.
- Il recupero riuscito e' provato con il vero job broadcast dopo ripristino
  Reverb, non con il fixture sempre fallente M3-003.
- Il limite di riordinamento retry e' accettato e documentato per questa chat
  locale/toy; tombstone o versioning richiedono un task separato.

## File modificati

Da compilare durante il task.

## Risultati dei controlli

Da compilare durante il task.

## Problemi residui

Da compilare durante il task.

## Riepilogo finale

Da compilare alla chiusura del task.
