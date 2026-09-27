# M7-008 — Verificare il runbook e chiudere la Milestone 7

- **Stato:** proposta
- **Milestone:** Milestone 7 — Deployment
- **Data di apertura:**
- **Data di chiusura:**
- **Dipendenze:** M7-007

## Contesto

I task precedenti producono immagine, servizi esterni, Blueprint, deploy,
prova E2E e backup. La Milestone 7 richiede pero' un deployment manuale
documentato e verificabile: evidenze sparse nei task non sostituiscono un
runbook coerente ne' un audit finale dello SHA realmente pubblicato.

## Obiettivo

Rileggere ed eseguire il runbook finale sul commit candidato, verificare tutti
i criteri M7 con evidenza fresca e coerente, correggere soltanto documentazione
stale e chiudere milestone, roadmap e stato progetto se nessun requisito resta
aperto.

## Fuori scope

- Nuove funzionalita', refactor, aggiornamenti dipendenze o nuova topologia.
- Automazione del deploy, custom domain, staging, scaling e monitoraggio esterno.
- Correzione nascosta di problemi tecnici: un difetto applicativo riapre o
  genera il task tecnico pertinente.
- Nuovo backup se quello M7-007 e' ancora valido e verificato sullo stesso
  database; il task ne controlla evidenza e procedura.

## File modificabili

- Documentazione del runbook deployment.
- `docs/learning/deployment-render.md`, per la versione finale verificata.
- `docs/project/current-state.md`.
- `docs/project/roadmap.md`.
- `CHANGELOG.md`, se coerente con la convenzione esistente.
- Questo task, poi spostato in `docs/tasks/completed/` solo a criteri soddisfatti.

## File non modificabili

- Codice, Dockerfile, Blueprint, workflow, dipendenze e configurazione runtime,
  salvo nuova autorizzazione dopo un difetto dimostrato.
- Secret e valori Dashboard.
- Task completati precedenti, salvo correzione documentale fattuale minima e
  tracciata.

## Requisiti

- Il runbook parte da prerequisiti espliciti: account, repository, Neon,
  Upstash, secret, branch `master` e CI verde.
- Distingue prima configurazione, sync Blueprint, deploy di un nuovo commit,
  lettura log, health, smoke, rollback del codice e limite delle migration.
- Ogni comando contiene placeholder riconoscibili e non valori reali.
- Il commit attivo Render coincide con lo SHA finale scelto; un ultimo deploy
  manuale e' eseguito se modifiche runtime successive a M7-005 non sono ancora
  pubblicate.
- `/up`, `/`, login/registrazione, CRUD realtime a due context e cleanup hanno
  evidenza fresca. Il backup/restore ha evidenza M7-007 ancora pertinente.
- Log e metriche mostrano assenza di OOM/crash durante lo smoke; l'assenza di
  errori viene dichiarata solo sulla finestra e sui log effettivamente letti.
- Sono documentati i limiti reali: 512 MB, spin-down/cold start, quote, log per
  sette giorni, assenza di SLA, singolo container e utenti E2E residui.
- `docs/learning/deployment-render.md` segue `docs/learning/README.md` e include
  problema, funzionamento, ruolo, configurazione minima, verifica, test, errore
  comune, differenza production, esercizio e fonti ufficiali.
- Roadmap e current state dichiarano M7 completata soltanto dopo tutti i
  criteri e indicano che si tratta di deployment pubblico dimostrativo Free,
  non produzione durevole con SLA.

## Strategia di test

Eseguire un audit read-only iniziale di task, runbook, stato remoto e Git.
Seguire il runbook senza scorciatoie dal commit candidato: CI, deploy manuale se
necessario, health, warm-up, Playwright production, log e controllo stato. Non
ripetere operazioni distruttive inutili. Confrontare ogni DoD con un output e
aggiornare soltanto i documenti dopo la prova.

## Comandi da eseguire

- `git status --short`
- Stato GitHub Actions completo per lo SHA candidato.
- Ispezione SHA/deploy attivo Render.
- Richieste TLS a `/up` e `/` con readiness osservabile.
- Playwright production con `PLAYWRIGHT_BASE_URL` esplicita.
- Lettura log Render della finestra completa del test e metriche disponibili.
- Controllo dell'evidenza M7-007 e della posizione non versionata del dump.
- Comandi del runbook che sono sicuri e pertinenti alla verifica finale.
- `git diff --stat`
- `git diff --check`
- Diff completo di tutti i documenti modificati.

## Criteri di accettazione

- [ ] Il runbook consente di configurare e ridistribuire manualmente il servizio
      senza conoscenze rimaste soltanto nel Dashboard o nella conversazione.
- [ ] CI, deploy, health, pagina, realtime Playwright, log e backup hanno
      evidenza appropriata e non vengono confusi tra loro.
- [ ] Lo SHA Render attivo e lo SHA verificato sono esplicitamente registrati.
- [ ] Limiti Free e compromessi del container unico sono documentati senza
      chiamarli produzione affidabile.
- [ ] Learning guide, current state, roadmap e changelog sono coerenti.
- [ ] Non esistono modifiche fuori scope o secret nel diff.
- [ ] M7 viene marcata completata soltanto se tutti i task M7-001..M7-008 sono
      completati e nessun controllo pertinente fallisce.

## Rischi e assunzioni

La documentazione puo' diventare stale se provider e piani cambiano; il runbook
deve includere una verifica della documentazione ufficiale prima di una nuova
provisioning. Una run verde storica non prova il commit corrente. Un deploy
pubblico dimostrativo non offre SLA, backup schedulati o alta disponibilita'.

## Verifica manuale

1. Partire dal commit candidato con CI verde.
2. Seguire il runbook e confermare lo SHA attivo.
3. Eseguire health e Playwright production.
4. Leggere log/metriche e controllare il backup verificato.
5. Confrontare ogni criterio M7 prima di aggiornare roadmap e stato.

## Decisioni emerse

- La chiusura della milestone e' un audit documentale con evidenza fresca.
- Il risultato e' un deployment dimostrativo gratuito, non una piattaforma con
  garanzie production commerciali.
- Automazione e hardening ulteriori richiedono nuovi task autorizzati.

## File modificati

Da compilare durante l'implementazione.

## Risultati dei controlli

Da compilare con SHA, run, deploy e output sanitizzati.

## Problemi residui

Da compilare.

## Riepilogo finale

Da compilare dopo tutti i criteri verificati e la chiusura documentale.
