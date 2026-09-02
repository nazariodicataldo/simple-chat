# M4-005 — Caricare l'autore nelle risposte CREATE e UPDATE Message

- **Stato:** completato
- **Milestone:** Milestone 4 — Horizon
- **Data di apertura:** 2026-09-02
- **Data di chiusura:** 2026-09-02
- **Dipendenze:** [ISS-004](../../issues/ISS-004-caricare-autore-risposte-create-update-message.md), M4-004

## Contesto

Lo smoke M4-004 ha rilevato che UPDATE restituisce un Message senza `user`.
`MessageResource` include l'autore solo quando la relazione e' gia' caricata;
la mutation frontend sostituisce quindi il messaggio e `MessageRow` non puo'
renderizzare il mittente. CREATE ha lo stesso contratto HTTP incompleto,
attualmente mascherato dalla bubble optimistic.

## Obiettivo

Ripristinare nelle risposte HTTP CREATE e UPDATE di Message l'autore pubblico
richiesto dal tipo frontend, senza modificare gli altri endpoint o il flusso
realtime.

## Fuori scope

- Fallback o cambiamenti a `MessageRow` e alla UI.
- Endpoint SHOW, LIST, DELETE, eventi broadcast, queue, Horizon, Reverb ed
  Echo.
- Policy, schema dati, dipendenze, configurazioni, refactor non necessari e
  ADR.

## File modificabili

- `backend/app/Http/Controllers/MessageController.php`
- `backend/tests/Feature/Http/Controllers/MessageControllerTest.php`
- `frontend/app/__test__/messages/chat-page.test.tsx`
- [ISS-004](../../issues/ISS-004-caricare-autore-risposte-create-update-message.md)
- Questo task e [current-state](../../project/current-state.md) per gli stati
  finali

## File non modificabili

- `backend/app/Http/Resources/MessageResource.php`: la condizione
  `whenLoaded('user')` e' il contratto da rispettare, non da aggirare.
- Componenti di rendering, tipi frontend, eventi, policy, migration,
  configurazioni, dipendenze e lockfile.

## Requisiti

- POST e PUT restituiscono `data.user` con soli `id`, `firstName`, `lastName`
  e `username`; l'email non e' esposta.
- Il controller carica `user` prima di serializzare CREATE e UPDATE.
- Un UPDATE riuscito rende il messaggio aggiornato conservando l'autore, senza
  errore di rendering nel mittente.
- SHOW resta invariato.

## Strategia di test

I seam concordati sono l'API autenticata `POST/PUT /api/messages` e il
rendering pubblico di `ChatPage` dopo il successo della mutation UPDATE.

1. RED backend: estendere i feature test POST e PUT con l'autore pubblico e
   l'assenza dell'email; eseguire il file mirato.
2. Frontend: simulare la risposta UPDATE completa e verificare che il testo
   aggiornato e il nome del mittente restino renderizzati; eseguire il file
   mirato.
3. GREEN: caricare la relazione `user` nel controller prima di costruire la
   Resource, senza fallback lato client.
4. Eseguire i controlli backend/frontend completi. M4-004 riprendera' poi il
   proprio smoke Horizon separato.

## Comandi da eseguire

- `git status --short`
- `git diff --stat`
- `git diff --check`
- Da `backend/`: `composer test -- tests/Feature/Http/Controllers/MessageControllerTest.php`
- Da `backend/`: `composer test`, `./vendor/bin/pint --test` e
  `./vendor/bin/phpstan analyse --memory-limit=512M`
- Da `frontend/`: `pnpm test -- app/__test__/messages/chat-page.test.tsx`
- Da `frontend/`: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`

## Criteri di accettazione

- [x] POST restituisce l'autore pubblico completo e non l'email.
- [x] PUT restituisce l'autore pubblico completo e non l'email.
- [x] Il test ChatPage dimostra che UPDATE conserva l'autore nel rendering.
- [x] SHOW e `MessageRow` non sono modificati.
- [x] I controlli backend/frontend hanno esito documentato; eventuali limiti
  dell'ambiente sono dichiarati.
- [x] ISS-004 e' `risolta`, M4-004 e' riattivato e questo task e' spostato in
  `completed/` solo dopo tutte le verifiche verdi.

## Rischi e assunzioni

L'autore pubblico e' gia' definito da `MessageAuthorResource`; il task deve
solo assicurare che la relazione sia disponibile alla serializzazione. La
risposta realtime resta fuori scope perche' include gia' l'autore.

## Verifica manuale

Con frontend e backend locali attivi, creare e poi aggiornare un messaggio
proprio. Entrambe le risposte HTTP devono includere `data.user`; dopo UPDATE
la bubble del mittente deve mostrare l'autore senza errore console. La
ripetizione completa dello smoke Horizon e' registrata in M4-004, non qui.

## Decisioni emerse

- Si corregge il contratto alla sorgente nel backend, senza fallback silenzioso
  nel renderer.
- CREATE e UPDATE condividono lo stesso requisito; SHOW resta esplicitamente
  fuori scope.

## File modificati

- `backend/app/Http/Controllers/MessageController.php`
- `backend/tests/Feature/Http/Controllers/MessageControllerTest.php`
- `frontend/app/__test__/messages/chat-page.test.tsx`
- [ISS-004](../../issues/ISS-004-caricare-autore-risposte-create-update-message.md)
- [current-state](../../project/current-state.md)
- Questo task

## Risultati dei controlli

- RED backend: il feature test POST ha ricevuto `data.user.id = null`; dopo la
  prima correzione il test PUT ha riprodotto lo stesso difetto. Entrambi sono
  verdi dopo il caricamento della relazione nel controller.
- Da `backend/`: `composer test -- tests/Feature/Http/Controllers/MessageControllerTest.php`
  verde, 5 test e 77 assertion; `composer test` verde, 40 test e 210
  assertion; Pint e PHPStan verdi.
- Da `frontend/`: la regressione `chat-page.test.tsx` e' verde, 11 test. Il
  test e' stato verde alla prima esecuzione perche' il renderer gia' gestiva
  correttamente un UPDATE con autore completo: il difetto era nel contratto
  backend, non nella UI.
- I 14 file Vitest sono verdi in due gruppi verificabili: 57 test Message e
  24 test Auth. `pnpm lint` e `pnpm typecheck` sono verdi.
- Verifica locale dello sviluppatore, 2026-09-02: `pnpm run build` verde con
  Next.js 16.2.6; generazione delle quattro pagine statiche e ottimizzazione
  finale completate.
- `git diff --check` e' verde. I controlli `--no-index --check` dei nuovi file
  restituiscono il codice atteso `1` senza output di whitespace.

## Problemi residui

Nessuno per questo task. M4-004 riprende con lo smoke Horizon completo.

## Riepilogo finale

La correzione e i test di regressione sono verificati. ISS-004 e' risolta e
M4-004 riprende per completare il proprio smoke Horizon.
