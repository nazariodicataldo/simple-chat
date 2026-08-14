# ADR 0002 — Usare eventi Message separati per il real-time

- **Stato:** accettato
- **Data:** 2026-08-14

## Contesto

La roadmap della Milestone 2 indicava un singolo evento `MessageSent`. Il CRUD
HTTP distingue invece create, update e delete; il frontend dovra' riconciliare
queste tre mutazioni senza refresh e senza cambiare il contratto HTTP
`MessageResource`.

## Problema

Un solo evento non comunica in modo esplicito se il consumer deve inserire,
aggiornare o rimuovere un messaggio. La discrepanza fra roadmap e task M2-001
lasciava inoltre ambiguo il contratto che Echo dovra' ascoltare.

## Opzioni considerate

- Conservare il solo `MessageSent` e aggiungere un campo che descriva la
  mutazione.
- Usare `MessageCreated`, `MessageUpdated` e `MessageDeleted` come eventi
  distinti.
- Rinviare la scelta al task frontend.

## Decisione

Il real-time usa tre eventi Laravel tipizzati: `MessageCreated`,
`MessageUpdated` e `MessageDeleted`. Create e update inviano un payload
`message` con autore pubblico; delete invia soltanto `messageId`. Tutti gli
eventi usano il canale privato di gruppo `chat` e `ShouldBroadcastNow` nella
Milestone 2.

## Motivazione

Il tipo dell'evento rende la mutazione esplicita senza introdurre un envelope o
uno stato globale aggiuntivo. Il payload delete minimo evita di inviare dati di
un messaggio che non e' piu' necessario al consumer. La scelta e' coerente con
la riconciliazione create/update/delete gia' prevista per TanStack Query.

## Conseguenze

- Echo ascoltera' i tre nomi evento, non `MessageSent`.
- Gli schema Zod e la cache frontend modelleranno le tre forme di payload.
- `MessageResource` HTTP resta invariata.
- Un eventuale nuovo tipo di mutazione richiedera' un evento e un contratto
  espliciti.

## Condizioni per una futura revisione

Rivalutare la scelta soltanto se la chat richiedera' un protocollo versionato o
un envelope comune per piu' domini/eventi. In assenza di quel problema,
conservare i tre eventi separati.
