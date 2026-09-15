# GitHub Actions per la qualita' applicativa

M6-003 introduce la prima automazione remota del progetto in
`.github/workflows/ci.yml`. La CI non sostituisce Compose locale: un runner
GitHub parte da una copia effimera del commit e usa gli stessi Dockerfile gia'
scelti per PHP, Composer, Node e pnpm.

## Ruolo e confine

Il workflow sara' eseguito dopo un push su `master`, su pull request e tramite
avvio manuale. Ha due job indipendenti:

```text
commit
  -> backend: container backend -> test, Pint, PHPStan
  -> frontend: container frontend -> test, lint, typecheck, build
```

Separare i job non aumenta la copertura, ma rende leggibile il risultato: una
failure PHP non nasconde ne' blocca il report dei controlli frontend, e
viceversa. Gli step di ogni job sono distinti e si fermano al primo exit code
diverso da zero.

## Perche' non avviamo tutto Compose

Il container backend riceve i normali valori Compose, ma PHPUnit forza SQLite
in memoria. I suoi test non richiedono quindi PostgreSQL, Redis, Horizon o
Reverb. Vitest, ESLint, TypeScript e il build Next non richiedono invece API,
Nginx o certificati locali.

Per questo ogni job costruisce soltanto la propria immagine e usa
`docker compose --env-file compose.env.example run --rm --no-deps`. Il workflow
imposta inoltre `COMPOSE_FILE=compose.yaml:compose.ci.yaml`: l'override conserva
il bind mount del sorgente frontend e i volumi di dipendenze/cache, ma rimuove il
solo mount del certificato locale e svuota `NODE_EXTRA_CA_CERTS`. Per il backend
fornisce anche una `APP_KEY` fittizia e valida: i test di autenticazione cifrano
i cookie di sessione, ma questa chiave CI non protegge dati reali e non e' un
segreto. Il file di esempio contiene esclusivamente valori fittizi: non viene
usato `compose.env`, che e' un input locale ignorato. `--no-deps` e' corretto
qui proprio perche' questi
controlli sono isolati; non lo sara' per M6-004, che dovra' dimostrare il
percorso realtime completo.

## Struttura del workflow

I trigger sono push su `master`, pull request e `workflow_dispatch`. I job
`backend` e `frontend` girano su `ubuntu-24.04`, costruiscono rispettivamente il
servizio Compose corretto e poi eseguono i controlli in step separati. Il job
backend esegue `composer test`, Pint con `--test` e PHPStan con
`--memory-limit=512M`; il job frontend esegue `pnpm test`, lint, typecheck e
build.

L'unica action e' `actions/checkout` fissata al commit
`3d3c42e5aac5ba805825da76410c181273ba90b1`, annotato come `v7.0.1` nel
workflow. Il permesso globale e' limitato a `contents: read`; nessun secret o
dato applicativo viene richiesto.

## Lockfile e controlli

L'entrypoint backend esegue `composer install`; quello frontend esegue `pnpm
install --frozen-lockfile`. In entrambi i casi una discrepanza dal lockfile fa
fallire il job invece di modificare le dipendenze durante la CI.

I controlli restano gli stessi comandi gia' usati nel progetto:

- backend: `composer test`, `./vendor/bin/pint --test` e
  `./vendor/bin/phpstan analyse --memory-limit=512M`;
- frontend: `pnpm test`, `pnpm lint`, `pnpm typecheck` e `pnpm build`.

Ogni controllo avra' il proprio step GitHub Actions. Un exit code diverso da
zero interrompe il job e individua il comando responsabile senza nascondere la
failure con fallback o comandi condizionali.

## Action e permessi

Un'action e' codice di terzi eseguito nel runner. Il checkout usera' un commit
SHA completo e immutabile, con la release indicata in commento. Un tag major e'
piu' breve, ma puo' essere spostato a un commit diverso senza una modifica del
repository.

Prima di creare o aggiornare il pin, si consulta il repository ufficiale senza
presupporre quale sia la release corrente:

```bash
git ls-remote --tags https://github.com/actions/checkout.git 'refs/tags/v*'
git ls-remote https://github.com/actions/checkout.git 'refs/tags/vX.Y.Z^{}'
```

Il primo comando mostra i tag disponibili; si sceglie l'ultima release stabile,
escludendo prerelease come `-rc` o `-beta`. Nel secondo comando `vX.Y.Z` va
sostituito con il tag scelto. Se restituisce uno SHA, quello e' il commit dietro
un tag annotato. Se non restituisce nulla, il tag e' lightweight e si usa lo
SHA associato a quel tag nel primo output, perche' coincide gia' con il commit.

Il workflow annota il pin con release, data e comando usato per ricavarlo. Cosi'
un aggiornamento futuro resta intenzionale e ripetibile, senza dedurre uno SHA
da una versione ormai superata.

Il workflow dichiarera' `permissions: contents: read`: e' sufficiente per
leggere il commit e non autorizza scritture, pubblicazioni o deploy. Il pin e'
un confine di riproducibilita', non sostituisce comunque la revisione del file
workflow e l'aggiornamento intenzionale degli SHA.

## Verifica e limiti

La sintassi YAML puo' essere controllata localmente; la prova effettiva richiede
un run GitHub, avviato manualmente o da un push. Nel run si controllano trigger,
SHA del commit, due job e output di ogni step. I controlli Compose possono essere
riprodotti localmente con:

```bash
COMPOSE_FILE=compose.yaml:compose.ci.yaml docker compose \
  --env-file compose.env.example run --rm --no-deps backend composer test
```

Sostituendo servizio e comando si ripetono gli altri step del workflow.

Questo workflow non avvia browser, domini `.test`, TLS, PostgreSQL, Redis,
Horizon, Reverb o Echo. Non dimostra quindi login o realtime: quel percorso e'
responsabilita' di M6-004. Non include neppure cache, matrix, badge, deploy o
segreti. La prima verifica locale di M6-003 ha completato i comandi con le
immagini gia' presenti, mentre una build da zero e un run GitHub restano
verifiche dipendenti da rete/runner.

Errore comune: trattare un build Docker riuscito come prova della chat. Il build
prova che l'immagine si costruisce; i comandi successivi provano rispettivamente
test, stile, analisi statica e build frontend. L'integrazione reale richiede
invece lo stack completo.

Esercizio: spiega perche' il test backend puo' usare `--no-deps`, mentre il job
realtime futuro non potra' farlo. Poi indica perche' uno SHA di action produce
un run piu' riproducibile di un tag major.
