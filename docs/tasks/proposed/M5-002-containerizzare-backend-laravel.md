# M5-002 — Containerizzare backend Laravel

- **Stato:** proposta
- **Milestone:** Milestone 5 — Docker
- **Data di apertura:** 2026-09-03
- **Data di chiusura:**
- **Dipendenze:** M5-001

## Contesto

M5-001 fornisce PostgreSQL e Redis isolati nella rete Compose. Laravel deve ora
girare con PHP ed estensioni dichiarati dall'immagine del progetto, non dal PHP
installato da Lerd o dall'host.

## Obiettivo

Costruire un servizio Laravel riproducibile per sviluppo, collegarlo a
PostgreSQL e Redis Compose e rendere esplicita la procedura per dipendenze,
chiave applicativa e migrazioni iniziali.

## Fuori scope

- Frontend, HTTPS, reverse proxy e accesso HTTP dal browser.
- Reverb, Horizon o qualunque secondo consumer della queue.
- Immagine di produzione, scheduler, deploy e ottimizzazioni.
- Modifiche ad API, migration, policy, eventi e `.lerd.yaml`.

## File modificabili

- `compose.yaml`
- `docker/backend/Dockerfile`
- `docker/backend/` per soli file di bootstrap necessari al container
- `.dockerignore`
- `compose.env.example`
- `backend/.env.example`, solo per valori Compose diversi e non segreti
- `docs/learning/docker-compose.md`
- Questo task

## File non modificabili

- Codice di dominio Laravel, frontend, configurazioni Lerd, dipendenze e
  lockfile, salvo un difetto direttamente necessario alla configurazione Docker.

## Requisiti

- L'immagine dichiara PHP compatibile con `backend/composer.json`, estensioni
  Laravel/PostgreSQL/Redis e Composer; non copia `vendor/` o runtime dell'host.
- Il sorgente resta modificabile senza ricostruire l'immagine per ogni edit;
  dipendenze e cache non devono finire nel repository.
- Le variabili Docker puntano solo a `postgres` e `redis`, mai a `localhost` o
  host Lerd.
- La migrazione iniziale parte solo dopo PostgreSQL healthy. Un fallimento resta
  visibile e non e' ignorato da script shell generici.
- Il backend non pubblica porte host: M5-005 esporra' HTTP/HTTPS tramite Nginx.

## Strategia di test

Costruire l'immagine da zero, avviare dipendenze e backend, verificare le
connessioni e applicare le migration in un database Compose nuovo. La suite nel
container controlla contratti applicativi, non proxy o browser.

## Comandi da eseguire

- `git status --short`
- `docker compose --env-file compose.env build backend`
- `docker compose --env-file compose.env up -d postgres redis backend`
- `docker compose --env-file compose.env ps`
- `docker compose --env-file compose.env exec backend php artisan about`
- `docker compose --env-file compose.env exec backend php artisan migrate:status`
- `docker compose --env-file compose.env exec backend composer test`
- `docker compose --env-file compose.env exec backend ./vendor/bin/pint --test`
- `docker compose --env-file compose.env exec backend ./vendor/bin/phpstan analyse --memory-limit=512M`
- `docker compose --env-file compose.env down`
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [ ] Il build e l'avvio riescono senza PHP, Composer o database dell'host/Lerd.
- [ ] Laravel raggiunge PostgreSQL e Redis tramite nomi Compose e le migration
  risultano applicate.
- [ ] Suite, Pint e PHPStan hanno un esito registrato nel container o una
  limitazione riproducibile.
- [ ] Codice, dipendenze e cache generati localmente non sporcano Git.
- [ ] Nessuna porta backend e' pubblicata sull'host.

## Rischi e assunzioni

Un bind mount puo' mascherare file prodotti nel build. Il task sceglie in modo
esplicito dove vivono `vendor/` e cache, senza un entrypoint che nasconda errori.
Il database e' quello isolato M5-001: non importare dati Lerd.

## Verifica manuale

1. Partire senza Lerd avviato per il progetto.
2. Costruire e avviare backend con le sole dipendenze M5-001.
3. Controllare migration e connessioni Laravel, poi eseguire i controlli nel
   container.
4. Arrestare Compose e verificare che nessun file generato sia pronto per Git.

## Decisioni emerse

- Il backend e' un processo PHP interno alla rete Compose; Nginx M5-005 e'
  l'unico punto di ingresso host.
- M5 usa immagine di sviluppo e bind mount, non immagini ottimizzate per M7.

## File modificati

## Risultati dei controlli

## Problemi residui

## Riepilogo finale
