# M6-004 — Eseguire realtime Compose in CI

- **Stato:** proposta
- **Milestone:** Milestone 6 — Test end-to-end e CI
- **Data di apertura:**
- **Data di chiusura:**
- **Dipendenze:** M6-001, M6-002, M6-003

## Contesto

M6-002 avra' automatizzato il percorso reale della chat in due context Chromium
contro il Compose locale. M6-003 avra' introdotto la CI per i controlli
applicativi. Resta da far eseguire lo stesso scenario in un runner GitHub
effimero, con PostgreSQL, Redis, Horizon, Reverb e Nginx effettivi.

## Obiettivo

Estendere la GitHub Actions con un job E2E che prepari input temporanei non
segreti, avvii il Compose completo e lanci Playwright Chromium sul percorso
HTTPS/WSS reale della chat. Al termine, il job rimuove lo stack e i volumi del
solo runner CI.

## Fuori scope

- Trust del certificato mkcert personale, certificati di produzione o gestione
  di una CA persistente nel browser/runner.
- Browser Firefox/WebKit, test visuali, parallelo E2E, servizi cloud, cache o
  deploy.
- Cambi a codice applicativo, autenticazione, CORS, cookie Secure, Nginx o
  contratti WebSocket per adattarli al test.
- Operazioni `down -v` sul computer locale dello sviluppatore.

## File modificabili

- Workflow GitHub Actions introdotto da M6-003.
- File di supporto minimi per generare valori Compose e certificato temporaneo
  con SAN, senza chiavi o segreti versionati.
- Configurazione Playwright strettamente necessaria a distinguere runner CI e
  macchina locale.
- Documentazione CI/E2E e questo task.
- `docs/project/current-state.md` quando il task verra' attivato o completato.

## File non modificabili

- `.cert/`, `compose.env`, `.env` locali, certificati mkcert, configurazioni di
  produzione e logica di dominio.

## Requisiti

- Il job genera nel workspace effimero un certificato temporaneo con SAN per
  `app.simple-chat.test` e `api.simple-chat.test`, oltre ai valori Compose
  fittizi indispensabili ma non sensibili.
- Il runner risolve entrambi i domini a `127.0.0.1`, avvia lo stesso
  `compose.yaml` della chat e attende segnali di disponibilita' utili prima di
  Playwright.
- Playwright Chromium visita HTTPS/WSS reali; `ignoreHTTPSErrors` e' ammesso
  soltanto in CI per il certificato temporaneo non trusted, non per il profilo
  locale mkcert e non come fallback HTTP.
- Il test resta quello a due context di M6-002 e non usa mock di Redis, Horizon,
  Reverb, Echo o HTTP.
- Log Compose e report Playwright utili sono disponibili in caso di failure,
  senza cookie, token, chiavi private o dati sensibili.
- Il cleanup `docker compose down -v` e' eseguito solo nel runner GitHub
  effimero, anche quando il test fallisce.

## Strategia di test

Provare dapprima i passaggi di preparazione in una CI manuale: generazione SAN,
mapping host, build/avvio Compose e health. Poi eseguire lo scenario Playwright
di M6-002 e verificare nei log Horizon/Reverb che la pipeline reale sia stata
percorsa. Una failure TLS deve distinguere certificato non trusted dalla
connessione HTTPS/WSS; il bypass trust non deve comparire nello scenario locale.

## Comandi da eseguire

- `git status --short`
- Validazione della configurazione Compose generata nel runner
- Build e avvio Compose nel job GitHub
- Comando Playwright Chromium E2E
- Raccolta log dei servizi Compose e report Playwright in caso di failure
- `docker compose down -v` soltanto nel job effimero
- Verifica del workflow su GitHub Actions
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [ ] Il job CI avvia lo stack Compose completo e risolve i due domini pubblici
  senza usare Lerd o input locali dello sviluppatore.
- [ ] Chromium esegue con successo lo scenario M6-002 su HTTPS/WSS, con due
  browser context e pipeline Redis/Horizon/Reverb/Echo reali.
- [ ] Il solo bypass del trust del certificato temporaneo e' limitato a
  Playwright CI; HTTP e modifiche ai cookie/CORS non sono introdotti.
- [ ] Failure di E2E conserva evidenze sufficienti alla diagnosi e il runner
  effettua il cleanup dei propri volumi anche in caso di errore.

## Rischi e assunzioni

Un certificato self-signed temporaneo prova TLS, routing e WSS, ma non la trust
chain della CA mkcert personale: quella resta coperta dallo smoke locale M5.
L'avvio di sette servizi e browser puo' superare i timeout predefiniti della
CI; tempi e readiness devono essere basati su stato o log osservabili, non su
sleep fissi. Si assume un runner Linux GitHub-hosted con Docker Compose
disponibile.

## Verifica manuale

1. Avviare il workflow manualmente e aprire il job E2E.
2. Controllare che i domini risolvano localmente nel runner e Nginx esponga
   soltanto il percorso HTTPS previsto.
3. Leggere log Horizon/Reverb e il report Playwright del run riuscito.
4. Per una failure controllata, verificare che log e report siano disponibili e
   il cleanup finale sia comunque eseguito.

## Decisioni emerse

- La CI riusa Compose normale e non crea un'architettura di test separata.
- Il certificato CI e' effimero e volutamente non trusted; Playwright lo ignora
  solo nel job CI. Il trust mkcert locale resta un controllo distinto.
- `down -v` e' sicuro solo nel runner effimero; i volumi locali non vengono
  mai cancellati automaticamente dagli E2E.

## File modificati

## Risultati dei controlli

## Problemi residui

## Riepilogo finale
