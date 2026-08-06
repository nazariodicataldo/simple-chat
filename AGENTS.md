# Group Chat — istruzioni operative

Progetto personale di apprendimento: una singola chat di gruppo per utenti autenticati, con backend Laravel e frontend Next.js. L'obiettivo e' capire ogni componente, non costruire un sistema enterprise.

## Principi non negoziabili

- Mantieni la soluzione semplice e convenzionale; non anticipare scaling, microservizi, Kubernetes o astrazioni senza un problema osservabile.
- PostgreSQL sara' la fonte persistente di verita' dei messaggi; TanStack Query gestira' lo stato remoto frontend.
- Prima HTTP, poi real-time diretto (`ShouldBroadcastNow`), poi queue Redis e worker; Horizon soltanto dopo `queue:work`.
- Sicurezza lato server: l'utente autenticato determina `user_id`; policy e private channel sono autorizzati server-side. Nessun secret in `NEXT_PUBLIC_*` o nel repository.
- Non aggiungere dipendenze, modificare API pubbliche o prendere decisioni architetturali rilevanti senza motivazione esplicita e, se necessario, ADR.
- Ogni task e' piccolo, verificabile e reversibile. I test devono osservare comportamenti utili.

## Workflow obbligatorio

Prima: leggi [current-state](docs/project/current-state.md) e il task in `docs/tasks/active/`; leggi solo i documenti collegati, ispeziona il codice pertinente e controlla `git status`. Dichiara modifiche preesistenti, piano, assunzioni e ambiguita' prima di modificare.

Durante: procedi per incrementi piccoli; usa TDD quando il comportamento e' testabile; esegui i controlli vicini alla modifica. Non fare refactor opportunistici, correzioni non correlate o modifiche fuori scope senza segnalarle. Se emerge una decisione importante, proponi un ADR.

Dopo: esegui tutti i test e i controlli richiesti; controlla `git status`, `git diff --stat` e diff completo, incluse eventuali lockfile. Aggiorna task e [current-state](docs/project/current-state.md) solo se lo stato e' cambiato; aggiorna [changelog](CHANGELOG.md) e ADR solo quando appropriato. Un task non e' completo senza verifiche effettivamente eseguite e criteri soddisfatti; se un comando non e' eseguibile, registra motivo, copertura mancante e istruzione di verifica.

## Comandi noti

I comandi seguenti sono rilevati nel repository ma non sono ancora verificati come workflow del progetto: backend `composer test`, `./vendor/bin/pint --test`, `./vendor/bin/phpstan analyse`; frontend `pnpm lint`, `pnpm typecheck`, `pnpm build`. Non eseguire comandi di una cartella diversa da quella dichiarata nel task. I comandi Docker, Reverb, queue, Horizon, Vitest e Playwright non sono ancora disponibili come workflow documentato.

## Dove cercare

- [Indice documentazione](docs/README.md)
- [Stato corrente](docs/project/current-state.md)
- [Architettura](docs/project/architecture.md)
- [Roadmap](docs/project/roadmap.md)
- [Task](docs/tasks/README.md)
- [Decisioni (ADR)](docs/decisions/README.md)

