# M2-004 — Configurare Echo frontend

- **Stato:** completato
- **Milestone:** Milestone 2 — Real-time diretto con Reverb ed Echo
- **Data di apertura:** 2026-08-13
- **Data di chiusura:** 2026-08-20

## Contesto

Reverb e il canale privato sono disponibili lato Laravel. Il frontend necessita di un solo client browser che usi la stessa autenticazione cookie/CSRF della chat HTTP.

## Obiettivo

Installare Echo e creare un modulo client browser Reverb dedicato.

## Fuori scope

- Backend.
- Componenti chat e feature Message.
- Migration, model e controller Laravel.

## File modificabili

- `frontend/package.json` e lockfile.
- `frontend/.env.example`.
- `frontend/lib/http.ts` e service auth correlato, per estrarre il retry CSRF
  gia' usato dalla SPA.
- `frontend/lib/echo.ts` e `frontend/lib/echo.test.ts`.
- Test del wiring.
- `docs/learning/broadcasting-reverb-echo.md`.
- Questo task.

## File non modificabili

- Backend.
- Componenti chat.
- Feature Message.
- Migration, model e controller Laravel.

## Requisiti

- Aggiungere esclusivamente `laravel-echo` e `pusher-js`.
- Le variabili `NEXT_PUBLIC_` contengono solo endpoint, host, porta, schema e app key pubblica.
- L'authorizer usa l'istanza Axios esistente con cookie e CSRF Sanctum.
- Nessun user ID, token o segreto e' inviato o salvato dal client.
- Aggiornare la guida learning con problema, funzionamento e ruolo di Echo nel browser, authorizer Axios con cookie/CSRF e confini delle variabili `NEXT_PUBLIC_`; includere configurazione minima, verifica/test, errore comune, differenza production, esercizio e documentazione Laravel ufficiale compatibile.

## Strategia di test

Controllo sintattico/typecheck e test mock del client e dell'authorizer. Eseguire inoltre uno smoke browser di connessione autenticata quando il runtime locale e' disponibile.

## Comandi da eseguire

- `git status --short`
- `git diff --stat`
- `git diff --check`
- Revisione di `docs/learning/broadcasting-reverb-echo.md` rispetto ai requisiti didattici.
- Da `frontend/`: test mirati, `pnpm lint`, `pnpm typecheck`, `pnpm build`.

## Criteri di accettazione

- [x] Echo e Pusher JS sono le sole nuove dipendenze frontend.
- [x] Il client e' browser-only e riusabile.
- [x] L'authorizer usa Axios con credenziali Sanctum.
- [x] Nessun segreto o token e' esposto lato client.
- [x] La guida learning spiega Echo e l'authorizer per un principiante.
- [x] Test e smoke pertinente sono documentati con verifica completa.

## Rischi e assunzioni

La app key Reverb e' pubblica per definizione del protocollo; il segreto resta esclusivamente nella configurazione Laravel.

## Verifica manuale

Con un utente autenticato, aprire il browser e confermare l'autorizzazione e la connessione a `private-chat`.

## Decisioni emerse

- Il checkout usa `frontend/lib/`, non `frontend/src/lib/`: il modulo e' quindi
  `frontend/lib/echo.ts`.
- `http` e `ensureCsrf` esistevano in `frontend/lib/http.ts`, mentre il retry
  `withCsrf` era locale al service auth. Il retry e' stato estratto e riusato
  per mantenere una sola implementazione.
- Sono installati `laravel-echo` `2.4.0` e `pusher-js` `8.6.0`. Pusher 8 usa
  `channelAuthorization.customHandler`, che riceve `{ socketId, channelName }`
  e completa la richiesta con `callback(error, data)`.

## File modificati

- `frontend/package.json` e `frontend/pnpm-lock.yaml`
- `frontend/.env.example`
- `frontend/lib/http.ts`, `frontend/app/features/auth/auth.service.ts`
- `frontend/lib/echo.ts`, `frontend/lib/echo.test.ts`
- `docs/learning/broadcasting-reverb-echo.md`
- Questo task e `docs/project/current-state.md`

## Risultati dei controlli

- `pnpm exec vitest run lib/echo.test.ts app/__test__/auth/auth.service.test.ts`
  (frontend): exit 0, 2 file e 14 test superati. Output: `Test Files 2 passed
  (2)`, `Tests 14 passed (14)`.
- `pnpm typecheck` (frontend): exit 0, output `$ tsc --noEmit`.
- `pnpm lint` (frontend): exit 0, output `$ eslint`.
- `git diff --check`: exit 0; ricerca degli import ha confermato che Echo non
  e' collegato a pagine, componenti, hook o feature Message.
- `pnpm build` (frontend), eseguito localmente dallo sviluppatore: exit 0.
  Next.js `16.2.6` ha compilato in `34.2s`, terminato TypeScript in `14.0s`,
  raccolto i dati delle pagine e generato 4 pagine statiche senza errori.

## Problemi residui

- Una precedente invocazione `pnpm test -- lib/echo.test.ts` ha eseguito anche
  la suite completa e osservato un timeout preesistente/non diagnosticato in
  `ChatPage > edits an owned message without scrolling and announces success`;
  il comando Vitest mirato corretto e' quello riportato sopra.

## Riepilogo finale

Il wiring Echo/Reverb, custom handler Axios/CSRF, test mockati, build e smoke
browser autenticato sono verificati. Lo smoke locale del 2026-08-20, con Lerd,
Reverb e sessione Sanctum attivi, ha completato la sottoscrizione e mostrato
`Subscribed to private-chat`; la pagina temporanea usata per la prova e' stata
rimossa subito dopo, quindi il modulo non resta collegato alla UI.
