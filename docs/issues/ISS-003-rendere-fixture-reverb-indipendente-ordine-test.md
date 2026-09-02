# ISS-003 — Rendere il fixture Reverb indipendente dall'ordine dei feature test

- **Stato:** risolta
- **Priorita':** media
- **Area:** backend, fixture test Reverb
- **Data di apertura:** 2026-09-02
- **Data di chiusura:** 2026-09-02
- **Task collegato:** [M4-002](../tasks/active/M4-002-proteggere-dashboard-horizon.md),
  [M4-003](../tasks/completed/M4-003-rendere-fixture-reverb-indipendente-ordine-test.md)
- **ADR collegato:** nessuno

## Contesto

Durante M4-002, l'aggiunta di un feature test per la dashboard Horizon ha reso
visibile un difetto d'ordine nella suite backend. Il problema riguarda il
fixture Reverb dei test del canale privato, non l'autorizzazione Horizon.

## Comportamento osservato

`ChannelsTest` riesce se eseguito isolatamente. Se e' preceduto da un altro
feature test, il test della firma Reverb legge la configurazione locale invece
delle credenziali fittizie e fallisce.

## Riproduzione

Da `backend/`, nel runtime Lerd:

1. Eseguire `composer test`: fallisce il test della firma in `ChannelsTest`.
2. Eseguire `composer test -- --filter=ChannelsTest`: i quattro test del file
   riescono.
3. Eseguire `php artisan test tests/Feature/Http/Controllers/AuthControllerTest.php tests/Feature/Http/ChannelsTest.php`: fallisce di nuovo soltanto il test della firma.

## Evidenza

- La suite completa ha eseguito 40 test: 39 riusciti, 1 fallito, 198 assertion.
- `ChannelsTest` isolato ha eseguito 4 test e 14 assertion senza errori.
- La sequenza con `AuthControllerTest` ha eseguito 10 test: 9 riusciti, 1
  fallito, 65 assertion.
- `UsesReverbForChannelTests` imposta le variabili fittizie soltanto prima del
  bootstrap dell'applicazione e le ripristina subito dopo.
- Nessun malfunzionamento Reverb o della chat e' stato osservato nel runtime.

## Impatto

La suite backend non puo' essere usata come verifica completa quando
`ChannelsTest` non e' il primo test a inizializzare l'applicazione. Il problema
non modifica il comportamento del prodotto, ma blocca la chiusura di task che
richiedono una suite interamente verde.

## Causa

**Confermata.** Laravel carica `config/broadcasting.php` durante il bootstrap
e registra `routes/channels.php` sul broadcaster di default gia' risolto. Il
trait impostava solo l'ambiente prima del bootstrap e lo ripristinava subito:
dopo un feature test precedente, la connessione Reverb fittizia non era piu'
garantita. Impostare la configurazione del test dopo il bootstrap richiede
anche di rigenerare il driver Reverb e di riusare la dichiarazione del canale,
altrimenti il driver nuovo non conosce `chat` e rifiuta l'autorizzazione.

## Decisione e scope

L'issue e' emersa durante M4-002 ma resta fuori dal suo scope: M4-002 protegge
la dashboard Horizon e non modifica il fixture Reverb. Non e' necessario un
ADR, perche' la correzione riguarda l'isolamento dei test e non un'architettura
del prodotto.

## Risoluzione

M4-003 imposta e ripristina per ogni test la sola configurazione della
connessione Reverb necessaria a `POST /broadcasting/auth`, con valori fittizi.
Il trait rigenera il driver dopo il bootstrap e riusa `routes/channels.php`; non
modifica configurazioni applicative, `.env`, dipendenze o `ChannelsTest`.

## Verifica

Nel runtime Lerd, dopo la correzione:

- `composer test` e' riuscito: 40 test, 198 assertion;
- `composer test -- --filter=ChannelsTest` e' riuscito: 4 test, 14 assertion;
- la sequenza `AuthControllerTest` seguita da `ChannelsTest` e' riuscita: 10
  test, 65 assertion;
- Pint e PHPStan sono riusciti, rispettivamente senza modifiche e con 0
  errori; `git diff --check` e' riuscito.

## File coinvolti o modificati

- `backend/tests/Concerns/UsesReverbForChannelTests.php`

## Problemi residui

Nessuno.

## Riepilogo finale

Issue risolta da M4-003. La suite backend completa e la sequenza riproduttiva
sono verdi senza modificare il comportamento applicativo.
