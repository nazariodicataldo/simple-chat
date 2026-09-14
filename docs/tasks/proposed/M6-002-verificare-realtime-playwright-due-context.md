# M6-002 — Verificare realtime con Playwright e due context

- **Stato:** proposta
- **Milestone:** Milestone 6 — Test end-to-end e CI
- **Data di apertura:**
- **Data di chiusura:**
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

- [ ] Due context Chromium autenticati non condividono sessione o socket.
- [ ] B riceve CREATE, UPDATE e DELETE generati da A attraverso la pipeline
  reale, una sola volta e senza refresh.
- [ ] Il test non usa mock, endpoint test-only, accesso diretto al database o
  reset distruttivi del Compose locale.
- [ ] I messaggi E2E sono rimossi selettivamente e gli output utili di
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

- Il contratto E2E iniziale e' un solo percorso ad alto valore: autenticazione,
  CREATE, UPDATE e DELETE realtime tra A e B.
- Il cleanup locale privilegia semplicita' e sicurezza: elimina i messaggi di
  prova senza azzerare database o volumi della chat normale.

## File modificati

## Risultati dei controlli

## Problemi residui

## Riepilogo finale
