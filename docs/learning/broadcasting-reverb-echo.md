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

## Documentazione ufficiale

Il progetto usa Laravel `13.24.0` (bloccato in `composer.lock`). La guida
compatibile da consultare e' la documentazione Laravel 13 su
[Broadcasting](https://laravel.com/docs/13.x/broadcasting): in particolare
eventi broadcast, `PrivateChannel`, payload `broadcastWith` e
`ShouldBroadcastNow`.
