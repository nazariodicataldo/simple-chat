# M4-002 — Proteggere la dashboard Horizon

- **Stato:** completato
- **Milestone:** Milestone 4 — Horizon
- **Data di apertura:** 2026-09-02
- **Data di chiusura:** 2026-09-02
- **Dipendenze:** M4-001

## Contesto

Horizon espone la dashboard su `/horizon`. Il suo fallback consente l'accesso
in ambiente `local`; e' comodo durante l'installazione, ma non soddisfa la DoD
di una dashboard protetta. La dashboard puo' mostrare dettagli operativi e
payload serializzati dei job, quindi non deve essere accessibile a guest o a
ogni utente della chat.

Il dominio User non ha ruoli amministrativi. Per questo toy project la regola
minima e' una lista di email dichiarata nella configurazione, inizialmente
`admin@admin.com`.

## Obiettivo

Proteggere `/horizon` anche nel profilo `local`: solo un utente con sessione
autenticata e email presente in `HORIZON_ALLOWED_EMAILS` puo' vedere o azionare
la dashboard.

## Fuori scope

- Ruoli, permessi, tabella admin, inviti o gestione UI degli amministratori.
- Accesso per IP, Basic Auth, VPN, SSO o autenticazione dedicata Horizon.
- Produzione, reverse proxy, rate limiting, Docker e secret management.
- Modifiche al login, a Sanctum, CORS, API, frontend o account esistenti.
- Osservazione e retry runtime dei job: M4-004.

## File modificabili

- `backend/.env.example`
- `backend/config/horizon.php`
- `backend/app/Providers/HorizonServiceProvider.php`
- `backend/tests/Feature/HorizonDashboardAuthorizationTest.php`
- `docs/learning/horizon.md`
- Questo task
- `docs/project/current-state.md` solo quando il task passa da proposta ad
  attivo o da attivo a completato

## File non modificabili

- `backend/.env`, cookie, password, chiavi o altri dati locali.
- Model User, migration, endpoint e form di autenticazione esistenti.
- Configurazione Redis/queue M3, Horizon supervisor M4-001 e frontend.
- `CHANGELOG.md` fino al completamento dell'intera M4.

## Requisiti

- Dichiarare `HORIZON_ALLOWED_EMAILS=admin@admin.com` in `.env.example`.
  L'email non e' un secret; il file `.env` locale viene allineato manualmente e
  resta fuori dal diff.
- Esporre la lista tramite configurazione Horizon, non leggendo `env()`
  direttamente nel provider. La lista puo' contenere piu' email separate da
  virgola; valori vuoti devono essere ignorati e ogni email deve essere
  normalizzata con `trim` e minuscole.
- Il provider deve registrare, dopo il bootstrap del provider padre,
  un'autorizzazione esplicita con `Horizon::auth(...)`. Deve quindi sostituire
  il fallback permissivo di `local` e fallire chiusa quando manca l'utente o la
  lista e' vuota.
- L'autorizzazione normalizza con `trim` e minuscole anche l'email dell'utente
  autenticato e la confronta strettamente con la lista configurata, senza
  aprire l'accesso ad altri utenti.
- Il task non crea un utente `admin@admin.com`: durante la verifica manuale
  l'account viene registrato tramite il flusso esistente, oppure riusato se e'
  gia' disponibile.
- Aggiungere feature test su `GET /horizon` per guest rifiutato con `403`,
  utente autenticato non incluso rifiutato con `403`, utente
  `admin@admin.com` autorizzato e lista vuota che rifiuta anche
  `admin@admin.com`. I test devono attraversare la route dashboard reale, non
  soltanto invocare la closure in isolamento.

## Strategia di test

I feature test provano `GET /horizon`, cioe' la route dashboard reale, e il suo
middleware di autorizzazione condiviso dall'intero gruppo Horizon. M4-004
provera' una vera azione della dashboard (retry): duplicarla qui
accoppierebbe il task alle API interne del pacchetto. Lo smoke browser completa
la prova della sessione Sanctum condivisa tra frontend HTTPS e host backend: il
solo `actingAs()` non dimostra che il cookie reale renda accessibile
`https://api.simple-chat.test/horizon`.

## Comandi da eseguire

- `git status --short`
- `git diff --stat`
- `git diff --check`
- Da `backend/`: `php artisan config:clear`
- Da `backend/`: `composer test -- --filter=HorizonDashboardAuthorizationTest`
- Da `backend/`: `composer test`, `./vendor/bin/pint --test` e
  `./vendor/bin/phpstan analyse --memory-limit=512M`
- Runtime locale: login SPA come utente non autorizzato e come
  `admin@admin.com`, quindi apertura diretta di `https://api.simple-chat.test/horizon`

## Criteri di accettazione

- [x] In `local`, guest e utente autenticato fuori lista ricevono `403` dalla
      dashboard Horizon.
- [x] L'utente autenticato `admin@admin.com` riceve la dashboard con successo.
- [x] Una lista assente o vuota non apre l'accesso.
- [x] I test coprono i quattro casi, inclusa lista vuota, attraverso la route
      reale `/horizon`.
- [x] Lo smoke browser conferma che la sessione SPA esistente abilita soltanto
      l'account autorizzato sul dominio backend.
- [x] `.env` e credenziali non compaiono nel diff; la configurazione e il test
      non introducono ruoli o API nuove.
- [x] I controlli backend e diff hanno esito registrato o una limitazione
      riproducibile esplicita.

## Rischi e assunzioni

La protezione per email e' appropriata solo al toy project locale. Non e' un
sistema di ruoli e non va estesa a produzione senza una decisione dedicata.

Il default di Horizon permette l'accesso in `local`; il provider esplicito e'
quindi necessario anche se non esiste ancora un ambiente production. La lista
configurabile evita di legare un'identita' amministrativa al codice e consente
di cambiare utenti locali senza una modifica applicativa.

## Verifica manuale

1. Allineare manualmente `HORIZON_ALLOWED_EMAILS=admin@admin.com` nel `.env`
   locale e svuotare la cache configurazione.
2. Avviare Lerd, frontend HTTPS e Horizon secondo M4-001.
3. Registrare/autenticare un utente non incluso nella lista e aprire la URL
   backend `/horizon`: deve ricevere rifiuto.
4. Autenticare o registrare l'utente `admin@admin.com` tramite la SPA e aprire
   la stessa URL senza creare cookie manuali: la dashboard deve essere visibile.
5. Annotare solo status e risultato di accesso, mai cookie o credenziali.

## Decisioni emerse

- La dashboard e' protetta anche in `local`; non si accetta il fallback Horizon
  che consentirebbe l'accesso indiscriminato in sviluppo.
- L'autorizzazione e' una lista configurabile di email, con valore iniziale
  `admin@admin.com`; il progetto non introduce ruoli amministrativi.
- I rifiuti della dashboard sono `403`, non redirect a una pagina login: Horizon
  applica direttamente il proprio middleware di autorizzazione.
- Lista e email utente sono normalizzate con `trim` e minuscole, poi confrontate
  strettamente; una lista vuota non autorizza alcun utente.
- Il test automatico copre `GET /horizon`; le azioni interne condividono il
  middleware Horizon e il retry reale resta nella verifica end-to-end M4-004.

## File modificati

- `backend/.env.example`
- `backend/config/horizon.php`
- `backend/app/Providers/HorizonServiceProvider.php`
- `backend/tests/Feature/HorizonDashboardAuthorizationTest.php`
- Questo task

## Risultati dei controlli

- RED: `php artisan test --filter=HorizonDashboardAuthorizationTest` ha
  mostrato che guest, utente fuori lista e lista vuota ricevevano `200` in
  `local` a causa del fallback di Horizon.
- GREEN: la suite mirata ha superato 4 test e 6 assertion sulla route reale
  `GET /horizon`; include guest, utente fuori lista, utente autorizzato con
  CSV normalizzato dalla configurazione e lista assente.
- `php artisan config:clear`: riuscito.
- `php artisan test tests/Feature/HorizonDashboardAuthorizationTest.php`:
  rieseguito il 2026-09-02 e riuscito (4 test, 6 assertion).
- `./vendor/bin/pint --test`: riuscito.
- `./vendor/bin/phpstan analyse --memory-limit=512M`: riuscito senza errori.
- `composer test`: rieseguito il 2026-09-02 e riuscito (40 test, 200
  assertion); il runner ha riportato un warning senza dettagli.
- Smoke browser HTTPS del 2026-09-02: guest e utente autenticato fuori lista
  hanno ricevuto `403` su `GET /horizon/dashboard`; con `admin@admin.com`
  autenticato, le richieste della dashboard a `GET /horizon/api/stats`,
  `GET /horizon/api/masters` e `GET /horizon/api/workload` hanno ricevuto
  `200`.

## Problemi residui

- Nessuno.

## Riepilogo finale

M4-002 e' completato: l'autorizzazione esplicita protegge Horizon anche in
`local`, i test automatici coprono la route reale e lo smoke browser HTTPS
conferma la sessione SPA per guest, utente fuori lista e amministratore.
