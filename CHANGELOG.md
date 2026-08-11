# Changelog

Il formato e' ispirato a [Keep a Changelog](https://keepachangelog.com/it/1.1.0/) e il versioning sara' definito quando esistera' una prima release del prodotto.

## [Unreleased]

### Added

- Base documentale e workflow operativo per il progetto Group Chat.

- Envelope standard per le risposte API riuscite del CRUD Message e cursor pagination della cronologia con autore pubblico privo di email.

- Autenticazione SPA backend con Laravel Sanctum: cookie/CSRF, registrazione, login, logout, utente corrente e protezione dei Message per utente autenticato.

- Gate frontend per autenticazione SPA: controllo server-side della sessione, form login/registrazione/logout, cookie CSRF deduplicato e retry singolo su `419`.

### Changed

- Inizializzato un unico repository Git nella root del monorepo; rimossi i repository Git annidati di backend e frontend.

- Aggiunte regole Git ignore root per environment locali e artefatti rigenerabili del monorepo.
