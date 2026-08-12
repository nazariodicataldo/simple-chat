# M1-010 — Infinite scroll cursor e identita' nella chat

- **Stato:** completato
- **Milestone:** Milestone 1 — Chat HTTP autenticata
- **Data di apertura:** 2026-08-12
- **Data di chiusura:** 2026-08-12

## Contesto

`GET /api/messages` restituisce il wrapper Laravel `ApiResponse`: la lista e'
in `data`, mentre `pagination` contiene `nextCursor`, `previousCursor`,
`hasMorePages` e `perPage`. Ogni `MessageResource` espone il relativo autore
pubblico nella chiave obbligatoria `user`. Il frontend usa invece soltanto
`response.data.data`, il campo locale errato `author` e l'ID utente hardcoded.

## Obiettivo

Completare la visualizzazione della chat autenticata con infinite scroll basato
su cursor, stati accessibili di caricamento/errore/riprova, avatar dell'utente
autenticato esterno alla card e nome reale dell'autore dentro ogni bubble.

## Fuori scope

- Modifiche a backend, endpoint, `ApiResponse`, Resource o paginazione.
- UI o logica di update e delete Message, che saranno oggetto del task
  successivo.
- Realtime, nuove dipendenze, avatar caricabili e profili modificabili.
- Chiusura della Milestone 1.

## File modificabili

- `frontend/app/features/messages/` per tipi, service e query cursor.
- `frontend/app/page.tsx` e componenti in `frontend/components/chat/`
  strettamente necessari alla chat e al profilo autenticato.
- Test frontend pertinenti.
- Questo task al termine, se ne viene registrato l'esito.

## File non modificabili

- `backend/` e tutti i contratti HTTP esistenti.
- `docs/project/current-state.md`, `CHANGELOG.md` e ADR, salvo una decisione
  emersa che richieda esplicitamente un task separato o una decisione
  architetturale significativa.

## Requisiti

- Tipizzare l'envelope della lista Laravel, non il solo array: `data:
  Message[]`, `pagination: { nextCursor, previousCursor, hasMorePages,
  perPage }` e i campi comuni di `ApiResponse` effettivamente usati. Il service
  lista restituisce tale envelope, cosi' la query puo' leggere sia messaggi sia
  metadati.
- Sostituire `Message.author` con `Message.user`, obbligatorio per il listing e
  conforme a `MessageResource`; eliminare il fallback che inventa un autore.
- Definire `MessageListQueryParams` tipizzato. `listMessages(queryParams)` usa
  quell'oggetto come soli params Axios; i query params della richiesta sono la
  fonte di verita' per il cursor, senza stato React duplicato.
- Usare `useInfiniteQuery`: la prima pagina ha `pageParam` `{}`; ciascuna
  successiva deriva esclusivamente `{ cursor: lastPage.pagination.nextCursor
  }` quando `lastPage.pagination.hasMorePages` e' true. Pagine e page params
  restano nella cache TanStack Query.
- Inserire un sentinel alla fine del contenuto e osservarlo rispetto al
  viewport di `MessageScroller`, non alla finestra browser. Il suo callback
  chiama `fetchNextPage` solo con `hasNextPage` e senza un fetch successivo gia'
  in corso.
- Durante `isFetchingNextPage`, mantenere i messaggi visibili e mostrare nel
  fondo uno stato accessibile di caricamento. Se il fetch della pagina
  successiva fallisce, mantenere le pagine esistenti e mostrare un'azione
  accessibile "Try again" che ritenta esclusivamente la pagina successiva.
- Il sentinel per pagine remote non sposta l'utente. Dopo l'invio di un proprio
  messaggio, invece, aggiungere subito una bubble optimistic in coda e scorrere
  in modo fluido fino a essa.
- Il messaggio optimistic usa un ID client-only, l'utente autenticato e lo
  stato `sending` o `failed`, senza modificare il contratto backend. Durante
  l'invio mostra `Sending...` accessibile; al successo viene sostituito con il
  messaggio canonico del backend, al fallimento resta visibile con `Failed to
  send the message.` in stile `text-destructive dark:text-red-400` e azione
  accessibile `Try again` che riusa il testo originale.
- Dopo il successo, invalidare la query key della lista infinita con
  `refetchType: "none"`: la cache resta leggibile, viene marcata stale e il
  rendering deduplica gli ID per prevenire doppie bubble a un refetch futuro.
- Passare dal Server Component soltanto il profilo minimo necessario al client
  (`id`, `firstName`, `lastName`, `username`), non l'intero `AuthUser` con email
  e altri campi. Confrontare `message.userId` con `currentUser.id` per
  allineamento e variante bubble, senza valori hardcoded.
- Aggiungere nella barra pagina sopra la card chat avatar, nome completo e
  username dell'utente autenticato, accanto al logout. Riutilizzare avatar
  DiceBear, fallback e stile delle bubble.
- Renderizzare il nome completo reale da `message.user` dentro la bubble,
  prima del testo; rimuoverlo dal `MessageHeader` esterno alla bubble.

## Strategia di test

Applicare RED/GREEN/REFACTOR ai comportamenti client testabili con Vitest e
React Testing Library, senza backend reale:

1. testare service e tipi lista con envelope Laravel completo, `user`, cursor
   params e metadati;
2. testare `useInfiniteQuery`: prima pagina senza cursor, cursor successivo,
   stop a `hasMorePages: false`, protezione dal doppio fetch e invalidazione
   dopo creazione;
3. mockare `IntersectionObserver` e verificare infinite scroll, pending,
   errore e retry della sola pagina successiva, senza perdita delle pagine gia'
   caricate;
4. testare bubble optimistic, scroll al messaggio proprio, stati accessibili
   `Sending...` e fallimento, retry, sostituzione con risposta backend e
   invalidazione senza refetch immediato;
5. testare barra profilo con avatar, fallback, nome e username e bubble con
   nome `user` reale e allineamento basato sull'utente autenticato;
6. eseguire test, lint, typecheck e build dalla sola cartella `frontend/`.

## Comandi da eseguire

- Da `frontend/`: `pnpm test`
- Da `frontend/`: `pnpm lint`
- Da `frontend/`: `pnpm typecheck`
- Da `frontend/`: `pnpm build`
- Dalla root: `git status --short`
- Dalla root: `git diff --stat`
- Dalla root: `git diff --check`

## Criteri di accettazione

- [x] Il frontend interpreta correttamente `data`, `pagination.nextCursor`,
  `pagination.previousCursor`, `pagination.hasMorePages` e `pagination.perPage`.
- [x] Lo scroll in fondo carica una sola volta la pagina cursor successiva e
  non avvia fetch oltre l'ultima pagina.
- [x] Pending, errore e retry della pagina successiva sono accessibili e non
  cancellano i messaggi gia' visibili.
- [x] L'invio aggiunge una bubble optimistic, scorre al messaggio proprio,
  sostituisce la response canonica e invalida la query senza stato cursor
  duplicato o refetch immediato.
- [x] Una bubble fallita resta visibile con errore destructive accessibile e
  `Try again` ripetibile.
- [x] Avatar, nome e username dell'utente autenticato sono esterni alla card;
  ogni bubble mostra il nome reale da `message.user` ed e' allineata
  correttamente.
- [x] Update/delete Message e la chiusura di M1 restano esplicitamente fuori
  dal task.
- [x] Test, lint, typecheck, build e controlli Git sono eseguiti e registrati.

## Rischi e assunzioni

- `useInfiniteQuery` e' l'unico proprietario client di pagine e cursor;
  introdurre `useState` per la paginazione violerebbe il contratto scelto.
- Il messaggio optimistic e' un'estensione solo client: il suo ID non viene
  inviato al backend e viene sostituito dalla response canonica al successo.
- `previousCursor` resta tipizzato per fedelta' al backend ma non riceve UI in
  questo task.
- Il refetch di pagine cursor invalidate deve sostituire la cache senza
  duplicare messaggi; questo comportamento va coperto dai test.

## Verifica manuale

Con una sessione valida e piu' di 20 messaggi:

1. verificare avatar, nome e username nella barra sopra la card;
2. verificare nomi reali e allineamento di messaggi propri e altrui;
3. scorrere fino al fondo e verificare il caricamento automatico della pagina
   successiva, senza caricamenti ulteriori dopo l'ultima;
4. simulare il fallimento della pagina successiva e verificare "Try again"
   senza perdita dei messaggi precedenti;
5. dopo aver caricato piu' pagine, inviare un messaggio e verificare bubble
   immediata, `Sending...`, scroll in fondo e sostituzione al successo; simulare
   un errore e verificare messaggio destructive e retry.

## Decisioni emerse

- La navigazione M1 usa infinite scroll sul solo cursor successivo, non un
  pulsante "Load more".
- Cursor e pagine risiedono nella cache TanStack Query, non in stato locale.
- L'invio usa optimistic update e porta alla bubble propria in fondo; le pagine
  remote continuano a non spostare l'utente.
- Fallimento invio: la bubble resta con testo destructive e retry esplicito.
- M1 resta aperta finche' update e delete Message non saranno trattati.

## File modificati

- `frontend/app/features/messages/` per contratto lista cursor, infinite query
  e invalidazione optimistic.
- `frontend/components/chat/` e `frontend/app/page.tsx` per chat, invio,
  identita' autenticata e avatar.
- Test Message pertinenti, changelog e documentazione di progetto.

## Risultati dei controlli

- RED service: la lista restituiva il solo array e perdeva envelope e params.
- RED query: il vecchio hook non riceveva `pageParam` cursor.
- `pnpm test`: riuscito, 10 file e 32 test superati, incluso il fallback quando
  `crypto.randomUUID` non e' disponibile.
- `pnpm lint`: riuscito senza warning o errori.
- `pnpm typecheck`: riuscito.
- `pnpm build`: riuscito nel sandbox con Next.js 16.2.6; l'output disponibile
  arriva fino alla creazione del build ottimizzato.
- `git diff --check`: riuscito.

## Problemi residui

- Lo smoke browser con backend Lerd non e' eseguibile nel sandbox: verificare
  manualmente infinite scroll, invio optimistic e retry nell'ambiente locale.

## Riepilogo finale

Chat cursor, infinite scroll, messaggi optimistic e identita' degli utenti sono
implementati. M1 resta aperta: update e delete Message sono il prossimo task.
