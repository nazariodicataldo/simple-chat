# M4-003 — Rendere il fixture Reverb indipendente dall'ordine dei feature test

- **Stato:** completato
- **Milestone:** Milestone 4 — Horizon
- **Data di apertura:** 2026-09-02
- **Data di chiusura:** 2026-09-02
- **Dipendenze:** [ISS-003](../../issues/ISS-003-rendere-fixture-reverb-indipendente-ordine-test.md)

## Contesto

ISS-003 ha mostrato che `ChannelsTest` riesce isolato, ma fallisce dopo un
feature test precedente perche' il fixture Reverb dipende dal bootstrap che
carica la configurazione. Il difetto impedisce una suite backend completa
verde, ma non ha prodotto un malfunzionamento della chat o di Reverb nel
runtime.

M4-002 e' stato bloccato finche' questo task non ha reso di nuovo verde la
suite backend completa; non era quindi una dipendenza di implementazione di
M4-003.

## Obiettivo

Rendere il fixture Reverb dei test del canale privato indipendente dall'ordine
dei feature test, mantenendo credenziali fittizie e senza toccare la
configurazione o il comportamento applicativo introdotti nelle precedenti M4.

## Fuori scope

- Horizon, dashboard, Redis, worker, Reverb runtime, Echo, browser e M4-004.
- File applicativi, `.env`, `.env.example`, `phpunit.xml`, Composer, dipendenze
  e configurazioni Reverb o broadcasting.
- Nuovi test di integrazione realtime o modifiche ai contratti del canale
  privato.
- Correzioni non direttamente necessarie a isolare il fixture Reverb.

## File modificabili

- `backend/tests/Concerns/UsesReverbForChannelTests.php`
- `backend/tests/Feature/Http/ChannelsTest.php` soltanto se la diagnosi prova
  che il trait non puo' garantire da solo il ciclo di vita necessario
- `docs/issues/ISS-003-rendere-fixture-reverb-indipendente-ordine-test.md`
- `docs/issues/README.md`
- `docs/tasks/active/M4-002-proteggere-dashboard-horizon.md` (solo stato)
- Questo task
- `docs/project/current-state.md` solo dopo il completamento effettivo

## File non modificabili

- Tutti i file backend e frontend estranei al fixture e al caso limite
  `ChannelsTest`.
- Configurazioni, variabili locali, dipendenze, lockfile e documentazione M4
  gia' completata o attiva, salvo i riferimenti di stato autorizzati sopra.
- Il task M4-004 e la sua procedura runtime Horizon.

## Requisiti

- Riprodurre prima il difetto con suite completa e con la sequenza
  `AuthControllerTest` seguita da `ChannelsTest`; confermare che `ChannelsTest`
  isolato resta verde.
- Individuare con evidenza il punto in cui la configurazione Reverb viene
  caricata tra un feature test e il successivo, senza stampare credenziali,
  cookie, token o firme reali.
- Scrivere prima un test o una sequenza automatizzata che fallisca con il
  fixture corrente e che osservi la firma fittizia soltanto attraverso
  `/broadcasting/auth`.
- Correggere prima `UsesReverbForChannelTests` impostando e ripristinando la
  configurazione Reverb necessaria per ogni test, senza dipendere dal primo
  bootstrap e senza usare valori locali.
- Modificare `ChannelsTest` solo se la diagnosi dimostra che il trait non puo'
  applicare il setup nel lifecycle corretto; registrare il motivo nel task e
  mantenere le asserzioni del canale private esistenti.
- Aggiornare ISS-003 a `risolta` soltanto dopo le verifiche verdi complete.

## Strategia di test

Il seam e' l'endpoint reale `POST /broadcasting/auth`: la firma risposta usa
la configurazione Reverb fittizia e non deve dipendere dall'ordine dei file.

Il ciclo TDD e' una singola slice: RED della sequenza che precede
`ChannelsTest`, GREEN della stessa sequenza dopo la correzione del trait,
quindi controllo della suite completa. Il test isolato non e' prova sufficiente
perche' gia' verde nel baseline.

## Comandi da eseguire

- `git status --short`
- `git diff --stat`
- `git diff --check`
- Da `backend/`: `composer test -- --filter=ChannelsTest`
- Da `backend/`: `php artisan test tests/Feature/Http/Controllers/AuthControllerTest.php tests/Feature/Http/ChannelsTest.php`
- Da `backend/`: `composer test`
- Da `backend/`: `./vendor/bin/pint --test`
- Da `backend/`: `./vendor/bin/phpstan analyse --memory-limit=512M`

## Criteri di accettazione

- [x] Il RED dimostra che la sequenza con un feature test precedente fallisce
      prima della correzione, senza esporre valori locali.
- [x] Il fixture usa configurazione Reverb fittizia per ogni test, anche dopo
      un feature test precedente.
- [x] `ChannelsTest` isolato e la sequenza riproduttiva riescono entrambi.
- [x] `composer test`, Pint, PHPStan e `git diff --check` riescono.
- [x] Non sono modificati `.env`, configurazioni, dipendenze, codice
      applicativo, M4-002 o M4-004.
- [x] ISS-003 e il task registrano soltanto evidenza verificata; l'issue passa
      a `risolta` solo dopo l'esito completo.

## Rischi e assunzioni

Il trait attuale modifica l'ambiente prima del bootstrap. La causa precisa va
confermata prima di fissare il punto di setup alternativo; non e' autorizzato
aggirare il difetto isolando arbitrariamente l'intera suite o cambiando
`phpunit.xml`.

La priorita' e' rendere deterministico il test esistente, non estendere la
copertura realtime o cambiare la configurazione Reverb del prodotto.

## Verifica manuale

Non e' richiesto uno smoke browser: il comportamento da dimostrare e'
deterministico nella suite backend. Verificare soltanto che l'output dei test e
il diff non riportino configurazioni o credenziali locali.

## Decisioni emerse

- Il trait e' il primo punto autorizzato per la correzione; `ChannelsTest` e'
  un caso limite, modificabile solo con evidenza che il trait non basti.
- M4-004 dipende da M4-003 perche' la sua DoD richiede la suite backend verde.
- Non serve un ADR: il lavoro isola un fixture di test e non cambia
  l'architettura applicativa.

## File modificati

- `backend/tests/Concerns/UsesReverbForChannelTests.php`
- `docs/issues/ISS-003-rendere-fixture-reverb-indipendente-ordine-test.md`
- `docs/issues/README.md`
- `docs/tasks/active/M4-002-proteggere-dashboard-horizon.md` (solo stato)
- Questo task
- `docs/project/current-state.md`

## Risultati dei controlli

- RED, `php artisan test tests/Feature/Http/Controllers/AuthControllerTest.php
  tests/Feature/Http/ChannelsTest.php`: 9 test riusciti, 1 fallito, 65
  assertion. Il solo test della firma leggeva una configurazione diversa; il
  valore locale non e' stato registrato.
- RED, `composer test`: 39 test riusciti, 1 fallito, 198 assertion; stesso
  difetto della firma, con output mascherato.
- Baseline, `composer test -- --filter=ChannelsTest`: riuscito (4 test, 14
  assertion).
- Diagnosi: Laravel carica la configurazione durante il bootstrap e registra
  `routes/channels.php` sul driver gia' risolto. Il trait ora imposta la
  connessione Reverb fittizia nel setup post-bootstrap, rigenera il driver e
  riusa la dichiarazione del canale; al teardown ripristina configurazione e
  driver.
- GREEN, sequenza `AuthControllerTest` seguita da `ChannelsTest`: riuscito
  (10 test, 65 assertion).
- GREEN, `composer test -- --filter=ChannelsTest`: riuscito (4 test, 14
  assertion).
- GREEN, `composer test`: riuscito (40 test, 198 assertion).
- `./vendor/bin/pint --test`: riuscito.
- `./vendor/bin/phpstan analyse --memory-limit=512M`: riuscito, 0 errori.
- `git diff --check`: riuscito.
- M4-002 e' aggiornato soltanto nel proprio stato, per l'attivazione e la
  ripresa esplicitamente autorizzate; non cambia la sua implementazione.

## Problemi residui

- Nessuno.

## Riepilogo finale

M4-003 completa l'isolamento del fixture Reverb senza modificare
`ChannelsTest`: il test del canale privato ora usa configurazione fittizia
indipendentemente dall'ordine dei feature test. ISS-003 e' risolta e M4-002
puo' riprendere le proprie verifiche.
