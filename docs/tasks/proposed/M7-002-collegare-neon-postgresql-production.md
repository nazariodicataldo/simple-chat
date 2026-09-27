# M7-002 — Collegare Neon come PostgreSQL production

- **Stato:** proposta
- **Milestone:** Milestone 7 — Deployment
- **Data di apertura:**
- **Data di chiusura:**
- **Dipendenze:** M7-001

## Contesto

Il PostgreSQL gratuito di Render scade dopo 30 giorni. La chat richiede invece
che PostgreSQL resti la fonte persistente di verita' dei messaggi. Neon offre
PostgreSQL gestito con piano gratuito e scale-to-zero; il servizio applicativo
production deve collegarsi tramite TLS senza introdurre SDK o funzionalita'
proprietarie Neon.

## Obiettivo

Creare manualmente un progetto Neon Free a Francoforte, collegare in modo
temporaneo e non versionato l'immagine production tramite `DB_URL`, applicare
le migration e verificare persistenza e riconnessione del normale driver PDO
PostgreSQL usato da Laravel.

## Fuori scope

- Neon Auth, Data API, Storage, branching applicativo o driver serverless.
- Render, Upstash, Blueprint e deploy pubblico.
- Importazione dei dati locali esistenti.
- Backup e ripristino, trattati da M7-007.
- Modifiche allo schema o ai modelli applicativi.

## File modificabili

- Configurazione backend soltanto se una incompatibilita' reale con la
  connection string TLS viene prima riprodotta.
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
  versione e' ancora selezionabile al momento dell'implementazione.
- L'applicazione usa il normale driver `pgsql` Laravel/PDO e una connection
  string Neon TLS; non aggiunge dipendenze Neon.
- La connection string applicativa usa l'endpoint pooled quando compatibile
  con Laravel e le migration; l'endpoint diretto resta riservato al futuro
  `pg_dump` e non viene salvato nel repository.
- `DB_CONNECTION=pgsql`, `DB_URL` e l'eventuale `DB_SSLMODE=require` sono
  passati come variabili effimere. Il valore di `DB_URL` non compare in comandi
  registrati, diff, log o documentazione.
- `php artisan migrate --force` crea lo schema su un database vuoto ed e'
  idempotente a una seconda esecuzione.
- Una scrittura controllata sopravvive alla chiusura del container client e a
  una successiva riconnessione dopo l'idle del compute Neon.
- Il test non copia utenti o messaggi dal database locale.

## Strategia di test

Creare il progetto dal Dashboard Neon e annotare soltanto piano, regione e
versione, mai le credenziali. Passare la URL tramite un meccanismo locale
temporaneo con permessi restrittivi, avviare l'immagine M7-001, applicare le
migration due volte e verificare connessione, schema e una scrittura prova.
Terminare il client, attendere o provocare un nuovo collegamento e confermare
che il dato persiste. Eliminare selettivamente il dato prova, non il progetto.

## Comandi da eseguire

- `git status --short`
- Query non sensibile per versione, database e regione osservabile.
- `php artisan migrate --force` dall'immagine production con secret effimeri.
- Seconda esecuzione di `php artisan migrate --force`.
- Query di inserimento/lettura o percorso applicativo controllato, con cleanup.
- Riconnessione dopo arresto del client e verifica del record.
- Ispezione dei log per escludere la connection string.
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [ ] Neon Free esiste a Francoforte con PostgreSQL 17 oppure con la versione
      disponibile motivata e verificata al momento del task.
- [ ] Laravel si collega tramite PDO PostgreSQL e TLS senza SDK proprietari.
- [ ] Le migration riescono su database vuoto e la seconda esecuzione non
      applica modifiche aggiuntive.
- [ ] Un dato controllato persiste attraverso disconnessione e riconnessione.
- [ ] Credenziali e connection string non compaiono nel repository o negli
      output registrati.
- [ ] Nessun dato locale esistente viene importato e il record prova viene
      rimosso selettivamente.

## Rischi e assunzioni

Il compute Neon puo' andare in idle e aggiungere latenza alla prima query; non
e' perdita di dati. Persistenza non significa backup. Le quote e le versioni
del piano Free possono cambiare: vanno ricontrollate dalla documentazione
ufficiale durante l'implementazione e una variazione materiale va registrata
prima di procedere.

## Verifica manuale

1. Controllare piano, regione e versione nel Dashboard Neon.
2. Avviare un client production con `DB_URL` fornita fuori dal repository.
3. Applicare due volte le migration.
4. Scrivere, rileggere dopo riconnessione e rimuovere il dato prova.
5. Controllare Git e log per assenza di credenziali.

## Decisioni emerse

- Neon e' usato soltanto come PostgreSQL standard.
- La regione e' Francoforte e PostgreSQL 17 e' la versione preferita.
- Il backup portabile resta un task finale distinto.

## File modificati

Da compilare durante l'implementazione; e' possibile che il task non richieda
modifiche applicative.

## Risultati dei controlli

Da compilare con output sanitizzato e senza URL o password.

## Problemi residui

Da compilare.

## Riepilogo finale

Da compilare dopo tutti i criteri verificati.
