# M2-003 — Configurare Reverb diretto

- **Stato:** proposta
- **Milestone:** Milestone 2 — Real-time diretto con Reverb ed Echo
- **Data di apertura:** 2026-08-13
- **Data di chiusura:**

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
- Conservare il segreto solo sul backend e non inserire valori reali negli esempi.
- Mantenere `ShouldBroadcastNow` sincrono.
- Aggiornare la guida learning con problema, funzionamento e ruolo di Reverb, trasporto Pusher, configurazione minima, app key pubblica e segreto backend; includere verifica/test, errore comune, differenza production, esercizio e documentazione Laravel ufficiale compatibile.

## Strategia di test

Non applicare RED/GREEN/REFACTOR a puro wiring. Eseguire controllo sintattico/configurazione, test smoke pertinente e avvio controllato di `reverb:start`.

## Comandi da eseguire

- `git status --short`
- `git diff --stat`
- `git diff --check`
- Revisione di `docs/learning/broadcasting-reverb-echo.md` rispetto ai requisiti didattici.
- Da `backend/`: `composer test`, `./vendor/bin/pint --test`, `./vendor/bin/phpstan analyse --memory-limit=512M`, comandi Artisan di configurazione e smoke `php artisan reverb:start`.

## Criteri di accettazione

- [ ] Reverb e il trasporto Pusher necessario sono le sole nuove dipendenze backend.
- [ ] La configurazione seleziona Reverb e non richiede una queue.
- [ ] Nessun segreto compare in variabili `NEXT_PUBLIC_` o file esempio con valore reale.
- [ ] La guida learning spiega Reverb e la configurazione sicura per un principiante.
- [ ] Il smoke Reverb e i controlli backend hanno evidenza registrata.

## Rischi e assunzioni

L'avvio Reverb puo' dipendere dal runtime locale Lerd. L'eventuale impossibilita' del sandbox va documentata con istruzioni ripetibili.

## Verifica manuale

Avviare Reverb con l'ambiente locale e confermare che ascolti sull'host e porta configurati.

## Decisioni emerse

Reverb e il trasporto Pusher richiesto sono le uniche eccezioni motivate al vincolo sulle dipendenze.

## File modificati

Da compilare durante l'implementazione.

## Risultati dei controlli

Da compilare durante l'implementazione.

## Problemi residui

Nessuno all'apertura.

## Riepilogo finale

Task pianificato, dipende da M2-002.
