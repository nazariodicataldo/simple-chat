# M7-003 — Collegare Neon come PostgreSQL production

- **Stato:** completato
- **Milestone:** Milestone 7 — Deployment
- **Data di apertura:** 2026-09-29
- **Data di chiusura:** 2026-09-29
- **Dipendenze:** M7-002

## Contesto

Il PostgreSQL gratuito di Render scade dopo 30 giorni. La chat richiede invece
che PostgreSQL resti la fonte persistente di verita' dei messaggi. Neon offre
PostgreSQL gestito con piano gratuito e scale-to-zero; il servizio applicativo
production deve collegarsi tramite TLS senza introdurre SDK o funzionalita'
proprietarie Neon.

## Obiettivo

Creare manualmente un progetto Neon Free a Francoforte, collegare in modo
temporaneo e non versionato l'immagine production tramite la `DB_URL` pooled,
applicare le migration e verificare persistenza e riconnessione del normale
driver PDO PostgreSQL usato da Laravel. La prova usa container one-shot della
stessa immagine production e avvia soltanto i comandi Laravel necessari.

## Fuori scope

- Neon Auth, Data API, Storage, branching applicativo o driver serverless.
- Render, Upstash, Blueprint e deploy pubblico.
- Avvio con Supervisor di Nginx, Next.js, PHP-FPM, Horizon e Reverb; M7-003 non
  introduce un Redis temporaneo per rieseguire prove gia' coperte da M7-001.
- Importazione dei dati locali esistenti.
- Backup e ripristino, trattati da M7-008.
- Modifiche allo schema o ai modelli applicativi.
- Separazione fra un ruolo PostgreSQL per le migration e uno per il runtime.

## File modificabili

- Configurazione backend soltanto se una incompatibilita' reale con la
  connection string TLS viene prima riprodotta.
- `docker/production/Dockerfile` soltanto se l'immagine non contiene un
  archivio CA utilizzabile e la mancanza viene prima dimostrata.
- `docs/learning/deployment-render.md`, limitatamente a PostgreSQL gestito,
  TLS, pooling e scale-to-zero.
- Questo task e `docs/project/current-state.md` durante attivazione e chiusura.

## File non modificabili

- File `.env` versionati, `render.yaml`, workflow CI e configurazione Upstash.
- Migration, schema dati, API e codice di dominio, salvo un difetto dimostrato
  e autorizzato separatamente.
- Database PostgreSQL locale e relativi volumi Compose.

## Requisiti

- Il progetto Neon usa il piano Free, la regione AWS `eu-central-1`
  (Francoforte) e PostgreSQL 17 per mantenere parita' con il Compose, se la
  versione e' ancora selezionabile al momento dell'implementazione. Se non lo
  e', usa soltanto una versione dichiarata stabile da Neon, registra la
  divergenza e verifica l'intero task senza aggiornare automaticamente Compose.
- L'applicazione usa il normale driver `pgsql` Laravel/PDO e una connection
  string Neon TLS; non aggiunge dipendenze Neon.
- La connection string applicativa usa l'endpoint pooled per tutte le prove.
  Se le migration mostrano una incompatibilita' specifica, il task resta
  attivo e la soluzione viene valutata sull'errore osservato: non esiste un
  fallback automatico all'endpoint diretto, riservato al futuro `pg_dump`.
- La connessione finale usa `sslmode=verify-full` e una CA di sistema tramite
  `sslrootcert=system` o il percorso esplicito del bundle del container. Il
  solo `sslmode=require` puo' servire alla diagnosi ma non soddisfa il task.
- Prima della connessione vengono verificati disponibilita' del bundle CA,
  permessi di lettura e supporto della versione `libpq`. Il Dockerfile cambia
  soltanto se questa verifica dimostra che manca un archivio CA utilizzabile.
- Non si assume che `channel_binding=require` presente nella URL generata sia
  applicato da PDO: il connettore Laravel corrente inoltra nel DSN PostgreSQL
  `sslmode` e `sslrootcert`, ma non `channel_binding`.
- `DB_CONNECTION=pgsql`, `DB_URL` e le opzioni TLS sono passati con un file
  env temporaneo fuori dal repository, con permessi `600`. La URL non compare
  in righe di comando, diff, log, documentazione o output conservati.
- I container di prova sono effimeri con `--rm` quando possibile. Al termine
  non devono restare container, neppure arrestati, che conservino `DB_URL` nei
  propri metadati; il file env temporaneo viene poi eliminato.
- Una sola credenziale Neon dedicata a Simple Chat serve migration e runtime.
  La maggiore ampiezza dei privilegi viene accettata e documentata per non
  introdurre ora due ruoli, due secret e un nuovo flusso di avvio.
- `php artisan migrate --force` crea lo schema su un database vuoto ed e'
  idempotente a una seconda esecuzione.
- La scrittura controllata e' un solo utente sintetico creato tramite Laravel,
  con identificatore univoco e senza dati personali reali. Sopravvive alla
  rimozione del primo container e a una nuova connessione dopo che il Dashboard
  Neon mostra il compute sospeso; viene poi eliminato selettivamente.
- Il test non copia utenti o messaggi dal database locale.

## Strategia di test

Creare il progetto dal Dashboard Neon e annotare soltanto piano, regione e
versione, mai le credenziali. Salvare la URL pooled in un file temporaneo fuori
dal repository con permessi `600`. Usare container one-shot dell'immagine
M7-001 con entrypoint sostituito soltanto per eseguire Laravel: controllare CA
e `libpq`, applicare due volte le migration, poi creare un utente sintetico con
un identificatore univoco. Rimuovere il primo container, attendere che il
Dashboard mostri il compute sospeso e usare un container nuovo per rileggere e
cancellare selettivamente l'utente. Rimuovere ogni container di prova prima di
eliminare il file env temporaneo; non eliminare progetto, schema o migration.

## Comandi da eseguire

- `git status --short`
- Controllo non sensibile di bundle CA e versione `libpq` nell'immagine.
- Query non sensibile per versione e database; regione verificata dal Dashboard
  senza registrare hostname o identificatori dell'endpoint.
- `php artisan migrate --force` in un container one-shot dell'immagine
  production, tramite endpoint pooled e secret effimeri.
- Seconda esecuzione di `php artisan migrate --force`.
- Creazione tramite Laravel di un solo utente sintetico identificabile.
- Riconnessione da un container nuovo dopo sospensione osservata nel Dashboard,
  lettura dell'utente e cleanup selettivo.
- Ispezione sanitizzata dei log per escludere la connection string, senza
  eseguire un `docker inspect` completo che stampi le variabili.
- Controllo di `docker ps -a` per escludere container di prova residui e
  rimozione del file env temporaneo.
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [x] Neon Free esiste a Francoforte con PostgreSQL 17 oppure con la versione
      disponibile motivata e verificata al momento del task.
- [x] Laravel si collega tramite PDO PostgreSQL, endpoint pooled e TLS con
      verifica completa del certificato, senza SDK proprietari.
- [x] Le migration pooled riescono su database vuoto e la seconda esecuzione
      non applica modifiche aggiuntive; un fallimento non attiva il diretto in
      modo automatico e mantiene il task aperto.
- [x] L'utente sintetico persiste dopo rimozione del primo container,
      sospensione osservata del compute e riconnessione da un container nuovo.
- [x] Credenziali e connection string non compaiono nel repository o negli
      output registrati; file env e container di prova vengono rimossi.
- [x] Nessun dato locale esistente viene importato e il record prova viene
      rimosso selettivamente.

## Rischi e assunzioni

Il compute Neon puo' andare in idle e aggiungere latenza alla prima query; non
e' perdita di dati. La prova attende lo stato sospeso osservabile e non deduce
lo scale-to-zero da un intervallo fisso. Persistenza non significa backup.

Un file env eliminato non rimuove la copia delle variabili conservata nei
metadati di un container ancora esistente: il cleanup rimuove prima i container
e poi il file. Chi controlla il demone Docker puo' leggere le variabili durante
la prova; questo limite e' accettato per il test locale temporaneo.

La singola credenziale applicativa puo' modificare anche lo schema perche'
l'entrypoint production esegue le migration. E' un compromesso consapevole per
questo progetto personale; la separazione dei ruoli e' un hardening futuro.

Le quote e le versioni del piano Free possono cambiare: vanno ricontrollate
dalla documentazione ufficiale durante l'implementazione e una variazione
materiale va registrata prima di procedere.

## Verifica manuale

1. Controllare piano, regione e versione nel Dashboard Neon.
2. Preparare fuori dal repository il file env `600` e verificare CA e `libpq`.
3. Applicare due volte le migration pooled da container production one-shot.
4. Creare l'utente sintetico e rimuovere il primo container.
5. Attendere lo stato sospeso nel Dashboard, riconnettersi da un container
   nuovo, rileggere l'utente e rimuoverlo selettivamente.
6. Rimuovere i container, cancellare il file env e controllare Git e log per
   assenza di credenziali.

## Decisioni emerse

- Neon e' usato soltanto come PostgreSQL standard.
- La regione e' Francoforte; PostgreSQL 17 e' preferito e una versione diversa
  e' ammessa soltanto se Neon non offre piu' la 17 ed e' dichiarata stabile.
- Il secret passa tramite un file env temporaneo `600` fuori dal repository;
  container e file vengono rimossi in quest'ordine al termine della prova.
- L'endpoint pooled e' il solo percorso di accettazione iniziale. Una sua
  incompatibilita' osservata mantiene aperto il task e viene valutata dopo,
  senza fallback automatico al diretto.
- Il livello TLS finale e' `verify-full` con CA del container. Il Dockerfile
  puo' aggiungere `ca-certificates` soltanto dopo una mancanza dimostrata.
- Una sola credenziale serve migration e runtime; il limite di privilegio e'
  accettato per mantenere semplice l'attuale immagine unificata.
- Le prove usano l'immagine production con soli comandi Laravel one-shot, non
  avviano Supervisor e non introducono Redis prima di M7-004.
- Il dato prova e' un utente sintetico univoco, riletto da un nuovo container
  dopo sospensione osservata del compute e poi eliminato selettivamente.
- Il backup portabile resta un task finale distinto.

## File modificati

Nessun file applicativo o Dockerfile modificato: l'immagine production contiene
gia' `pdo_pgsql`, `libpq` e un bundle CA leggibile. Sono stati aggiornati questo
task, `docs/project/current-state.md` e `docs/learning/deployment-render.md`;
il file env temporaneo e' stato creato
fuori dal repository e rimosso al termine.

## Risultati dei controlli

- L'immagine locale `simple-chat-production:fix-autoload` e' stata usata senza
  stampare variabili d'ambiente: `/etc/ssl/certs/ca-certificates.crt` e'
  leggibile con modalita' `644`, `libpq5` e' alla versione `17.11-0+deb13u1`,
  e PHP espone `pdo_pgsql`. L'immagine non contiene `psql`, coerentemente con
  una prova eseguita tramite Laravel/PDO. I tag locali `manual` e `m7-001`
  avevano una classmap obsoleta; il tag `fix-autoload`, gia' presente e
  verificato, contiene il modello applicativo richiesto.
- La configurazione Laravel usa `DB_URL` con il driver `pgsql`; il parser URL
  inoltra le opzioni query al connettore e il connettore PDO aggiunge
  `sslmode` e `sslrootcert` al DSN. `channel_binding` non viene aggiunto dal
  connettore.
- Il Dashboard Neon ha confermato piano Free, regione AWS `eu-central-1`
  (Francoforte) e PostgreSQL 17. La URL pooled e' stata usata con
  `sslmode=verify-full` e `sslrootcert` al bundle CA del container; la query
  Laravel ha restituito `neondb` e PostgreSQL 17.11.
- La prima `php artisan migrate --force` ha creato lo schema su database vuoto;
  la seconda ha restituito `Nothing to migrate.`. Non e' stato attivato alcun
  fallback all'endpoint diretto.
- L'utente sintetico `m7_003_neon_20260929` (ID `1`) e' stato creato tramite
  Laravel. Dopo la sospensione `SUSPENDED` osservata nel Dashboard, un nuovo
  container ha riletto lo stesso record. Un secondo nuovo container lo ha
  eliminato selettivamente; la verifica finale ha restituito
  `remaining_test_users=0`.
- Il file env era in `/tmp`, con modalita' `600`, ed e' stato rimosso dopo i
  container. I container usavano `--rm`; il controllo finale non ha trovato
  residui con nome Neon o M7-003. Nessuna URL o credenziale compare negli
  output registrati.
- La verifica documentale finale ha confermato che guida, stato corrente e
  task completato non contengono piu' il testo dell'attivazione precedente; il
  task resta completato.

## Problemi residui

Nessun problema residuo di M7-003. Il limite deliberato resta l'uso della
singola credenziale Neon per migration e runtime; la separazione dei ruoli e'
fuori scope e resta hardening futuro.

## Riepilogo finale

M7-003 completato il 2026-09-29. L'immagine production si e' collegata a
Neon tramite Laravel/PDO, endpoint pooled e TLS `verify-full`; migration,
persistenza dopo scale-to-zero, riconnessione e cleanup selettivo sono riusciti.
Nessuna credenziale o URL e' stata registrata nel repository o negli output.
