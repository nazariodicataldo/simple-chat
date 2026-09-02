# ISS-004 — Caricare l'autore nelle risposte CREATE e UPDATE Message

- **Stato:** risolta
- **Priorita':** alta
- **Area:** backend, contratto HTTP Message
- **Data di apertura:** 2026-09-02
- **Data di chiusura:** 2026-09-02
- **Task collegato:** [M4-004](../tasks/active/M4-004-verificare-job-horizon-e-recupero-reale.md),
  [M4-005](../tasks/completed/M4-005-caricare-autore-risposte-create-update-message.md)
- **ADR collegato:** nessuno

## Contesto

Durante lo smoke runtime di M4-004, l'UPDATE di un messaggio eseguito dal
mittente ha restituito `200 OK` e il relativo broadcast e' stato completato da
Horizon. Il client mittente ha pero' interrotto il rendering di `MessageRow`
quando ha letto l'autore del messaggio aggiornato.

## Comportamento osservato

Dopo un UPDATE riuscito, Chrome mostra `Cannot read properties of undefined
(reading 'firstName')` in `components/chat/chat.tsx`: il messaggio sostituito
nella cache non ha `user`, mentre la UI richiede nome, cognome e username
dell'autore.

## Riproduzione

1. Autenticarsi e creare un messaggio proprio.
2. Aggiornare il testo del messaggio con `PUT /api/messages/{id}`.
3. Ricevere `200 OK` e osservare il rendering del messaggio nel browser
   mittente.

## Evidenza

- Lo smoke M4-004 ha osservato `PUT /api/messages/51` con `200 OK` e il job
  `MessageUpdated` completato da Horizon.
- `MessageResource` espone `user` solo con `whenLoaded('user', ...)`.
- `MessageController::store()` e `MessageController::update()` passano alla
  Resource il modello senza la relazione `user` caricata.
- La mutation UPDATE sostituisce il messaggio nella cache con la risposta HTTP;
  `MessageRow` usa poi `message.user.firstName`.
- Il payload realtime non e' la causa: gli eventi Message Created e Updated
  includono esplicitamente l'autore e lo schema frontend lo richiede.

## Impatto

Il mittente non puo' usare in modo affidabile l'UPDATE: una risposta HTTP
riuscita puo' produrre un errore applicativo e interrompere il rendering. M4-004
non puo' soddisfare il criterio che richiede assenza di errori applicativi dopo
il recupero.

## Causa

**Confermata.** Il contratto HTTP restituito da CREATE e UPDATE e' incompleto
rispetto al tipo frontend `Message`: la Resource omette l'autore quando il
controller non ha caricato la relazione. CREATE e' attualmente mascherato dal
client optimistic, che associa localmente l'utente corrente, ma la sua risposta
HTTP resta incompleta.

## Decisione e scope

L'issue e' una regressione osservata durante M4-004 e resta fuori dal suo
scope. Non si aggiunge un fallback in `MessageRow`: nasconderebbe un contratto
HTTP incompleto e puo' mostrare un autore errato. Non serve un ADR.

Il futuro M4-005 carichera' `user` soltanto nelle risposte CREATE e UPDATE
prima di costruire `MessageResource`. SHOW resta fuori scope; non cambiano
eventi realtime, policy, schema dati, dipendenze o configurazioni.

## Piano di risoluzione

M4-005 ha introdotto le asserzioni del contratto HTTP e del rendering
mittente, poi ha caricato `user` nel controller prima della serializzazione di
CREATE e UPDATE.

## Verifica

- I feature test backend verificano per POST e PUT `data.user.id`,
  `firstName`, `lastName` e `username`, e l'assenza dell'email.
- Il test frontend verifica che un UPDATE riuscito sostituisca il messaggio
  senza perdere l'autore e senza errore di rendering.
- Dopo M4-005 rieseguire i controlli backend/frontend e riprendere lo smoke
  M4-004, incluso il recupero Horizon.

## File coinvolti o modificati

- `backend/app/Http/Controllers/MessageController.php`
- `backend/app/Http/Resources/MessageResource.php`
- `frontend/components/chat/chat-page.tsx`
- Test backend e frontend del contratto Message

## Problemi residui

Nessuno. M4-004 e' riattivato per ripetere lo smoke Horizon.

## Riepilogo finale

Issue risolta da M4-005: CREATE e UPDATE restituiscono l'autore pubblico,
senza email. I test backend/frontend e la build Next.js sono verificati;
M4-004 riprende con lo smoke runtime separato.
