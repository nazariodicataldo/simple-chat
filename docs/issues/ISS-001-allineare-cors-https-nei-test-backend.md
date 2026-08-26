# ISS-001 — Allineare CORS HTTPS nei test backend

- **Stato:** risolta
- **Priorita':** media
- **Area:** backend, configurazione test CORS
- **Data di apertura:** 2026-08-25
- **Data di chiusura:** 2026-08-25
- **Task collegato:** [M2-008](../tasks/completed/M2-008-verificare-realtime-due-browser.md)
- **ADR collegato:** [ADR 0003](../decisions/0003-usare-https-locale-per-spa-api-e-reverb.md)

## Contesto

Durante la verifica M2-008, `composer test` ha rilevato che due feature test
CORS usavano ancora l'origine HTTP, mentre il profilo locale deciso da ADR 0003
e gia' verificato nel browser usa HTTPS.

## Comportamento osservato

Le preflight verso `/broadcasting/auth` e `/api/login` rispondevano con
`Access-Control-Allow-Origin: https://app.simple-chat.test:3000`, ma i test si
aspettavano `http://app.simple-chat.test:3000`.

## Riproduzione

Da `backend/`, eseguire `composer test` con le precedenti aspettative HTTP.

## Evidenza

- Esito iniziale: 2 test falliti, 27 superati, 164 assertion.
- Test coinvolti: `ChannelsTest` e `AuthControllerTest`.
- `.env`, `.env.example` e ADR 0003 indicano HTTPS per la SPA locale.
- Lo smoke browser HTTPS/CORS e la channel authorization erano gia' riusciti.

## Impatto

La suite poteva fallire pur avendo il runtime corretto; inoltre il fallback
CORS non era coerente con il profilo locale HTTPS stabilito.

## Causa

**Confermata.** Il fallback CORS, l'ambiente PHPUnit e le aspettative feature
test non erano stati aggiornati insieme al passaggio locale da HTTP a HTTPS.

## Decisione e scope

La correzione e' emersa fuori dallo scope di M2-008, che era solo di verifica
realtime. E' stata comunque autorizzata per ripristinare la coerenza con ADR
0003; non richiede un nuovo ADR perche' applica una decisione gia' esistente.

## Piano di risoluzione

Completato: allineare fallback, ambiente PHPUnit e richieste/asserzioni CORS a
`https://app.simple-chat.test:3000` senza ampliare le origini consentite.

## Verifica

Eseguite localmente dopo la correzione:

- `composer test`: 29 test superati, 172 assertion;
- `./vendor/bin/pint --test`: riuscito, 55 file;
- `./vendor/bin/phpstan analyse --memory-limit=512M`: riuscito, 40/40, nessun
  errore.

La review differenziale non ha rilevato widening CORS o regressioni
all'autorizzazione del canale privato.

## File coinvolti o modificati

- `backend/config/cors.php`
- `backend/phpunit.xml`
- `backend/tests/Feature/Http/ChannelsTest.php`
- `backend/tests/Feature/Http/Controllers/AuthControllerTest.php`

## Problemi residui

Nessuno noto per questa issue.

## Riepilogo finale

Configurazione e test backend ora rappresentano lo stesso profilo HTTPS locale
gia' definito da ADR 0003 e verificato dai controlli backend.
