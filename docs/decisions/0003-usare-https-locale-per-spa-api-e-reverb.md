# ADR 0003 — Usare HTTPS locale per SPA, API e Reverb

- **Stato:** accettato
- **Data:** 2026-08-20

## Contesto

La SPA Next.js, l'API Laravel e Reverb sono su origini distinte durante lo
sviluppo locale. Sanctum usa cookie di sessione e il client Axios usa il cookie
`XSRF-TOKEN`; Reverb viene raggiunto dal browser tramite Echo. Con Lerd e un
certificato locale fidato questi servizi sono disponibili dietro i domini
`app.simple-chat.test` e `api.simple-chat.test`.

## Problema

Servire la SPA in HTTP mentre API o Reverb sono esposti tramite TLS crea una
configurazione mista: il browser non invia correttamente un cookie XSRF
`Secure` a una pagina HTTP e una pagina HTTPS non puo' aprire un WebSocket
`ws`. Login, richieste CSRF e sottoscrizioni private diventano quindi
inaffidabili o falliscono con errori `419` e di connessione.

## Opzioni considerate

- Usare HTTP e `ws` per tutti i servizi locali.
- Usare HTTPS per SPA e API e `wss` per il browser, mantenendo il collegamento
  interno Laravel-verso-Reverb su HTTP.
- Fare transitare anche il collegamento interno Laravel-verso-Reverb dal proxy
  HTTPS locale.

## Decisione

Il profilo locale predefinito usa HTTPS per la SPA
`https://app.simple-chat.test:3000`, HTTPS per l'API
`https://api.simple-chat.test` e `wss` per Echo verso il dominio API sulla
porta 443. Gli esempi `.env` espongono pertanto questi valori al browser e
all'API.

Il broadcaster Laravel continua a raggiungere il processo Reverb direttamente
su `localhost:8080` con HTTP. Questo e' traffico interno alla macchina di
sviluppo, non una connessione del browser: non richiede TLS e non deve passare
dal proxy. `REVERB_ALLOWED_ORIGINS` conserva solo l'host della SPA, senza
schema o porta.

## Motivazione

L'allineamento HTTPS/WSS evita mixed content e permette ai cookie Sanctum/XSRF
contrassegnati `Secure` di funzionare nel flusso reale del browser. Separare il
collegamento interno del broadcaster mantiene la configurazione semplice e non
aggiunge un salto proxy o una dipendenza dal certificato per una connessione
loopback non esposta.

## Conseguenze

- Lo sviluppo locale richiede certificati fidati per i due domini Lerd e Next
  deve essere avviato in HTTPS con il certificato della SPA.
- `APP_URL`, `NEXT_PUBLIC_BACKEND_URL`, `FRONTEND_URL`, CORS e i valori Echo
  devono usare gli URL HTTPS coerenti; `SANCTUM_STATEFUL_DOMAINS` conserva il
  formato host e porta.
- Il browser non deve disabilitare la verifica TLS. Se Node.js effettua
  richieste server-side all'API locale, deve fidarsi della CA locale invece di
  disabilitare i controlli dei certificati.
- Segreti Reverb, cookie e token restano fuori da `NEXT_PUBLIC_*`; la scelta
  HTTPS non modifica l'autorizzazione server-side dei canali privati.

## Condizioni per una futura revisione

Rivalutare se lo sviluppo locale non usa piu' domini TLS o se backend e Reverb
vengono separati su host distinti. In produzione la stessa separazione tra
ingresso HTTPS/WSS pubblico e rete interna puo' restare valida, ma certificati,
proxy e processi saranno gestiti dal deploy.
