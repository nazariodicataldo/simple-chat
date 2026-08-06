# Broadcasting, Reverb ed Echo

Da usare nella Milestone 2. Laravel decide evento/canale/payload; Reverb trasporta l'evento sulle connessioni WebSocket; Echo si iscrive e ascolta nel browser. Il primo flusso usara' `ShouldBroadcastNow` per isolare il real-time dalla queue. Private channel e autorizzazione restano server-side.

Prima dell'implementazione, verificare le versioni installate e consultare la documentazione ufficiale Laravel Broadcasting, Reverb ed Echo compatibile con esse.

