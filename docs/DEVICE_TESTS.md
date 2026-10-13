# Visita guidata e menu nascosto · verifica da eseguire

Sul Quest fisico: saluto breve, nome opzionale, annuncio del futuro critico e ingresso senza secondo sì. Parlare durante l’introduzione: la nuova battuta deve attendere. Dopo una domanda NEO ascolta, il silenzio non seleziona interventi. Richiedere tram/alberi, interrompere con parole e controllare dieci turni con audio reale.

Con menu chiuso non devono comparire i tre vecchi pulsanti A/X: provare richiamo con controller/stick e mani/pinch, chiusura e ritorno durante una trasformazione. Il pannello di riposizionamento rimane necessario se si perde tracking. Controllare compositing e confini reali.

Fare tre scelte dopo due minuti o quattro prima: ritorno e frase conclusiva. Senza scelte verificare il limite di 210 secondi attivi, oltre alle brevi transizioni/chiusura. Pausa esplicita sospende il tempo. Con backend offline il ritorno continua. Senza consenso iniziale nessun dato deve comparire nella control room; con consenso osservare aggiornamenti anonimi, ricevuta e cancellazione. Accesso da PC con account operatore autorizzato; account diverso e visitatore anonimo non devono leggere dati.

Le sezioni precedenti sotto descrivono anche la modalità libera, ora opzionale. Nessun test fisico, misurazione di latenza Realtime, compositing o 72 FPS eseguito per questo aggiornamento.

---

## Bilanciamento del dialogo dopo la versione 20

Nel Quest reale, attendere il saluto: NEO deve chiedere il nome e poi restare in ascolto, senza entrare da solo nell’osservatorio. Rispondere con il nome: deve recepirlo e chiedere l’interesse, senza fare un’altra scelta al posto dell’utente. Parlare degli alberi o chiedere il tram: deve mostrare subito l’intervento senza conferma. Provare una breve pausa nella frase e un’interruzione con una parola riconoscibile mentre parla. Verificare che rumori o silenzio non facciano avanzare le scene e che la fine della trasformazione non avvii un nuovo monologo. La taratura VAD di 850 ms e la cancellazione dell’eco richiedono questa prova fisica.

---

# V4 · checklist hardware da completare

Nessuna prova fisica Quest Pro, Android o iPhone è stata eseguita dall’agente. Chromium/WebKit emulati verificano la pagina, non il dispositivo.

## Quest Pro

1. Aprire il Site pubblico senza login; Start richiede permessi, il microfono non si accende prima.
2. Verificare portale a circa due metri sul pavimento, robot a 1–1,5 m e posa stabile girando la testa.
3. Provare mani/pinch, raggi, stick, richiamo e chiusura menu. Il dock resta world-locked, discreto in alto a destra.
4. Almeno dieci scambi: parola/frase interrompe NEO, un rumore isolato no; ascolto ritorna senza reconnect. Provare mute, focus XR, recupero traccia e interruzione manuale.
5. Entrare nell’osservatorio: verificare occultamento completo del passthrough. Se fallisce, provare passaggio VR con gesto separato e ritorno AR; nessuna falsa conferma di compositing.
6. Spostarsi poco, restando nei confini reali: parallasse della finestra, avatar laterale, sguardo, collisioni virtuali. Nessuna locomozione continua.
7. Applicare quattro/cinque interventi, sentire descrizioni coerenti, revisionare una scelta e verificare rimozione degli effetti vecchi.
8. Monitorare FPS, draw call, comfort, qualità adattiva e memoria in visita lunga; target almeno 72 FPS dove supportato. Registrare refresh effettivo e temperature, non soltanto una media iniziale.
9. Tornare MR durante una trasformazione; provare riflessione, consenso sì/no, errore backend e cancellazione.
10. Fine visita e restart: avatar scompare, traccia/peer/XR chiusi, nome e scelte precedenti assenti.

## Mobile reale

Android: rilevamento AR, gesto/permessi, fallback se non supportato, rotate/zoom touch e voce dopo Start. iPhone: scene 3D e touch, layout senza overflow, autoplay/audio recovery, almeno cinque turni. Non presumere supporto immersive-ar su iPhone.

Annotare modello, browser, versione, timestamp, modalità XR/blend, scelte, FPS minimo/medio, draw call, problemi audio/compositing e pass/fail per ogni punto.

## Riordino urbano · verifica Quest aggiuntiva

Osservare una visita con alberi, ombreggiamento, bici, tram, cargo ed energia sul tetto; poi aggiungere gli altri interventi. Controllare che pedoni e veicoli restino separati, che il panorama centrale sia leggibile e che una revisione non sovrapponga strati. Spostarsi lateralmente entro i confini reali. Registrare FPS/draw call prima e dopo l’accumulo completo, qualità attiva e comfort; queste prove fisiche non sono ancora eseguite.
