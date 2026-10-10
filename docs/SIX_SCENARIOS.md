# Sei futuri e dialogo breve

Ogni visita mantiene stanza, finestra, robot, prospettiva e connessione WebRTC. Scegli **Tema della visita** nella pagina o il pulsante **Ambiente → / Economia → / Società →** nel dock/menu Quest. Il tema cambia anche dentro l’osservatorio e durante ingresso o trasformazione: mantiene futuro corrente, posizione del robot, nome e connessione vocale. **Visita il 2050** apre il futuro critico; i pulsanti **Mostra il futuro sostenibile / critico** confrontano i due stati in entrambe le direzioni, con otto secondi di trasformazione. Niente locomozione artificiale.

| Tema | Critico | Sostenibile |
|---|---|---|
| Ambiente | Smog, industria fumante, alberi spogli, macerie, traffico e acqua scarsa | Alberi, giardini, acqua raccolta, elettriche e ricarica, tram, solare ed eolico |
| Economia | Officina e negozi sbarrati, carico fermo, scarti sparsi | Stessi edifici riusati, ingressi riaperti, banchi di riparazione, risorse ordinate, produzione locale e solare condiviso |
| Società | Cancelli dividono i servizi, gradini, piazza e attese vuote | Accessi aperti, rampe e percorsi tattili, biblioteca e salute di quartiere, panchine e tavoli condivisi |

`scenarios.ts` contiene messaggi, oggetti narrativi, nebbia e temi; Story Engine valida consenso, ordine e disponibilità. `EnvironmentalDistrict` mantiene industria, mobilità e verde e aggiunge residenti e ciclisti. `CivicDistrict` realizza economia/società senza importare il motore vocale. Solo il quartiere selezionato viene renderizzato. Le geometrie restano durante la trasformazione: cambiano materiali, luce, cielo, nebbia, vegetazione e visibilità; gli edifici GLB sostituiscono progressivamente i fallback. Si mantengono tre fasce di profondità, PBR Poly Haven, asset locali CC0 e qualità adattiva. Il profilo low riduce da dodici a sei persone e nasconde dettagli decorativi, mantenendo movimento, accessi e materiali di riuso. `UrbanLife` anima persone articolate procedurali, navetta/consegne e componenti riutilizzati a 30 Hz. Aggiorna solo il quartiere visibile, riusa mesh istanziate, non crea geometrie ad ogni frame e mantiene bounds conservativi per il culling. Le insegne critiche e positive sono distinte e sfumano con il futuro: nessuna officina attiva nel quartiere abbandonato.

NEO si presenta e chiede il nome al primo incontro. Il prompt mira a una o due frasi, 10–25 parole, una domanda solo quando utile, nessuna descrizione lunga automatica. `remember_name` valida il nome dichiarato; `forget_name` lo cancella. Memoria nella pagina, conservata tra MR/osservatorio e riavvii della voce, cancellata alla ricarica/chiusura: nessun database o salvataggio locale del nome. Le istruzioni di sistema conservano lo stato autorevole e le scene sono ipotesi narrative.

Le **interruzioni intelligenti** mantengono il microfono aperto, ma VAD da solo non ferma NEO. La trascrizione deve contenere una parola riconoscibile, con almeno 450 ms fra timestamp VAD in caso di sovrapposizione (incluso il pre-roll 350 ms). “Eh”, soli simboli e indicazioni di rumore vengono scartati. Dopo una breve pausa di 700 ms, il parlato validato cancella la vecchia generazione e l’audio remoto, preserva l’input e richiede una sola risposta. Mute, risposta già generata ma ancora in playback, completamenti duplicati, trascrizione fallita e cleanup sono coperti dai test. La modalità protetta e il pulsante d’interruzione restano disponibili. ASR può sbagliare o scambiare eco per parlato: la taratura sul Quest resta necessaria.

API verificate sulla documentazione ufficiale: [VAD senza risposta automatica](https://developers.openai.com/api/docs/guides/realtime-conversations), [eventi e cancellazione audio WebRTC](https://developers.openai.com/api/reference/resources/realtime/client-events). Nessuna nuova chiave: si riusa il segreto già presente solo nel backend.

I risultati della build e dei browser sono registrati in VALIDATION.md. Questi test non certificano passthrough, mani/controller reali, room scale, comfort, voce o 72 FPS su Quest Pro.

Gli arredi vengono normalizzati separatamente sugli assi: panchina larga 1,6 m e alta 0,94 m; fabbrica alta 4 m, sotto la pensilina solare. Un test di caricamento controlla quota del pavimento e dimensioni, anche con modelli sorgente decentrati.

## Attività visibile fin dal primo frame

| Futuro | Movimento coerente |
|---|---|
| Ambiente critico | Due corsie di traffico lento con avanzamento reale, quattro residenti visibili, fumo industriale e cielo velato; tram e treno meno efficienti ma in movimento |
| Ambiente sostenibile | Otto auto elettriche, due tram articolati, treno di cinque carrozze, tre ciclisti, pedoni e rotori eolici; cielo più limpido, riuso degli stessi veicoli |
| Economia critica | Due persone davanti agli ingressi chiusi, furgone in attesa, segnale di infrastruttura degradata; produzione e banchi fermi |
| Economia sostenibile | Persone fra le officine, tre addetti con gesti di riparazione, attrezzi e casse riusate, consegne locali e componenti sul banco; tram e treno |
| Società critica | Persone isolate davanti al cancello, navetta che passa oltre il fronte inaccessibile, segnale di degrado |
| Società sostenibile | Percorsi verso i servizi, gruppi attorno ai tavoli, scambio libri, navetta, tram e treno, persona in carrozzina (dettaglio nascosto in low) |

Il cielo mantiene un movimento lento in tutti i temi. Le persone sono sagome procedurali leggere, non personaggi realistici animati da motion capture. Non viene simulata un’intera città né la fisica del traffico. Gli asset CC0 già verificati sono conservati; i nuovi elementi della città sono procedurali e non richiedono texture o dipendenze aggiuntive. Il candidato umanoide separato è documentato in [HUMANOID_CANDIDATE.md](HUMANOID_CANDIDATE.md), con licenza CC BY 3.0; non viene caricato dall’esperienza.

## Dettagli e visibilità della città

`CityTransit` rende due tram articolati (due moduli ciascuno), una fermata con pensilina/panchina e un treno regionale di cinque carrozze su viadotto. Binari, porte, vetri, fari e ruote sono geometrie 3D reali: sei batch istanziati complessivi, condivisi da tutti i temi, senza nuove texture. Il futuro critico conserva una mobilità degradata e lenta; quello positivo ha materiali più puliti e maggiore frequenza di passaggio. I due tram sono distanziati sullo stesso percorso, senza incontrarsi frontalmente. Il treno attraversa davanti agli edifici.

La prima fascia di edifici è arretrata a 22–34 m per lasciare spazio leggibile a persone e trasporti; resta davanti alle fasce intermedia/lontana. Gli alberi lasciano un varco centrale attraverso cui osservare la città. Auto, tram e treno cambiano prospettiva insieme alla testa, non sono video o piani fotografici. Gli estremi dei percorsi ciclici sono oltre il campo osservabile iniziale.

`UrbanLife` riusa quattro batch per corpi, teste, braccia e gambe, con colori istanziati per differenziare vestiti e carnagioni. I residenti del futuro critico rimangono pochi e separati; le scene positive aggiungono camminate e attività ferme con gesti delle braccia. `CycleTraffic` usa quattro batch per tre biciclette/rider sul percorso protetto: ruote, pedalata e avanzamento sono animati. Aggiornamento decorativo a 30 Hz, nessun movimento della camera e nessun motore fisico/AI per i cittadini.

Il traffico ambientale ha quindici auto nel futuro critico e otto elettriche nel positivo. Le auto permanenti occupano slot alternati e quelle critiche gli intervalli, con almeno 7 m fra centri della stessa corsia. La velocità varia senza ricollocare le auto durante la trasformazione; riprendendo una scena nascosta non recupera tutto il tempo trascorso con un salto.
