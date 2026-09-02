# Issue

Questo registro conserva anomalie, debito tecnico e correzioni emerse durante
un task ma non comprese nel suo scope. Un'issue non autorizza modifiche al
codice: per implementarla si crea un task verificabile collegato.

Non usare questo registro come ADR. Un ADR serve solo quando, per risolvere
l'issue, occorre adottare una decisione architetturale significativa.

## Stati

- `aperta`: problema documentato, da confermare o risolvere;
- `pianificata`: esiste un task collegato che ne esegue la risoluzione;
- `accettata`: limite noto che non verra' risolto ora, con motivazione;
- `risolta`: correzione applicata e verificata;
- `bloccata`: non risolvibile senza una decisione o una dipendenza esterna.

## Flusso

1. Copiare [il template](issue-template.md) e assegnare il prossimo ID
   progressivo `ISS-NNN`.
2. Separare chiaramente osservazione, causa confermata e ipotesi.
3. Collegare il task o l'ADR soltanto se esistono.
4. Per lo stato `risolta`, registrare modifica e verifica effettivamente
   eseguita; per `accettata`, registrare limite e motivo.

## Registro

| ID | Stato | Titolo | Collegamenti |
| --- | --- | --- | --- |
| [ISS-001](ISS-001-allineare-cors-https-nei-test-backend.md) | risolta | Allineare CORS HTTPS nei test backend | ADR 0003, M2-008 |
| [ISS-002](ISS-002-eliminare-flash-cache-messaggi-dopo-logout-login.md) | risolta | Eliminare il flash della cache messaggi dopo logout/login | M2-008, M2-009 |
| [ISS-003](ISS-003-rendere-fixture-reverb-indipendente-ordine-test.md) | risolta | Rendere il fixture Reverb indipendente dall'ordine dei feature test | M4-002, M4-003 |
