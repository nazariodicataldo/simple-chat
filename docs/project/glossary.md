# Glossario

- **Broadcasting:** Laravel definisce evento, canale e payload da trasmettere.
- **Reverb:** server WebSocket che mantiene connessioni e trasporta eventi ai client.
- **Echo:** client JavaScript che si connette, si iscrive a canali e ascolta eventi.
- **Job:** lavoro discreto da eseguire.
- **Queue:** coda dei job in attesa.
- **Worker:** processo persistente che preleva ed esegue job.
- **Horizon:** dashboard e gestore Laravel per worker e queue; da introdurre dopo `queue:work`.
- **Private channel:** canale WebSocket con autorizzazione server-side.
- **Cursor pagination:** paginazione basata su cursore, adatta a caricare messaggi precedenti.
- **ADR:** Architecture Decision Record; registra una scelta significativa e le sue conseguenze.

