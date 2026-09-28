# M7-008 — Verificare backup e ripristino di Neon

- **Stato:** proposta
- **Milestone:** Milestone 7 — Deployment
- **Data di apertura:**
- **Data di chiusura:**
- **Dipendenze:** M7-007

## Contesto

Neon conserva il database oltre il ciclo di vita del container Render, ma la
persistenza del provider non equivale a un backup portabile. Per questa demo il
backup e' un controllo manuale finale: non serve automazione schedulata, ma un
file prodotto da `pg_dump` deve essere realmente ripristinabile senza toccare
il database production.

## Obiettivo

Creare un dump logico manuale e non versionato del database Neon, ripristinarlo
in un PostgreSQL locale temporaneo e isolato e verificare schema e dati
essenziali prima di rimuovere soltanto l'ambiente di restore.

## Fuori scope

- Backup Redis/Upstash, perche' non contiene la fonte dei messaggi.
- Scheduling, object storage, cifratura gestita, retention e PITR.
- Restore sopra Neon production o migrazione verso un altro provider.
- Script generico di disaster recovery o workflow GitHub.
- Cancellazione automatica del file di backup riuscito.

## File modificabili

- Runbook del backup e restore manuale.
- `.gitignore` soltanto se viene scelta una directory locale nel repository e
  il rischio di commit accidentale non e' gia' coperto.
- `docs/learning/deployment-render.md`, limitatamente a persistenza, backup e
  restore.
- Questo task e `docs/project/current-state.md` durante attivazione e chiusura.

## File non modificabili

- Database Neon production, salvo letture consistenti di `pg_dump`.
- Schema, migration, seed e dati applicativi.
- Upstash, Render Blueprint, workflow CI e secret versionati.

## Requisiti

- Il client `pg_dump` ha major version uguale o successiva a quella Neon,
  verificata prima dell'export.
- Il dump usa formato custom, esclude ownership/ACL specifici del provider e
  viene scritto in una posizione locale esplicita non tracciata da Git.
- La connection string diretta Neon e la password sono fornite senza apparire
  nella history della shell, nell'elenco processi, nel task o nel diff.
- Il file e' trattato come sensibile: contiene utenti e hash password anche se
  i messaggi E2E sono stati rimossi.
- Il restore usa un container/database PostgreSQL temporaneo con nome univoco,
  versione compatibile e nessun collegamento ai volumi abituali del progetto.
- `pg_restore` completa senza errori ignorati genericamente; eventuali warning
  sono esaminati e registrati.
- La verifica confronta almeno migration applicate, presenza delle tabelle
  principali e conteggi coerenti di utenti/messaggi tra fonte e restore, senza
  stampare contenuti sensibili.
- Il cleanup rimuove solo container, rete e volume temporanei dopo averne
  validato esplicitamente il nome. Il dump riuscito resta nella posizione
  scelta dall'utente.

## Strategia di test

Rilevare la versione server Neon, scegliere un'immagine client PostgreSQL
compatibile e produrre il dump con credenziali temporanee protette. Creare un
progetto/container locale dal nome specifico del task, ripristinare, interrogare
schema e conteggi e confrontarli con query read-only sulla fonte. Conservare il
dump e distruggere soltanto l'ambiente temporaneo dopo la prova completa.

## Comandi da eseguire

- `git status --short`
- Query `SHOW server_version` o equivalente senza dati sensibili.
- `pg_dump --format=custom --no-owner --no-acl` con secret protetto.
- Controllo tipo, dimensione non nulla e indice del dump.
- Avvio PostgreSQL temporaneo con nome e volume espliciti.
- `pg_restore` nel database vuoto.
- Query di confronto per migration, tabelle e conteggi.
- Cleanup selettivo dell'ambiente temporaneo.
- `git status --short`
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [ ] Esiste un dump custom non vuoto in una posizione non versionata e nota
      all'utente.
- [ ] Nessuna credenziale compare in Git, comandi registrati o output allegati.
- [ ] Il restore in PostgreSQL locale isolato termina senza errori non spiegati.
- [ ] Schema, migration e conteggi essenziali coincidono con Neon al momento
      dell'export.
- [ ] L'ambiente temporaneo viene rimosso senza toccare volumi locali abituali
      o Neon; il dump viene conservato.
- [ ] Il runbook distingue backup manuale verificato da backup schedulato o
      disaster recovery, che restano fuori scope.

## Rischi e assunzioni

Il dump contiene dati personali di test e hash password; non va allegato al
task o caricato come artifact. Un `pg_dump` riuscito senza restore non soddisfa
il task. I conteggi possono cambiare se l'app riceve scritture durante il
confronto: per questa demo si esegue la prova senza utenti attivi e si registra
la finestra temporale.

## Verifica manuale

1. Controllare versione Neon e destinazione privata del dump.
2. Eseguire export e ispezione dell'indice.
3. Ripristinare in PostgreSQL temporaneo vuoto.
4. Confrontare schema e conteggi senza mostrare contenuti.
5. Rimuovere l'ambiente temporaneo e conservare il dump.

## Decisioni emerse

- Il backup e' manuale, finale e limitato a PostgreSQL.
- La prova di restore locale e' obbligatoria.
- Nessun backup viene versionato o pubblicato come artifact.

## File modificati

Da compilare durante l'implementazione.

## Risultati dei controlli

Da compilare senza percorso contenente segreti o dati del dump.

## Problemi residui

Da compilare.

## Riepilogo finale

Da compilare dopo tutti i criteri verificati.
