# Overview

Group Chat e' un progetto personale full-stack per imparare progressivamente Laravel e Next.js attraverso una sola chat di gruppo real-time per utenti autenticati.

L'MVP consente registrazione, login/logout, cronologia paginata, invio, ricezione real-time, modifica ed eliminazione dei propri messaggi, autore e timestamp. Deve evitare duplicati tra risposta HTTP ed evento WebSocket.

Fuori dall'MVP: typing, presenza, allegati, read receipt, notifiche, moderazione avanzata, scaling orizzontale, cluster Redis, Kubernetes, osservabilita' estesa e continuous deployment automatico.

Il criterio guida e' introdurre una tecnologia soltanto quando risolve un problema osservato. Vedi [architettura](architecture.md), [roadmap](roadmap.md) e [glossario](glossary.md).

