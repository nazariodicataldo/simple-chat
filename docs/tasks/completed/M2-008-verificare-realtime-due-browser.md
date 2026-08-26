# M2-008 — Verificare realtime in due browser

- **Stato:** completato
- **Milestone:** Milestone 2 — Real-time diretto con Reverb ed Echo
- **Data di apertura:** 2026-08-13
- **Data di aggiornamento:** 2026-08-26
- **Data di chiusura:** 2026-08-26

## Contesto

Questo task chiude la Milestone 2 soltanto dopo una verifica end-to-end
indipendente dei comportamenti gia' implementati: eventi Laravel,
autorizzazione del canale, Reverb, Echo, validazione, riconciliazione,
deduplicazione e cleanup.

La verifica deve partire da zero rispetto agli smoke precedenti. Gli smoke
documentati per M2-005, M2-006 e M2-007 non sostituiscono questa evidenza.

## Obiettivo

Dimostrare con due sessioni browser isolate che due utenti autenticati
comunicano in tempo reale senza refresh e che logout/login non lascia listener
duplicati, errori o doppie elaborazioni.

## Fuori scope

- Codice backend e frontend.
- Configurazioni, dipendenze e lockfile.
- Registrazione degli utenti durante lo smoke.
- Azioni simultanee o test di concorrenza, ordering e conflitti.
- Tentativi browser di modifica/cancellazione dei messaggi altrui.
- Race artificiale tra `MessageDeleted` e un GET stale gia' in volo.
- Nuove funzionalita' o correzioni fuori scope.

La policy di proprieta' resta gia' verificata in M1. Un controllo Postman
preliminare e' consigliato, ma non e' un criterio autonomo di chiusura M2-008;
fa eccezione una channel authorization riuscita senza sessione, che blocca la
milestone perche' invalida la sicurezza del realtime.

## File modificabili

- Questo task.
- `docs/project/current-state.md` solo dopo il superamento della DoD.
- `CHANGELOG.md` solo dopo la chiusura effettiva della Milestone 2.

## File non modificabili

- Tutto il codice backend/frontend.
- Configurazioni.
- Dipendenze e lockfile.
- Credenziali, cookie, token o altri dati sensibili.

## Prerequisiti

- Due utenti Sanctum gia' esistenti e autenticabili; la registrazione resta
  fuori scope.
- Browser A: Chrome in finestra incognito.
- Browser B: Firefox in finestra incognito.
- CA locale correttamente trusted in entrambi i browser, incluso Firefox.
- Nessun bypass TLS o certificato accettato come eccezione temporanea.
- Frontend: `https://app.simple-chat.test:3000`.
- API: `https://api.simple-chat.test`.
- Reverb browser: `wss://api.simple-chat.test/app/...`.
- Backend, Reverb e frontend avviati nell'ambiente locale.
- La sessione di ogni browser deve mostrare l'utente atteso prima di entrare
  nella chat.

## Strategia di test

Smoke end-to-end manuale con due browser, preceduto da un controllo Postman
separato e seguito dalla riesecuzione dei controlli backend/frontend.

Ogni evento deve propagarsi entro 5 secondi. Per ogni mutazione si verifica
anche un refetch esplicito, senza richiedere un refresh del browser:

- CREATE: una sola bubble per ID, nel mittente e nel ricevente;
- UPDATE: testo aggiornato in entrambe le sessioni, senza ritorno alla versione
  precedente;
- DELETE: messaggio assente in entrambe le sessioni quando il GET riflette la
  cancellazione.

Le prove sono sequenziali. Dopo ogni evento si annotano risultato, tempo di
propagazione, ID del messaggio e osservazioni DevTools.

## Controllo preliminare Postman

Il controllo e' informativo rispetto alla chiusura, salvo il caso di guest
autorizzato al canale.

### Sessioni e policy

- Usare cookie jar distinti per A e B.
- Verificare, se possibile, la policy sui messaggi propri e altrui:
  - A modifica/elimina il proprio messaggio: successo atteso;
  - A prova il messaggio di B: `403` atteso;
  - B prova il messaggio di A: `403` atteso.
- Se un controllo policy fallisce, documentare l'errore come possibile
  regressione M1 e proseguire con il realtime solo se il resto e' affidabile.

### Guest channel authorization

- Inviare `POST /broadcasting/auth` senza cookie Sanctum valido.
- Atteso: `401`.
- Atteso: nessuna subscription riuscita a `private-chat` e nessun evento
  ricevuto dal client guest.
- Una risposta che consenta la subscription senza sessione blocca la chiusura
  della Milestone 2.

## Comandi da eseguire

- `git status --short`
- `git diff --stat`
- `git diff --check`
- Da `backend/`: `composer test`, `./vendor/bin/pint --test`, `./vendor/bin/phpstan analyse --memory-limit=512M`.
- Da `frontend/`: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`.
- Per lo smoke: avviare backend e Reverb con `php artisan reverb:start`, quindi
  il frontend con `pnpm dev:https` nell'ambiente locale.

Se un comando non e' eseguibile nell'ambiente dell'agente, riportare il
comando completo, la directory, l'errore e la copertura mancante; rieseguirlo
nell'ambiente locale dello sviluppatore e riportare l'output effettivo.

## Criteri di accettazione

- [x] Due utenti gia' autenticati usano Chrome incognito e Firefox incognito,
  con cookie jar distinti.
- [x] Entrambi i browser usano HTTPS e completano correttamente TLS senza
  bypass.
- [x] A crea, aggiorna e cancella un proprio messaggio; B osserva ogni evento
  senza refresh.
- [x] B crea, aggiorna e cancella un proprio messaggio; A osserva ogni evento
  senza refresh.
- [x] Ogni CREATE, UPDATE e DELETE raggiunge anche lo stato finale corretto
  nel browser mittente.
- [x] Dopo il refetch, CREATE non produce duplicati e UPDATE non viene
  sovrascritto da una versione vecchia.
- [x] Dopo il refetch, DELETE resta assente quando la risposta HTTP riflette la
  cancellazione.
- [x] Ogni evento osservato rispetta il timeout operativo di 5 secondi.
- [x] Il guest channel-auth check Postman restituisce `401`; una channel
  authorization guest riuscita blocca la chiusura.
- [x] Entrambi i browser eseguono logout/login e ristabiliscono una sola
  subscription a `private-chat`.
- [x] Dopo ogni remount, un evento inviato dall'altro browser viene elaborato
  una sola volta e produce una sola bubble.
- [x] DevTools mostra console senza errori, handshake Reverb WSS `101`, auth
  riuscita e cleanup/re-subscription coerenti.
- [x] I controlli backend e frontend hanno evidenza fresca oppure riportano
  esplicitamente la copertura mancante.
- [x] Solo dopo la DoD soddisfatta vengono aggiornati `current-state.md` e
  `CHANGELOG.md` e il task viene spostato tra i completati.

## Rischi e assunzioni

Due finestre incognito dello stesso Chrome condividerebbero normalmente la
stessa sessione; per questo i browser devono essere Chrome e Firefox.

Firefox potrebbe richiedere l'import/trust esplicito della CA locale. Un
fallimento TLS va risolto come prerequisito ambientale, non aggirato.

Un errore Postman isolato su cookie, CSRF o account di test viene documentato e
non blocca automaticamente M2-008. Un guest autorizzato a `private-chat` blocca
la milestone.

E' accettato che una risposta GET stale gia' in volo possa ripresentare per
breve tempo un messaggio cancellato. Il task verifica DELETE senza refresh e
con GET coerente con il database, non introduce tombstone o filtering.

## Verifica manuale

### Preparazione

1. Avviare backend, Reverb e frontend HTTPS.
2. Aprire Chrome incognito per A e Firefox incognito per B.
3. Accedere con due utenti gia' esistenti e verificare il profilo mostrato in
   ciascun browser.
4. Aprire DevTools in entrambi i browser: Console e Network.
5. Verificare la POST `/broadcasting/auth`, la subscription a `private-chat` e
   il socket Reverb `wss://api.simple-chat.test/app/...`.
6. Distinguere il socket Reverb dal socket Next HMR
   `/_next/webpack-hmr`.

### Matrice eventi

Per ciascuna riga, attendere al massimo 5 secondi, osservare entrambi i
browser, eseguire il refetch e registrare una sola elaborazione:

| Mittente | Evento | Target | Risultato atteso |
| --- | --- | --- | --- |
| A | CREATE | proprio messaggio | A e B mostrano una sola bubble |
| A | UPDATE | proprio messaggio | A e B mostrano il nuovo testo |
| A | DELETE | proprio messaggio | A e B non mostrano piu' il messaggio |
| B | CREATE | proprio messaggio | B e A mostrano una sola bubble |
| B | UPDATE | proprio messaggio | B e A mostrano il nuovo testo |
| B | DELETE | proprio messaggio | B e A non mostrano piu' il messaggio |

### Remount e cleanup

1. A esegue logout/login.
2. Verificare in Network la chiusura/unsubscribe della subscription precedente
   e una sola nuova authorization/subscription.
3. B crea un messaggio; A deve ricevere un solo evento entro 5 secondi e
   mostrare una sola bubble.
4. B esegue logout/login con la stessa verifica DevTools.
5. A crea un messaggio; B deve ricevere un solo evento entro 5 secondi e
   mostrare una sola bubble.
6. Se necessario, impostare breakpoint temporanei nel listener Echo,
   `reconcileRealtimeEvent` e nei rami create/update/delete. Non aggiungere
   log, UI o diagnostica persistente al codice.
7. Per ogni breakpoint registrare file/funzione, evento previsto, hit attesi e
   hit osservati.

## Decisioni emerse

- La verifica parte da zero e non riusa come prova finale gli smoke precedenti.
- Si usano due utenti gia' esistenti; la registrazione e' fuori scope.
- I browser sono Chrome incognito (A) e Firefox incognito (B). Due finestre
  incognito dello stesso Chrome non sono sufficientemente isolate.
- La policy sui messaggi viene controllata a monte con Postman, ma resta una
  verifica informativa M1. Il guest channel-auth check e' invece un gate: una
  autorizzazione senza sessione blocca la milestone.
- Entrambi gli utenti eseguono CREATE, UPDATE e DELETE sui propri messaggi;
  l'altro browser osserva. Le azioni sui messaggi altrui non fanno parte dello
  smoke browser.
- Logout/login di entrambi i browser e' il remount scelto per M2-008. StrictMode,
  HMR e Fast Refresh restano coperti da M2-007.
- CREATE, UPDATE e DELETE vengono verificati anche dopo refetch. La race
  DELETE/refetch stale resta un limite accettato per non introdurre tombstone o
  filtering in questa milestone.
- Non si testano azioni simultanee, ordering sotto concorrenza o conflitti.
- Il timeout operativo per ogni evento e' 5 secondi.
- Console, Network, WSS, authorization, subscription e breakpoint temporanei
  sono evidenza ammessa e preferita per il cleanup; nessuna diagnostica viene
  committata.
- Il report usa solo etichette anonime A/B, ID o testi di prova non sensibili,
  timestamp e risultati. Non si salvano credenziali, cookie o token.

## File modificati

- Questo task.
- `backend/config/cors.php`.
- `backend/phpunit.xml`.
- `backend/tests/Feature/Http/ChannelsTest.php`.
- `backend/tests/Feature/Http/Controllers/AuthControllerTest.php`.

## Risultati dei controlli

Verifiche dell'agente, 2026-08-25:

- `git diff --check`: riuscito.
- `git diff --stat`: cinque file modificati: questo task e quattro file backend
  per l'allineamento CORS HTTPS emerso durante la verifica.
- `git status --short`: quattro modifiche backend CORS/test e questo task; non
  sono presenti lockfile o modifiche frontend.
- Da `backend/`, `composer test`, `./vendor/bin/pint --test` e
  `./vendor/bin/phpstan analyse --memory-limit=512M` non sono eseguibili nel
  sandbox: il wrapper Lerd non riesce ad avviare PHP 8.5 per
  `dbus connect: dial unix /run/user/1000/bus: connect: operation not
  permitted`. Devono essere rieseguiti nel terminale locale dello sviluppatore.
- Da `backend/`, riesecuzione locale dell'utente di `composer test`: fallito,
  2 test falliti e 27 superati (164 assertion). I fallimenti sono le preflight
  CORS di `ChannelsTest` e `AuthControllerTest`: i test inviano e si aspettano
  `http://app.simple-chat.test:3000`, mentre la risposta effettiva e la
  configurazione locale espongono
  `https://app.simple-chat.test:3000`. L'ADR 0003, `.env` e `.env.example`
  confermano HTTPS come profilo previsto. Il test environment non fissa
  `CORS_ALLOWED_ORIGINS`, quindi le aspettative HTTP sono rimaste disallineate
  dal cambio HTTPS. Il runtime HTTPS/CORS e' stato verificato nello smoke;
  questo e' un regression test/configuration gap M1, non una regressione
  realtime M2.
- Correzione applicata dall'utente e review read-only dell'agente: il fallback
  CORS, l'ambiente PHPUnit e tutte le aspettative feature test usano ora
  `https://app.simple-chat.test:3000`, coerentemente con ADR 0003. La review
  non rileva widening CORS o rimozioni di autorizzazione; Reverb conserva
  correttamente il proprio allowlist host-only. Riesecuzione locale dell'utente
  di `composer test`: riuscita, 29 test e 172 assertion.
- Da `backend/`, riesecuzione locale dell'utente successiva alla correzione
  CORS di `./vendor/bin/pint --test`: riuscita, 55 file. Da `backend/`,
  riesecuzione locale dell'utente successiva alla correzione CORS di
  `./vendor/bin/phpstan analyse --memory-limit=512M`: riuscita, 40/40 senza
  errori.
- Da `frontend/`, `pnpm lint` riuscito con exit 0.
- Da `frontend/`, `pnpm typecheck` riuscito con exit 0.
- Da `frontend/`, `pnpm test` riuscito in riesecuzione isolata: 14 file e 83
  test superati. Il primo avvio parallelo aveva prodotto un timeout in un
  singolo test; il test mirato rieseguito da solo e' passato, quindi il primo
  esito e' classificato come contesa di risorse del sandbox, non come
  regressione riproducibile.
- Da `frontend/`, `pnpm build` bloccato dal download remoto di Google Font
  `Outfit` (`next/font: Failed to fetch 'Outfit'`); la compilazione non ha
  raggiunto una verifica completa nel sandbox.
- Da `frontend/`, riesecuzione locale dell'utente di `pnpm build`: il primo
  tentativo e' fallito solo durante il download remoto di Google Font `Outfit`;
  il secondo e' riuscito con compilazione Turbopack, TypeScript, raccolta dati,
  generazione delle 4 pagine statiche e ottimizzazione finale completate.
- Guest channel authorization Postman verificata dall'utente: richiesta
  `POST {{backend_url}}/broadcasting/auth` senza sessione, risposta
  `401 Unauthorized`. Il gate guest e' superato; resta separata la verifica
  opzionale delle policy con sessioni A/B.
- Policy Postman verificata dall'utente con una sessione autenticata non
  proprietaria: `PUT` e `DELETE` sul messaggio ID `13` (proprietario differente)
  restituiscono `403 Forbidden` con `This action is unauthorized.`. Il CREATE
  effettuato via Postman e' comparso subito nella chat, confermando il percorso
  API → broadcast → client. Il messaggio di prova va eliminato dal proprietario
  prima della verifica logout/login, se ancora presente.
- Setup Firefox incognito verificato dall'utente: registrazione di un nuovo
  account completata senza problemi. La registrazione non conta come evidenza
  M2-008; l'account puo' essere usato come sessione autenticata B per lo smoke.
- Evidenza DevTools fornita dall'utente, 2026-08-25: in Chrome A e Firefox B
  il socket Next HMR `wss://app.simple-chat.test:3000/_next/webpack-hmr` e'
  terminato con `101 Switching Protocols`; il socket Reverb
  `wss://api.simple-chat.test/app/...` e' terminato con `101 Switching
  Protocols`. Entrambi mostrano `pusher:connection_established`, subscribe a
  `private-chat` e `pusher_internal:subscription_succeeded`, oltre a ping/pong.
  Gli `auth` token presenti nell'export non vengono conservati in questo
  documento.
- Smoke Chrome incognito + Firefox incognito: handshake e subscription
  verificati. Primo CREATE verificato dall'utente: Chrome A ha inviato
  `POST /api/messages` con risposta `201 Created`; Firefox B ha ricevuto
  `App\\Events\\MessageCreated` sul canale `private-chat` per il messaggio
  ID `17`.
- UPDATE A→B verificato dall'utente sul messaggio ID `17`: Chrome A ha inviato
  `PUT /api/messages/17` con risposta `200 OK`; il refetch
  `GET /api/messages` ha restituito `200 OK`; Firefox B ha ricevuto
  `App\\Events\\MessageUpdated` con il nuovo testo.
- DELETE A→B verificato dall'utente sul messaggio ID `17`: Chrome A ha inviato
  `DELETE /api/messages/17` con risposta `204 No Content`; il refetch
  `GET /api/messages` ha restituito `200 OK`; Firefox B ha ricevuto
  `App\\Events\\MessageDeleted` su `private-chat`. L'assenza esplicita
  dell'ID `17` nel dump GET condiviso e' confermata.
- Il dump GET condiviso dall'utente, timestamp `2026-08-25 12:20:28`, contiene
  la lista dei messaggi senza l'ID `17` e con `hasMorePages: false`; non vengono
  riportati nel task nomi o altri dati personali del payload.
- CREATE B→A verificato dall'utente sul messaggio ID `18`: Firefox B ha inviato
  `POST /api/messages` con risposta `201 Created`; Chrome A ha ricevuto
  `App\\Events\\MessageCreated` su `private-chat`. Firefox ha mostrato anche
  `OPTIONS /api/messages` con `204 No Content`, compatibile con un preflight
  CORS riuscito; l'ordine visualizzato nella tab Network non e' sufficiente da
  solo a indicare un problema.
- UPDATE B→A verificato dall'utente sul messaggio ID `18`: Firefox B ha inviato
  `PUT /api/messages/18` con risposta `200 OK`; ha mostrato anche
  `OPTIONS /api/messages/18` con `204 No Content`, compatibile con preflight
  CORS; il refetch `GET /api/messages` ha restituito `200 OK`; Chrome A ha
  ricevuto `App\\Events\\MessageUpdated` su `private-chat` con il nuovo testo.
- DELETE B→A verificato dall'utente sul messaggio ID `18`: Firefox B ha inviato
  `DELETE /api/messages/18` con risposta `204 No Content`; il preflight
  `OPTIONS /api/messages/18` ha restituito `204 No Content`; il refetch
  `GET /api/messages` ha restituito `200 OK` con lista senza l'ID `18`; Chrome A
  ha ricevuto `App\\Events\\MessageDeleted` su `private-chat`.
- Firefox B e' stato ricaricato dopo le cancellazioni e non ha mostrato i
  messaggi ID `17` e `18`: nessuna resurrezione osservata in quella sessione.
- Conferma finale dell'utente sulla matrice CRUD: A e B hanno ciascuno creato,
  aggiornato e cancellato un proprio messaggio in sequenza; il ricevente ha
  osservato ogni evento senza refresh; dopo refetch lo stato del mittente e'
  corretto, CREATE non ha prodotto duplicati, UPDATE ha mantenuto il nuovo testo
  e DELETE e' rimasto assente. Questa conferma completa le note parziali degli
  estratti Network precedenti.
- Logout iniziale verificato dall'utente in Chrome A e Firefox B: entrambi
  mostrano `pusher:unsubscribe` per `private-chat`.
- Logout/login completato dall'utente in Chrome A e Firefox B: sul socket Reverb
  gia' esistente entrambi mostrano `pusher:subscribe` e
  `pusher_internal:subscription_succeeded` per `private-chat`; la
  `POST /broadcasting/auth` restituisce `200 OK` in entrambi. Non e' stato
  creato un socket Reverb aggiuntivo. Gli auth token e socket ID degli export
  non vengono conservati nel task. Resta la prova di un singolo evento elaborato
  dopo il rientro.
- Prova post-rientro A→B: Firefox B ha ricevuto `MessageCreated` per il
  messaggio ID `20` alle `17:53:23.460` locali (`15:53:23.460Z`), nello stesso
  secondo della risposta Chrome A (`15:53:23 GMT`). Il campione soddisfa il
  timeout operativo di 5 secondi; resta la prova speculare B→A con una sola
  bubble dopo il rientro.
- Misura temporale successiva associata dall'utente alla prova B→A: il mittente
  ha ricevuto `Date: Tue, 25 Aug 2026 16:00:13 GMT`; Chrome A ha osservato il
  frame alle `18:00:14.426` locali (`16:00:14.426Z`). Con la risoluzione al
  secondo dell'header HTTP, la consegna e' compresa tra circa `0,427 s` e
  `1,426 s`, quindi entro il timeout operativo. L'utente conferma che era un
  `MessageCreated` e che Chrome A ha mostrato una sola bubble dopo il rientro.
  L'utente conferma anche la singola bubble di Firefox B per la prova A→B,
  Console pulita in entrambi i browser e nessun evento oltre 5 secondi.
- Diagnosi iniziale Chrome A: dopo due refetch l'utente ha osservato sei richieste
  Reverb `wss://api.simple-chat.test/app/...` con `101 Switching Protocols` e
  header `Sec-WebSocket-Accept` differenti. L'evidenza non prova ancora sei
  socket attivi: la tab Network puo' mantenere handshake storici e l'header e'
  specifico della singola handshake. Riprodurre con log Network svuotato, filtro
  WS, senza reload/HMR, e annotare il numero di nuove connessioni e subscribe.
- Esito della diagnosi Chrome A: con la vista Network pulita l'utente osserva
  soltanto i due socket attesi (Next HMR e Reverb); anche dopo refresh restano
  due. Le sei richieste precedenti sono quindi classificate come handshake
  storici mostrati da DevTools, non come leak realtime riprodotto.
- Indagine read-only dell'agente: `getEcho()` conserva un singleton in
  `window.__simpleChatEcho`; `useMessageRealtime` sottoscrive nel solo effetto
  con dipendenze vuote. Da `frontend/`, il test mirato
  `pnpm test app/__test__/messages/message-realtime.test.tsx` e' riuscito:
  1 file, 17 test, incluso il rerender senza resubscription. Non e' stata
  applicata alcuna correzione: serve una riproduzione pulita prima di attribuire
  le handshake al refetch.
- Console senza errori e `POST /broadcasting/auth` `200` sono documentati.
  I breakpoint non sono stati necessari: la diagnosi dei socket storici e'
  stata conclusa con Network pulito, singleton Echo e test mirato.
- Nuova osservazione logout/login Firefox B, 2026-08-25: mentre B e' fuori da
  `private-chat`, A crea, aggiorna o cancella un messaggio. Al nuovo login B
  mostra per circa un secondo la lista precedente; poi il nuovo messaggio
  appare, il testo precedente viene sostituito o il messaggio cancellato
  scompare. L'ispezione read-only individua la causa probabile: `Providers`
  conserva un solo `QueryClient` per l'intera app e `useLogoutMutation` pulisce
  soltanto `authQueryKey`, non `messageKeys.lists()`. Al remount, la chat rende
  la cache esistente e `useMessagesQuery` esegue il GET stale-by-default che la
  riconcilia con PostgreSQL. Gli eventi avvenuti durante l'unsubscribe non sono
  recuperabili dal canale privato. Serve ancora la conferma DevTools che il GET
  post-login, e non un frame Reverb successivo, sia il momento della variazione.

## Problemi residui

- Limite accettato: una risposta GET stale gia' in volo puo' ripresentare per
  breve tempo un messaggio dopo `MessageDeleted`. Non blocca la chiusura di
  M2-008 e non viene risolto in questo task.
- [ISS-002](../../issues/ISS-002-eliminare-flash-cache-messaggi-dopo-logout-login.md)
  e' risolta in M2-009: lo smoke Chrome/Firefox nei due versi non osserva piu'
  dati della sessione precedente al login.
- Eventuali errori di CA/TLS Firefox, Postman o ambiente locale devono essere
  classificati nel report con comando/prova mancante e non confusi con un
  difetto realtime.
- [ISS-001](../../issues/ISS-001-allineare-cors-https-nei-test-backend.md)
  raccoglie il disallineamento CORS HTTP/HTTPS emerso fuori scope, la correzione
  autorizzata e le verifiche backend riuscite.

## Riepilogo finale

Completato: la DoD realtime e la correzione ISS-002 sono verificate. La
Milestone 2 e' chiusa; resta documentato il limite accettato della race
GET stale/Delete, fuori scope.
