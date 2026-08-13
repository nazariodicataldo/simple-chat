# M1-011 — Completare CRUD messaggi lato frontend

- **Stato:** completato
- **Milestone:** Milestone 1 — Chat HTTP autenticata
- **Data di apertura:** 2026-08-13
- **Data di chiusura:** 2026-08-13

## Contesto

I service e le mutation TanStack Query per update e delete Message sono già
presenti. Il backend Laravel protegge entrambe le operazioni con MessagePolicy;
il frontend deve quindi mostrare i controlli solo ai proprietari senza sostituire
l'autorizzazione server-side.

## Obiettivo

Consentire all'utente autenticato di modificare ed eliminare i propri messaggi
persistiti tramite popover, dialog e alert shadcn accessibili. Il form di invio
deve inoltre disabilitare il submit con testo vuoto o composto solo da spazi.

## Fuori scope

- Modifiche a backend, endpoint, contratti HTTP, policy e soft delete Laravel.
- Realtime, queue, ottimistic update/delete e indicatore di messaggio modificato.
- Nuove dipendenze applicative o refactor non correlati.

## File modificabili

- `frontend/components/chat/` e `frontend/components/ui/` strettamente necessari.
- `frontend/app/features/messages/message.queries.ts` se necessario al contratto
  di invalidazione testato.
- Test frontend pertinenti.
- `docs/project/current-state.md`, `CHANGELOG.md` e questo task.

## Requisiti

- I tre puntini sono visibili solo sui messaggi persistiti dell'utente corrente,
  floating a sinistra della bubble e speculari all'avatar a destra.
- Popover shadcn con azioni inglesi “Edit message” e “Delete message”, chiuso
  prima dell'apertura della dialog selezionata.
- Update riusa form e schema della create; mostra originale readonly,
  textarea precompilata, blocca “Save” con valore trim-vuoto o pending, mantiene
  la dialog aperta su errore e non provoca scroll al successo.
- Delete mostra il testo effettivo, blocca le azioni durante mutation, chiude la
  dialog sia su successo sia su errore e delega il soft delete a Laravel.
- Alert shadcn in alto, persistenti fino a chiusura manuale, con messaggi utente
  in inglese e dettaglio server quando disponibile.

## Strategia di test

Applicare TDD in cicli RED/GREEN: service pubblici update/delete, hook mutation
con invalidazione lista e UI accessibile ChatPage. Coprire ownership, popover,
dialog edit/delete, pending, successo, errore, alert e assenza di auto-scroll
durante update. Eseguire test mirati per ogni ciclo e suite completa finale.

## Comandi da eseguire

- Da `frontend/`: `pnpm test`
- Da `frontend/`: `pnpm lint`
- Da `frontend/`: `pnpm typecheck`
- Da `frontend/`: `pnpm build`
- Dalla root: `git status --short`
- Dalla root: `git diff --stat`
- Dalla root: `git diff --check`

## Criteri di accettazione

- [x] Submit create disabilitato con testo trim-vuoto.
- [x] Ownership frontend corretta e policy Laravel invariata.
- [x] Update/delete riusano service e mutation esistenti.
- [x] Dialog, popover e alert sono accessibili e tutti i testi utente sono in inglese.
- [x] I flussi successo/errore rispettano i comportamenti definiti.
- [x] Test e controlli richiesti sono eseguiti e registrati.

## Rischi e assunzioni

- L'errore Axios può includere `response.data.message`; in assenza si mostra un
  fallback inglese specifico dell'operazione.
- L'invalidazione della lista resta il meccanismo di riallineamento con lo stato
  canonico Laravel, senza update ottimistici.

## Verifica manuale

Con una sessione valida e messaggi propri/altrui, verificare ownership delle
azioni, navigazione tastiera, modifica senza scroll, conferma delete con testo
reale, alert persistenti e gestione degli errori API.

## Decisioni emerse

Nessuna.

## File modificati

- `frontend/components/chat/chat.tsx`, `chat-page.tsx` e `chat-form.tsx`.
- `frontend/components/ui/alert.tsx`, `dialog.tsx` e `popover.tsx`.
- Test Message service, query, chat e chat page.
- `docs/project/current-state.md` e `CHANGELOG.md`.

## Risultati dei controlli

- `pnpm vitest run app/__test__/messages/chat.test.tsx`: riuscito, 9 test.
- Test mirati query/chat page: riusciti, 8 test.
- `pnpm test`: riuscito nel sandbox dopo i test aggiunti per pending, errori,
  successo delete e dismiss degli alert.
- `pnpm lint`: riuscito.
- `pnpm typecheck`: riuscito.
- `pnpm build`: riuscito nell'ambiente locale dello sviluppatore con Next.js
  16.2.6 e Turbopack: compilazione, TypeScript, raccolta page data e
  generazione di 4 pagine statiche completate.
- `git diff --check`: riuscito.

## Problemi residui

- Nessuno.

## Riepilogo finale

Implementazione e verifiche completate.
