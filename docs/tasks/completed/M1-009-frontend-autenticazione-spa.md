# M1-009 — Interfaccia frontend di autenticazione SPA

- **Stato:** completato
- **Milestone:** Milestone 1 — Chat HTTP autenticata
- **Data di apertura:** 2026-08-10
- **Data di chiusura:** 2026-08-11

## Contesto

M1-008 espone l'autenticazione Sanctum SPA cookie/CSRF: `POST /api/register`,
`POST /api/login` e `GET /api/user` restituiscono il payload riuscito
`ApiResponse`, mentre tutte le API della chat richiedono la sessione. Il
frontend mostra ancora direttamente la chat e il client Axios non invia i
cookie.

## Obiettivo

Far sì che `/` verifichi la sessione attraverso `GET /api/user`: se esiste un
utente autenticato renderizza la chat con logout, altrimenti renderizza
l'interfaccia login. Login e registrazione condividono la stessa schermata e sono
commutabili localmente tramite `useState`; tutte le chiamate remote client-side
usano i service e le query/mutation TanStack Query in `app/features/auth`.

## Fuori scope

- Modifiche a endpoint, validazione o configurazione Laravel/Sanctum/CORS.
- Verifica email, reset password, OAuth e persistenza di token nel browser.
- Realtime, queue, Docker, CI e refactor della chat non necessario al gate
  autenticato.
- Nuove librerie non portate dai template shadcn eseguiti e strettamente
  necessarie al form.

## File modificabili

- `frontend/app/page.tsx` e componenti frontend direttamente necessari al
  gate auth/chat.
- `frontend/app/features/auth/` per tipi, schema, service e query/mutation.
- `frontend/lib/http.ts` e un modulo Axios esclusivamente server-side per la
  configurazione separata richiesta da Sanctum e Server Components.
- Un helper frontend server-side per validare `FRONTEND_URL`, se necessario.
- Componenti UI aggiunti dai template shadcn `login-01` e `signup-01`, dopo
  aver rimosso codice, asset e dipendenze non usati.
- Test frontend pertinenti e lockfile solo se il generatore shadcn lo modifica.
- Questo task al termine, se ne viene registrato l'esito.

## File non modificabili

- `backend/` e il contratto HTTP esistente.
- `docs/project/current-state.md`, `CHANGELOG.md` e ADR, salvo una decisione
  emersa che richieda esplicitamente un task separato o una decisione
  architetturale significativa.

## Requisiti

- Il componente server della pagina `/` usa un service auth server-only per
  chiamare `GET /api/user` verso il backend configurato, inoltrando i cookie
  della richiesta browser. Il service usa `cache()` per deduplicare le chiamate
  nel medesimo render; `200` rende la chat, `401` rende il gate di
  autenticazione. Errori diversi da `401` non devono essere scambiati per una
  sessione assente e devono mostrare uno stato di errore con retry.
- Il gate e i form sono componenti client. Il loro stato `login`/`register` è
  gestito con `useState`; il cambio modalità non deve inviare richieste né
  perdere immotivatamente i dati dell'altro form.
- Creare in `frontend/app/features/auth/` tipi del `UserResource` camelCase,
  tipi input, schema Zod, service e hook TanStack Query. Il service interpreta
  il wrapper riuscito `ApiResponse.data` e non duplica chiamate HTTP nei
  componenti.
- La query utente corrente usa una query key auth dedicata. Login e register
  usano `useMutation`; al successo invalidano/aggiornano la query utente e
  richiedono `router.refresh()` così che il componente server rivaluti la
  sessione prima di montare la chat.
- Il logout usa `POST /api/logout` tramite una mutation auth, azzera la query
  utente e richiede `router.refresh()` per rivalutare il gate server.
- Mantenere due istanze Axios con responsabilità non sovrapposte. Quella
  browser mantiene `NEXT_PUBLIC_BACKEND_URL`, imposta `withCredentials: true`,
  `withXSRFToken: true`, `Accept: application/json`,
  `xsrfCookieName: XSRF-TOKEN` e `xsrfHeaderName: X-XSRF-TOKEN`. Prima di ogni
  mutation login/register, un `ensureCsrf` browser-only controlla la presenza
  di `XSRF-TOKEN` e richiede `GET /sanctum/csrf-cookie` soltanto se manca.
  La funzione conserva una `Promise<void>` in corso e la azzera in `finally`,
  così mutation concorrenti condividono la stessa richiesta CSRF. Questa
  logica resta fuori dai form.
- Le mutation auth usano un wrapper che chiama `ensureCsrf` e converte gli
  errori nel tipo auth previsto. In caso di `419`, richiede forzatamente un
  nuovo cookie e ritenta la richiesta originale una sola volta; un secondo
  errore viene restituito, senza loop. Non applicare questo wrapper a query
  `GET` o a endpoint auth fuori scope.
- L'istanza server è in un modulo con `import "server-only"`, usa lo stesso
  backend configurato e il solo header comune `Accept: application/json`.
  La singola richiesta utente inoltra `Cookie`, `Origin` e `Referer`, questi
  ultimi derivati da un `FRONTEND_URL` obbligatorio e validato senza slash
  finale. Non configura credenziali o XSRF browser-side e non è mai importata
  dal client.
- Il service server tipizza e restituisce `ApiResponse<AuthUser>.data`, non
  tratta la risposta HTTP come un `AuthUser` diretto.
- Il form login usa `email` e `password`. Il form register mantiene campi
  camelCase sul client (`firstName`, `lastName`, `passwordConfirmation`) e
  converte solo nel service il payload `first_name`, `last_name`, `username`,
  `email`, `password` e `password_confirmation` per `POST /api/register`, in
  linea con `RegisterRequest`.
- Validare i campi nel client con React Hook Form e Zod, disabilitare il submit
  durante la mutation e rendere accessibili gli errori di validazione e gli
  errori API (inclusi `422`). Non mostrare password o dettagli tecnici.
- Partire, se utile, dai template `npx shadcn@latest add login-01` e
  `npx shadcn@latest add signup-01`; mantenere soltanto markup e componenti
  necessari ai campi richiesti e all'aspetto coerente con il progetto.
- I campi password partono con `type="password"` e hanno un controllo
  accessibile per mostrare/nascondere il valore, con icona Lucide `EyeOff` per
  lo stato nascosto (e l'icona corrispondente nello stato mostrato).

## Strategia di test

Applicare RED/GREEN/REFACTOR ai comportamenti client testabili con Vitest e
React Testing Library, senza chiamate a backend reale:

1. mockare i service auth e verificare che il gate mostri login e commuti a
   register con `useState`;
2. verificare payload validi, errori Zod, stato pending, errore mutation e
   visibilità password per entrambi i form;
3. verificare che le mutation chiamino i service corretti e, al successo,
   aggiornino/invalidate la query auth e invochino il refresh della route;
4. testare il service Axios browser con adapter/mock: `withCredentials`,
   configurazione XSRF, richiesta CSRF solo senza `XSRF-TOKEN`, dedup di due
   chiamate concorrenti, reset della Promise dopo successo/fallimento, retry
   singolo su `419` e unwrap di `ApiResponse.data`;
5. testare il service server isolando cookie/configurazione: inoltra `Cookie`,
   `Origin` e `Referer`, rende `null` solo per `401`, propaga gli altri errori
   e legge il payload `ApiResponse.data`;
6. eseguire lint, typecheck, test e build dalla sola cartella `frontend/`.
7. verificare logout service/mutation e comando accessibile nella chat.

## Comandi da eseguire

- Da `frontend/`: `pnpm test`
- Da `frontend/`: `pnpm lint`
- Da `frontend/`: `pnpm typecheck`
- Da `frontend/`: `pnpm build`
- Dalla root: `git status --short`
- Dalla root: `git diff --stat`
- Dalla root: `git diff --check`

## Criteri di accettazione

- [ ] Una sessione valida fa renderizzare la chat da `/`; un `401` fa renderizzare login; un altro errore resta distinguibile e ritentabile.
- [x] Login e register sono nello stesso gate, commutabili con `useState`, e inviano esclusivamente i payload previsti dagli endpoint esistenti.
- [x] Service, query key e mutation auth risiedono in `frontend/app/features/auth/`; i componenti non eseguono fetch direttamente.
- [x] Le mutation login/register includono cookie, richiedono il CSRF token
  solo quando manca, deduplicano richieste concorrenti e ritentano una sola
  volta la richiesta originale dopo un `419`.
- [x] Le istanze Axios browser e server sono separate: nessun modulo
  server-only arriva nel bundle client, e il service server gestisce
  correttamente cookie, origin e wrapper `ApiResponse`.
- [x] I form sono validati, accessibili, mostrano stati pending/errore e permettono di mostrare/nascondere la password con `EyeOff`.
- [x] La chat espone logout; la mutation usa l'endpoint esistente, azzera la
  sessione remota e rivaluta il gate server.
- [x] I test frontend, lint, typecheck, build e controlli Git sono eseguiti con esito registrato nel task.

## Rischi e assunzioni

- Un Server Component non può usare hook TanStack Query né mantenere `useState`:
  il controllo iniziale della sessione resta server-side, mentre query e
  mutation auth vivono nei componenti client. Dopo login/register il refresh
  della route evita che un risultato client sostituisca il controllo server.
- Poiché frontend e backend locali condividono l'host ma non la porta, la
  chiamata server-side deve inoltrare il header `Cookie`; il browser riceve e
  usa invece i cookie tramite Axios con `withCredentials`.
- Axios usa `withCredentials`, non l'opzione Fetch `credentials: "include"`.
  `withXSRFToken` consente di inoltrare il cookie XSRF dal browser, ma non lo
  ottiene: `ensureCsrf` resta necessario prima di login/register. Un `419`
  richiede un refresh forzato del cookie e un solo retry dell'operazione, non
  il solo refresh seguito dal rilancio immediato dell'errore.
- `FRONTEND_URL` non è un segreto ma è obbligatorio lato server: deve essere
  validato senza fallback per non mascherare una configurazione Sanctum errata.
  `Content-Type` non è configurato globalmente, perché è necessario soltanto
  per richieste con body JSON.
- Il cookie `XSRF-TOKEN` è il segnale verificabile per decidere se richiedere
  `/sanctum/csrf-cookie`; il cookie di sessione può essere HttpOnly e non deve
  essere letto dal JavaScript.
- I template shadcn possono introdurre file o dipendenze superflui: ogni loro
  modifica va revisionata e mantenuta soltanto se necessaria.

## Verifica manuale

Con backend Lerd e frontend avviati sui rispettivi URL configurati:

1. aprire `/` senza cookie e verificare login, switch a register e i campi
   richiesti;
2. registrare un utente, controllare nel browser `XSRF-TOKEN` e cookie di
   sessione, quindi verificare che il refresh mostri la chat;
3. in una finestra privata, eseguire login con lo stesso utente e verificare
   la chat, quindi logout e il ritorno al login; provare credenziali errate e
   campi non validi, senza esporre la password;
4. simulare un backend non raggiungibile e verificare lo stato errore/riprova,
   distinto dal login.

## Decisioni emerse

- Nessuna al momento.

## File modificati

- `docs/tasks/active/M1-009-frontend-autenticazione-spa.md`

## Risultati dei controlli

- `git status --short` iniziale: modifica preesistente in `frontend/app/features/messages/message.type.ts`; il task attivo era non tracciato.
- Ispezionati contratto M1-008, `AuthController`, Request auth, routing API e
  pattern frontend TanStack Query/Axios; il task è compatibile con quanto
  esiste.
- Implementazione: aggiunti service/types/schema/query/mutation auth, gate
  client login/register, Axios browser con CSRF/retry `419`, Axios
  server-only e controllo sessione server in `/`.
- Estensione richiesta: aggiunto logout frontend e refactor dei form in
  componenti dedicati; i valori form sono camelCase e la conversione payload
  è localizzata nel service.
- `pnpm test`: riuscito, 8 file e 28 test superati.
- `pnpm lint`: riuscito senza errori.
- `pnpm typecheck`: riuscito dopo l'allineamento del fixture chat al tipo.
- `pnpm build`: riuscito localmente con Next.js 16.2.6.
- `git diff --check`: riuscito. `git diff --stat` eseguito; i file nuovi non
  tracciati non sono inclusi nello stat Git finché non vengono aggiunti.

## Problemi residui

- Nessuno.

## Riepilogo finale

Gate auth frontend e form login/register completati. Verificati build, 28 test
frontend e smoke browser per login, registrazione, logout, credenziali non
valide, email già registrata ed errore di sessione.
