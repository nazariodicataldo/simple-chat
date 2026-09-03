# M5-004 — Eseguire Reverb e Horizon in Compose

- **Stato:** proposta
- **Milestone:** Milestone 5 — Docker
- **Data di apertura:** 2026-09-03
- **Data di chiusura:**
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
- `backend/.env.example`, `backend/config/reverb.php` e
  `backend/config/horizon.php` solo per valori necessari alla rete Docker
- `docs/learning/docker-compose.md`
- Questo task

## File non modificabili

- Dockerfile backend gia' funzionante, codice di dominio, frontend, policy,
  eventi, lockfile e configurazione Lerd, salvo un difetto bloccante approvato.

## Requisiti

- Reverb e Horizon riusano l'immagine backend e comandi espliciti; nessun
  container esegue piu' processi con shell, `supervisord` o `composer dev`.
- Horizon e' l'unico consumer di `redis/default`: non aggiungere `queue:work`,
  `queue:listen` o un secondo servizio Horizon.
- Il broadcaster Laravel contatta Reverb con hostname e porta interni Compose;
  l'endpoint WSS pubblico resta separato fino a M5-005.
- Reverb e Horizon dipendono da Redis healthy e rendono consultabili log e
  stato con comandi Compose.
- Le credenziali Reverb restano locali: il template contiene solo valori fittizi.

## Strategia di test

Osservare Redis, Reverb e un solo master Horizon. Creare un messaggio di prova
tramite Laravel e verificare che il relativo `BroadcastEvent` sia elaborato da
Horizon e che Reverb riceva la connessione interna. La consegna Echo browser
resta M5-005.

## Comandi da eseguire

- `git status --short`
- `docker compose --env-file compose.env config --quiet`
- `docker compose --env-file compose.env up -d postgres redis backend reverb horizon`
- `docker compose --env-file compose.env ps`
- `docker compose --env-file compose.env exec backend php artisan horizon:status`
- `docker compose --env-file compose.env logs --tail=100 horizon reverb`
- `docker compose --env-file compose.env exec backend php artisan queue:failed`
- `docker compose --env-file compose.env down`
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [ ] Reverb e Horizon si avviano con immagine backend e rete Compose, senza
  servizi Lerd.
- [ ] Horizon e' il solo consumer della queue `default`; nessun worker
  concorrente e' presente.
- [ ] Un broadcast reale e' osservato nei log/stato Horizon e Reverb usando
  Redis Compose.
- [ ] Log e stato sono consultabili senza copiare payload, cookie, token,
  chiavi o stack trace nella documentazione.
- [ ] La consegna browser non e' dichiarata prima di M5-005.

## Rischi e assunzioni

Reverb distingue il collegamento interno del broadcaster dall'URL pubblico
browser. Confonderli trasformerebbe `localhost` nel container stesso o
esporrebbe Reverb direttamente: il task deve dimostrare entrambi i ruoli senza
pubblicare la porta Reverb.

## Verifica manuale

1. Avviare backend, dipendenze, Reverb e Horizon senza Lerd per il progetto.
2. Verificare status Horizon e assenza di consumer concorrenti.
3. Generare un messaggio di prova autorizzato, osservare job e confrontare i
   failed job con la baseline, senza cleanup bulk.
4. Arrestare Compose; non modificare record Lerd o job preesistenti.

## Decisioni emerse

- Horizon resta il solo consumer locale anche in Docker.
- Reverb non pubblica porte host: l'unico ingresso WSS sara' Nginx M5-005.

## File modificati

## Risultati dei controlli

## Problemi residui

## Riepilogo finale
