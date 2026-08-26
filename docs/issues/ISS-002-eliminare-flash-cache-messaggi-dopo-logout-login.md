# ISS-002 — Eliminare il flash della cache messaggi dopo logout/login

- **Stato:** risolta
- **Priorita':** media
- **Area:** frontend, TanStack Query, esperienza logout/login
- **Data di apertura:** 2026-08-26
- **Data di chiusura:** 2026-08-26
- **Task collegato:** [M2-008](../tasks/completed/M2-008-verificare-realtime-due-browser.md),
  [M2-009](../tasks/completed/M2-009-evitare-cache-messaggi-obsoleta-dopo-logout-login.md)
- **ADR collegato:** nessuno

## Contesto

Firefox B esce da `private-chat`; Chrome A esegue una mutazione mentre B e'
disiscritto. Al login successivo B mostra brevemente lo stato messaggi
precedente, poi la lista si riallinea al database.

## Comportamento osservato

- CREATE: il nuovo messaggio appare dopo circa un secondo;
- UPDATE: per circa un secondo e' visibile il testo precedente, poi compare
  quello aggiornato;
- DELETE: per circa un secondo e' visibile il messaggio cancellato, poi
  scompare.

Il comportamento e' stato osservato dopo logout/login Firefox; non prova la
consegna di eventi storici sul canale privato.

## Riproduzione

1. Accedere con A in Chrome e B in Firefox.
2. Fare logout di B e verificare `pusher:unsubscribe` da `private-chat`.
3. Da A creare, aggiornare o cancellare un messaggio.
4. Accedere di nuovo come B e osservare la lista prima e dopo il refetch.

## Evidenza

- Il logout rimuove la subscription ma mantiene aperta la connessione Reverb
  per il successivo riuso.
- `frontend/app/providers.tsx` mantiene un singolo `QueryClient` nell'app.
- `useLogoutMutation` pulisce `authQueryKey`, non `messageKeys.lists()`.
- `useMessagesQuery` non imposta uno `staleTime`; al remount la cache esistente
  viene resa e poi refetchata.

La prova DevTools completa conferma il confine HTTP/realtime:

- nel caso UPDATE, `GET /api/messages` post-login contiene gia' il testo
  `ISS-002-dopo`, mentre B mostra inizialmente il testo precedente e cambia
  soltanto durante il flash;
- nel caso DELETE, dopo il login il socket Reverb mostra soltanto
  `connection_established`, `pusher:subscribe` e
  `pusher_internal:subscription_succeeded`; non riceve
  `App\\Events\\MessageDeleted` storico, pur mostrando temporaneamente il
  messaggio cancellato;
- l'ordine osservato, con `GET /api/messages` che puo' partire prima di
  `/broadcasting/auth`, e' coerente con la query avviata nel render e la
  subscription Echo avviata nell'effetto successivo.
- La correzione annulla e rimuove le query con prefisso `messages` soltanto
  dopo logout HTTP riuscito; non tocca cache non correlate.

## Impatto

Risolta: il rientro non rende piu' dati della sessione precedente. Il server
resta fonte di verita' e non e' emersa una falla di autorizzazione realtime.

## Causa

**Confermata.** La cache della lista messaggi sopravvive al logout e viene
renderizzata al login successivo prima che il refetch `GET /api/messages`
completi il riallineamento. Non e' una consegna di eventi storici dal canale
privato.

## Decisione e scope

L'issue e' emersa durante M2-008 ma la correzione M2-009 resta lato client:
non modifica protocollo Reverb, backend o il limite distinto della race
GET/Delete gia' accettata.

## Piano di risoluzione

M2-009 ha introdotto un RED con `QueryClient` persistente, lista vecchia e GET
post-login differito. La correzione scelta annulla e rimuove le sole query
`messages` al logout riuscito.

## Verifica

Verifiche riuscite dopo la correzione:

- nessun messaggio creato, aggiornato o cancellato durante il logout e' visibile
  in versione obsoleta al rientro;
- il GET post-login e la nuova subscription restano corretti;
- `pnpm test` (15 file, 85 test), lint, typecheck e build riescono;
- smoke Chrome incognito A ↔ Firefox incognito B: CREATE, UPDATE e DELETE
  eseguiti durante il logout non producono flash al login; stato finale,
  authorization e subscription sono corretti in entrambi i versi.

## File coinvolti o modificati

- `frontend/app/features/auth/auth.queries.ts`
- `frontend/app/__test__/auth/logout-message-cache.test.tsx`
- `frontend/app/__test__/auth/auth.queries.test.tsx`

## Problemi residui

Distinta dalla race gia' accettata in cui una risposta GET stale, gia' in volo,
puo' far ricomparire brevemente un messaggio eliminato dopo un evento realtime.

## Riepilogo finale

Risolta e verificata: causa cache confermata, RED/GREEN automatico e smoke
Chrome/Firefox nei due versi riusciti.
