# M2-009 — Evitare cache messaggi obsoleta dopo logout/login

- **Stato:** completato
- **Milestone:** Milestone 2 — Real-time diretto con Reverb ed Echo
- **Data di apertura:** 2026-08-26
- **Data di chiusura:** 2026-08-26
- **Issue collegata:** [ISS-002](../../issues/ISS-002-eliminare-flash-cache-messaggi-dopo-logout-login.md)
- **Dipendenza:** M2-008 riprende la chiusura documentale dopo questo task.

## Contesto

Dopo il logout di B, le mutazioni di A avvenute mentre B e' disiscritto non
vengono consegnate dal canale privato. Al login successivo B rende per breve
tempo la lista TanStack Query precedente e poi il GET la riallinea al database.

La causa e' confermata: UPDATE mostra un GET gia' aggiornato durante il flash;
DELETE mostra una nuova subscription senza alcun evento `MessageDeleted`
storico. Il problema e' quindi cache client persistente, non Reverb.

## Obiettivo

Impedire che, dopo un logout riuscito e il login successivo, la chat renda dati
messaggi obsoleti della sessione precedente prima del primo GET corrente.

## Fuori scope

- Backend, Reverb, canali, eventi e autorizzazione realtime.
- Configurazioni, dipendenze, lockfile e UI/stili.
- Tombstone o risoluzione della race distinta GET stale/Delete gia' accettata.
- Caching/paginazione ulteriore, concorrenza e gestione offline.

## File modificabili

- `frontend/app/features/auth/auth.queries.ts`
- `frontend/app/features/messages/message.queries.ts`, solo se strettamente
  necessario alla strategia scelta
- test frontend pertinenti
- Questo task, ISS-002 e stato progetto solo al cambio di stato effettivo

## File non modificabili

- Backend e configurazioni Reverb/CORS.
- Componenti UI non necessari alla correzione.
- Dipendenze e lockfile.

## Requisiti

- La correzione agisce soltanto dopo logout HTTP riuscito.
- Al login successivo non deve comparire alcun dato messaggi della sessione
  precedente prima del primo GET concluso.
- Il GET iniziale, la nuova authorization e la subscription a `private-chat`
  restano invariati e funzionanti.
- La soluzione deve restare valida anche quando, nello stesso tab, cambia
  l'utente autenticato.

## Strategia di test

1. Scrivere un RED che usa un solo `QueryClient` persistente: precarica una
   lista vecchia, completa il logout e rimonta la chat con il GET differito.
   Prima della risoluzione del GET non deve apparire alcun messaggio obsoleto.
2. Risolvere il GET con dati correnti e verificare la lista corretta.
3. Aggiungere o estendere il test della mutation logout per provare il confine
   della cache messaggi scelto, senza svuotare cache non correlate.
4. Applicare la correzione minima soltanto dopo il RED riproducibile.

## Comandi da eseguire

- `git status --short`
- `git diff --stat`
- `git diff --check`
- Da `frontend/`: test mirati auth/chat, `pnpm test`, `pnpm lint`,
  `pnpm typecheck`, `pnpm build`.

## Criteri di accettazione

- [x] Il test RED riproduce una lista cache vecchia attraverso logout/login.
- [x] Il test GREEN prova che, prima del GET corrente, nessun dato messaggi
  della sessione precedente e' visibile.
- [x] La cache non correlata all'autenticazione non viene rimossa senza motivo.
- [x] La suite frontend, lint e typecheck sono riusciti; la build ha evidenza
  esplicita o una motivazione ambientale documentata.
- [x] Smoke Chrome A/Firefox B: CREATE, UPDATE e DELETE eseguiti durante il
  logout non causano flash al login B; GET e nuova subscription sono corretti.
- [x] ISS-002 e documentazione di stato sono aggiornate solo con evidenza
  completa.

## Rischi e assunzioni

Una richiesta lista gia' in volo puo' completare dopo il logout e reinserire
dati precedenti. La soluzione annulla e rimuove le query `messages`; il test
copre il confine cache logout→nuovo mount, mentre lo smoke browser ha coperto
il ciclo effettivo con `router.refresh`. Non estendere la correzione alla race
distinta GET stale/Delete senza un nuovo RED.

## Verifica manuale

1. Chrome A e Firefox B usano sessioni incognito isolate.
2. B esegue logout e verifica `pusher:unsubscribe`.
3. A crea, aggiorna e cancella tre messaggi di prova in sequenza.
4. B effettua login con Network e WebSocket aperti.
5. Prima del GET B non deve mostrare lo stato precedente; dopo il GET deve
   mostrare lo stato corrente.
6. Verificare `POST /broadcasting/auth` 200, una sola subscription e assenza
   di errori Console, senza salvare token o cookie nel report.

## Decisioni emerse

- La causa non e' una consegna realtime storica: la correzione resta lato
  client e non richiede ADR.
- Dopo il RED, la strategia minima scelta e' `cancelQueries` seguito da
  `removeQueries` sul prefisso `messages`, nell'`onSuccess` del logout. Agisce
  solo dopo la risposta HTTP riuscita e non svuota cache non correlate.

## File modificati

- `frontend/app/features/auth/auth.queries.ts`
- `frontend/app/__test__/auth/logout-message-cache.test.tsx`
- `frontend/app/__test__/auth/auth.queries.test.tsx`
- Questo task.

## Risultati dei controlli

- RED, da `frontend/`,
  `pnpm test app/__test__/auth/logout-message-cache.test.tsx`: fallito come
  previsto. Dopo logout riuscito, il test ha trovato nel DOM
  `Messaggio sessione precedente` prima della risoluzione del GET differito.
- GREEN mirato, da `frontend/`,
  `pnpm test app/__test__/auth/logout-message-cache.test.tsx`: riuscito,
  1 file e 1 test.
- Test dei due seam, da `frontend/`,
  `pnpm test app/__test__/auth/auth.queries.test.tsx app/__test__/auth/logout-message-cache.test.tsx`:
  riuscito, 2 file e 4 test. Copre sia l'assenza di dati obsoleti nel DOM sia
  la rimozione delle sole query messaggi.
- Da `frontend/`, `pnpm test` rieseguito da solo dopo l'ultimo test: riuscito,
  15 file e 85 test. Un precedente lancio in parallelo a lint/typecheck ha
  prodotto timeout in due test; entrambi sono riusciti isolatamente e la suite
  rieseguita senza contesa e' verde.
- Da `frontend/`, `pnpm lint` e `pnpm typecheck` rieseguiti dopo l'ultima
  modifica: riusciti con exit 0.
- Da `frontend/`, `pnpm build` rieseguito dopo l'ultima modifica con rete
  autorizzata per il font Google `Outfit`: riuscito con compilazione,
  TypeScript, raccolta dati, generazione delle 4 pagine e ottimizzazione finale.
- Da root, `git diff --check`: riuscito. Le modifiche non tracciate sono state
  controllate separatamente senza errori di whitespace.
- Smoke finale utente, 2026-08-26: Chrome A e Firefox B hanno ripetuto CREATE,
  UPDATE e DELETE mentre l'altro browser era disconnesso; al login non compare
  lo stato precedente e il GET, authorization e subscription ristabiliscono lo
  stato corrente. L'utente conferma il comportamento corretto nei due versi.
- Riepilogo finale agent, 2026-08-26: `pnpm test` e' riuscito con 15 file e 85
  test; `pnpm lint` e `pnpm typecheck` con exit 0; `pnpm build` con rete
  autorizzata e' riuscito con compilazione, TypeScript e generazione pagine.

## Problemi residui

La race gia' accettata GET stale/Delete non viene risolta da questo task.

## Riepilogo finale

Completato: la correzione cache e' verificata automaticamente e nello smoke
bidirezionale; ISS-002 e' risolta.
