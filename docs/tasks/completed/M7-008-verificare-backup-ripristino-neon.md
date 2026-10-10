# M7-008 — Verificare backup e ripristino di Neon

- **Stato:** completato
- **Milestone:** Milestone 7 — Deployment
- **Data di apertura:** 2026-10-09
- **Data di chiusura:** 2026-10-10
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
essenziali prima di rimuovere soltanto l'ambiente di restore. Tutti i comandi
sono eseguiti manualmente dall'utente, uno alla volta, dopo averne compreso
scopo e risultato atteso.

## Fuori scope

- Backup Redis/Upstash, perche' non contiene la fonte dei messaggi.
- Scheduling, object storage, cifratura gestita, retention e PITR.
- Restore sopra Neon production o migrazione verso un altro provider.
- Script generico di disaster recovery o workflow GitHub.
- Cancellazione automatica del file di backup riuscito.
- Installazione o aggiornamento di PostgreSQL sul sistema host.
- Modifiche a permessi Docker, gruppi di sistema o configurazione del daemon.

## File modificabili

- Questo task, che contiene il contratto del backup e restore manuale.
- `docs/learning/deployment-render.md`, limitatamente a persistenza, backup e
  restore.
- `docs/project/current-state.md` durante attivazione e chiusura.

## File non modificabili

- Database Neon production, salvo letture consistenti di `pg_dump`.
- Schema, migration, seed e dati applicativi.
- Codice applicativo, Dockerfile, file Compose e `.gitignore`.
- Upstash, configurazione Render, Blueprint, workflow CI e secret versionati.

## Requisiti

- L'utente esegue ogni comando manualmente. Viene fornito un solo comando per
  volta, con scopo e risultato atteso; il passo seguente arriva soltanto dopo
  un output sanitizzato. L'agente non usa direttamente Docker, Neon o il dump.
- La versione server Neon viene rilevata prima dell'export. Dump, restore e
  database temporaneo usano la stessa immagine ufficiale
  `postgres:<major-neon>`; le versioni complete e l'ID locale dell'immagine
  vengono registrati, senza richiedere la stessa minor release.
- Il dump logico comprende l'intero database applicativo, usa formato custom
  con `--no-owner --no-acl` e non seleziona singole tabelle o schemi.
- L'export usa l'endpoint direct di Neon, non il pooler. Host, porta, database e
  username possono comparire come argomenti; la password viene inserita solo
  nel prompt nascosto `-W`, mai in URL, history, processi, file o chat.
- La connessione Neon usa `sslmode=verify-full` e `sslrootcert=system`. Un
  errore di certificato o hostname blocca la prova senza fallback a controlli
  TLS meno rigorosi.
- La cartella Download effettiva viene rilevata senza indovinarne il nome. Al
  suo interno viene creata una sottocartella dedicata con permessi `700`; dump
  timestampato e checksum SHA-256 hanno permessi `600` e restano fuori dal
  repository. Il formato custom comprime ma non cifra i dati.
- L'immagine client esegue `pg_dump` come UID/GID dell'utente quando possibile,
  cosi' il file non resta di proprieta' di `root`. `sudo` viene usato solo se
  Docker lo richiede e non comporta modifiche ai permessi del sistema.
- Il dump e' accettabile come candidato solo se `pg_dump` termina con codice
  zero, il file e' non vuoto e `pg_restore --list` ne legge l'indice. Il
  checksum conservato permette di ricontrollarne l'integrita'.
- La prova avviene in una finestra senza uso volontario della chat. I conteggi
  Neon vengono letti subito prima e subito dopo il dump; se cambiano, la prova
  si ferma e l'export non viene usato come evidenza coerente.
- Prima del restore devono risultare assenti il container
  `simple-chat-m7-008-restore` e il volume
  `simple-chat-m7-008-restore-data`. Una collisione ferma la procedura senza
  eliminazioni automatiche.
- Il restore usa un solo container PostgreSQL con l'immagine gia' verificata,
  il volume dedicato, `--network none` e nessuna porta pubblicata. Non usa
  Compose o i volumi abituali del progetto.
- Il database locale usa `trust` soltanto dentro il container isolato. Le
  operazioni sono eseguite come utente `postgres` con `docker exec` e socket
  locale; il container non puo' collegarsi a Neon o ad altri servizi.
- Il dump `600` non viene montato o copiato nel container di restore. La shell
  host lo apre come utente proprietario e lo invia automaticamente allo
  standard input di `pg_restore` tramite `docker exec -i`; non viene usato il
  restore parallelo, che richiederebbe un file direttamente accessibile.
- `pg_restore` opera su un database vuoto con `--exit-on-error`,
  `--single-transaction`, `--no-owner` e `--no-acl`. Un errore annulla l'intero
  restore; ogni warning viene esaminato invece di essere filtrato genericamente.
- La verifica confronta l'elenco delle tabelle `public`, l'elenco delle
  migration, il totale utenti e i messaggi totali, visibili e soft-deleted.
  Non stampa email, username, hash password o testi e non usa i conteggi delle
  tabelle operative come gate.
- Dopo il successo vengono validati e rimossi soltanto container e volume del
  task. Il dump e il checksum restano nella cartella scelta. In caso di errore
  ci si ferma, si conserva temporaneamente il restore per la diagnosi e il
  cleanup viene impartito in passaggi manuali separati.

## Strategia di test

Rilevare la versione server tramite un client containerizzato e scegliere la
stessa major PostgreSQL per tutto il flusso. In una finestra stabile, leggere i
conteggi fonte, produrre e validare il dump completo tramite prompt password,
quindi rileggere i conteggi. Ripristinare in un database locale vuoto, senza
rete, confrontare struttura e soli aggregati sanitizzati e distruggere le
risorse Docker esclusivamente dopo una prova completa. Ogni passaggio e'
manuale e sequenziale.

## Comandi da eseguire

- `git status --short`
- Rilevamento della directory Download e creazione della sottocartella `700`.
- Preflight dei nomi Docker e query Neon `SHOW server_version` via endpoint
  direct, TLS rigoroso e password al prompt.
- Pull e verifica di `postgres:<major-neon>`, `pg_dump` e `pg_restore`.
- Query fonte sanitizzate prima dell'export.
- `pg_dump --format=custom --no-owner --no-acl` con password al prompt.
- Controllo codice di uscita, dimensione, indice e checksum del dump.
- Query fonte sanitizzate dopo l'export e confronto della finestra.
- Avvio del container isolato e readiness PostgreSQL locale.
- `pg_restore --exit-on-error --single-transaction --no-owner --no-acl` nel
  database vuoto, con il dump fornito tramite standard input.
- Query di confronto per tabelle, migration, utenti e messaggi.
- Cleanup selettivo di container e volume dopo verifica dei nomi.
- `git status --short`
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [x] Esiste un dump custom non vuoto in una posizione non versionata e nota
      all'utente, leggibile da `pg_restore --list` e accompagnato dal checksum.
- [x] Nessuna credenziale compare in Git, comandi registrati o output allegati.
- [x] Versioni reali, endpoint direct e TLS rigoroso sono verificati prima del
      dump senza installare PostgreSQL sull'host.
- [x] I conteggi Neon prima e dopo il dump coincidono.
- [x] Il restore atomico nel PostgreSQL locale isolato termina senza errori o
      warning non spiegati.
- [x] Tabelle `public`, migration e conteggi di utenti e messaggi coincidono
      con Neon, inclusa la distinzione visibili/soft-deleted.
- [x] L'ambiente temporaneo viene rimosso senza toccare volumi locali abituali
      o Neon; dump e checksum vengono conservati con i permessi concordati.
- [x] Il runbook distingue backup manuale verificato da backup schedulato o
      disaster recovery, che restano fuori scope.

## Rischi e assunzioni

Il dump contiene dati personali di test e hash password; non va allegato al
task o caricato come artifact. Un `pg_dump` riuscito senza restore non soddisfa
il task e formato custom non significa cifratura. I permessi `700`/`600` non
proteggono da `root` o da chi controlla Docker, limite accettato per questa
prova locale personale.

Il dump e' internamente consistente, ma i conteggi fonte possono cambiare fra
le query esterne. La chat resta online e non viene introdotta manutenzione: una
differenza prima/dopo invalida soltanto la finestra di confronto. Un errore di
dump, restore, TLS o compatibilita' mantiene il task attivo e non autorizza
fallback permissivi.

## Verifica manuale

1. Verificare stato Git, cartella privata, nomi Docker e versione Neon.
2. Scegliere e verificare l'immagine PostgreSQL della stessa major.
3. Rilevare gli aggregati fonte, eseguire export, indice e checksum.
4. Rilevare nuovamente gli aggregati e confermare la finestra stabile.
5. Avviare il PostgreSQL isolato e completare il restore atomico.
6. Confrontare schema, migration e aggregati senza mostrare contenuti.
7. Rimuovere container e volume e conservare dump e checksum.

## Decisioni emerse

- Il backup e' manuale, finale e limitato a PostgreSQL.
- L'utente esegue un solo comando alla volta; l'agente spiega scopo e output
  atteso, poi aspetta il risultato sanitizzato.
- Si usa l'immagine Docker ufficiale della stessa major Neon, non il client
  PostgreSQL gia' installato sull'host.
- Il dump completo usa endpoint direct, TLS `verify-full`, prompt password,
  formato custom, directory privata in Download e checksum SHA-256.
- La prova di restore locale atomico e' obbligatoria e usa un container senza
  rete o porte, volume dedicato, `trust` locale e `docker exec -i`; la shell
  host legge il dump `600` e lo passa automaticamente a `pg_restore`.
- La finestra e' valida solo con conteggi fonte invariati prima/dopo; il restore
  confronta tabelle, migration, utenti e messaggi senza contenuti sensibili.
- Errori e collisioni fermano la procedura; nessuna risorsa utile alla diagnosi
  viene rimossa automaticamente.
- Nessun backup viene versionato o pubblicato come artifact. Dump e checksum
  riusciti vengono conservati manualmente.

## Evidenze della verifica manuale

- Il direct endpoint Neon ha restituito PostgreSQL `17.11 (7d7ea2a)` con
  `sslmode=verify-full` e `sslrootcert=system`; il pooler non e' stato usato.
- L'immagine ufficiale `postgres:17` e' stata registrata con digest e ID
  `sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3`
  e creazione `2026-10-06T01:33:02.828687149Z`. `pg_dump` e `pg_restore` sono
  `17.11 (Debian 17.11-1.pgdg13+2)`; `ca-certificates` e' `20250419`.
- Il dump custom e' conservato fuori dal repository in
  `/home/nazario/Scaricati/simple-chat-m7-008-20261010-183516/` con file
  `neon-m7-008-20261010-193708.dump`, permessi `600`, proprietario
  `nazario:nazario`, dimensione `22304` byte e SHA-256
  `c4cea239c25d5b5fed2b501bf0c73d829610ef22b083bb44212675b9c9f94fc7`.
  `pg_restore --list` ha restituito `0`; un file vuoto del tentativo fallito
  iniziale non e' stato usato come candidato.
- I conteggi Neon prima e dopo l'export sono rimasti `users=10`,
  `messages_total=6`, `messages_visible=2` e `messages_soft_deleted=4`.
- Il restore atomico ha restituito `restore_exit=0` nel database `restore`,
  usando il container `simple-chat-m7-008-restore`, il volume
  `simple-chat-m7-008-restore-data`, `--network none`, nessuna porta pubblicata,
  utente `postgres` e autenticazione `trust` confinata al container.
- Il confronto ha mostrato lo stesso elenco di tabelle `public`, le quattro
  migration con batch `1` e tutti gli aggregati applicativi sopra indicati.
  Non sono stati stampati dati personali, hash, email, username o testi.
- Il container e il volume temporanei sono stati verificati e rimossi
  selettivamente; la verifica finale li ha restituiti entrambi `ABSENT`.

## File modificati

- `docs/tasks/completed/M7-008-verificare-backup-ripristino-neon.md`, con
  criteri, evidenze e riepilogo della verifica completata;
- `docs/project/current-state.md`, con M7-008 come ultimo task completato e
  nessun task attivo;
- `docs/learning/deployment-render.md`, con il runbook concettuale, la gestione
  del bundle CA e la lettura da stdin senza `--file=-` o archivio `-`.

Nessun file applicativo, Docker, Compose, schema, migration, seed o secret
versionato e' stato modificato.

## Problemi residui

Nessun criterio residuo per M7-008. Il dump manuale verificato non introduce
backup schedulato, retention, PITR, object storage o disaster recovery
generale: restano fuori scope come previsto dal task.

## Riepilogo finale

M7-008 e' completato il 2026-10-10: il dump Neon custom e' stato prodotto e
validato, ripristinato in PostgreSQL locale isolato, confrontato con la fonte e
conservato fuori dal repository dopo il cleanup selettivo.
