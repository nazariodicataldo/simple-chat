# M7-006 — Verificare il deploy pubblico con Playwright

- **Stato:** proposta
- **Milestone:** Milestone 7 — Deployment
- **Data di apertura:**
- **Data di chiusura:**
- **Dipendenze:** M7-005

## Contesto

M7-005 dimostra che il servizio Render costruisce, parte e risponde, ma non che
il flusso reale attraversi Neon, Upstash, Horizon, Reverb ed Echo. Lo scenario
M6-002 offre gia' la prova a due browser context, ma la base URL e alcuni
messaggi diagnostici sono specifici del Compose locale.

## Obiettivo

Rendere configurabile in modo esplicito la base URL Playwright e riutilizzare
lo scenario realtime esistente contro il dominio Render pubblico, mantenendo
il default locale e la verifica TLS rigorosa.

## Fuori scope

- Nuovo scenario funzionale, browser aggiuntivi o matrice di ambienti.
- Mock, endpoint test-only, seed, reset Neon o cleanup diretto del database.
- Esecuzione automatica contro production da GitHub Actions.
- Modifica dell'autenticazione o creazione di una funzione delete-user.
- Backup e ripristino.

## File modificabili

- `frontend/playwright.config.ts`.
- Test E2E esistenti soltanto per rendere diagnostica e base URL neutrali tra
  locale e deploy, senza cambiare il comportamento osservato.
- Comando/documentazione frontend strettamente necessari all'override.
- `docs/learning/deployment-render.md`, limitatamente a smoke, TLS e cold start.
- Questo task e `docs/project/current-state.md` durante attivazione e chiusura.

## File non modificabili

- API, autenticazione, eventi, queue, Reverb, Nginx production e Blueprint,
  salvo difetto bloccante riprodotto e autorizzato separatamente.
- Credenziali, database reset, utenti esistenti e workflow di deploy.
- Default locale HTTPS o variabile CI `PLAYWRIGHT_IGNORE_HTTPS_ERRORS`.

## Requisiti

- Senza variabili, `pnpm e2e` continua a usare
  `https://app.simple-chat.test:8443` con il Compose gia' avviato.
- `PLAYWRIGHT_BASE_URL=https://<render-service>.onrender.com` seleziona il
  deploy pubblico senza modificare file o introdurre trailing slash ambiguo.
- Un valore non HTTPS per il deploy pubblico o un URL invalido fallisce con un
  messaggio chiaro; il percorso locale conserva il contratto esistente.
- Playwright non abilita `ignoreHTTPSErrors` per Render: certificato HTTPS e WSS
  devono essere pubblicamente validi.
- Prima della suite, una readiness esplicita attende `/up` e `/` dopo
  l'eventuale cold start; non usa un sonno fisso come prova di disponibilita'.
- Lo scenario usa due `BrowserContext`, registra due utenti univoci dalla UI e
  attende la subscription `private-chat` prima della mutazione.
- CREATE, UPDATE e DELETE attraversano HTTP, Neon, Upstash/default, Horizon,
  Reverb, Echo e la UI di B senza refresh e senza duplicati.
- Il messaggio viene eliminato via UI anche in cleanup; i due utenti E2E possono
  restare su Neon come compromesso esplicitamente accettato.
- I log completi Render vengono esaminati per migration, richieste, job e
  Reverb. Socket aperto o queue vuota da soli non sono prova sufficiente.
- Dopo la modifica, il percorso Playwright locale viene rieseguito per evitare
  una regressione M6.

## Strategia di test

Prima introdurre e testare la selezione della base URL, mantenendo il default
locale. Eseguire la suite contro Compose con TLS mkcert. Poi riscaldare il
servizio Render tramite condizioni osservabili ed eseguire la stessa suite
contro l'URL production. Correlare output Playwright e log Render; controllare
che il test abbia pulito il messaggio e lasciato soltanto gli utenti previsti.

## Comandi da eseguire

- `git status --short`
- Test mirato della configurazione URL, se esiste una struttura adatta.
- `docker compose --env-file compose.env up -d` e readiness locale.
- `cd frontend && corepack pnpm e2e` contro Compose.
- Attesa HTTPS `/up` e `/` sul dominio Render con TLS verificato.
- `PLAYWRIGHT_BASE_URL=https://<render-service>.onrender.com corepack pnpm e2e`.
- Lettura dei log Render completi relativi alla finestra del test.
- `corepack pnpm test`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `docker compose --env-file compose.env down` senza `-v`.
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [ ] La base URL production e' selezionabile via variabile esplicita e il
      default Compose non cambia.
- [ ] TLS e WSS Render sono verificati senza bypass.
- [ ] Due context isolati completano CREATE, UPDATE e DELETE su production e B
      osserva ogni stato una sola volta senza refresh.
- [ ] Il messaggio prova viene rimosso via UI; restano soltanto i due utenti E2E
      accettati.
- [ ] Output Playwright e log Render dimostrano la pipeline Neon -> Upstash ->
      Horizon -> Reverb, senza deduzioni da segnali parziali.
- [ ] La suite locale M6 e i controlli frontend pertinenti restano verdi.

## Rischi e assunzioni

Il cold start Render puo' superare i timeout pensati per Compose; va gestito
prima dello scenario, non allargando indiscriminatamente ogni asserzione.
L'esecuzione crea dati reali nel database demo: messaggi vengono rimossi, utenti
no. Se il piano Free o uno dei provider sospende il servizio, registrare il log
completo e distinguere limite infrastrutturale da difetto applicativo.

## Verifica manuale

1. Riscaldare il dominio Render fino a `/up` e `/` riusciti.
2. Avviare la suite con `PLAYWRIGHT_BASE_URL` esplicita.
3. Seguire nei log richiesta, job, broadcast e connessione Reverb.
4. Verificare l'assenza del messaggio E2E dopo il cleanup.
5. Ripetere il percorso locale prima di chiudere il task.

## Decisioni emerse

- Lo stesso test M6 verifica locale e production; non nasce una suite parallela.
- Production mantiene TLS rigoroso.
- Due utenti E2E residui sono accettati per la singola prova finale.

## File modificati

Da compilare durante l'implementazione.

## Risultati dei controlli

Da compilare separando prova locale, remota e log correlati.

## Problemi residui

Da compilare.

## Riepilogo finale

Da compilare dopo tutti i criteri verificati.
