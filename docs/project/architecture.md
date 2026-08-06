# Architettura

L'architettura prevista e' un monorepo semplice con `backend/` Laravel e `frontend/` Next.js. Il repository contiene gia' skeleton separati; la loro relazione Git e il workflow di versionamento non sono ancora una decisione chiusa.

## Confini e responsabilita'

- Laravel espone API HTTP, autentica e autorizza lato server, persiste i messaggi e definisce gli eventi broadcast.
- PostgreSQL sara' la fonte di verita' persistente dei messaggi.
- Next.js renderizza l'interfaccia; TanStack Query gestira' lo stato remoto. Nessuno stato globale aggiuntivo senza un problema concreto.
- Reverb manterra' connessioni WebSocket e trasportera' gli eventi; Echo li ricevera' nel browser.
- Redis sara' inizialmente backend della queue, non database della chat. Worker eseguira' i job; Horizon arrivera' dopo l'uso diretto di `queue:work`.

## Progressione deliberata

```text
HTTP:              Next.js -> Laravel -> PostgreSQL
Real-time diretto: Laravel -> Broadcasting -> Reverb -> Echo -> browser
Real-time queue:   Laravel -> Redis queue -> worker -> Broadcasting -> Reverb -> Echo -> browser
```

La prima fase real-time isolera' Broadcasting/Reverb/Echo con `ShouldBroadcastNow`; retry, failed jobs, `after_commit` e Horizon restano fuori scope finche' non iniziera' la milestone dedicata.

## Vincoli di sicurezza

`user_id` deriva sempre dall'utente autenticato. Modifica, eliminazione e canali privati sono autorizzati server-side. Cookie di autenticazione non vanno in `localStorage`; secret non vanno in `NEXT_PUBLIC_*`; non aggirare CSRF o CORS. Il contenuto dei messaggi avra' un limite e verra' renderizzato senza XSS.

