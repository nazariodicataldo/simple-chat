# Changelog

Il formato e' ispirato a [Keep a Changelog](https://keepachangelog.com/it/1.1.0/) e il versioning sara' definito quando esistera' una prima release del prodotto.

## [Unreleased]

### Added

- Base documentale e workflow operativo per il progetto Group Chat.

- Envelope standard per le risposte API riuscite del CRUD Message e cursor pagination della cronologia con autore pubblico privo di email.

- Autenticazione SPA backend con Laravel Sanctum: cookie/CSRF, registrazione, login, logout, utente corrente e protezione dei Message per utente autenticato.

- Gate frontend per autenticazione SPA: controllo server-side della sessione, form login/registrazione/logout, cookie CSRF deduplicato e retry singolo su `419`.

- Chat frontend con cursor pagination in infinite scroll, messaggi optimistic con
  stati di invio/riprova, identita' dell'utente autenticato e autori reali nelle
  bubble.

- Azioni frontend per modifica ed eliminazione dei messaggi propri, con popover,
  dialog di conferma/modifica, notifiche persistenti e controlli accessibili.

- Stack locale Docker Compose completo con PostgreSQL, Redis, Laravel,
  Next.js, Reverb, Horizon e Nginx; HTTPS/WSS su `127.0.0.1:8443`, certificato
  SAN locale ignorato da Git e smoke browser a due profili.

- GitHub Actions end-to-end con stack Compose completo, TLS effimero e
  Playwright realtime a due context; Webpack e' limitato alla CI mentre lo
  sviluppo locale continua a usare Turbopack.

### Changed

- Completata la verifica runtime di Horizon: un solo consumer locale osserva
  job Message completati e falliti e recupera selettivamente un broadcast dopo
  la risottoscrizione Echo a Reverb.

- Completata la verifica end-to-end dei broadcast queued su Redis con worker,
  retry, `failed_jobs`, Reverb ed Echo; il percorso reale e' documentato in
  M3-004.

- I broadcast Message sono ora job queued con protezione after-commit
  selettiva, evitando eventi fantasma in caso di rollback senza cambiare il
  contratto HTTP o realtime.

- Allineati fallback CORS, ambiente PHPUnit e feature test al profilo locale
  HTTPS della SPA, mantenendo il rifiuto delle origini HTTP nel fallback.

- Dopo logout riuscito, le query messaggi TanStack vengono annullate e rimosse
  prima del login successivo, evitando il flash della lista precedente.

- Il submit del form di invio resta disabilitato quando il messaggio e' vuoto o
  contiene soltanto spazi.

- Il lifecycle del listener realtime Message protegge consumer e riconciliazione
  da callback tardive dopo cleanup, mantenendo una sola sottoscrizione attiva
  durante mount, StrictMode e rerender.

- Inizializzato un unico repository Git nella root del monorepo; rimossi i repository Git annidati di backend e frontend.

- Aggiunte regole Git ignore root per environment locali e artefatti rigenerabili del monorepo.
