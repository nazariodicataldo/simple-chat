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
dal broadcaster Laravel (e dal client Echo nel task successivo).

Il processo `php artisan reverb:start` ha invece il proprio indirizzo di
ascolto: `REVERB_SERVER_HOST` e `REVERB_SERVER_PORT`. In locale il server puo'
ascoltare su `0.0.0.0:8080` mentre broadcaster e browser si collegano a
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
PHP isolata. Una preflight CORS da `http://app.simple-chat.test:3000` deve
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

Il progetto usa Laravel `13.24.0` (bloccato in `composer.lock`). La guida
compatibile da consultare e' la documentazione Laravel 13 su
[Broadcasting](https://laravel.com/docs/13.x/broadcasting): in particolare
eventi broadcast, `PrivateChannel`, autorizzazione dei canali, payload
`broadcastWith` e `ShouldBroadcastNow`; per il server locale consulta anche
[Laravel Reverb 13](https://laravel.com/docs/13.x/reverb). Per il guard della
SPA consulta [Laravel Sanctum 13](https://laravel.com/docs/13.x/sanctum).
