# M5-001 — Definire fondazioni Docker Compose

- **Stato:** completato
- **Milestone:** Milestone 5 — Docker
- **Data di apertura:** 2026-09-03
- **Data di chiusura:** 2026-09-03
- **Dipendenze:** nessuna

## Contesto

Lerd ha finora gestito PHP, PostgreSQL e Redis tramite Podman. M5 introduce un
ambiente locale autosufficiente: chi clona il repository deve poter usare Docker
Engine e `docker compose` senza installare o avviare Lerd.

Questa prima parte isola le dipendenze persistenti. Non avvia ancora Laravel o
Next.js e non modifica contratti HTTP, autenticazione o real-time.

## Obiettivo

Introdurre la base Compose con PostgreSQL e Redis in rete privata, healthcheck
utili, volume nominato persistente per PostgreSQL e configurazione locale
ignorata dal repository.

## Fuori scope

- Backend, frontend, Reverb, Horizon e reverse proxy.
- Migrazioni, seed, codice applicativo e `.lerd.yaml`.
- Porte host per PostgreSQL o Redis.
- Rimuovere Lerd, immagini, container o volumi Lerd.
- Reset automatico o implicito dei dati persistenti.

## File modificabili

- `compose.yaml`
- `compose.env.example`
- `.gitignore`, solo per ignorare il file Compose locale scelto
- `docs/learning/docker.md`
- `docs/project/current-state.md`
- Questo task

## File non modificabili

- `backend/`, `frontend/`, `.lerd.yaml`, lockfile, dipendenze e variabili
  locali esistenti.
- Volumi e dati creati da Lerd o da altri progetti Docker.

## Requisiti

- Il comando di riferimento e' `docker compose`; Podman e Lerd non sono
  prerequisiti dell'ambiente Compose.
- Un file locale ignorato contiene i valori necessari. Il template versionato
  non contiene chiavi, password effettive o certificati.
- PostgreSQL e Redis non pubblicano porte host; i servizi successivi li
  raggiungeranno come `postgres` e `redis` nella rete Compose.
- PostgreSQL usa un volume nominato. `docker compose down` lo conserva;
  `down -v` e' documentato come reset distruttivo esplicito.
- Gli healthcheck dimostrano disponibilita' reale. I task dipendenti potranno
  usare `service_healthy`.
- Linux e' la piattaforma verificata; la guida annota macOS/Windows come non
  verificati, pur usando gli stessi comandi Compose.

## Strategia di test

Validare il modello Compose, avviare solo PostgreSQL e Redis, osservarne lo
stato healthy e verificare che un dato innocuo di PostgreSQL sopravviva a
`down` e successivo `up`, senza usare dati della chat.

## Comandi da eseguire

- `git status --short`
- `docker compose --env-file compose.env config --quiet`
- `docker compose --env-file compose.env up -d postgres redis`
- `docker compose --env-file compose.env ps`
- `docker compose --env-file compose.env exec postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'`
- `docker compose --env-file compose.env exec redis redis-cli ping`
- `docker compose --env-file compose.env down`
- `docker compose --env-file compose.env up -d postgres redis`
- `docker compose --env-file compose.env down`
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [x] `docker compose config --quiet` con il file locale completo termina con
  esito zero.
- [x] PostgreSQL e Redis risultano healthy e raggiungibili internamente.
- [x] PostgreSQL non perde il dato di prova dopo `down` senza `-v`.
- [x] Il reset con `down -v` e' l'unica procedura documentata che elimina il
  volume della milestone.
- [x] Nessun servizio Lerd, porta host di database o segreto e' richiesto.

## Rischi e assunzioni

Si assume Docker Engine con plugin Compose su Linux. L'host puo' avere Lerd
installato, ma Compose non usa rete, DNS, container o volumi Lerd. Il nome
progetto e' fissato in `compose.yaml` a `simple-chat`; non avviare M5-001 se
un altro stack attivo usa gia' intenzionalmente quel nome.

## Verifica manuale

1. Copiare il template locale, valorizzarlo senza inserirlo in Git e validare
   il modello Compose.
2. Avviare solo i due servizi; attendere gli healthcheck e verificare
   `pg_isready` e `PONG` dall'interno dei container.
3. Inserire un dato innocuo, eseguire `down` e `up`, quindi controllare che
   sia ancora presente.
4. Arrestare con `down`, senza usare `-v`.

## Decisioni emerse

- Docker Compose sostituisce Lerd per M5, non si sovrappone ai suoi servizi.
- PostgreSQL e Redis restano privati alla rete Compose; persiste solo il
  database PostgreSQL.
- Linux e' l'unica piattaforma verificata in M5.
- Il progetto Compose usa `name: simple-chat`, `postgres:17` e
  `redis:8-alpine`.
- `compose.env` e' locale e ignorato; Redis resta senza password nella rete
  privata, come l'ambiente Lerd attuale.

## File modificati

- `compose.yaml`
- `compose.env.example`
- `.gitignore`
- `docs/learning/docker.md`
- `docs/project/current-state.md`
- Questo task

## Risultati dei controlli

- `docker compose --env-file compose.env config --quiet`: riuscito.
- `docker compose --env-file compose.env up -d --wait postgres redis`:
  PostgreSQL e Redis `healthy`.
- `pg_isready` nel container PostgreSQL: connessioni accettate.
- `redis-cli ping` nel container Redis: `PONG`.
- Due client Compose temporanei hanno raggiunto `postgres` e `redis` tramite i
  rispettivi nomi DNS: `SELECT 1` e `PONG` riusciti.
- Il record innocuo `5001` nella tabella `m5_volume_check` e' rimasto presente
  dopo `down` e un nuovo `up`.
- `docker compose --env-file compose.env down`: riuscito senza `-v`.

## Problemi residui

Nessuno.

## Riepilogo finale

M5-001 e' completato: il modello Compose, la rete privata e la persistenza del
volume PostgreSQL sono verificati su Linux.
