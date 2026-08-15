# M2-002 — Autorizzare il canale privato chat

- **Stato:** completato
- **Milestone:** Milestone 2 — Real-time diretto con Reverb ed Echo
- **Data di apertura:** 2026-08-13
- **Data di chiusura:** 2026-08-15

## Contesto

Gli eventi Message del task M2-001 usano un unico canale di gruppo. L'autorizzazione deve restare una decisione server-side coerente con Sanctum.

## Obiettivo

Registrare `private-chat` e autorizzarne l'accesso per ogni utente autenticato tramite `auth:sanctum`.

## Fuori scope

- Frontend, Echo, Reverb e relative dipendenze.
- Controller, model, policy e Resource Message.
- Configurazione Redis e queue.

## File modificabili

- `backend/routes/channels.php`.
- Bootstrap/routing broadcasting strettamente necessario.
- `backend/config/cors.php` per il solo path dell'endpoint broadcasting.
- Test autorizzazione e CORS backend.
- `docs/learning/broadcasting-reverb-echo.md`.
- Questo task.

## File non modificabili

- Frontend.
- Controller, model, policy e Resource Message.
- Configurazione e dipendenze Reverb.
- Migration.

## Requisiti

- Ogni utente autenticato via `auth:sanctum` puo' autorizzare esclusivamente `private-chat`.
- Un ospite riceve `401` dal channel authorization endpoint.
- Il client non prende decisioni autorizzative.
- La preflight CORS da un'origine SPA ammessa puo' raggiungere
  `/broadcasting/auth` con credenziali.
- Aggiornare la guida learning con problema, funzionamento e ruolo di canali pubblici e privati, autorizzazione server-side e Sanctum; includere configurazione minima, verifica/test, errore comune, differenza production, esercizio e documentazione Laravel ufficiale compatibile.

## Strategia di test

RED/GREEN/REFACTOR con richieste POST all'endpoint di autorizzazione: sessione Sanctum valida e sessione assente. Aggiungere una feature test della preflight `OPTIONS /broadcasting/auth` con origine SPA, credenziali e header XSRF richiesto.

## Comandi da eseguire

- `git status --short`
- `git diff --stat`
- `git diff --check`
- Revisione di `docs/learning/broadcasting-reverb-echo.md` rispetto ai requisiti didattici.
- Da `backend/`: dopo ogni modifica alle route locali con cache attiva,
  `php artisan route:clear`; poi Pest mirato, `composer test`,
  `./vendor/bin/pint --test`, `./vendor/bin/phpstan analyse --memory-limit=512M`.

## Criteri di accettazione

- [x] `private-chat` e' registrato: gli eventi `PrivateChannel('chat')` sono
  associati alla regola server-side `Broadcast::channel('chat', ...)`.
- [x] Utente Sanctum autenticato accede al solo endpoint protetto e la regola
  `private-chat` resta registrata server-side. La firma di autorizzazione
  Pusher/Reverb non e' simulata con il broadcaster `log`: e' verificata in
  M2-003, dopo la configurazione del driver reale.
- [x] Ospite riceve `401`: verifica manuale Postman dello sviluppatore del
  2026-08-15 senza autenticazione, dopo `redirectGuestsTo(null)`.
- [x] I test osservano l'endpoint pubblico di channel authorization in
  `backend/tests/Feature/Http/ChannelsTest.php`.
- [x] La configurazione CORS include `broadcasting/auth` e il feature test
  osserva la preflight con origine esplicita, credenziali e header richiesto.
- [x] La guida learning spiega il confine autorizzativo server-side per un
  principiante, verificato con revisione manuale rispetto ai requisiti.
- [x] Tutti i controlli sono registrati con evidenza.

## Rischi e assunzioni

Il canale rappresenta la chat di gruppo, non una stanza per utente. L'accesso e' uniforme per tutti gli utenti autenticati.

## Verifica manuale

Effettuare una richiesta di channel authorization con e senza cookie Sanctum e verificare rispettivamente risposta positiva e 401.

Non eseguibile nel sandbox: PHP 8.5 Lerd non puo' avviarsi senza accesso al
D-Bus della sessione dello sviluppatore. Da ambiente locale Lerd, eseguire prima
`./vendor/bin/pest tests/Feature/Http/ChannelsTest.php` in `backend/`; per la
prova browser, dopo login SPA inviare `POST /broadcasting/auth` con
`channel_name=private-chat` e `socket_id` valido, poi ripetere senza cookie.

## Decisioni emerse

Nessuna.

## File modificati

- `backend/bootstrap/app.php`
- `backend/config/cors.php`
- `backend/routes/channels.php`
- `backend/tests/Feature/Http/ChannelsTest.php`
- `docs/learning/broadcasting-reverb-echo.md`
- Questo task.
- `docs/project/current-state.md`

## Risultati dei controlli

- `git status --short` iniziale: riuscito; erano gia' presenti le modifiche
  M2-002 dichiarate nel task, senza modifiche estranee rilevate.
- RED, `./vendor/bin/pest tests/Feature/Http/ChannelsTest.php` da `backend/`:
  non eseguibile (exit 1). Lerd PHP 8.5 non puo' connettersi al D-Bus della
  sessione nel sandbox; il RED non e' quindi osservabile qui.
- Il feature test CORS richiede `OPTIONS /broadcasting/auth` dall'origine SPA,
  con `Content-Type` e `X-XSRF-TOKEN`; la configurazione include ora il path.
  L'esecuzione dinamica resta soggetta allo stesso blocco Lerd.
- Il test della risposta di autorizzazione per utente autenticato e' marcato
  `skip`: il driver Pusher/Reverb non e' ancora configurato e il suo formato
  sara' verificato in M2-003, senza simulare un risultato `true` come prova del
  driver reale.
- GREEN, stesso comando: non eseguibile per lo stesso motivo (exit 1).
- Fallback, `/usr/bin/php vendor/bin/pest tests/Feature/Http/ChannelsTest.php`:
  non eseguibile (exit 255), perche' il PHP del sandbox e' 8.3.6 mentre le
  dipendenze Composer richiedono PHP >= 8.5.0.
- `/usr/bin/php -l bootstrap/app.php`, `config/cors.php`, `routes/channels.php` e
  `tests/Feature/Http/ChannelsTest.php`: riuscito, nessun errore di sintassi.
- `composer test` da `backend/`: non eseguibile (exit 1), stesso errore D-Bus
  Lerd; inoltre il wrapper non puo' sincronizzare una directory in sola lettura.
- `./vendor/bin/pint --test` da `backend/`: non eseguibile (exit 1), stesso
  errore D-Bus Lerd.
- `./vendor/bin/phpstan analyse --memory-limit=512M` da `backend/`: non
  eseguibile (exit 1), stesso errore D-Bus Lerd.
- Verifica locale Lerd, 2026-08-15, prima del clear della route cache:
  `./vendor/bin/pest tests/Feature/Http/ChannelsTest.php` termina con 2
  fallimenti, 1 skip e 1 successo (12 assertion). La preflight CORS riesce; le
  due richieste `POST` ricevono invece `404` anziche' `403` e `401`.
- Causa del `404`: `bootstrap/cache/routes-v7.php`, file locale ignorato,
  contiene le route compilate prima di M2-002 e non include
  `/broadcasting/auth`. `composer test` esegue solo `config:clear`, non
  `route:clear`; con route cache attiva Laravel non registra la nuova route.
- Verifica locale Lerd, 2026-08-15, `composer test`: stesso risultato del Pest
  mirato (2 fallimenti, 1 skip, 26 successi, 170 assertion, exit 1).
- Verifica locale Lerd, 2026-08-15, `./vendor/bin/pint --test`: exit 1 per una
  sola issue preesistente e fuori scope in
  `tests/Feature/Http/Controllers/MessageBroadcastingTest.php`
  (`function_declaration`).
- Verifica locale Lerd, 2026-08-15,
  `./vendor/bin/phpstan analyse --memory-limit=512M`: riuscito, 38/38, nessun
  errore.
- Verifica locale Lerd, 2026-08-15, dopo `php artisan route:clear`, Pest
  mirato: il canale non registrato e la preflight CORS riescono; il test guest
  raggiunge `auth:sanctum` ma riceve `500` invece di `401` perche' il bootstrap
  Laravel predefinito tenta `route('login')`, assente nell'app API.
- Correzione: `backend/bootstrap/app.php` configura
  `redirectGuestsTo(null)`. Un guest non viene reindirizzato a una pagina web
  inesistente e l'endpoint produce quindi `401`.
- Verifica manuale Postman dello sviluppatore, 2026-08-15, senza cookie o
  autenticazione: `POST /broadcasting/auth` restituisce `401 Unauthorized`.
  Conferma il comportamento del guest dopo la correzione del bootstrap.
- Verifica finale nel sandbox, 2026-08-15: `/usr/bin/php -l` e'
  riuscito su bootstrap, CORS, route channels e feature test; `git diff --check`
  e' riuscito. Pest mirato, `composer test`, Pint e PHPStan non sono avviabili
  qui (exit 1 prima dei test): Lerd PHP 8.5 non puo' connettersi al D-Bus della
  sessione. Questo e' un limite del sandbox, non un fallimento dei controlli.
- Revisione della guida learning: riuscita. Copre problema, canali
  pubblici/privati, confine Sanctum, configurazione minima, test, errore comune,
  produzione, esercizio e riferimenti Laravel 13/Sanctum 13.
- `git diff --check`: riuscito.
- `git diff --stat` e revisione del diff completo, inclusi i due file non
  tracciati con `git diff --no-index`: eseguiti; nessuna modifica fuori scope
  rilevata.

## Problemi residui

Pint completo resta bloccato dalla sola issue preesistente fuori scope; PHPStan
e' riuscito. La forma di risposta dell'autorizzazione Pusher/Reverb resta
rinviata a M2-003, che configurerà il driver reale.

## Riepilogo finale

Implementata la registrazione server-side del canale e i feature test HTTP,
senza modificare frontend, Reverb, queue o CRUD. La verifica Postman ha
confermato il rifiuto `401` per un ospite e il task e' spostato in `completed`.
La firma Pusher/Reverb resta fuori scope e sara' verificata da M2-003.
