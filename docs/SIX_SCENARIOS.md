# Sei futuri e dialogo breve

Ogni visita mantiene stanza, finestra, robot, prospettiva e connessione WebRTC. Scegli **Tema della visita** nella pagina o **Tema** nel menu Quest: Ambiente → Economia → Società. **Visita il 2050** apre il futuro critico; **Mostra il futuro sostenibile** cambia la città per otto secondi. Per cambiare tema torna al presente; niente locomozione artificiale.

| Tema | Critico | Sostenibile |
|---|---|---|
| Ambiente | Smog, industria fumante, alberi spogli, macerie, traffico e acqua scarsa | Alberi, giardini, acqua raccolta, elettriche e ricarica, tram, solare ed eolico |
| Economia | Officina e negozi sbarrati, carico fermo, scarti sparsi | Stessi edifici riusati, ingressi riaperti, banchi di riparazione, risorse ordinate, produzione locale e solare condiviso |
| Società | Cancelli dividono i servizi, gradini, piazza e attese vuote | Accessi aperti, rampe e percorsi tattili, biblioteca e salute di quartiere, panchine e tavoli condivisi |

`scenarios.ts` contiene messaggi, oggetti narrativi, nebbia e temi; Story Engine valida consenso, ordine e disponibilità. `EnvironmentalDistrict` è preservato. `CivicDistrict` realizza economia/società senza importare il motore vocale. Solo il quartiere selezionato viene renderizzato. Le geometrie restano durante la trasformazione: cambiano materiali, luce, cielo, nebbia, vegetazione e visibilità; gli edifici GLB sostituiscono progressivamente i fallback. Si mantengono tre fasce di profondità, PBR Poly Haven, asset locali CC0 e qualità adattiva. Il profilo low nasconde dettagli decorativi senza perdere gli elementi essenziali, inclusi accessi e materiali di riuso.

NEO si presenta e chiede il nome al primo incontro. Il prompt mira a una o due frasi, 15–35 parole, una sola domanda, nessuna descrizione lunga automatica. `remember_name` valida il nome dichiarato; `forget_name` lo cancella. Memoria nella pagina, conservata tra MR/osservatorio e riavvii della voce, cancellata alla ricarica/chiusura: nessun database o salvataggio locale del nome. Le istruzioni di sistema conservano lo stato autorevole e le scene sono ipotesi narrative.

Le **interruzioni intelligenti** mantengono il microfono aperto, ma VAD da solo non ferma NEO. La trascrizione deve contenere una parola riconoscibile, con almeno 450 ms fra timestamp VAD in caso di sovrapposizione (incluso il pre-roll 350 ms). “Eh”, soli simboli e indicazioni di rumore vengono scartati. Dopo una breve pausa di 700 ms, il parlato validato cancella la vecchia generazione e l’audio remoto, preserva l’input e richiede una sola risposta. Mute, risposta già generata ma ancora in playback, completamenti duplicati, trascrizione fallita e cleanup sono coperti dai test. La modalità protetta e il pulsante d’interruzione restano disponibili. ASR può sbagliare o scambiare eco per parlato: la taratura sul Quest resta necessaria.

API verificate sulla documentazione ufficiale: [VAD senza risposta automatica](https://developers.openai.com/api/docs/guides/realtime-conversations), [eventi e cancellazione audio WebRTC](https://developers.openai.com/api/reference/resources/realtime/client-events). Nessuna nuova chiave: si riusa il segreto già presente solo nel backend.

I risultati della build e dei browser sono registrati in VALIDATION.md. Questi test non certificano passthrough, mani/controller reali, room scale, comfort, voce o 72 FPS su Quest Pro.

Gli arredi vengono normalizzati separatamente sugli assi: panchina larga 1,6 m e alta 0,94 m; fabbrica alta 4 m, sotto la pensilina solare. Un test di caricamento controlla quota del pavimento e dimensioni, anche con modelli sorgente decentrati.
