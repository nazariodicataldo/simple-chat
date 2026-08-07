# ADR 0001 — Usare Lerd per l’ambiente backend locale

- **Stato:** accettato
- **Data:** 2026-08-07

## Contesto

Il backend Laravel richiede una versione PHP coerente con le dipendenze e servizi locali per PostgreSQL e Redis. La configurazione Lerd del progetto dichiara già Laravel 13, PHP 8.5, PostgreSQL, Redis e Mailpit.

## Problema

Senza una scelta esplicita, il runtime PHP, Composer, server web e servizi locali possono divergere tra macchine. Un database remoto non è necessario per lo sviluppo corrente.

## Opzioni considerate

- Usare Lerd per runtime, server web e servizi locali.
- Usare un database remoto per lo sviluppo e installare i servizi locali manualmente.
- Introdurre Docker Compose prima delle milestone applicative.

## Decisione

Per lo sviluppo locale del backend usiamo Lerd. Lerd fornisce PHP 8.5 e l’ambiente in cui eseguire Composer e Laravel, espone il web server locale e avvia PostgreSQL e Redis locali. Mailpit resta disponibile come servizio di sviluppo, senza introdurre flussi email. I servizi remoti vengono messi da parte.

`backend/.php-version` e `backend/.lerd.yaml` fissano PHP 8.5; `backend/composer.json` richiede PHP `^8.5`.

## Motivazione

Una sola configurazione versionata riduce il setup manuale, allinea il runtime alle dipendenze Composer e permette di usare PostgreSQL e Redis senza anticipare Docker o infrastruttura remota.

## Conseguenze

- I comandi backend locali vanno eseguiti tramite l’ambiente Lerd.
- PostgreSQL locale è il database di sviluppo; Redis locale è disponibile per le milestone che lo richiederanno.
- Docker, queue/worker, Horizon e una scelta di servizi per produzione restano fuori scope.
- Il sandbox dell’agente non può verificare i comandi Lerd perché non accede al D-Bus della sessione dello sviluppatore.

## Condizioni per una futura revisione

Rivalutare la decisione quando servirà un ambiente riproducibile multi-servizio tramite Docker, un database condiviso per integrazione/deployment o una nuova versione PHP non supportata da Lerd.
