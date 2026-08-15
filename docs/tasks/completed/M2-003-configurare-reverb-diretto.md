# M2-003 — Configurare Reverb diretto

- **Stato:** completato
- **Milestone:** Milestone 2 — Real-time diretto con Reverb ed Echo
- **Data di apertura:** 2026-08-13
- **Data di chiusura:** 2026-08-15

## Contesto

Dopo la definizione degli eventi e l'autorizzazione del canale, Laravel deve avere un trasporto WebSocket locale per il broadcasting sincrono.

## Obiettivo

Installare e configurare Laravel Reverb per il broadcasting diretto, senza introdurre queue, Redis worker o Horizon.

## Fuori scope

- Frontend ed Echo.
- Route, controller, model, policy e Resource Message.
- Migration, Redis e configurazione queue.

## File modificabili

- `backend/composer.json` e `backend/composer.lock`.
- Configurazioni broadcasting/Reverb generate e necessarie.
- `backend/.env.example`.
- Test o smoke config pertinenti.
- `docs/learning/broadcasting-reverb-echo.md`.
- Questo task.

## File non modificabili

- Frontend.
- Route, controller, model, policy e Resource Message.
- Migration.
- Redis e configurazione queue.

## Requisiti

- Aggiungere soltanto `laravel/reverb` e il trasporto Pusher richiesto dal driver Laravel.
- Impostare `BROADCAST_CONNECTION=reverb`.
- Rendere configurabili app key pubblica, host, porta e schema.
- Distinguere host e porta di ascolto del processo Reverb da host e porta del
  broadcaster, e limitarne le origini browser configurabili.
- Conservare il segreto solo sul backend e non inserire valori reali negli esempi.
- Mantenere `ShouldBroadcastNow` sincrono.
- Aggiornare la guida learning con problema, funzionamento e ruolo di Reverb, trasporto Pusher, configurazione minima, app key pubblica e segreto backend; includere verifica/test, errore comune, differenza production, esercizio e documentazione Laravel ufficiale compatibile.

## Strategia di test

Non applicare RED/GREEN/REFACTOR al puro wiring. Aggiungere prima un feature
test dell'endpoint di autorizzazione con driver Reverb e firma Pusher attesa;
eseguire inoltre controllo sintattico/configurazione e avvio controllato di
`reverb:start`.

## Comandi da eseguire

- `git status --short`
- `git diff --stat`
- `git diff --check`
- Revisione di `docs/learning/broadcasting-reverb-echo.md` rispetto ai requisiti didattici.
- Da `backend/`: `composer test`, `./vendor/bin/pint --test`, `./vendor/bin/phpstan analyse --memory-limit=512M`, comandi Artisan di configurazione e smoke `php artisan reverb:start`.

## Criteri di accettazione

- [x] Reverb e il trasporto Pusher necessario sono le sole nuove dipendenze backend.
- [x] La configurazione seleziona Reverb e non richiede una queue.
- [x] Host e porta del processo Reverb sono espliciti e le origini browser sono
  ristrette tramite configurazione.
- [x] Nessun segreto compare in variabili `NEXT_PUBLIC_` o file esempio con valore reale.
- [x] Il feature test osserva la firma Pusher/Reverb di un utente Sanctum sul
  canale `private-chat`.
- [x] La guida learning spiega Reverb e la configurazione sicura per un principiante.
- [x] Il smoke Reverb e i controlli backend hanno evidenza registrata.

## Rischi e assunzioni

L'avvio Reverb puo' dipendere dal runtime locale Lerd. L'eventuale impossibilita' del sandbox va documentata con istruzioni ripetibili.

## Verifica manuale

Avviare Reverb con l'ambiente locale e confermare che ascolti sull'host e porta configurati.

## Decisioni emerse

Reverb e il trasporto Pusher richiesto sono le uniche eccezioni motivate al vincolo sulle dipendenze.

## File modificati

- `backend/composer.json` e `backend/composer.lock`: aggiunti soltanto
  `laravel/reverb` e `pusher/pusher-php-server` come dipendenze dirette.
- `backend/config/broadcasting.php`: pubblicata la connessione `reverb` e
  selezionata tramite `BROADCAST_CONNECTION`.
- `backend/config/reverb.php`: pubblicata la configurazione del server Reverb.
- `backend/.env.example`: configurazione locale senza credenziali reali per
  connessione, ID, chiave, segreto, host, porte del broadcaster e del server,
  schema e origini browser ammesse.
- `backend/tests/Concerns/UsesReverbForChannelTests.php`: configura Reverb con
  credenziali fittizie soltanto prima del bootstrap dei test Channels.
- `backend/tests/Feature/Http/ChannelsTest.php`: driver Reverb reale con
  asserzione di una firma Pusher nota per `private-chat`; rimossi gli override
  Redis non piu' necessari.
- `docs/learning/broadcasting-reverb-echo.md`: aggiunta la sezione Reverb per
  principianti.
- `backend/tests/Feature/Http/Controllers/MessageBroadcastingTest.php`:
  corretta la sola formattazione `function_declaration` autorizzata dopo il
  fallimento Pint iniziale.
- `docs/project/current-state.md`: registrati completamento ed evidenze.

## Risultati dei controlli

- `composer require laravel/reverb pusher/pusher-php-server`: installati
  `laravel/reverb 1.11.1` e `pusher/pusher-php-server 7.3.0` (11 pacchetti
  transitivi); il post-script preesistente `php artisan boost:update` termina
  con errore perche' Boost non e' configurato.
- `/usr/bin/php -l config/broadcasting.php` e `/usr/bin/php -l
  config/reverb.php`: riusciti. Il binario di sistema 8.3 e' stato usato solo
  per la sintassi; i controlli Laravel usano PHP 8.5 Lerd.
- `composer test`: riuscito, 28 test superati, 170 assertion, 1 skipped.
- `./vendor/bin/pint --test`: riuscito dopo la correzione autorizzata della
  sola formattazione `function_declaration` in
  `tests/Feature/Http/Controllers/MessageBroadcastingTest.php`.
- `./vendor/bin/phpstan analyse --memory-limit=512M`: riuscito, 0 errori.
- `php artisan config:cache`: riuscito; un controllo Artisan non invasivo ha
  confermato la risoluzione della connessione, del server e dell'app Reverb.
- `php artisan reverb:start`: processo Reverb osservato in esecuzione con
  server `0.0.0.0:8080`, connessione `reverb`; terminato al termine dello
  smoke e il controllo successivo non ha rilevato listener residui.
- Revisione post-completamento: il nuovo feature test non e' eseguibile nel
  sandbox, perche' il wrapper PHP 8.5 non puo' avviare Lerd senza accesso al
  D-Bus. Rieseguire da ambiente locale Lerd il test mirato e l'intera suite
  prima di richiudere il task.
- Revisione post-completamento, 2026-08-15: `/usr/bin/php -l` e' riuscito su
  `bootstrap/app.php`, `config/broadcasting.php`, `config/reverb.php` e
  `tests/Feature/Http/ChannelsTest.php`. Il fallback
  `/usr/bin/php vendor/bin/pest tests/Feature/Http/ChannelsTest.php` non puo'
  avviare Pest perche' le dipendenze richiedono PHP >= 8.5.0 mentre il sandbox
  ha PHP 8.3.6. `composer test`, `./vendor/bin/pint --test` e
  `./vendor/bin/phpstan analyse --memory-limit=512M` falliscono prima dei
  controlli per lo stesso blocco D-Bus del wrapper Lerd.
- Revisione post-completamento, 2026-08-15: `git diff --check` e' riuscito.
- Revisione post-completamento, 2026-08-15: il primo tentativo del feature test
  ha rivelato che il canale viene registrato durante il bootstrap sul driver
  configurato in quel momento. Il trait di test dedicato configura quindi Reverb
  prima del bootstrap soltanto per i test Channels; rieseguire i controlli
  backend locali.
- Revisione post-completamento, 2026-08-15: `composer test` e' riuscito con 29
  test e 172 assertion. `./vendor/bin/pint --test` e
  `./vendor/bin/phpstan analyse --memory-limit=512M` sono riusciti senza errori.

## Problemi residui

- Il post-script Composer `boost:update` fallisce per Boost non configurato;
  l'installazione delle dipendenze Reverb e Pusher e' comunque stata completata
  e bloccata nel lockfile.
- Nessuno relativo alle correzioni di revisione.

## Riepilogo finale

Configurazione Reverb diretta e guida aggiornate, senza queue, Redis worker,
Horizon o modifiche frontend. Il feature test Reverb e i controlli backend sono
verificati nell'ambiente locale Lerd.
