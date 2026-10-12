# Correzione ascolto e UX Quest — 10 ottobre 2026

Il feedback dell’utente segnala microfono fermo dopo il primo scambio, controlli che seguono la testa e assenza di un segnale di ascolto affidabile. Il codice precedente trasformava la perdita di focus XR in un mute permanente e ignorava `response_cancel_not_active`, lasciando bloccata la coda. I controlli rapidi chiusi erano ancora riallineati alla testa a ogni frame.

Questa revisione conserva avatar, città ambientale cumulativa V4, Story Engine e backend. Corregge pausa XR, coda Realtime e timer; mantiene pannello e comandi rapidi nello spazio; presenta un indicatore accanto a NEO e nella pagina con testo, colore e livello del microfono. **Riprendi ascolto** riattiva il microfono e restituisce il turno nella connessione corrente; **Termina conversazione** rilascia le tracce.

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


## Seconda revisione — 11 ottobre 2026

Il nuovo feedback segnala una traccia apparentemente accesa senza voce ricevuta da NEO. La cattura del Quest fisico non è riproducibile qui: questa revisione copre blocchi verificabili del lifecycle e della coda, senza attribuire con certezza una sola causa al dispositivo.

- **Invio distinto dal permesso:** statistiche del sender WebRTC a 1 Hz, quando disponibili. `flowing` indica pacchetti in uscita, non parole comprese; `checking` non certifica il trasporto. Dopo 8 s senza progresso servono anche cattura ferma o energia locale presente. Il semplice silenzio con DTX non avvia il recupero; una traccia mutata dal dispositivo ha una soglia di 5 s.
- **Recupero nella stessa conversazione:** un tentativo automatico riacquisisce il microfono con `replaceTrack`, conservando peer, cronologia, nome e Story Engine. Se fallisce, mostra **Microfono da ripristinare** e non ripete richieste di permesso in ciclo. **Riprendi ascolto** riprova su gesto esplicito. Durante una risposta normale, **Interrompi NEO** restituisce il turno senza riacquisire una cattura sana. Mute e pausa XR hanno la precedenza; una traccia acquisita dopo lo stop viene rilasciata.
- **Sensibilità:** echo cancellation, noise suppression e ora auto gain. VAD 0,50, pre-roll 350 ms, silenzio 650 ms. Le risposte brevi “OK”, “sì” e “no” sono accettate: il filtro precedente scartava “OK”. L'interruzione richiede parole riconoscibili, non il solo VAD; i delta ASR possono anticiparla quando il servizio li invia. Eco e latenza reali restano da misurare.
- **Attese limitate:** 30 s senza progresso della risposta e senza audio misurabile fanno cancellare il turno e liberare la coda. Delta e riproduzione udibile rinnovano il termine. VAD mai chiuso: pulizia dopo 60 s; attesa trascrizione: 10 s. Output completato ma mai udibile: ritorno pronto dopo 5 s, solo con riproduzione locale abilitata. Audio bloccato: **Riattiva audio**, senza fingere che NEO abbia sentito.
- **WebXR:** l'avvio immersivo non viene confuso con un tab abbandonato. La visibilità XR controlla la pausa; `pagehide` termina sempre la voce. Fuori da XR una pagina nascosta chiude il microfono. La ripresa del focus tenta di sbloccare AudioContext/playback senza scavalcare il mute manuale.

### Pannelli e scheda NEO

Pagina, selettori, posizionamento e diagnostica condividono bordi sottili, angoli morbidi e superfici traslucide. Anche i pannelli web evitano il backdrop blur per contenere il carico di compositing. In XR si usano texture canvas con alpha: 64% per il pannello e 58% per la scheda, senza blur o effetti XR. La scheda non scrive nel depth buffer: anche gli angoli trasparenti lasciano vedere la scena. Posa dei menu, dimensioni cliccabili, raggi e stick restano quelli già verificati. Nessun nuovo asset o segreto.

Anteprime in [validation/voice-glass-ui](validation/voice-glass-ui): desktop e iPhone sul runtime Sites locale; `xr-panels-simulated.png` usa i componenti reali in un harness Three.js con edifici di prova, senza sessione XR. Le immagini attestano l'ispezione visiva, non compositing, comfort o leggibilità sul visore.

### Verifiche

- Repository: lint, typecheck, build, scansione del bundle e **182 test** superati.
- Sites: typecheck, build e **173 test** superati.
- Suite browser completa: **30/30** superati dopo la correzione dei casi Android. La CI su `0322553` ha completato con successo entrambi i run (push e PR).
- Dialogo browser: **3/3 profili**, anche dopo la correzione di “OK”, con verifica che ogni turno generi una richiesta di risposta; tre scambi consecutivi, traccia sospesa e riacquisita, mute, scelte cumulative e stop con render loop fermato. Audio/WebRTC/OpenAI simulati.
- Tredici nuove regressioni coprono invio bloccato con traccia live, silenzio/DTX, recupero fallito, stop durante acquisizione, visibilità XR, eventi risposta persi, delta di interruzione e VAD non chiuso. Una trascrizione tardiva precedente a un reset esplicito non genera una risposta inattesa.

Sul Quest: riprovare almeno cinque scambi, interruzione con parola, rumore, menu di sistema, cambi scenario e ritorno MR. Se NEO non sente, controllare la barra locale e **Invio microfono** nella diagnostica; usare **Riprendi ascolto** e annotare se compare **Microfono da ripristinare**. Permessi hardware, voce, eco, latenza e 72 FPS restano da verificare fisicamente.
