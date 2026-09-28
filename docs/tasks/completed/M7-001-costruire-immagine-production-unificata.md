# M7-001 — Costruire l'immagine production unificata

- **Stato:** completato
- **Milestone:** Milestone 7 — Deployment
- **Data di apertura:** 2026-09-22
- **Data di chiusura:** 2026-09-26
- **Dipendenze:** M6-007

## Contesto

Il Compose locale esegue frontend, PHP-FPM, Reverb, Horizon e Nginx in servizi
separati con bind mount e dipendenze installate all'avvio. Render Free non offre
un background worker gratuito e assegna un solo ingresso HTTP a ciascun web
service. Per mantenere il costo a zero senza eliminare queue e realtime, il
deployment usera' un solo container production multi-processo. Il profilo
locale e la CI devono restare invariati.

## Obiettivo

Creare un'immagine Docker production multi-stage che costruisca backend e
frontend dal lockfile e avvii, dietro un solo Nginx, Next.js, PHP-FPM, Horizon
e Reverb. L'entrypoint deve eseguire le migration prima dei processi persistenti
e il container deve essere verificabile localmente senza servizi cloud.

## Fuori scope

- Creazione di account o risorse Neon, Upstash e Render.
- `render.yaml`, secret di produzione e deploy remoto.
- Modifiche al Compose locale o all'override CI per adottare l'immagine
  production.
- Aggiornamenti di dipendenze, refactor applicativi o modifica delle API.
- Autoscaling, alta disponibilita' e orchestrazione multi-container production.

## File modificabili

- Nuovi file strettamente necessari sotto `docker/production/`.
- `backend/config/horizon.php`, limitatamente al supervisor `production`
  necessario ad avviare realmente il processo nel nuovo runtime.
- Configurazione Next e service HTTP server-side, con i test piu' vicini,
  soltanto per distinguere URL pubblico browser e URL interno al container.
- Configurazione Laravel minima per fidarsi del solo proxy Nginx in loopback
  quando riceve gli header HTTPS inoltrati dalla piattaforma.
- `.dockerignore` pertinenti al nuovo build context.
- `docs/learning/deployment-render.md`, creato con i concetti verificati in
  questo task.
- Questo task e `docs/project/current-state.md` quando verra' attivato o
  completato.

## File non modificabili

- `compose.yaml`, `compose.ci.yaml` e `.github/workflows/ci.yml`.
- Dockerfile ed entrypoint locali sotto `docker/backend/` e `docker/frontend/`.
- Codice di dominio, API, schema dati, test applicativi e lockfile, salvo un
  bisogno tecnico dimostrato e autorizzato separatamente.
- Configurazione o stato di servizi cloud.

## Requisiti

- Il build usa PHP 8.5, Node 24.19.0, pnpm 11.20.0 e i lockfile esistenti.
- Composer installa le dipendenze production senza script o download
  post-avvio non necessari; pnpm usa il lockfile congelato e `next build`.
- L'immagine finale contiene soltanto runtime e artefatti necessari e non
  contiene `.env`, certificati locali, cache Git o credenziali.
- Nginx ascolta sulla variabile `PORT` fornita dal PaaS, con un default locale
  esplicito, riceve HTTP dalla terminazione TLS della piattaforma e inoltra sullo
  stesso host:
  - `/` a Next.js;
  - `/api`, `/sanctum`, `/broadcasting`, `/horizon` e `/up` a Laravel;
  - `/app` e `/apps` a Reverb mantenendo l'upgrade WebSocket.
- Next, PHP-FPM, Horizon e Reverb ascoltano soltanto sulle interfacce o porte
  interne necessarie; Nginx e' l'unico ingresso pubblico.
- Il browser usa percorsi relativi per API e ricava WSS dallo stesso host HTTPS
  pubblico: il dominio non viene fissato nel bundle durante `next build`. Il
  rendering server-side Next raggiunge Nginx su loopback tramite una variabile
  runtime solo-server, evitando un giro sulla rete pubblica; il profilo locale
  conserva gli URL espliciti gia' esistenti e nessun URL interno finisce in
  `NEXT_PUBLIC_*`.
- Laravel pubblica verso Reverb su loopback HTTP, mentre Echo usa lo stesso host
  pubblico su WSS: i due percorsi restano distinti come nel Compose locale.
- Laravel considera HTTPS l'origine ricevuta soltanto tramite Nginx in loopback;
  Nginx inoltra alla app il protocollo gia' attestato dalla piattaforma. Non
  vengono copiati certificati o chiavi TLS nell'immagine.
- `supervisord`, eseguito come PID 1, mantiene i cinque processi persistenti e
  inoltra segnali e output senza file di log persistenti. Per ogni processo usa
  `startsecs=10`, `startretries=5` e riavvio sui crash inattesi: un avvio che
  dura almeno 10 secondi apre un nuovo ciclo, mentre cinque fallimenti di avvio
  consecutivi portano il processo in `FATAL`. Un event listener minimale ferma
  l'intero container se uno dei cinque processi essenziali raggiunge `FATAL`.
- L'entrypoint crea le directory runtime, esegue
  `php artisan migrate --force` e avvia il supervisore soltanto dopo il successo
  delle migration. Tenta una sola migration senza attesa o retry nascosti:
  qualunque errore lascia il container non disponibile. Non esegue
  `composer install` o `pnpm install` al boot.
- Nginx, Laravel, Next, Horizon e Reverb scrivono su `stdout`/`stderr` senza
  stampare secret, cookie o body delle richieste.
- Supervisor e tutti i processi applicativi usano il solo utente non-root
  `app`; directory runtime e file temporanei Nginx devono essere predisposti
  per questo utente durante il build.
- Al `SIGTERM` del container, Supervisor ferma Nginx con `QUIT`, Next, PHP-FPM
  e Reverb entro 10 secondi e Horizon entro 65 secondi (timeout job di 60
  secondi piu' margine esplicito di 5 secondi); i gruppi di processi ricevono
  il segnale insieme e il kill forzato e' il fallback oltre il limite.
- Il profilo Horizon `production` conserva la politica gia' verificata in
  locale: un processo, bilanciamento `simple`, queue `default`, tre tentativi,
  backoff 5 secondi e timeout 60 secondi. M7-004 ne verifichera' poi la
  compatibilita' contro Upstash.
- Il nuovo percorso production non cambia il comportamento locale o CI.

## Strategia di test

Costruire l'immagine da un checkout con file ignorati non disponibili, quindi
ispezionarne history e filesystem per escludere secret e sorgenti locali
accidentali. Avviarla in una rete Docker isolata contro PostgreSQL e Redis
temporanei o contro dipendenze locali esplicitamente controllate. Verificare
ordine migration -> processi, routing HTTP, upgrade WebSocket, segnalazione di
un processo terminato, il riavvio dopo un crash, il passaggio `FATAL` e il
conseguente arresto del container, log standard e arresto pulito. Eseguire infine i
controlli backend/frontend proporzionati ai file eventualmente toccati.

## Comandi da eseguire

- `git status --short`
- Build esplicito del nuovo Dockerfile production.
- Ispezione di history e filesystem dell'immagine per input esclusi.
- Avvio isolato con variabili fittizie non versionate e dipendenze controllate.
- Richieste a `/`, `/up`, un endpoint `/api/*` e handshake `/app/*`.
- Arresto di un processo figlio e verifica del comportamento del supervisore.
- `SIGTERM` al container e verifica di segnali, limiti di arresto e assenza di
  processi residui.
- `composer test`, Pint e PHPStan se viene modificata configurazione backend.
- `corepack pnpm test`, lint, typecheck e build se viene modificata
  configurazione frontend.
- `docker compose --env-file compose.env config --quiet` per confermare che il
  profilo locale resta valido.
- `git diff --stat`
- `git diff --check`

## Criteri di accettazione

- [x] L'immagine production si costruisce dai lockfile senza dipendere da
      `.env`, bind mount o certificati locali.
- [x] Un solo ingresso Nginx instrada Next, Laravel e Reverb sullo stesso host.
- [x] Browser, SSR Next e broadcaster Laravel usano rispettivamente origine
      pubblica, loopback Nginx e loopback Reverb senza esporre host interni.
- [x] Migration riuscite precedono l'avvio dei processi; una migration fallita
      impedisce al container di diventare disponibile.
- [x] Next, PHP-FPM, Horizon e Reverb sono avviati e osservabili dal
      supervisore, con log su `stdout`/`stderr`.
- [x] Ogni processo essenziale supera `startsecs=10` oppure esaurisce i cinque
      `startretries`; il listener ferma il container quando riceve `FATAL`, senza
      duplicare la logica nativa di Supervisor.
- [x] Il container e i suoi processi eseguono come utente non-root `app` e
      l'arresto `SIGTERM` usa i limiti concordati, incluso Horizon a 65 secondi.
- [x] Horizon in `production` espone un solo worker con la politica M3/M4,
      verificato in questo task contro Redis controllato e non ancora Upstash.
- [x] `/up` prova Nginx -> PHP-FPM -> Laravel e non viene presentato come prova
      completa di frontend, queue o realtime.
- [x] Compose locale e CI conservano Dockerfile, entrypoint e comportamento
      precedenti.
- [x] La nuova guida learning descrive build/runtime, entrypoint, supervisore e
      compromesso del container unico con un piccolo esercizio.

## Rischi e assunzioni

Il piano Render Free assegna 512 MB condivisi. Il test locale deve raccogliere
un dato di memoria utile, ma solo il runtime remoto potra' dimostrare il limite
reale. Riunire cinque processi aumenta il blast radius: e' un compromesso
esplicito del costo zero, non un modello consigliato per scalare. Il supervisore
non deve trasformare crash continui in un servizio apparentemente sano. La
terminazione TLS, la finestra di stop e il retry effettivi del PaaS dipendono
dalla piattaforma: M7-001 dimostra il comportamento del container, non quello
remoto.

## Verifica manuale

1. Costruire l'immagine da repository pulito.
2. Avviare dipendenze isolate e poi il container production.
3. Osservare migration, processi e log nell'ordine previsto.
4. Visitare pagina, health e API sullo stesso host.
5. Aprire un handshake WebSocket e arrestare poi il container con SIGTERM.

## Decisioni emerse

- Il deployment gratuito usa un solo container per Next, Nginx, PHP-FPM,
  Horizon e Reverb.
- Il percorso production e' separato dai Dockerfile di sviluppo.
- Le migration appartengono all'entrypoint production, prima del supervisore.
- La liveness minima e la verifica E2E restano prove distinte.
- Il browser production usa percorsi relativi sul singolo host pubblico; SSR
  Next usa una variabile runtime solo-server verso Nginx in loopback, mentre il
  profilo locale conserva gli URL espliciti.
- TLS termina nella piattaforma. Laravel si fida solo di Nginx in loopback per
  gli header di protocollo inoltrati; l'immagine non contiene certificati.
- `supervisord` e' PID 1, usa `startsecs=10` e `startretries=5` per ogni
  processo e un listener che arresta il container su `FATAL`; non e' previsto
  un contatore custom dei retry.
- L'entrypoint tenta le migration una sola volta e fallisce subito; tutti i
  processi usano l'utente non-root `app`.
- L'arresto normale usa `QUIT` per Nginx, 10 secondi per Next/PHP-FPM/Reverb e
  65 secondi per Horizon: i 5 secondi oltre il timeout job sono un margine
  operativo esplicito.

## File modificati

- `.dockerignore`
- `backend/bootstrap/app.php`
- `backend/config/horizon.php`
- `docker/production/Dockerfile`
- `docker/production/entrypoint.sh`
- `docker/production/fatal-listener.sh`
- `docker/production/verify-image.sh`
- `docker/production/nginx.conf.template`
- `docker/production/php-fpm-pool.conf`
- `docker/production/supervisord.conf`
- `frontend/lib/backend.ts`
- `frontend/lib/echo.test.ts`
- `frontend/lib/echo.ts`
- `frontend/lib/server-http.test.ts`
- `frontend/lib/server-http.ts`
- `frontend/next.config.ts`
- `docs/learning/deployment-render.md`
- `docs/project/current-state.md`

## Risultati dei controlli

- La nuova asserzione build-time sulla route `api/register` ha riprodotto il
  RED con la classmap precedente (`AuthController does not exist`); dopo la
  rigenerazione post-copia Composer la build e' passata e l'immagine ha caricato
  provider, controller e modello applicativi.
- Il test Axios ora attraversa l'interceptor fino all'adapter della richiesta;
  una mutazione temporanea che rimuoveva l'interceptor ha fallito il test, poi
  il codice corretto e' stato ripristinato e il test e' passato.
- Il test Echo usa un'origine HTTPS esplicita e aspettative indipendenti da
  JSDOM; una mutazione temporanea che invertiva `forceTLS` ha fallito il test,
  poi il fallback corretto e' stato ripristinato.
- Build Docker production riuscito con PHP `8.5.11`, Node `24.19.0`, pnpm
  `11.20.0` e `next build`; dopo la copia dei sorgenti, `composer dump-autoload`
  rigenera la classmap autorevole e la build verifica la route applicativa
  `api/register`. L'immagine finale non contiene `.env`, `.cert`, Git, Composer,
  lockfile o sorgenti di test; conserva soltanto i manifest `package.json`
  necessari allo standalone Next.
- `sh docker/production/verify-image.sh simple-chat-production:fix-autoload` ha
  verificato gli artefatti runtime minimi e l'assenza di sorgenti, lockfile,
  `.env`, certificati e directory di sviluppo superflui.
- Smoke runtime isolato riuscito: `/up` `200`, `/` `200`, `/api/messages` `401`,
  handshake `/app/...` `101`; migration prima dei cinque processi, Horizon e
  Reverb attivi, memoria osservata circa `248 MiB`.
- Migration fallita verificata con container exit `1`; restart inatteso Nginx
  verificato dopo `SIGKILL`; cinque retry, `FATAL`, listener e `SIGTERM` a PID 1
  verificati con porta Nginx invalida; shutdown finale exit `0` e zero processi
  residui.
- `composer test`: 41 test e 213 assertion passati dopo l'allineamento locale di
  `SANCTUM_STATEFUL_DOMAINS` e `CORS_ALLOWED_ORIGINS` all'origine HTTPS usata
  dai test (`app.simple-chat.test:8443`).
- `corepack pnpm test`: 16 file e 90 test passati; i test aggiunti verificano la
  richiesta SSR attraverso l'interceptor Axios e il fallback HTTPS same-origin
  di Echo; lint, typecheck e build host
  passati. La build ha completato anche il download e l'inclusione del font
  Google usato dal frontend.
- Pint passato; PHPStan passato con `--memory-limit=512M`.
- `docker compose --env-file compose.env config --quiet`, syntax check shell e
  PHP, `nginx -t` e `git diff --check` passati.
- La verifica dei test auth richiede che l'origine configurata localmente
  coincida con quella usata dai test; questa sessione ha verificato il profilo
  HTTPS `app.simple-chat.test:8443`.

## Limiti della verifica

- Il dato di memoria e' locale (`248 MiB`) e non dimostra il limite o il ciclo di
  vita del provider Render.

## Riepilogo finale

M7-001 implementa e verifica localmente l'immagine production multi-processo.
Tutti i criteri di accettazione e i controlli obbligatori sono verdi; il task
puo' essere spostato in `completed`.
