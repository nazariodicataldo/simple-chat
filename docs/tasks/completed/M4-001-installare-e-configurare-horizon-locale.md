# M4-001 — Installare e configurare Horizon locale

- **Stato:** completato
- **Milestone:** Milestone 4 — Horizon
- **Data di apertura:** 2026-09-01
- **Data di chiusura:** 2026-09-01
- **Dipendenze:** M3-001, M3-002

## Contesto

M3 usa Redis e `composer queue:work` per consumare la sola queue applicativa
`default`. Il worker funziona, ma non espone un punto unico per osservare i
processi e i job. Horizon e' il passo successivo: mantiene un processo master,
avvia il supervisor configurato e rende disponibili i relativi metadati su una
dashboard.

Questa milestone resta locale. Docker, process monitor del sistema operativo,
configurazione di produzione, metriche storiche e scaling appartengono a
milestone successive.

## Obiettivo

Installare una versione stabile di Laravel Horizon compatibile con le
dipendenze gia' risolte, pubblicarne la configurazione e rendere `composer
horizon` il workflow locale canonico per consumare `redis/default`.

## Fuori scope

- Autorizzazione della dashboard e lista di email: M4-002.
- Docker, Supervisor di Linux, systemd, Horizon in produzione e processi
  persistenti: M5/M7.
- Code aggiuntive, priorita', auto-scaling, piu' processi, notifiche e metriche
  con `horizon:snapshot`.
- Modifiche a Message, eventi, API, Reverb, Echo, frontend, retry policy,
  `queue:work` o `.env` locale.
- Changelog e chiusura della milestone: M4-004.

## File modificabili

- `backend/composer.json`
- `backend/composer.lock`
- `backend/config/horizon.php`
- `backend/app/Providers/HorizonServiceProvider.php` se generato
- `backend/bootstrap/providers.php` se richiesto dall'installazione
- `docs/learning/horizon.md`
- Questo task
- `docs/project/current-state.md` solo quando il task passa da proposta ad
  attivo o da attivo a completato

## File non modificabili

- `backend/.env`, credenziali e secret.
- `backend/config/queue.php`, `backend/.env.example` e la politica M3 della
  queue.
- Codice Message, eventi, controller, policy, frontend e migration esistenti.
- `CHANGELOG.md` fino al completamento dell'intera M4.

## Requisiti

- L'aggiunta della nuova dipendenza di produzione richiede approvazione
  esplicita quando questo task verra' attivato; questa proposta non la installa.
- Usare `composer require laravel/horizon`, lasciare che Composer risolva la
  versione compatibile e registrare la versione effettiva nel task completato.
- Eseguire `php artisan horizon:install` e conservare solo gli artefatti
  necessari prodotti dalla versione installata.
- La configurazione deve definire esclusivamente l'ambiente `local`, con un
  supervisor dal nome legato al dominio, ad esempio `chat-default`.
- Il supervisor consuma solo la connection `redis` e la queue `default`, con
  un unico processo, balancing `simple`, tre tentativi, backoff 5 s e timeout
  60 s. I valori devono restare coerenti con M3.
- Aggiungere lo script Composer `horizon` che esegue esattamente `@php artisan
  horizon`. `composer queue:work` resta invariato per diagnosi M3, ma la
  documentazione deve vietarne l'esecuzione contemporanea con Horizon sulla
  stessa queue.
- La guida deve distinguere il master Horizon, il supervisor configurato e il
  worker figlio: Horizon non sostituisce Redis, PostgreSQL, Reverb o Echo.
- Non configurare `horizon:snapshot`: senza scheduler locale il pannello
  metriche non fa parte della DoD M4.

## Strategia di test

E' configurazione e integrazione di un pacchetto, non un comportamento da
simulare con fake. Verificare prima manifest e configurazione risolta; poi
avviare Horizon nel runtime Lerd e controllare che il master sia attivo. La
configurazione del supervisor e' verificata staticamente; il consumo reale di
un job su `redis/default`, la dashboard protetta e il percorso completo saranno
verificati nei task successivi.

## Comandi da eseguire

- `git status --short`
- `git diff --stat`
- `git diff --check`
- Da `backend/`: `composer require laravel/horizon`
- Da `backend/`: `composer validate --no-check-publish`
- Da `backend/`: `php artisan horizon:install`
- Da `backend/`: `php artisan config:clear`
- Da `backend/`: `php artisan config:show horizon`
- Da `backend/`: `composer horizon`
- Da `backend/`, in un secondo terminale: `php artisan horizon:status`
- Da `backend/`: `composer test`, `./vendor/bin/pint --test` e
  `./vendor/bin/phpstan analyse --memory-limit=512M`

## Criteri di accettazione

- [x] Composer risolve e blocca Horizon senza aggiornamenti non spiegati a
  dipendenze estranee.
- [x] Esistono configurazione e provider Horizon richiesti dalla versione
  installata, registrati nel bootstrap quando necessario.
- [x] `config:show horizon` conferma il solo supervisor locale per
  `redis/default`, con un processo e parametri M3 invariati.
- [x] `composer horizon` avvia il master e `horizon:status` riporta Horizon
  attivo; non e' in esecuzione alcun `queue:work` concorrente.
- [x] Non vengono configurati scheduler, metriche storiche, code ulteriori,
  scaling o ambiente production.
- [x] La guida distingue correttamente master, supervisor, worker e storage
  dei metadati, senza riportare credenziali.
- [x] I controlli Composer, backend e diff hanno esito registrato o una
  limitazione riproducibile esplicita.

## Rischi e assunzioni

Horizon richiede Redis, che M3 usa gia' per la queue. I suoi metadati di
osservazione sono aggiuntivi: PostgreSQL continua a essere la fonte di verita'
dei Message e `failed_jobs` continua a registrare i fallimenti definitivi.

In locale il processo non e' persistente: se il terminale termina, Horizon non
viene riavviato automaticamente. L'avvio persistente e il process monitor sono
esplicitamente rinviati a M5/M7.

## Verifica manuale

1. Avviare Lerd e controllare che Redis sia disponibile con il profilo M3.
2. Assicurarsi che `composer queue:work` non sia in esecuzione.
3. Avviare `composer horizon` e mantenere visibile il terminale del master.
4. Da un secondo terminale eseguire `php artisan horizon:status` e verificare
   lo stato attivo del processo.
5. Interrompere Horizon in modo controllato al termine della verifica. La prova
   di job completati e falliti non appartiene a questo task.

## Decisioni emerse

- Horizon e' il consumer locale canonico della queue `redis/default`; il
  worker M3 manuale resta un comando diagnostico e non va eseguito in parallelo.
- Un solo supervisor locale, una sola queue e un solo processo: il progetto e'
  intenzionalmente un toy project e non ha bisogno di balancing o scaling.
- Metriche storiche e scheduler sono fuori scope: M4 osserva job e processi
  attraverso la dashboard, non costruisce un sistema di monitoraggio.
- Il supervisor dichiara esplicitamente i parametri M3 nel solo blocco
  `local.chat-default`; `testing` continua a usare la queue `sync` e non
  configura Horizon.
- `composer dev` avvia `queue:listen` e non va usato insieme a
  `composer horizon`; resta invariato e fuori scope.

## File modificati

- `backend/composer.json` e `backend/composer.lock`: `laravel/horizon`
  `v5.48.3`, con le sole dipendenze transitive `laravel/sentinel` e
  `symfony/polyfill-php83`, e script `composer horizon`.
- `backend/config/horizon.php`: configurazione pubblicata con il solo
  supervisor locale `chat-default` per `redis/default`.
- `backend/app/Providers/HorizonServiceProvider.php` e
  `backend/bootstrap/providers.php`: provider generato e registrato.
- `docs/learning/horizon.md`: ruoli, configurazione, verifica e correzione del
  workflow M3 precedente.
- `docs/project/current-state.md`: stato M4-001 completato.

## Risultati dei controlli

- `composer require laravel/horizon`: ha installato e bloccato Horizon
  `v5.48.3`; il post-script `php artisan boost:update` e' terminato con errore
  perche' Boost non e' configurato, dopo `package:discover` riuscito.
- `composer validate --no-check-publish`: manifest valido; restano soltanto i
  warning sui constraint `*` preesistenti di Reverb e Pusher.
- `php artisan horizon:install`: provider e configurazione pubblicati.
- `php artisan config:clear` e `php artisan config:show horizon`: un solo
  `local.chat-default`, `redis/default`, `simple`, `processes=1`, `tries=3`,
  `backoff=5` e `timeout=60`.
- `composer horizon` e `php artisan horizon:status`: master avviato e stato
  `running`; `php artisan horizon:terminate` lo ha arrestato e lo stato finale
  e' `inactive`.
- Controllo processi nel runtime Lerd: nessun `queue:work`, `queue:listen` o
  Horizon residuo dopo lo stop.
- `composer test`: 36 test superati, 194 assertion.
- `./vendor/bin/pint --test`: riuscito.
- `./vendor/bin/phpstan analyse --memory-limit=512M`: riuscito, 0 errori.
- `git diff --check`: riuscito.

## Problemi residui

- Il post-script Composer di Boost continua a fallire se Boost non e'
  configurato; non impedisce l'installazione o la discovery di Horizon.
- La dashboard usa temporaneamente il fallback locale del pacchetto;
  l'autorizzazione esplicita appartiene a M4-002.

## Riepilogo finale

Horizon `v5.48.3` e' il consumer locale canonico di `redis/default` tramite un
solo worker `chat-default`. `composer queue:work` resta uno strumento
diagnostico M3 e non va avviato con Horizon. M4-001 non invia job di prova: la
dashboard protetta e la prova end-to-end completa restano rispettivamente in
M4-002 e M4-004.
