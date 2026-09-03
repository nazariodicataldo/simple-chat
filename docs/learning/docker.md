# Docker Compose

Questa guida accompagna la Milestone 5. Compose descrive servizi, rete e volumi
di un'applicazione multi-container in un unico modello, poi li gestisce con
`docker compose`. M5-001 introduce soltanto le dipendenze persistenti;
Laravel, Next.js, Reverb, Horizon e il reverse proxy arriveranno nei task
successivi.

## Teoria e ruolo di M5-001

Lerd ha finora avviato PostgreSQL e Redis tramite Podman. M5 non aggiunge un
secondo ambiente da tenere acceso insieme a Lerd: definisce un ambiente Docker
autonomo, che chi clona il repository possa avviare con Docker Engine e il
plugin Compose.

Compose raggruppa le risorse sotto un nome progetto. M5-001 fissa il nome a
`simple-chat`: questo rende prevedibili rete, container e volume e li isola da
altri progetti Compose, invece di derivarli dalla directory corrente.

PostgreSQL rimane la fonte persistente di verita' della chat. Redis mantiene
invece dati temporanei della queue e di Horizon; in M5-001 non ricevera' un
volume. Nessuno dei due servizi pubblichera' porte sull'host: i futuri
container li raggiungeranno dai nomi DNS `postgres` e `redis` nella rete
privata Compose.

```text
Docker Engine
  -> progetto Compose simple-chat
     -> rete privata -> postgres (dato persistente)
                      -> redis (queue e metadati temporanei)
```

Un container avviato non e' necessariamente pronto a ricevere connessioni. Un
healthcheck esegue una verifica nel container e distingue `running` da
`healthy`. I servizi che M5 aggiungera' in seguito potranno dipendere da
`service_healthy`, evitando di provare a collegarsi a PostgreSQL o Redis troppo
presto.

## Configurazione minima

M5-001 introduce `compose.yaml` e `compose.env.example`; i punti seguenti
descrivono la configurazione da usare nel workflow locale.

- `name: simple-chat` identifica il progetto.
- I soli servizi sono `postgres` con immagine `postgres:17` e `redis` con
  immagine `redis:8-alpine`.
- PostgreSQL riceve il volume nominato `postgres-data`. `docker compose down` rimuove i
  container ma conserva il volume; solo `docker compose down -v` lo elimina.
- I due servizi hanno healthcheck reali: `pg_isready` per PostgreSQL e
  `redis-cli ping` per Redis.
- `compose.env` e' il file locale ignorato letto esplicitamente con
  `--env-file`; `compose.env.example` contiene solo valori di esempio. Il file
  Compose deve collegare esplicitamente le variabili che il container deve
  ricevere: un file `--env-file` serve prima di tutto a risolvere il modello
  Compose, non inietta automaticamente ogni valore nel container.
- La password PostgreSQL locale non entra in Git. Redis resta senza password,
  coerente con Lerd, perche' e' privato alla rete Compose e senza porte host.

Linux e' la sola piattaforma verificata per M5. Gli stessi comandi possono
essere utili su macOS e Windows, ma non costituiscono ancora una prova
supportata dal progetto.

## Verifica e test di M5-001

La prima prova e' statica: `docker compose --env-file compose.env config
--quiet` deve validare il modello risolto senza stampare o copiare i valori del
file locale. Questa prova non scarica immagini, non crea container e non prova
la disponibilita' dei servizi.

La prova runtime avvia solo `postgres` e `redis`, osserva che entrambi siano
`healthy`, quindi esegue `pg_isready` e `redis-cli ping` dall'interno dei
rispettivi container. Un record innocuo, estraneo alla chat, inserito in
PostgreSQL deve esistere anche dopo un `down` seguito da un nuovo `up`.
Dimostra la persistenza del volume nominato; non dimostra ancora migrazioni,
queue, broadcast, Horizon, autenticazione o browser.

Al termine della verifica il comando e' `docker compose down`, senza `-v`.
Il reset `down -v` e' intenzionalmente distruttivo: va eseguito soltanto se si
vuole eliminare il volume Docker di M5 e ricominciare da un database vuoto.

## Errori comuni

- Considerare `docker compose ps` con container `running` una prova di
  disponibilita'. Serve lo stato `healthy` e un controllo reale con
  `pg_isready` o `PONG`.
- Pubblicare `5432` o `6379` per abitudine. In M5-001 non servono client host:
  esporle allargherebbe inutilmente la superficie locale.
- Confondere `down` con `down -v`. Il primo conserva il volume PostgreSQL; il
  secondo elimina i dati del volume e non e' un normale arresto.
- Avviare Lerd e Compose aspettandosi che condividano DNS, rete, container o
  volumi. Sono ambienti indipendenti; M5 sostituisce Lerd nel workflow Docker.
- Trattare `compose.env` come un file sicuro da versionare. Resta locale e
  ignorato: il template contiene soltanto segnaposto. Inoltre le variabili
  della shell hanno precedenza su `--env-file`, quindi un valore esportato puo'
  modificare involontariamente la configurazione risolta.
- Usare `-p` o `COMPOSE_PROJECT_NAME` senza motivo. Entrambi prevalgono su
  `name: simple-chat` e cambiano il namespace delle risorse che il task rende
  intenzionalmente stabile.

## Differenze dalla produzione

M5 e' un ambiente locale di apprendimento. La password PostgreSQL locale e'
gestita in un file ignorato, Redis non ha autenticazione e non esistono backup,
rotazione di credenziali, monitoraggio, deploy, immagini applicative o TLS.
Nessuna di queste assenze e' una raccomandazione per un ambiente esposto.

In produzione le credenziali arrivano dal sistema di deploy o da un gestore di
secret, i dati richiedono backup e una strategia di ripristino, le immagini
vanno aggiornate e la rete deve essere definita rispetto all'infrastruttura
reale. Anche il modo di esporre HTTP/HTTPS e WSS sara' affrontato dal task
dedicato al reverse proxy, non anticipato qui.

## Esercizio M5-001

1. Spiega perche' `postgres` e `redis` possono comunicare con i futuri servizi
   senza porte host pubblicate.
2. Descrivi che cosa prova ciascuna delle tre evidenze: `config --quiet`,
   stato `healthy` e persistenza dopo `down`/`up`.
3. Indica quale comando conserva il volume e quale lo elimina, e perche' il
   secondo non va usato come normale pulizia.
4. Spiega la differenza tra una variabile usata per interpolare Compose e una
   variabile effettivamente disponibile nel container PostgreSQL.

## Documentazione ufficiale

- [Docker Compose](https://docs.docker.com/compose/)
- [Nome progetto Compose](https://docs.docker.com/compose/how-tos/project-name/)
- [Variabili e `--env-file`](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/)
- [Ordine di avvio e `service_healthy`](https://docs.docker.com/compose/how-tos/startup-order/)
- [Volumi nominati](https://docs.docker.com/reference/compose-file/volumes/)
