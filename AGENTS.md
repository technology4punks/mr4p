# Istruzioni per Codex — Future Observatory V4

## Missione e specifica
`SPEC.md` contiene la specifica V4 integrale, che sostituisce il precedente percorso per temi e il confronto binario. Estendere il progetto esistente: React, TypeScript, Three.js/WebXR, RobotExpressive, Realtime/WebRTC e backend. Una sola città ambientale, trenta interventi predefiniti, quattro o cinque scelte e una revisione.

## Flusso aggiornato (richiesta utente 12 ottobre 2026)
L’esplorazione è libera: mostrare direttamente gli interventi pertinenti, senza conferma o leva preliminare. Nome e numero di risposte non bloccano la visita. Ricordare le richieste durante le transizioni. Le prime cinque decisioni conservano il registro originale; ulteriori visualizzazioni in memoria non vengono salvate. Il consenso separato riguarda solo la persistenza.

Una domanda per turno, poi ascolto: il saluto non avvia visite da solo. I commenti applicativi non sono risposte dell’utente e non possono usare tool narrativi. L’assenza di conferme non autorizza iniziativa senza interesse espresso. Preservare la provenienza dei turni e la priorità dell’utente durante ASR/animazioni.

## Vincoli
- Separare DecisionEngine puro, StoryEngine, CityTransformationEngine e conversazione. Il modello chiama solo tool validati; non esegue codice grafico.
- Ricostruire tutte le conseguenze dalle scelte attive. Conservare la sequenza originale e registrare una sola revisione. Duplicati identici non consumano slot.
- Niente punteggi morali, soluzioni assolute o previsioni quantitative; risorse interne visibili solo nel developer panel.
- Start esplicito prima del microfono. Conservare interruzioni ASR, recupero tracce, eventi correlati, mute manuale e continuità voce durante le transizioni.
- Portale e menu world-locked. Nessuna locomozione continua XR; rispettare i confini reali del visore. Feature detection e gesto separato per una nuova sessione VR.
- Chiave OpenAI solo nel backend. Persistenza anonima soltanto dopo consenso separato. Non salvare nome, email, audio o dialogo completo. Non dichiarare salvato prima della risposta backend.
- Conservare fallback Android/iPhone/desktop. Non introdurre Unity, Unreal o modellazione manuale. Asset gratuiti con licenze documentate, caricati localmente.
- Non dichiarare testati passthrough, mani, controller, audio hardware o 72 FPS senza prova sul Quest Pro fisico.

## Consegna e verifiche
Branch dedicata, nessuna sovrascrittura della branch precedente. Eseguire `npm run check` e `npm run test:e2e`; documentare misure software separatamente dai test hardware. Aggiornare README, catalogo, interdipendenze, API/persistenza, crediti e checklist dispositivo. Per Sites usare il progetto pubblico esistente e preservare i segreti runtime. Non richiedere conferme per decisioni tecniche ordinarie già autorizzate.
