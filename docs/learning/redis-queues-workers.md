# Redis, queue e worker

Da usare nella Milestone 3, dopo il real-time diretto. Redis sara' backend della queue: un job e' lavoro da eseguire, la queue lo conserva in attesa, il worker lo preleva. Solo allora il broadcasting passera' a `ShouldBroadcast`; retry, failed jobs e `after_commit` saranno introdotti con un problema e test dedicati. Horizon e' rinviato alla Milestone 4.

Prima dell'implementazione, verificare versioni e documentazione ufficiale Laravel Queue e Redis.

