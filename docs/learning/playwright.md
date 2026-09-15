# Playwright E2E con due browser context

M6-002 automatizza il percorso che gli smoke manuali avevano gia' provato: due
utenti autenticati vedono CREATE, UPDATE e DELETE della chat senza aggiornare
la pagina. Un test unitario puo' verificare il codice di una mutation o di un
listener Echo, ma non dimostra che cookie Sanctum, Redis, Horizon, Reverb ed
Echo collaborino davvero nello stack Compose.

## Browser, context e page

Playwright separa tre livelli:

- un **browser** e' il processo Chromium avviato dal runner;
- un **browser context** e' una sessione isolata, simile a una finestra
  incognito: ha cookie, local storage e connessioni WebSocket propri;
- una **page** e' la scheda aperta dentro quel context.

M6-002 usa un solo Chromium con due context, A e B. Questa scelta e' piu'
leggera di due browser distinti, ma prova lo stesso confine importante: il
login di A non deve rendere autenticato B e ogni pagina deve aprire il proprio
socket Reverb e completare la propria subscription `private-chat`.

```text
Playwright Chromium
├── context A -> page A -> sessione Sanctum A -> socket Echo A
└── context B -> page B -> sessione Sanctum B -> socket Echo B
```

Non riusare lo stesso context per le due pagine e non copiare `storageState`:
entrambi condividerrebbero la stessa sessione e il test non dimostrerebbe piu'
l'isolamento richiesto.

## Scenario reale della chat

Il test crea dalla UI due utenti con un suffisso casuale della singola
esecuzione. Cosi' non richiede seed, credenziali locali note o una pulizia
globale del database. Una volta che A e B sono autenticati, il percorso e':

```text
A invia/modifica/elimina -> HTTP -> PostgreSQL -> Redis/default
-> Horizon -> Reverb -> Echo -> B aggiorna la propria UI
```

Per ogni mutazione si controllano due fatti distinti: A vede il proprio esito
HTTP e B vede il cambiamento ricevuto. Il testo univoco permette di cercare
solo il messaggio della run; su B deve essercene una sola bubble. Dopo UPDATE
il testo precedente deve sparire, e dopo DELETE deve sparire anche quello
aggiornato.

Il flusso resta un unico test seriale. CREATE, UPDATE e DELETE condividono
utenti e messaggio, quindi dividerli produrrebbe dipendenze artificiali tra
test senza aumentare la copertura.

## Attese affidabili

Redis, Horizon e Reverb rendono la consegna asincrona. Non serve aggiungere
`waitForTimeout`: una pausa fissa rende il test piu' lento quando tutto e'
sano e puo' nascondere un problema quando non lo e'. Playwright aspetta invece
che un locator diventi visibile o scompaia nel DOM.

Prima delle mutazioni, il test osserva sul WebSocket il frame non mutante
`pusher_internal:subscription_succeeded` del canale `private-chat`. L'apertura
del socket da sola non dimostra che Echo abbia completato l'autorizzazione e la
subscription: pubblicare subito potrebbe perdere l'evento mentre B e' ancora
in quel passaggio.

Per l'arrivo su B, M6-002 usa al massimo 15 secondi nell'asserzione
osservabile. Non e' una pausa: il test termina subito quando la bubble attesa
appare. Se scade, il risultato segnala un guasto nella pipeline o nella UI che
deve essere diagnosticato, non corretto aumentando alla cieca il timeout.

Non ricaricare B per verificare un messaggio. Un refresh potrebbe recuperarlo
via HTTP e farebbe passare un test che non ha ricevuto alcun evento realtime.
Allo stesso modo, i log Compose sono utili dopo una failure, ma non sono
l'asserzione del test: la prova resta il cambiamento visibile su B.

## Cleanup locale

Il database Compose e i suoi volumi appartengono allo sviluppatore. Il test non
usa endpoint nascosti, accesso diretto al database o `docker compose down -v`.
Conserva il testo univoco del messaggio creato e, in un `finally`, prova a
eliminarlo tramite la stessa UI di A. Gli utenti registrati possono restare:
sono dati locali innocui e non esiste un reset automatico dell'ambiente.

Il cleanup non deve mascherare l'errore che ha fatto fallire lo scenario. Se
una failure impedisce di raggiungere la UI, si riportano sia l'errore primario
sia il cleanup non eseguito, poi si rimuove manualmente soltanto il messaggio
identificato dalla run.

## Esecuzione locale

M6-001 ha gia' configurato Playwright contro il Compose normale; il runner non
avvia `webServer`, Docker o un profilo alternativo. Con domini `.test`, CA
mkcert trusted e certificati locali presenti:

```bash
docker compose --env-file compose.env up -d
docker compose --env-file compose.env ps
cd frontend
pnpm e2e
```

Se il test fallisce, i log finali utili sono quelli di backend, Reverb, Horizon
e Nginx. Al termine arresta lo stack senza `-v`, per preservare i dati locali:

```bash
docker compose --env-file compose.env logs --tail=100 backend reverb horizon nginx
docker compose --env-file compose.env down
```

Un errore comune e' disabilitare il controllo TLS per rendere il test verde.
In locale il certificato mkcert deve essere trusted e Playwright deve rifiutare
un certificato errato. Il bypass `ignoreHTTPSErrors` e' previsto soltanto per
il certificato temporaneo del runner CI in M6-004, non per questo scenario.

## Differenza con CI ed esercizio

In CI il runner sara' effimero: M6-004 preparera' certificati, mapping host,
browser e cleanup dei volumi. M6-002 resta invece un test locale sul Compose
gia' avviato e non introduce segreti o workaround TLS. I due context, le
asserzioni DOM e l'assenza di mock restano gli stessi.

Esercizio: spiega perche' due page nello stesso browser context non dimostrano
che B riceva un evento per una propria sessione. Poi indica quale controllo
potrebbe far passare falsamente il test dopo un refresh di B.

Per i dettagli, consulta la documentazione ufficiale Playwright su
[browser contexts](https://playwright.dev/docs/browser-contexts),
[isolamento dei test](https://playwright.dev/docs/browser-contexts#how-playwright-achieves-test-isolation)
e [asserzioni auto-retrying](https://playwright.dev/docs/test-assertions).
