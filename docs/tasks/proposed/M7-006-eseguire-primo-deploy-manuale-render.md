# M7-006 — Eseguire il primo deploy manuale su Render

- **Stato:** proposta
- **Milestone:** Milestone 7 — Deployment
- **Data di apertura:**
- **Data di chiusura:**
- **Dipendenze:** M7-005

## Contesto

Il repository dispone dell'immagine production, dei datastore esterni e di un
Blueprint validato, ma non esiste ancora un servizio pubblico. La prova remota
deve distinguere build, startup, health e osservazione dei processi; non deve
anticipare la prova funzionale realtime completa di M7-007.

## Obiettivo

Sincronizzare manualmente il Blueprint, inserire i secret nel Dashboard Render,
pubblicare il commit `master` scelto e verificare che build, migration,
processi, liveness, pagina pubblica, cold start, memoria e log del web service
Free siano coerenti con il contratto M7.

## Fuori scope

- Modifica automatica di GitHub, creazione di workflow deploy o auto-deploy.
- E2E CREATE -> UPDATE -> DELETE a due utenti: M7-007.
- Backup Neon: M7-008.
- Custom domain, staging, preview environment e piani a pagamento.
- Correzioni improvvisate nel Dashboard non riportate nel Blueprint.

## File modificabili

- Documentazione del runbook manuale e dei valori non sensibili osservati.
- `docs/learning/deployment-render.md`, limitatamente a deploy, cold start,
  processi, log e limiti Free verificati.
- Questo task e `docs/project/current-state.md` durante attivazione e chiusura.
- File production/Blueprint soltanto per difetti riprodotti e con modifica
  minima; ogni variazione deve tornare nel repository prima del nuovo deploy.

## File non modificabili

- Secret reali, file `.env`, database locale e workflow di deploy.
- Codice di dominio, API e dipendenze salvo difetto bloccante dimostrato e
  autorizzato separatamente.
- Dati Neon/Upstash fuori dal minimo necessario al bootstrap.

## Requisiti

- Il commit scelto e' su `master` e tutti i job GitHub Actions pertinenti sono
  verdi prima del deploy.
- La sync Blueprint e il deploy sono avviati manualmente; `autoDeploy` resta
  disabilitato.
- `APP_KEY` viene generata con Laravel; credenziali Reverb sono casuali; URL
  Neon e Upstash provengono dai rispettivi Dashboard. Gli output non vengono
  copiati nei documenti o nei log raccolti.
- Il servizio usa piano Free, regione Francoforte e il solo dominio HTTPS
  `https://<render-service>.onrender.com`.
- Il log mostra build dai lockfile, migration completate e avvio dei processi
  production nell'ordine previsto.
- `/up` raggiunge stato healthy. `/` restituisce la pagina Next pubblica con
  certificato valido e gate di autenticazione.
- Un periodo di inattivita' sufficiente dimostra il cold start del piano Free;
  la prima richiesta puo' essere lenta ma deve recuperare senza intervento.
- Durante avvio, idle e prime richieste vengono osservati memoria, restart/OOM
  e stato del servizio. Un OOM o crash ripetuto e' bloccante.
- I log Render ricevono output di tutti i processi su `stdout`/`stderr`, sono
  leggibili nel piano Hobby e non espongono secret, cookie o connection string.
- Una correzione necessaria passa da commit, CI verde e nuovo deploy manuale;
  non viene applicata come drift soltanto nel Dashboard.

## Strategia di test

Registrare SHA e run CI completi, poi creare/sincronizzare il servizio dal
Blueprint. Sorvegliare build e runtime fino a health riuscita. Eseguire richieste
TLS a `/up` e `/`, ispezionare processi/log/metriche, attendere lo spin-down e
misurare il successivo risveglio. Eseguire un secondo deploy manuale solo se
necessario a dimostrare ripetibilita' o una correzione. Non usare M7-006 per
dichiarare verificata la queue realtime.

## Comandi da eseguire

- `git status --short`
- Comandi `gh` read-only per stato del run CI sullo SHA scelto, se disponibili.
- Sync Blueprint e deploy manuali dal Dashboard Render.
- Richieste HTTPS a `/up` e `/` senza bypass TLS.
- Lettura completa dei log build/runtime e metriche CPU/memoria disponibili.
- Prova di spin-down/cold start con tempi registrati.
- Ispezione del deploy attivo e dello SHA pubblicato.
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [ ] Il deploy attivo corrisponde a uno SHA `master` con CI verde.
- [ ] Il Blueprint crea un unico web service Free a Francoforte e non presenta
      drift non documentato.
- [ ] Build, migration e avvio processi sono riusciti con log completi.
- [ ] `/up` e `/` rispondono in HTTPS con certificato pubblico valido.
- [ ] Il cold start recupera e i tempi osservati sono registrati senza
      presentarli come SLA.
- [ ] Non risultano OOM, restart imprevisti o crash silenziosi dei processi.
- [ ] I log di tutti i processi sono disponibili e non espongono secret.
- [ ] Queue e realtime restano esplicitamente non verificati fino a M7-007.

## Rischi e assunzioni

Il primo build e il cold start possono essere lenti. Aumentare timeout e
healthcheck e' ammesso soltanto in base a misure reali e non deve mascherare un
processo guasto. Le 512 MB sono condivise: se il runtime non e' stabile, il
vincolo zero euro e la topologia scelta devono essere riesaminati con l'utente,
non aggirati dichiarando il deploy riuscito.

## Verifica manuale

1. Confermare SHA e CI verde.
2. Sincronizzare Blueprint e inserire i secret senza registrarli.
3. Seguire build, migration, processi e health nei log completi.
4. Aprire pagina e `/up` con TLS valido.
5. Osservare memoria e ripetere dopo uno spin-down.

## Decisioni emerse

- Il deploy e' manuale dal Dashboard e parte solo dopo CI verde.
- Il piano Free e il dominio Render predefinito sono vincoli accettati.
- La disponibilita' HTTP non sostituisce la prova realtime M7-007.

## File modificati

Da compilare durante l'implementazione, separando modifiche repository e stato
remoto Render.

## Risultati dei controlli

Da compilare con SHA, run CI, deploy ID, tempi e output sanitizzato.

## Problemi residui

Da compilare.

## Riepilogo finale

Da compilare dopo tutti i criteri verificati.
