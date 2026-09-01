# M4-002 — Proteggere la dashboard Horizon

- **Stato:** proposta
- **Milestone:** Milestone 4 — Horizon
- **Data di apertura:** 2026-08-31
- **Data di chiusura:**
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
- Osservazione e retry runtime dei job: M4-003.

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
  virgola; valori vuoti e spazi devono essere ignorati.
- Il provider deve registrare un'autorizzazione Horizon esplicita, che
  sostituisca il fallback permissivo di `local` e fallisca chiusa quando manca
  l'utente o la lista e' vuota.
- L'autorizzazione confronta l'email dell'utente autenticato con la lista
  configurata in modo esplicito e senza aprire l'accesso ad altri utenti.
- Il task non crea un utente `admin@admin.com`: durante la verifica manuale
  l'account viene registrato tramite il flusso esistente, oppure riusato se e'
  gia' disponibile.
- Aggiungere feature test per guest rifiutato, utente autenticato non incluso
  rifiutato e utente `admin@admin.com` autorizzato. I test devono attraversare
  le route Horizon reali, non soltanto invocare la closure in isolamento.

## Strategia di test

I feature test provano l'autorizzazione Laravel delle route dashboard. Lo smoke
browser completa la prova della sessione Sanctum condivisa tra frontend HTTPS e
host backend: il solo `actingAs()` non dimostra che il cookie reale renda
accessibile `https://api.simple-chat.test/horizon`.

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

- [ ] In `local`, guest e utente autenticato fuori lista ricevono rifiuto
  HTTP dalla dashboard Horizon.
- [ ] L'utente autenticato `admin@admin.com` riceve la dashboard con successo.
- [ ] Una lista assente o vuota non apre l'accesso.
- [ ] I test coprono i tre casi attraverso le route reali Horizon.
- [ ] Lo smoke browser conferma che la sessione SPA esistente abilita soltanto
  l'account autorizzato sul dominio backend.
- [ ] `.env` e credenziali non compaiono nel diff; la configurazione e il test
  non introducono ruoli o API nuove.
- [ ] I controlli backend e diff hanno esito registrato o una limitazione
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

## File modificati

## Risultati dei controlli

## Problemi residui

## Riepilogo finale
