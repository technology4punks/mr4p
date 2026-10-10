# Correzione ascolto e UX Quest — 10 ottobre 2026

Il feedback dell’utente segnala microfono fermo dopo il primo scambio, controlli che seguono la testa e assenza di un segnale di ascolto affidabile. Il codice precedente trasformava la perdita di focus XR in un mute permanente e ignorava `response_cancel_not_active`, lasciando bloccata la coda. I controlli rapidi chiusi erano ancora riallineati alla testa a ogni frame.

Questa revisione conserva avatar, sei scenari, Story Engine e backend. Corregge pausa XR, coda Realtime e timer; mantiene pannello e comandi rapidi nello spazio; presenta un indicatore accanto a NEO e nella pagina con testo, colore e livello del microfono. **Riprendi ascolto** riattiva il microfono e restituisce il turno nella connessione corrente; **Termina conversazione** rilascia le tracce.

I dettagli e i limiti del recupero sono in [QUEST_INTERACTION.md](QUEST_INTERACTION.md). Il segreto backend e l’accesso pubblico non vengono modificati. Non vengono aggiunti asset esterni: l’indicatore usa tre piani, una texture canvas aggiornata al cambio di testo e una barra mesh, senza post-processing.

## Verifiche pertinenti

- Unit test: tre turni, pausa/ripresa XR con mute manuale, cancellazione senza risposta attiva e senza conferma, eventi tardivi correlati all’ID, creazione rifiutata senza perdere il turno, trascrizione mancante, riapertura del mic protetto dopo silenzio, stop dei timer e del peer.
- Test di scena/UI: posa del menu chiuso e aperto invariata quando cambia la testa, richiamo esplicito, raggi/controller/pinch e stato presso l’avatar che non segue la camera.
- Browser: tre turni, ascolto/risposta, mute, recupero e stop con audio/WebRTC simulati, anche con `requestAnimationFrame` fermato. La simulazione è esplicita in tutti i profili, perché WebKit headless non offre un servizio audio hardware. Rendering, DOM e controlli sono reali; acquisizione e OpenAI non sono certificati da questa prova.

## Da riprovare sul Quest Pro fisico

1. Aprire il link pubblico e avviare la voce. Dopo almeno cinque scambi deve tornare **Puoi parlare** senza un nuovo avvio.
2. Aprire/chiudere il menu e girare la testa: pannello e pulsanti rapidi devono restare nella stanza. A/X o presa richiama il menu davanti all’utente; mani e grilletto devono selezionare correttamente.
3. Durante la risposta provare una parola reale, un rumore e **Interrompi NEO**. Lo stato e il microfono devono essere coerenti; valutare la latenza del filtro.
4. Aprire un pannello del browser/sistema e tornare: la pausa XR deve sparire. Ripetere con mute manuale: deve restare spento.
5. Provare modalità protetta, trasformazione del futuro, ritorno MR e possibile cambio sessione VR. Usare **Riprendi ascolto** se il servizio non completa un turno e annotare lo stato mostrato.

Nessuna nuova prova fisica del Quest, di telefoni o di audio OpenAI live è stata eseguita dall’ambiente di sviluppo. La precedente prova dell’utente descrive i difetti e non certifica questa correzione.
