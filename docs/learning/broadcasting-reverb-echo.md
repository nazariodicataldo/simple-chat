# Broadcasting, Reverb ed Echo

Questa guida accompagna M2-001. Il problema e' semplice: dopo che un utente
crea, modifica o elimina un messaggio via HTTP, gli altri browser non hanno
modo di scoprirlo senza aggiornare la pagina. Il broadcast e' la notifica dal
backend ai client; non sostituisce PostgreSQL, il CRUD HTTP o le policy.

## I ruoli

- Laravel salva la mutazione e invia un evento tipizzato.
- Reverb, che sara' configurato nei task successivi, trasporta l'evento su
  WebSocket.
- Echo, che sara' configurato nel frontend nei task successivi, si iscrive al
  canale e reagisce all'evento ricevuto.
- Il canale privato e la sua autorizzazione restano responsabilita' del server:
  il client puo' chiedere di iscriversi, ma non decide da solo se puo' farlo.

## Reverb: il trasporto WebSocket locale

Un evento Laravel sa _che cosa_ notificare, ma non puo' consegnarlo da solo a
un browser gia' aperto. Laravel Reverb e' il server WebSocket che riceve il
broadcast dal backend e lo inoltra ai client connessi. In questa milestone usa
il protocollo compatibile con Pusher: non si sta usando il servizio Pusher, ma
la libreria PHP che Laravel usa per parlare quel protocollo con Reverb locale.

La configurazione minima e' tutta nel backend:

```dotenv
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=
REVERB_APP_KEY=
REVERB_APP_SECRET=
REVERB_HOST=localhost
REVERB_PORT=8080
REVERB_SCHEME=http
REVERB_SERVER_HOST=0.0.0.0
REVERB_SERVER_PORT=8080
REVERB_ALLOWED_ORIGINS=app.simple-chat.test
```

`BROADCAST_CONNECTION=reverb` seleziona la connessione `reverb` in
`config/broadcasting.php`. Quella connessione legge ID, chiave, segreto, host,
porta e schema dalle variabili d'ambiente; `config/reverb.php` usa le stesse
credenziali per riconoscere l'applicazione che puo' connettersi al server
Reverb. `REVERB_HOST` e `REVERB_PORT` sono l'indirizzo di destinazione usato
dal broadcaster Laravel. Non sono automaticamente l'indirizzo del browser:
Echo ha le proprie variabili pubbliche, perche' puo' raggiungere Reverb tramite
il proxy HTTPS.

Il processo `php artisan reverb:start` ha invece il proprio indirizzo di
ascolto: `REVERB_SERVER_HOST` e `REVERB_SERVER_PORT`. In locale il server puo'
ascoltare su `0.0.0.0:8080` mentre il broadcaster si collega a
`localhost:8080`: `0.0.0.0` serve solo ad ascoltare, non e' una destinazione.
Se cambi la porta locale, aggiorna sia `REVERB_PORT` sia
`REVERB_SERVER_PORT`, cosi' entrambi puntano allo stesso processo.

`REVERB_ALLOWED_ORIGINS` elenca, separati da virgola, i soli host browser che
possono aprire il WebSocket, per esempio `app.simple-chat.test`. Non contiene
URL completi, porte o segreti: Reverb confronta l'host dell'header `Origin`.
Questo controllo limita chi puo' aprire una connessione; l'autorizzazione del
canale privato resta comunque sul server tramite Sanctum.

La `REVERB_APP_KEY` identifica pubblicamente l'applicazione nel client che
sara' configurato nel task Echo. `REVERB_APP_SECRET`, invece, firma le
richieste del broadcaster ed e' solo backend: non va mai inserito in una
variabile `NEXT_PUBLIC_*`, nel frontend o in un file di esempio con un valore
reale. Anche ID e chiave qui sono vuoti intenzionalmente: l'installer crea
valori locali nel file `.env`, che e' ignorato da Git, mentre ogni ambiente
deve usare le proprie credenziali.

La prova di cablaggio e' avviare il server con `php artisan reverb:start` e
controllare che ascolti su `REVERB_SERVER_HOST:REVERB_SERVER_PORT`. Il feature
test dell'endpoint `/broadcasting/auth` avvia solo quel caso con Reverb e
credenziali fittizie, quindi verifica una firma Pusher nota: non richiede un
worker, Redis, Horizon o un server WebSocket attivo. Il suo trait di test rende le
credenziali disponibili prima del bootstrap, perche' e' allora che Laravel
registra il canale, senza trasformare in chiamate HTTP verso Reverb gli altri
test. La ricezione nel browser sara' verificata quando Echo verra' configurato.

Un errore comune e' usare `REVERB_HOST=0.0.0.0` come destinazione del
broadcaster. `0.0.0.0` e' utile come indirizzo di ascolto del server, ma non e'
un host a cui il client deve connettersi: in locale `localhost` e' la scelta
esplicita dell'esempio. Un altro errore e' esporre il segreto perche' la chiave
app e' pubblica: hanno ruoli diversi e il segreto resta sul server.

In produzione il principio non cambia, ma Reverb deve ricevere un hostname
reale, HTTPS/TLS e un `REVERB_ALLOWED_ORIGINS` ristretto alle SPA fidate;
valori e segreti vanno gestiti dal sistema di deploy, non versionati. Il
processo Reverb va inoltre mantenuto in esecuzione dal supervisore
dell'ambiente. Queste sono esigenze operative future, non introducono queue,
Redis o Horizon in questa milestone.

### Esercizio Reverb

Prima di configurare Echo, spiega con parole tue perche' la chiave puo' essere
letta dal client mentre il segreto no. Poi cambia `REVERB_PORT` e
`REVERB_SERVER_PORT` nel tuo `.env` locale e indica quali due processi devono
usare lo stesso valore perche' il broadcast arrivi al server WebSocket.

## Echo nel browser

Echo e' il piccolo client JavaScript che evita di parlare direttamente il
protocollo Pusher in ogni componente. Apre il WebSocket dal browser, si iscrive
ai canali Laravel e offre metodi leggibili come `private('chat')` e `listen`.
In questo progetto Reverb e' il server WebSocket self-hosted: usa il protocollo
Pusher, ma non e' il servizio Pusher Cloud. Per questo il frontend installa sia
`laravel-echo` sia `pusher-js` e configura `broadcaster: 'reverb'`.

Il modulo `frontend/lib/echo.ts` e' volutamente solo browser: importarlo sul
server non crea una connessione e `getEcho()` costruisce il client soltanto al
primo uso nel browser. L'istanza viene conservata su `window`, quindi un reload
del modulo durante l'HMR di Next.js non apre una seconda connessione. M2-004
non importa il modulo in pagine o componenti: la sottoscrizione e il cleanup
arriveranno nei task successivi.

Il profilo locale predefinito usa il proxy TLS di Lerd. La configurazione
minima del file `.env.local` frontend e' quindi questa:

```dotenv
NEXT_PUBLIC_BACKEND_URL=https://api.simple-chat.test
FRONTEND_URL=https://app.simple-chat.test:3000
NEXT_PUBLIC_REVERB_APP_KEY=la-stessa-REVERB_APP_KEY-del-backend
NEXT_PUBLIC_REVERB_HOST=api.simple-chat.test
NEXT_PUBLIC_REVERB_PORT=443
NEXT_PUBLIC_REVERB_SCHEME=https
```

Il backend espone `APP_URL=https://api.simple-chat.test` e consente
`https://app.simple-chat.test:3000` in CORS. Il suo broadcaster continua invece
a usare `REVERB_HOST=localhost`, `REVERB_PORT=8080` e `REVERB_SCHEME=http` per
il percorso interno verso Reverb: non e' un endpoint aperto al browser.

`NEXT_PUBLIC_` rende un valore disponibile nel bundle browser. E' corretto per
la app key pubblica e per host, porta e schema: servono al browser per sapere a
quale endpoint WebSocket connettersi. Non e' mai corretto per
`REVERB_APP_SECRET`, password, cookie, token o altri segreti. Anche
`REVERB_APP_ID` resta escluso da questo client: non e' necessario per aprire la
connessione Echo e non deve essere aggiunto "per completezza".

### Autorizzazione canale con Sanctum e Axios

Quando Echo prova a entrare in `private-chat`, prima invia al backend il socket
ID e il nome del canale. Con `pusher-js` 8 questa operazione e' configurata con
`channelAuthorization.customHandler`: riceve `{ socketId, channelName }` e un
callback. Il custom handler di questo progetto usa `http`, la stessa istanza
Axios della chat HTTP. Quell'istanza invia cookie (`withCredentials`)
e il token XSRF (`withXSRFToken`) secondo le regole gia' adottate dalla SPA.

Il custom handler passa la `POST /broadcasting/auth` tramite `withCsrf`: il helper
assicura il cookie CSRF e ritenta una volta dopo un eventuale `419`. La route
broadcasting Laravel resta CSRF-exempt; la protezione dell'accesso al canale e'
comunque la sessione Sanctum e la regola server-side `Broadcast::channel`. Il
riuso e' utile perche' mantiene una sola configurazione Axios cross-origin e
una sola gestione del ciclo del cookie, invece di lasciare che il trasporto HTTP
di default di Pusher usi una configurazione non adatta a questa SPA.

Il callback del custom handler riceve `(error, data)`: al
successo passa `null` e la risposta firmata del backend; al fallimento passa
l'errore senza registrare cookie, token o dati dell'utente nel modulo.

### Come verificare Echo

I test unitari mockano Echo, Pusher e il client HTTP: controllano configurazione
Reverb esplicita sia HTTPS sia HTTP, singleton lazy, import sicuro senza
`window`, chiamata a `withCsrf`, payload della POST di autorizzazione e callback
di successo o errore. Non aprono un WebSocket reale.

Lo smoke manuale richiede backend, Reverb e Next.js avviati, piu' una sessione
Sanctum autenticata. Nel browser, richiama temporaneamente `getEcho()` e prova
la sottoscrizione a `private-chat`: DevTools deve mostrare una POST autorizzata
senza `401` o `419` e una connessione WebSocket a Reverb. Se l'app key frontend
non coincide con `REVERB_APP_KEY` backend, oppure se mancano cookie/CSRF prima
della connessione, l'autorizzazione o la sottoscrizione falliranno: sono i due
errori locali piu' comuni.

Con Lerd la SPA Next deve essere avviata in HTTPS con un certificato locale
fidato: solo cosi' puo' leggere e inviare correttamente il cookie XSRF sicuro
e aprire `wss://api.simple-chat.test`. Non aggirare il problema disabilitando
la verifica TLS nel browser o in Node.js. In produzione valgono gli stessi
principi con un dominio pubblico: cambiano endpoint e certificati, non il fatto
che secret e decisione di accesso restino server-side.

### Esercizio Echo

Apri DevTools dopo il login, annota `socket_id` e `channel_name` che Echo
invierebbe al custom handler, poi spiega perche' il browser non puo' sostituire la
firma di Laravel con una propria. Infine imposta mentalmente lo schema su
`https`: quale valore di `forceTLS` e quale protocollo WebSocket devono
risultare?

## Il canale privato della chat

Un canale pubblico lascia entrare chiunque conosca il suo nome: e' utile, per
esempio, per un contatore pubblico. La chat contiene invece messaggi di utenti
autenticati, quindi usa un canale privato. `PrivateChannel('chat')` negli eventi
produce il nome sul filo `private-chat`; per questo il client chiedera' di
autorizzare proprio `private-chat`, non `chat`.

Laravel registra la regola server-side in `routes/channels.php`:

```php
Broadcast::channel('chat', fn (User $user): bool => true, ['guards' => ['sanctum']]);
```

La callback riceve un `User` solo dopo che Sanctum ha identificato la richiesta.
Qui restituisce `true` perche' esiste una sola chat di gruppo e tutti gli utenti
autenticati hanno lo stesso diritto di accesso. Non e' una scelta del frontend:
un client puo' inviare una richiesta con `channel_name=private-chat`, ma Laravel
verifica comunque sessione e regola prima di restituire l'autorizzazione.

La configurazione minima e' caricare `routes/channels.php` dal bootstrap Laravel
e assegnare `web` e `auth:sanctum` alla route `POST /broadcasting/auth` generata
da Laravel. `web` rende disponibile la sessione cookie della SPA; `auth:sanctum`
fa ricevere `401 Unauthorized` a un ospite. L'opzione `guards` della regola
mantiene anche la risoluzione dell'utente del canale ancorata a Sanctum. Reverb
ed Echo non servono per controllare questo confine: saranno configurati nei
task dedicati.

La SPA raggiunge questo endpoint da un'origine diversa, quindi `cors.php` deve
includere anche `broadcasting/auth`, mantenere l'origine SPA esplicita e
`supports_credentials=true`. Il browser puo' cosi' inviare cookie di sessione
solo dall'origine fidata, dopo una preflight `OPTIONS` riuscita.

Le richieste che modificano i Message restano protette da XSRF: l'istanza Axios
esistente puo' leggere il cookie `XSRF-TOKEN` e inviare l'header
`X-XSRF-TOKEN`. La route broadcasting standard di Laravel e' invece esentata
dal controllo CSRF. L'header puo' ancora essere inviato dal client condiviso,
ma non viene convalidato da quella route: il confine di sicurezza e' la
sessione Sanctum insieme alla regola `Broadcast::channel`, non il token CSRF.

## Verifica dell'autorizzazione

I feature test inviano richieste HTTP a `POST /broadcasting/auth` con
`channel_name=private-chat` e un `socket_id`: con un utente Sanctum si aspettano
una risposta di autorizzazione positiva, senza sessione si aspettano `401`.
Questo controlla il percorso pubblico che usera' Echo, non soltanto la callback
PHP isolata. Una preflight CORS da `https://app.simple-chat.test:3000` deve
restituire l'origine e le credenziali consentite. Per una verifica manuale,
dopo login SPA invia la stessa richiesta con il cookie di sessione; in una
sessione privata senza cookie deve rispondere `401`. La forma di autorizzazione
Pusher/Reverb e' verificata dal feature test M2-003 con credenziali fittizie.

Un errore comune e' registrare `Broadcast::channel('private-chat', ...)`.
Laravel rimuove il prefisso tecnico `private-` prima di cercare la regola, quindi
la regola corretta e' `chat`; usare il nome completo porta a un rifiuto `403`
anche per un utente autenticato. Un altro errore e' omettere `auth:sanctum` dalla
route: allora l'endpoint puo' raggiungere il broadcaster senza il confine
esplicito che la chat richiede.

In produzione restano gli stessi principi, ma la configurazione deve usare solo
origini SPA fidate, HTTPS e cookie `Secure`/`SameSite` appropriati. Se in futuro
un'app mobile usa token invece della sessione cookie, Sanctum puo' verificare il
token nella stessa route; non bisogna trasferire la decisione di accesso al
client. Regole per stanze o membership richiederebbero una callback che controlli
quel dato nel database, non sono parte di questa chat di gruppo.

## Gli eventi del messaggio

Il controller emette l'evento soltanto dopo che la mutazione e' riuscita:

- `MessageCreated` dopo `POST /api/messages`;
- `MessageUpdated` dopo `PUT /api/messages/{message}`;
- `MessageDeleted` dopo `DELETE /api/messages/{message}`.

Tutti implementano `ShouldBroadcastNow`, usano `PrivateChannel('chat')` e
quindi appartengono al solo canale privato `chat`. Non viene definito un
`broadcastAs`: Laravel usa il nome dell'evento derivato dalla relativa classe.
La scelta conserva una relazione esplicita fra il tipo PHP emesso e il nome che
il listener Echo configurera' nel task dedicato.

Create e update ricevono nel costruttore un `Message` con la relazione `user`
gia' caricata. Sul filo il payload e' esplicito e distinto da `MessageResource`:

```json
{
  "message": {
    "id": 42,
    "userId": 7,
    "text": "Ciao gruppo!",
    "createdAt": "2026-08-14T09:00:00.000000Z",
    "updatedAt": "2026-08-14T09:00:00.000000Z",
    "user": {
      "id": 7,
      "firstName": "Ada",
      "lastName": "Lovelace",
      "username": "ada"
    }
  }
}
```

Per delete basta invece:

```json
{ "messageId": 42 }
```

Il mapping manuale e' intenzionale: l'evento ha un proprio contratto e invia
soltanto l'autore pubblico (`id`, `firstName`, `lastName`, `username`), senza
email o altri attributi del modello `User`. `MessageResource` continua a essere
il contratto delle risposte HTTP e non e' stato modificato.

## Ricevere eventi in modo difensivo con Echo e Zod

Un evento WebSocket non e' una risposta HTTP che il componente ha appena
richiesto: e' input arrivato da una connessione esterna. Normalmente Laravel e
Reverb inviano il payload corretto, ma un bug di versione, un broadcaster
configurato male oppure un client non atteso possono produrre una forma diversa.
Per questo il browser lo considera **non fidato** finche' uno schema Zod non ne
conferma la forma. Questa validazione e' difensiva: non sostituisce
`auth:sanctum`, la policy o il canale privato, che restano controlli server-side.

M2-005 mantiene due schemi di input separati. Create e update hanno lo stesso
envelope `{ message: ... }`; `id` e `userId` sono interi positivi, le date sono
ISO con offset (oppure `null`) e autore/testo sono campi obbligatori. Delete ha
invece soltanto `{ messageId: ... }`: non deve essere forzato a contenere un
oggetto `message` che il backend non manda. Lo schema elimina i campi extra
prima della normalizzazione, ma non replica regole della form HTTP come il
limite di caratteri del testo.

Echo apre `private-chat` quando il codice usa `getEcho().private('chat')`. Gli
eventi non hanno `broadcastAs()`, quindi il loro nome sul filo e' il FQCN PHP.
Per indicare a Echo di non aggiungere il namespace predefinito, ogni listener
inizia con un punto:

```ts
channel.listen(".App\\Events\\MessageCreated", onCreated)
channel.listen(".App\\Events\\MessageUpdated", onUpdated)
channel.listen(".App\\Events\\MessageDeleted", onDeleted)
```

Il listener sceglie `created` oppure `updated`, perche' la forma raw dei due
payload e' identica. Dopo il parsing, consegna subito alla callback del consumer
un evento discriminato: `{ type: "created" | "updated", message }` oppure
`{ type: "deleted", messageId }`. Consegnarlo direttamente evita di usare un
solo `lastEvent`: due eventi ravvicinati non devono aspettare un render React
intermedio per essere riconciliati.

Se un payload non supera lo schema, l'hook lo ignora e continua ad ascoltare:
non modifica `lastEvent` e non chiude il canale. In development `console.error`
include payload ed errore Zod per facilitare il debug; in produzione non viene
stampato nulla, per non trasformare input esterno malformato in rumore o dati
nei log. Il cleanup ordinario dell'effetto chiama `echo.leave('chat')`; le
regressioni di StrictMode e HMR sono trattate separatamente in M2-007.

## Lifecycle del listener e React StrictMode

Un listener realtime appartiene al ciclo di vita del componente che lo usa. Al
mount, l'effetto costruisce `private('chat')` e registra i tre FQCN; al cleanup
rilascia la sottoscrizione. Il hook mantiene anche un flag locale alla singola
sottoscrizione: il cleanup lo disattiva prima di chiamare `echo.leave('chat')`.
Questo secondo controllo e' utile se il trasporto conserva per errore una
callback e la invoca dopo l'unmount: quella callback non deve raggiungere ne' il
consumer ne' lo stato React.

La configurazione minima pertinente e' questa, con un solo effetto e un solo
cleanup gia' posseduti dal hook:

```tsx
useEffect(() => {
  let active = true
  const echo = getEcho()
  const channel = echo.private("chat")

  channel.listen(".App\\Events\\MessageCreated", (payload) => {
    if (!active) return
    // valida il payload e consegnalo al consumer
  })

  return () => {
    active = false
    echo.leave("chat")
  }
}, [])
```

In sviluppo, `StrictMode` puo' eseguire la sequenza mount-cleanup-remount per
far emergere effetti non reversibili. Nel test del progetto questo significa
due chiamate a `private('chat')`, sei chiamate complessive a `listen`, una
`leave('chat')` intermedia e, alla fine, una sola callback attiva per evento.
L'evento ordinario va consegnato solo alle callback attive; una callback storica
va invocata direttamente soltanto nel test del caso tardivo.

La verifica automatica usa un mock Echo che separa callback attive e storiche:

```bash
pnpm exec vitest run app/__test__/messages/message-realtime.test.tsx
pnpm exec vitest run app/__test__/messages/chat-page-realtime.test.tsx
```

Il test d'integrazione osserva una sola riconciliazione cache e una sola bubble
per un update valido, poi invoca la callback catturata prima dell'unmount e
verifica che la riconciliazione non aumenti. Per la verifica manuale, distinguere
in DevTools il socket HMR `/_next/webpack-hmr` dal socket Reverb
`wss://api.simple-chat.test/app/...`: dopo Fast Refresh, uscita/rientro nella
chat e un nuovo messaggio inviato dal secondo browser deve apparire una sola
volta, senza warning React.

Un errore comune e' registrare il listener durante il render, oppure mettere
`onEvent` nelle dipendenze dell'effetto e ricreare il canale a ogni render. In
entrambi i casi il lifecycle diventa difficile da seguire e possono comparire
listener duplicati. Qui `useEffectEvent` permette al listener stabile di usare
il consumer piu' recente; `[]` mantiene stabile la sottoscrizione e il cleanup
resta quello del hook. Un'altra trappola e' usare un flag condiviso fra mount
diversi: la callback vecchia potrebbe tornare attiva dopo un remount. Il flag
deve appartenere alla singola esecuzione dell'effetto.

In produzione React non ripete automaticamente l'effetto come controllo di
`StrictMode`, quindi il doppio mount osservato nei test e' uno strumento di
sviluppo, non un comportamento da conteggiare come traffico reale. Il cleanup e
la guard locale restano comunque necessari: navigazione, HMR, riconnessioni e
callback gia' consegnate dal trasporto possono ancora incrociarsi con l'unmount.

### Esercizio sul lifecycle

Disegna una linea temporale con `mount -> listen x3 -> cleanup -> leave ->
remount -> listen x3`. Indica quali tre callback possono ricevere un evento
ordinario e quale callback puoi conservare per il test tardivo. Poi spiega
perche' `leave('chat')` da solo non dimostra che una funzione gia' catturata non
verra' piu' invocata.

I test usano un mock Echo, non un WebSocket: verificano esattamente canale e tre
FQCN, parsing/normalizzazione, consegna alla callback, rifiuto non bloccante,
logging per ambiente e cleanup. Lo smoke runtime richiede invece sessione
Sanctum, backend, Reverb e Next.js: produci una mutazione reale, correla il log
di Reverb con un breakpoint DevTools impostato nella callback di riconciliazione,
senza aggiungere UI o log temporanei. Un errore comune e' omettere il punto iniziale nel listener: Echo
trasforma allora il nome aggiungendo il namespace e non riceve l'evento Laravel.

### Esercizio di validazione realtime

Scrivi un payload `MessageDeleted` con `messageId` stringa e spiega perche'
l'hook deve ignorarlo senza smettere di ascoltare. Poi togli mentalmente il punto
da `.App\\Events\\MessageCreated`: quale nome formatterebbe Echo e perche' non
corrisponde piu' al FQCN inviato da Laravel?

## Riconciliare eventi realtime e cache HTTP

M2-006 mantiene due contenitori nel browser, con ruoli diversi:

- la cache TanStack Query (`data.pages`) conserva le pagine cursor-paginate che
  arrivano da `GET /api/messages`;
- `localMessages` e' una proiezione transitoria: contiene un optimistic create,
  la risposta HTTP del proprio create prima che una pagina la includa e i create
  arrivati da WebSocket che non sono ancora in una pagina HTTP.

Non si tratta della cache HTTP del browser. E' memoria dell'app React, gestita
da TanStack Query. Nel rendering una pagina HTTP ha precedenza su una copia
locale con lo stesso ID; dopo un refetch, la copia locale numerica non viene
piu' renderizzata. Un ID temporaneo dell'optimistic create resta invece locale
finche' la richiesta non riesce o fallisce.

Il percorso di un create remoto e' questo:

```text
MessageCreated WebSocket
  -> Echo valida con Zod
  -> callback realtime
  -> localMessages, solo se l'ID non e' gia' presente
  -> bubble visibile senza refetch
  -> futuro GET contiene lo stesso ID
  -> la pagina HTTP ha precedenza, la copia locale non e' piu' visibile
```

Update e delete non aggiungono un messaggio mancante. Update sostituisce lo
stesso ID sia nelle pagine gia' caricate sia in `localMessages`; delete lo
rimuove da entrambi. Le risposte HTTP delle proprie mutation applicano le stesse
operazioni: `PUT` restituisce il Message canonico, `DELETE 204` rimuove l'ID.
Così il broadcast equivalente puo' arrivare prima o dopo senza produrre un
secondo risultato permanente.

Per lo stesso ID, `updatedAt` evita di tornare indietro nel tempo: una copia con
timestamp piu' vecchio non sovrascrive una piu' recente. Questa regola vale
anche quando un GET gia' partito arriva dopo un update realtime. Un evento
create/update con date `null` passa lo schema di trasporto, ma non puo' formare
un `Message` della UI: viene ignorato e, solo in development, segnalato in
console. Non modifica Zod, il backend o le regole di autorizzazione.

La configurazione minima resta quella gia' vista per Echo: il browser deve avere
app key, host, porta e schema pubblici per connettersi a Reverb; cookie Sanctum e
Axios condiviso autorizzano `private-chat`. Questa riconciliazione non richiede
nuove dipendenze, un cache globale aggiuntivo o una queue.

### Come verificare la riconciliazione

I test frontend usano QueryClient reale con servizi HTTP controllati e un mock
Echo. Coprono create remoto, update/delete nelle pagine e nella proiezione
locale, evento duplicato dopo la risposta HTTP, refetch che promuove una copia
live, timestamp stale e payload con date mancanti. Lo smoke manuale richiede due
browser autenticati: crea in A e osserva una bubble in B; modifica e cancella in
A e verifica B senza refresh; infine crea in A e verifica che dopo broadcast e
refetch A mostri una sola bubble.

Un errore comune e' appendere ogni `MessageCreated` direttamente alle pagine
HTTP oppure alla lista locale senza deduplicare: dopo refetch appaiono due
bubble. L'ID server, non testo, autore o timestamp, e' l'identita' usata per
deduplicare. Un altro errore e' lasciare che una risposta GET piu' vecchia
sovrascriva l'update WebSocket piu' recente.

In produzione il principio e' identico, ma disconnessioni e riconnessioni
richiedono una strategia di refetch o di recupero eventi definita dal prodotto.
Questa chat locale non implementa replay, tombstone di delete o un
`clientMutationId`: puo' quindi mostrare per un istante sia l'optimistic create
sia il broadcast proprio prima della risposta HTTP. Il risultato converge a una
sola bubble quando la risposta canonica arriva.

### Esercizio di riconciliazione

Disegna due colonne, `data.pages` e `localMessages`. Segui nell'ordine: invio
optimistic con ID temporaneo, `MessageCreated` con ID 42, risposta POST con ID
42 e un GET che contiene 42. In quale passaggio puo' comparire una duplicazione
brevissima, e perche' non e' possibile correlare con certezza l'ID temporaneo a
42 senza che il backend invii un `clientMutationId`? Poi prova a spiegare perche'
`updatedAt` e' utile per update ma non basta a recuperare eventi persi durante
una disconnessione.

Per i dettagli dell'API di cache e delle mutation, consulta la documentazione
ufficiale di [TanStack Query per React](https://tanstack.com/query/latest/docs/framework/react/overview).

## Perche' `ShouldBroadcastNow`

Normalmente Laravel accoda un broadcast per non aumentare il tempo della
risposta: l'evento implementa `ShouldBroadcast`, Laravel crea un job
`BroadcastEvent` e lo dispaccia sulla connessione di coda configurata
(`QUEUE_CONNECTION`). In questa milestone si usa invece `ShouldBroadcastNow`:
Laravel riconosce l'interfaccia ed esegue il broadcast direttamente nello
stesso flusso della richiesta, senza mai passare dalla queue, indipendentemente
da `QUEUE_CONNECTION`. Questo permette di imparare evento, canale e payload
prima di aggiungere Redis, worker e Horizon. Non significa che la risposta HTTP
sia l'evento: prima il controller persiste la mutazione, poi emette l'evento,
infine restituisce la risposta gia' esistente.

In produzione, quando la milestone della queue sara' pronta, un evento
`ShouldBroadcast` sara' normalmente preferibile: il worker Redis potra'
consegnare il broadcast senza trattenere la richiesta HTTP. Da notare che
`ShouldBroadcast` con `QUEUE_CONNECTION=sync` non equivale a
`ShouldBroadcastNow`: nel primo caso viene comunque creato e processato un job
di queue (solo eseguito immediatamente nello stesso processo), nel secondo caso
la queue non entra mai in gioco. Se una mutazione avviene in una transazione,
va inoltre considerato l'invio dopo il commit per non notificare dati non
ancora visibili.

## Verifica

I feature test configurano un broadcaster fake nel driver Laravel alle route
HTTP, poi controllano l'evento emesso, `ShouldBroadcastNow`,
`PrivateChannel('chat')`, il payload, il caricamento dell'autore e l'assenza di
eventi per validazione `422` o policy `403`.

Vale la pena distinguere due livelli di garanzia nei test. Solo il test che
verifica `toBeInstanceOf(ShouldBroadcastNow::class)` sull'evento accerta il
contratto stesso, cioe' che il broadcast non passi mai dalla queue qualunque sia
`QUEUE_CONNECTION`. I test che verificano la chiamata al `Broadcaster` entro la
risposta HTTP (payload, canale, nome evento) confermano un comportamento
sincrono osservabile, ma da soli non distinguerebbero `ShouldBroadcastNow` da
`ShouldBroadcast` eseguito con `QUEUE_CONNECTION=sync`: quest'ultima
combinazione produce lo stesso effetto visibile, pur passando comunque da un
job di coda. Il test sull'interfaccia resta quindi l'unico presidio diretto
sulla scelta architetturale, e va mantenuto anche se puo' sembrare ridondante
rispetto agli altri.

Con il broadcaster log o reale configurato nei task successivi, la prova
manuale e': crea, modifica e cancella un messaggio autenticato e osserva i tre
eventi; quindi prova testo non valido e update di un messaggio altrui e verifica
che non arrivi nulla.

Un errore comune e' passare direttamente il modello `User` nel payload. La sua
serializzazione puo' rendere pubblici campi non previsti dal contratto della
chat; per questo qui il payload dell'autore e' scritto esplicitamente.

## Esercizio

Prima di vedere il task Echo, scrivi su carta quale cache frontend dovrebbe
aggiornare ciascun evento e perche' un `MessageDeleted` non ha bisogno del testo
del messaggio. Poi confronta la risposta con la forma dei payload qui sopra.

Poi rispondi: perche' la regola e' `chat` mentre la richiesta del client e'
`private-chat`? Infine immagina una chat con stanze: quale controllo server-side
aggiungeresti alla callback prima di restituire `true`?

## Documentazione ufficiale

Il progetto usa Laravel `13.24.0` (bloccato in `composer.lock`),
`laravel-echo` `2.4.0` e `pusher-js` `8.6.0`. La guida compatibile da
consultare e' la documentazione Laravel 13 su
[Broadcasting](https://laravel.com/docs/13.x/broadcasting): in particolare
installazione client Reverb, eventi broadcast, `PrivateChannel`, autorizzazione
dei canali, payload `broadcastWith` e `ShouldBroadcastNow`; per il server
locale consulta anche [Laravel Reverb 13](https://laravel.com/docs/13.x/reverb).
Per il guard della SPA consulta [Laravel Sanctum 13](https://laravel.com/docs/13.x/sanctum).
Il repository ufficiale di [Laravel Echo](https://github.com/laravel/echo) e il
[changelog di pusher-js](https://github.com/pusher/pusher-js/blob/master/CHANGELOG.md)
completano il riferimento per l'API client e la firma callback del custom
handler. Per gli schemi e `safeParse`, consulta la documentazione ufficiale di
[Zod](https://zod.dev/). Per il lifecycle React consulta [StrictMode](https://react.dev/reference/react/StrictMode)
e [`useEffect`](https://react.dev/reference/react/useEffect); per Fast Refresh
consulta la guida ufficiale di [Next.js](https://nextjs.org/docs/architecture/fast-refresh).
