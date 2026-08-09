# M1-005 — Frontend chat HTTP

- **Stato:** completato
- **Milestone:** Milestone 1 — Chat HTTP autenticata
- **Data di apertura:** 2026-08-07
- **Data di chiusura:** 2026-08-09

## Contesto

Laravel espone il CRUD provvisorio `/api/messages`, mentre il frontend Next.js era il placeholder iniziale. Auth e sessione non hanno ancora un contratto backend.

## Obiettivo

Mostrare e inviare messaggi HTTP dalla rotta `/`, con TanStack Query, componenti shadcn e test di mount/stato del componente chat.

## Fuori scope

- Auth, controllo server-side della sessione e form login/registrazione.
- UI per modifica o eliminazione dei messaggi.
- Paginazione, real-time e update ottimistici.

## File modificabili

- `frontend/`
- `docs/tasks/active/`
- `docs/project/current-state.md`

## File non modificabili

- `backend/`

## Requisiti

- TanStack Query collegato al layout tramite provider client.
- Client Axios basato su `NEXT_PUBLIC_BACKEND_URL`, senza fallback o secret.
- Layer messages con tipi, CRUD e query/mutation riusabili.
- Transcript con Message e MessageScroller shadcn, placeholder Skeleton accessibili per il pending, stati error/empty e invio accessibile validato con Zod.
- Vitest verifica il mount della chat e gli stati osservabili da `frontend/app/__test__/messages/`.

## Strategia di test

Test di componente nel DOM simulato per loading, empty, errore/riprova, allineamento messaggi e schema Zod; smoke test manuale con API Laravel.

## Comandi eseguiti

- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `git diff --check`
- `git status --short`
- `git diff --stat`

## Criteri di accettazione

- [x] La pagina `/` visualizza il transcript da `GET /api/messages`.
- [x] La pagina distingue loading, errore recuperabile e transcript vuoto.
- [x] L'invio accessibile crea un messaggio e aggiorna il transcript.
- [x] Il layer espone query/mutation CRUD per il riuso futuro.
- [x] I test Vitest coprono mount, pending Skeleton e schema Zod.
- [x] I controlli frontend e lo smoke test sono eseguiti con evidenza.

## Rischi e assunzioni

- Il backend mantiene `{ data: Message[] }` per la lista e `{ data: Message }` per create/update.
- La variabile API e' pubblica per definizione e non contiene secret.
- Le modifiche preesistenti in `globals.css` e `layout.tsx` sono state preservate.

## Verifica manuale

- Lo sviluppatore ha verificato l'app integrata con l'API Laravel il 2026-08-09.

## Decisioni emerse

- Auth differita fino alla disponibilita' del contratto Laravel.
- L'avatar usa `author` opzionale se disponibile; il MessageResource attuale espone solo `userId`, quindi il fallback deterministico e' `User #{id}` e seed `user-{id}` fino all'inclusione dei dati autore dal backend.
- Il messaggio e' validato da uno schema Zod condiviso con React Hook Form; le regole sono testo non vuoto e massimo 300 caratteri.

## File modificati

- `frontend/app/`, `frontend/components/chat/`, `frontend/components/ui/`, `frontend/lib/`, configurazione Vitest e dipendenze frontend.
- `frontend/.env.example` e `frontend/.gitignore`.

## Risultati dei controlli

- `pnpm test`: riuscito localmente dallo sviluppatore, 2 file e 6 test superati.
- `pnpm typecheck`: riuscito localmente dallo sviluppatore (`tsc --noEmit`, 2026-08-09).
- `pnpm lint`: riuscito localmente dallo sviluppatore (`eslint`, 2026-08-09).
- `pnpm build`: riuscito localmente dallo sviluppatore il 2026-08-09; compilazione Turbopack, TypeScript, raccolta dati e generazione pagine statiche completati.
- `git diff --check`: riuscito nel sandbox il 2026-08-09.

## Problemi residui

- Nessuno per il task.

## Riepilogo finale

- Chat HTTP frontend completata e verificata contro l'API Laravel.
