# M2-005 — Sottoscrivere e validare eventi Message

- **Stato:** proposta
- **Milestone:** Milestone 2 — Real-time diretto con Reverb ed Echo
- **Data di apertura:** 2026-08-13
- **Data di chiusura:**

## Contesto

Il client Echo e' pronto, ma un evento WebSocket e' input non fidato. La feature Message deve validarlo prima di modificare lo stato della chat.

## Obiettivo

Sottoscrivere i tre eventi Message su `private-chat`, validarne i payload con Zod e inoltrarli al consumer come un tipo discriminato.

## Fuori scope

- Backend, package e lockfile.
- Client Echo.
- Componenti di rendering e dialog CRUD.

## File modificabili

- Feature realtime/Message dedicata.
- `frontend/components/chat/chat-page.tsx` solo per montare l'hook.
- Test Message pertinenti.
- `docs/learning/broadcasting-reverb-echo.md`.
- Questo task.

## File non modificabili

- Backend.
- Package e lockfile.
- Client Echo.
- Componenti presentazionali e dialog CRUD.

## Requisiti

- Ascoltare soltanto `private-chat` e i tre nomi evento tipizzati.
- Validare ogni payload prima di consegnarlo al consumer.
- Ignorare un payload non valido senza interrompere la chat.
- Inoltrare gli eventi validi in forma discriminata create/update/delete.
- Non modificare il contratto HTTP `MessageResource`.
- Aggiornare la guida learning con il payload WebSocket come input non fidato, validazione Zod e gestione non bloccante degli eventi invalidi; includere configurazione minima pertinente, verifica/test, errore comune, differenza production, esercizio e documentazione Laravel ufficiale compatibile.

## Strategia di test

RED/GREEN/REFACTOR per schema Zod, evento valido, evento invalidato e inoltro del tipo discriminato.

## Comandi da eseguire

- `git status --short`
- `git diff --stat`
- `git diff --check`
- Revisione di `docs/learning/broadcasting-reverb-echo.md` rispetto ai requisiti didattici.
- Da `frontend/`: test mirati, `pnpm lint`, `pnpm typecheck`, `pnpm build`.

## Criteri di accettazione

- [ ] I soli listener registrati sono i tre eventi Message di `private-chat`.
- [ ] I payload validi sono tipizzati e inoltrati.
- [ ] I payload invalidi sono ignorati senza errore di UI.
- [ ] Il contratto HTTP Message resta invariato.
- [ ] La guida learning spiega la validazione difensiva dei payload per un principiante.
- [ ] Tutti i controlli sono registrati con evidenza.

## Rischi e assunzioni

La validazione client e' difensiva e non sostituisce i confini server-side; gli eventi sono gia' prodotti dal backend autorizzato.

## Verifica manuale

Con una connessione Reverb autenticata, produrre un evento valido e un payload volutamente malformato nel test harness; solo il primo deve aggiornare la chat.

## Decisioni emerse

Nessuna.

## File modificati

Da compilare durante l'implementazione.

## Risultati dei controlli

Da compilare durante l'implementazione.

## Problemi residui

Nessuno all'apertura.

## Riepilogo finale

Task pianificato, dipende da M2-004.
