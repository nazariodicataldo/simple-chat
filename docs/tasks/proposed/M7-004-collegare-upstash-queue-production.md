# M7-004 — Collegare Upstash come queue Redis production

- **Stato:** proposta
- **Milestone:** Milestone 7 — Deployment
- **Data di apertura:**
- **Data di chiusura:**
- **Dipendenze:** M7-003

## Contesto

Render Key Value Free e' volatile e il piano gratuito non offre un background
worker dedicato. Il container production include gia' Horizon; serve ora un
Redis esterno gratuito che esponga il protocollo nativo necessario alla queue.
Upstash offre TLS e persistenza, ma la compatibilita' reale con Horizon non va
dedotta dalla sola compatibilita' dichiarata con Laravel Queue.

## Obiettivo

Creare un database Upstash Redis Free a Francoforte, collegare il profilo
Horizon production introdotto da M7-001 alla queue `default`, quindi dimostrare
che un job viene inserito, riservato e completato tramite protocollo Redis
nativo cifrato.

## Fuori scope

- API REST Upstash, replica globale, ACL avanzate o piano a pagamento.
- Metriche avanzate, retention storica o dashboard Horizon come criterio.
- Backup Redis: PostgreSQL resta l'unica fonte dei messaggi.
- Render Blueprint e deploy pubblico.
- Modifiche alla politica funzionale di retry M3/M4.

## File modificabili

- `backend/config/horizon.php` e configurazione Redis Laravel soltanto se una
  incompatibilita' reale con Upstash viene prima dimostrata da un test fallito.
- `docs/learning/deployment-render.md`, limitatamente a Redis gestito, queue e
  differenza tra dato persistente e stato operativo.
- Questo task e `docs/project/current-state.md` durante attivazione e chiusura.

## File non modificabili

- Eventi Message, API, retry/backoff/timeout gia' decisi e schema dati.
- `render.yaml`, workflow CI, Dockerfile locali e segreti reali.
- Configurazione Redis del Compose locale, salvo variabili production isolate.

## Requisiti

- Upstash usa il piano Free e una singola regione AWS `eu-central-1`; non usa
  read replica o database globale.
- Eviction resta disabilitata: al raggiungimento della quota le scritture
  devono fallire visibilmente invece di eliminare job casualmente.
- Laravel usa `phpredis` e il protocollo Redis TCP nativo con TLS, non l'API
  REST. La URL completa e la password restano secret non versionati.
- `QUEUE_CONNECTION=redis`, `REDIS_QUEUE=default` e la cache necessaria a
  Reverb/Horizon usano Upstash senza cambiare PostgreSQL come fonte messaggi.
- Il profilo Horizon `production` di M7-001 conserva un solo processo,
  bilanciamento `simple`, tre tentativi, backoff 5 secondi e timeout 60 secondi.
- Un job controllato entra nella queue `default`, viene consumato una volta e
  lascia una prova osservabile senza dipendere dalle metriche storiche.
- Riavviare il client non elimina il job gia' persistito; il test non promette
  alta disponibilita' o replica del piano Free.
- Nessuna credenziale compare nei log o nel diff.

## Strategia di test

Creare Upstash dal Dashboard e fornire `REDIS_URL` all'immagine M7-001 tramite
input locale temporaneo. Verificare `PING` TLS con il client effettivamente
usato dall'applicazione, avviare Horizon in `production`, accodare un job
controllato e osservare prenotazione e completamento. Se possibile usare un
evento applicativo reale; un fixture e' ammesso soltanto se gia' production-safe
e non richiede autoload dev. La prova finale broadcast resta M7-007.

## Comandi da eseguire

- `git status --short`
- Connessione Redis TLS tramite PHP/Laravel senza stampare la URL.
- `php artisan horizon` con `APP_ENV=production` nel runtime controllato.
- Comando o richiesta che accoda un singolo job su `default`.
- Ispezione sanitizzata della queue e dei log fino al completamento.
- Test backend mirati alla configurazione Horizon modificata.
- `./vendor/bin/pint --test`
- `./vendor/bin/phpstan analyse --memory-limit=512M`
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [ ] Upstash Free esiste in regione singola Francoforte, con eviction
      disabilitata e TLS attivo.
- [ ] Laravel usa il protocollo Redis nativo e riceve una risposta valida.
- [ ] Horizon in `production` applica la politica M3/M4 con un solo processo.
- [ ] Un job sulla queue `default` viene consumato una sola volta e l'esito e'
      osservabile senza richiedere metriche avanzate.
- [ ] Secret e connection string non sono presenti in repository o output.
- [ ] Nessun requisito di backup o persistenza dei messaggi viene attribuito a
      Redis.

## Rischi e assunzioni

Upstash documenta Laravel Queue ma non garantisce esplicitamente ogni uso
interno di Horizon: un comando incompatibile e' bloccante e va dimostrato con
il log completo, non aggirato passando silenziosamente a queue sincrona. La
quota mensile di comandi e' sufficiente per la demo, non per un carico reale.

## Verifica manuale

1. Controllare piano, regione, TLS ed eviction nel Dashboard Upstash.
2. Avviare Horizon con il profilo production e secret effimeri.
3. Accodare un solo job e osservarne il completamento.
4. Controllare che il job non venga eseguito due volte.
5. Ispezionare log e Git per escludere credenziali.

## Decisioni emerse

- Upstash e' solo backend di queue/cache operativo.
- Le metriche avanzate Horizon non fanno parte della DoD M7.
- La compatibilita' Horizon deve avere evidenza runtime prima del deploy.

## File modificati

Da compilare durante l'implementazione.

## Risultati dei controlli

Da compilare con output sanitizzato.

## Problemi residui

Da compilare.

## Riepilogo finale

Da compilare dopo tutti i criteri verificati.
