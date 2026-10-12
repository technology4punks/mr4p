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
