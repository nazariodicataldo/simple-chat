# M6-002 — Verificare realtime con Playwright e due context

- **Stato:** completato
- **Milestone:** Milestone 6 — Test end-to-end e CI
- **Data di apertura:** 2026-09-15
- **Data di chiusura:** 2026-09-15
- **Dipendenze:** M6-001

## Contesto

La chat ha gia' superato smoke manuali a due browser con Sanctum, Horizon,
Reverb ed Echo. M6 richiede che lo stesso flusso sia verificato in modo
automatico senza mock di Redis, Horizon, Reverb o Echo. Playwright e il suo
accesso allo stack reale saranno disponibili dopo M6-001.

## Obiettivo

Automatizzare in Chromium un singolo scenario reale con due browser context
isolati: due utenti si registrano o accedono attraverso l'interfaccia, A crea,
modifica e cancella un messaggio e B osserva una sola volta ogni cambiamento
via `private-chat` senza refresh.

## Fuori scope

- Matrice cross-browser, mobile emulation, screenshot visual regression,
  test di carico o test di retry/failure di queue.
- Nuovi endpoint, seed, backdoor di autenticazione, accesso diretto al database
  o mock di HTTP, Redis, Horizon, Reverb ed Echo.
- Un database isolato, un Compose alternativo o reset automatici dei volumi
  locali.
- GitHub Actions: M6-003 e M6-004.

## File modificabili

- Test, fixture e utilita' Playwright strettamente necessari sotto `frontend/`.
- Selettori accessibili o attributi minimi direttamente necessari nella UI
  esistente, senza alterarne comportamento o API.
- Documentazione del solo scenario automatico e questo task.
- `docs/project/current-state.md` quando il task verra' attivato o completato.

## File non modificabili

- API Laravel, dominio Message, policy, configurazione Sanctum/Redis/Reverb,
  Compose, Nginx, certificati, dipendenze e lockfile, salvo un bisogno tecnico
  dimostrato e autorizzato separatamente.

## Requisiti

- I due utenti vivono in due browser context separati: cookie, storage e socket
  non possono essere condivisi dal test runner.
- Registrazione o login avvengono nella UI reale; i dati di prova hanno un
  identificatore univoco della singola esecuzione.
- Il test aspetta condizioni osservabili nell'interfaccia e non usa attese
  temporali arbitrarie per mascherare il ritardo della queue.
- CREATE, UPDATE e DELETE percorrono HTTP, PostgreSQL, Redis/default, Horizon,
  Reverb e Echo; B osserva l'effetto nell'interfaccia senza refresh.
- Al termine vengono eliminati tramite UI soltanto i messaggi creati dal test.
  Gli utenti di prova locali possono restare, come nello smoke M5.

## Strategia di test

Con Compose normale avviato, eseguire il test Playwright seriale. Per ogni
mutazione, controllare sia l'esito locale di A sia l'arrivo in B, quindi
verificare che B mostri una sola bubble o versione del messaggio. La prova e'
end-to-end: i test unitari e i fake esistenti non la sostituiscono.

## Comandi da eseguire

- `git status --short`
- `docker compose --env-file compose.env up -d`
- `docker compose --env-file compose.env ps`
- Comando Playwright Chromium E2E introdotto da M6-001
- `docker compose --env-file compose.env logs --tail=100 backend reverb horizon nginx`
- `docker compose --env-file compose.env down`
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [x] Due context Chromium autenticati non condividono sessione o socket.
- [x] B riceve CREATE, UPDATE e DELETE generati da A attraverso la pipeline
  reale, una sola volta e senza refresh.
- [x] Il test non usa mock, endpoint test-only, accesso diretto al database o
  reset distruttivi del Compose locale.
- [x] I messaggi E2E sono rimossi selettivamente e gli output utili di
  Playwright/Compose sono registrati.

## Rischi e assunzioni

La queue e il realtime sono asincroni: il test deve usare timeout ragionevoli e
segnali UI affidabili, senza trasformare un difetto in una semplice attesa piu'
lunga. Si assume che gli utenti registrati possano restare nel database locale;
solo i messaggi creati dal test sono soggetti a cleanup obbligatorio.

## Verifica manuale

1. Avviare Compose normale e controllare che Horizon e Reverb siano attivi.
2. Eseguire il test una prima volta e osservare nei log i job completati.
3. Ripeterlo: gli username univoci evitano collisioni e B continua a ricevere
   una sola rappresentazione di ciascun evento.
4. Arrestare Compose senza cancellare i volumi.

## Decisioni emerse

- Il contratto E2E iniziale e' un solo percorso seriale ad alto valore:
  registrazione, CREATE, UPDATE e DELETE realtime tra A e B. Dividere le
  mutazioni in test separati non porta valore per questi semplici messaggi.
- Il test registra dalla UI due utenti con un identificatore univoco per ogni
  esecuzione; non dipende da seed, account noti o credenziali versionate.
- A e B usano due `BrowserContext` Chromium distinti, senza condividere cookie,
  storage o socket.
- La prova resta osservabile dalla UI: non usa refresh, attese temporali
  arbitrarie, mock o intercettazioni mutanti di rete. Il test osserva inoltre
  l'ack non mutante `pusher_internal:subscription_succeeded` di
  `private-chat`, così A pubblica solo quando B è pronto a ricevere. Per B,
  le asserzioni Playwright possono attendere fino a 15 s l'evento asincrono.
- Il cleanup locale privilegia semplicita' e sicurezza: un `finally` tenta di
  eliminare dalla UI soltanto il messaggio univoco creato dal test, senza
  azzerare database o volumi della chat normale.

## File modificati

- `frontend/e2e/realtime-two-context.e2e.ts`
- `docs/learning/playwright.md`
- `docs/project/current-state.md`
- `docs/tasks/completed/M6-002-verificare-realtime-playwright-due-context.md`

## Risultati dei controlli

- `docker compose --env-file compose.env config --quiet`: riuscito.
- `docker compose --env-file compose.env up -d`: riuscito; PostgreSQL e Redis
  healthy, Reverb healthy, Horizon, backend, frontend e Nginx attivi; il
  frontend ha raggiunto `✓ Ready`.
- `cd frontend && pnpm e2e`: riuscito con 2 test Chromium superati in 15,4 s;
  lo scenario ha registrato due utenti dalla UI, verificato l'isolamento del
  secondo context, atteso la subscription riuscita a `private-chat` e
  propagato CREATE, UPDATE e DELETE a B con una sola bubble per stato e senza
  refresh.
- I log finali di backend, Reverb, Horizon e Nginx sono riusciti e mostrano le
  registrazioni `201`, le autorizzazioni `/broadcasting/auth` `200`, le
  mutazioni `POST`, `PUT` e `DELETE` dei messaggi e l'avvio di Reverb su
  `0.0.0.0:8080`.
- `cd frontend && pnpm test`: 15 file e 86 test superati.
- `cd frontend && pnpm lint`, `pnpm typecheck` e Prettier sul nuovo spec:
  riusciti.
- `docker compose --env-file compose.env ps`: riuscito con tutti i servizi
  attivi; `docker compose --env-file compose.env down`: riuscito senza `-v`.
- I messaggi creati dallo scenario sono stati eliminati tramite la UI di A;
  gli utenti locali di prova restano come previsto dal task.
- Il primo avvio Chromium nel sandbox ha fallito per
  `sandbox_host_linux.cc:41`; la verifica E2E finale è stata ripetuta fuori
  sandbox, senza modificare la configurazione Playwright, e ha superato tutti
  i test.
- Follow-up TDD del 2026-09-15: il test mirato è stato eseguito prima della
  correzione e ha fallito perché il test non osservava l'ack della subscription
  e il nuovo controllo riceveva zero frame; dopo l'osservazione dell'ack
  `pusher_internal:subscription_succeeded` ha superato lo scenario in 14,6 s.
- Follow-up controlli del 2026-09-15: la suite E2E completa ha superato 2 test
  Chromium in 15,5 s; `pnpm test` ha superato 15 file e 86 test, mentre lint,
  typecheck, Prettier, Compose config e `git diff --check` sono riusciti.

## Problemi residui

Nessuno noto per lo scope M6-002 dopo la sincronizzazione sulla subscription
privata.

## Riepilogo finale

M6-002 aggiunge lo scenario Playwright reale a due browser context isolati per
registrazione, CREATE, UPDATE e DELETE realtime. Le asserzioni osservano la UI
di A e B, mentre il runner attende l'apertura del socket e la subscription
Reverb senza usare mock, endpoint di test, reset dei volumi o attese temporali
arbitrarie. Il task e' pronto per
essere riutilizzato come base per la futura esecuzione in CI.
