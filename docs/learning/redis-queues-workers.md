# Redis, queue e worker

Da usare nella Milestone 3, dopo il real-time diretto. Redis sara' backend della queue: un job e' lavoro da eseguire, la queue lo conserva in attesa, il worker lo preleva. Solo allora il broadcasting passera' a `ShouldBroadcast`; retry, failed jobs e `after_commit` saranno introdotti con un problema e test dedicati. Horizon e' rinviato alla Milestone 4.

Prima dell'implementazione, verificare versioni e documentazione ufficiale Laravel Queue e Redis.

## `timeout` del worker e `retry_after` della queue

Sono due tempi diversi e non vanno confusi:

- `--timeout=60` e' il limite massimo di esecuzione di un singolo tentativo
  del worker. Se il job supera questo limite, il worker interrompe il
  tentativo.
- `retry_after=90` e' il tempo per cui Redis considera riservato un job gia'
  prelevato. Se il worker muore o non completa correttamente il job, Redis lo
  rende nuovamente disponibile dopo questo intervallo.

`retry_after` deve essere maggiore del timeout del worker. Con `60` e `90`, un
job interrotto dal timeout non viene reso nuovamente disponibile mentre il
primo worker potrebbe essere ancora in esecuzione; dopo la scadenza della
riserva potra' essere ritentato. Questo task configura il rapporto tra i due
valori, mentre i job reali, i retry osservabili e i failed jobs sono verificati
nei task successivi.
