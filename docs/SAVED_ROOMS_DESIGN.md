# Stanze salvate · progetto per una revisione futura

**Stato: progetto, non funzionalità implementata.** Richiesta del 18 ottobre 2026: ricordare una stanza dopo una prima acquisizione con camera e LiDAR, riconoscere i cambiamenti e aggiornare soltanto le parti interessate. Questa revisione non attiva salvataggi, analisi periodiche o nuove acquisizioni: la priorità immediata resta correggere blocchi della camera, carico del thread principale e animazione nell’app su iPhone 14 Pro.

## Principio

Separare tre cose: **dove siamo** (tracking e rilocalizzazione ARKit), **quale geometria abbiamo misurato** (superfici/profondità), **che cosa pensiamo di vedere** (riconoscimento visivo). Una descrizione dell’AI non è una misura e non può diventare direttamente un collider, un punto di appoggio o una traiettoria.

Il fulcro sarà una memoria locale versionata della stanza. A regime si riutilizzano le strutture già misurate, si verifica lo spazio utile all’interazione e si ricalcolano soltanto celle e oggetti modificati. Non si ricostruisce una scena RealityKit completa a ogni aggiornamento ARKit.

## Cosa permettono le API Apple

| Componente | Uso previsto | Limite da mantenere esplicito |
| --- | --- | --- |
| `ARWorldMap` | Salvare lo stato utile alla rilocalizzazione e gli anchor applicativi, tramite archivio sicuro | Non sostituisce il nostro database di superfici, oggetti, versioni e asset renderizzati. |
| `initialWorldMap` | Riprendere la stessa stanza e lo stesso riferimento spaziale | Il caricamento è un tentativo: attendere rilocalizzazione riuscita; una stanza molto cambiata può non essere riconosciuta. |
| RoomPlan / `CapturedRoom` | Prima scansione opzionale di pareti, aperture e arredi supportati, conservando dati parametrici | Non è comprensione universale degli oggetti né una scansione dettagliata di ogni superficie. |
| `ARMeshAnchor` e relativi callback | Ricevere aggiunte, revisioni e rimozioni di porzioni della ricostruzione | Gli aggiornamenti non sono una rappresentazione garantita in tempo reale di persone o oggetti mobili. |

Riferimenti: [ARWorldMap](https://developer.apple.com/documentation/arkit/arworldmap), [initialWorldMap](https://developer.apple.com/documentation/arkit/arworldtrackingconfiguration/initialworldmap), [RoomPlan](https://developer.apple.com/documentation/roomplan), [ARMeshAnchor](https://developer.apple.com/documentation/arkit/armeshanchor).

**“Rimappare solo ciò che cambia” si applica ai dati dell’app.** Le API pubbliche iOS consultate configurano `sceneReconstruction` e `frameSemantics` per la sessione; non espongono un comando per puntare il LiDAR su un singolo oggetto o richiedere la ricostruzione di una ROI. Potremo attivare una finestra di acquisizione, guidare l’inquadratura e filtrare gli aggiornamenti ricevuti nel nostro modello. Non potremo garantire che il sensore misuri soltanto quella zona. Togliere `.sceneDepth` elimina quel flusso opzionale verso l’app: non equivale a controllare direttamente l’accensione hardware del LiDAR, che ARKit gestisce internamente. Riferimenti: [sceneReconstruction](https://developer.apple.com/documentation/arkit/arworldtrackingconfiguration/scenereconstruction), [FrameSemantics](https://developer.apple.com/documentation/arkit/arconfiguration/framesemantics-swift.struct), [sceneDepth](https://developer.apple.com/documentation/arkit/arframe/scenedepth).

Una fotografia iniziale sarà un riferimento visivo, non la mappa dell’intera stanza. La prima acquisizione geometrica richiede più osservazioni da angolazioni diverse, con tracking stabile e guida vocale. La camera e il tracking restano necessari durante l’AR anche quando la stanza è salvata.

## Flusso proposto

### 1. Prima visita

1. L’utente avvia camera/microfono e sceglie esplicitamente **salva questa stanza** nei controlli o a voce. Il consenso alla camera non autorizza da solo la persistenza.
2. `RoomAcquisitionCoordinator` apre una fase di scansione distinta dall’esperienza ordinaria. Feature detection per RoomPlan, profondità e ricostruzione; fallback a piani misurati. Una sola `ARSession`, senza avviare due pipeline camera concorrenti.
3. Con RoomPlan disponibile, una scansione iniziale produce la struttura parametrica. In alternativa, si aggregano piani e profondità in un modello essenziale. Conservare zone non viste come **ignote**, mai come spazio libero.
4. Su comando vengono acquisiti pochi keyframe di riferimento, ciascuno con posa, intrinseci e geometria sincronizzati. La foto può essere inviata al backend per descrivere oggetti solo su richiesta autorizzata.
5. Si salva atomicamente una revisione coerente: mappa di rilocalizzazione, geometria semplificata, oggetti misurati e riferimenti visivi. Il salvataggio incompleto non sostituisce l’ultima revisione valida.

RoomPlan da iOS 17 può condividere una `ARSession` e terminarne la scansione mantenendo attivo il tracking. La scansione sarà comunque una modalità esplicita con budget proprio, senza sommare RoomPlan, mesh dettagliata, segmentazione e rendering completo. Riferimento: [Explore enhancements to RoomPlan, WWDC23](https://developer.apple.com/videos/play/wwdc2023/10192/).

### 2. Ritorno nella stanza

L’utente seleziona la stanza salvata; in seguito si potrà suggerire una corrispondenza locale, senza affidare all’LLM la scelta del riferimento geometrico. Si carica `initialWorldMap`, si attende tracking normale dopo la rilocalizzazione e si verifica il riferimento applicativo. Finché l’allineamento non è valido, avatar e interazioni non usano le vecchie coordinate.

La rilocalizzazione può fallire per illuminazione, arredi o luogo diverso. Dopo un timeout di prodotto da tarare sul dispositivo, offrire a voce e nei controlli richiamabili **riprova**, **nuova stanza** o **continua senza memoria**. Mai applicare silenziosamente una trasformazione arbitraria per far coincidere due stanze. Riferimento: [Managing Session Life Cycle and Tracking Quality](https://developer.apple.com/documentation/arkit/managing-session-life-cycle-and-tracking-quality).

### 3. Verifica dei cambiamenti

La prima versione effettuerà il controllo su richiesta («controlla se è cambiato qualcosa»), non a ogni frame. Un’eventuale modalità assistita richiederà un consenso separato e un intervallo adattivo.

Prima si confrontano indizi locali economici, con pose comparabili: copertura, profondità disponibile e differenze visive compensate per il punto di vista. Variazioni di luce, persone e occlusioni producono **incertezza**, non la cancellazione di un oggetto. Non confrontare direttamente pixel di foto scattate da posizioni diverse.

Solo una foto selezionata viene inviata all’AI, che restituisce proposte validate, per esempio `possibly_moved`, `possibly_added`, `possibly_removed`, con box 2D ed evidenze. I nomi e le dimensioni proposte non modificano da soli la geometria. Riconoscere «pianoforte» non determina né altezza della seduta né posizione dei singoli tasti.

### 4. Validazione e aggiornamento incrementale

`ChangeValidator` controlla schema, stanza, revisione, timestamp, pose e copertura della risposta. Se l’utente ha cambiato stanza o la richiesta è superata, il risultato viene scartato.

Le proposte interessanti invalidano provvisoriamente la zona coinvolta. Una breve acquisizione di profondità o mesh, quando supportata, fornisce misure correnti; i suoi dati vengono associati al medesimo riferimento spaziale. Richiedere conferme geometriche da più osservazioni per rimozioni o spostamenti. Un oggetto non visibile non è necessariamente rimosso.

Si aggiornano soltanto le celle spaziali e i proxy di collisione interessati. Gli anchor mesh sono indizi di sessione, non identità permanenti degli oggetti: il database assegna propri ID e associa le misure con posizione, sovrapposizione, categoria e incertezza. Rigenerare un collider soltanto quando la geometria supera una soglia di cambiamento misurabile, con lavoro serializzato e limitato. La mesh non permette di seguire con sicurezza una persona in movimento: prima del passo dell’avatar occorre una verifica locale recente.

## Dati e riferimenti spaziali

Proposta di modello, indipendente dalle entity RealityKit:

| Record | Campi essenziali |
| --- | --- |
| `RoomRecord` | UUID locale, nome facoltativo, `schemaVersion`, `mapEpoch`, `revision`, dispositivo/iOS, stato del consenso, date e qualità acquisizione |
| `RoomCoordinateFrame` | Anchor applicativo persistente, `roomFromSession`, unità metriche, convenzione assi, revisione dell’allineamento |
| `SurfaceCell` | ID applicativo, bounds nel riferimento stanza, geometria semplificata, fonte, confidenza, `lastMeasuredAt`, copertura, stato `valid/stale/unknown` |
| `RoomObject` | ID applicativo, categoria ipotizzata, proxy misurato separato, incertezza, evidenze, ultima conferma geometrica |
| `VisualKeyframe` | JPEG ridotto facoltativo, timestamp monotono e data, posa, intrinseci, risoluzione, orientamento, revisione stanza; nessun `ARFrame` persistente |
| `ChangeProposal` | ID richiesta, stanza/epoch/revisione di partenza, keyframe, box, tipo di ipotesi, scadenza e stato di validazione |

La stanza ha un’origine stabile nel database; ogni sessione mantiene una trasformazione esplicita verso quell’origine. Un reset del tracking crea un nuovo epoch se non si riesce a ripristinare l’allineamento. Le vecchie calibrazioni precise, come i punti del pianoforte, scadono se l’oggetto cambia, il riferimento viene perso o l’errore misurato supera il budget: non bastano nome o categoria uguali.

Usare timestamp monotoni per richieste nella sessione e date persistenti per la cronologia. Non dedurre freschezza da UUID ARKit né confrontare timestamp monotoni fra riavvii. Un risultato vecchio non può riportare valida una zona invalidata da misure più recenti.

## Pipeline senza bloccare camera e voce

Il delegate ARKit estrae solo valori piccoli. Per una richiesta visiva copia posa, intrinseci, orientamento e i campioni di profondità necessari in uno **snapshot di proprietà dell’app**; produce un JPEG ridotto in una coda seriale e rilascia subito i buffer ARKit. L’operazione asincrona di rete riceve `Data` e valori, mai `ARFrame`, `ARDepthData`, `CVPixelBuffer` o anchor contenenti buffer da trattenere fino alla risposta.

Un solo lavoro visivo in corso; niente coda illimitata e niente task per frame. Rilascio garantito su errore, timeout, cambio stanza, background e annullamento. Se la profondità non è stata copiata per un punto, misurarlo di nuovo e dichiarare l’incertezza; non mescolare coordinate di un vecchio JPEG con la posa di un frame corrente.

Apple documenta che trattenere troppi buffer può esaurire il pool della camera fino a fermare l’acquisizione. Il progetto di memoria deve prevenire questa classe di blocco prima di aggiungere riconoscimento periodico. Riferimenti: [Recognizing and Labeling Arbitrary Objects](https://developer.apple.com/documentation/arkit/recognizing-and-labeling-arbitrary-objects), [Discover ARKit 6, WWDC22](https://developer.apple.com/videos/play/wwdc2022/10126/).

Budget iniziali **da misurare su iPhone 14 Pro**, non risultati ottenuti:

- Esperienza ordinaria: tracking e un avatar; nessuna mesh o RoomPlan continui come effetto implicito della memoria stanza.
- Nessuna serializzazione, ricerca semantica, creazione di mesh/collider o conversione JPEG nel callback di rendering. Mutazioni RealityKit minime e raggruppate sul main actor.
- Un JPEG al massimo di 960 px sul lato lungo e 550 KB; una richiesta visiva alla volta. Archivio limitato inizialmente a cinque stanze e otto keyframe ciascuna, con quota disco e possibilità di cancellazione.
- Controllo assistito futuro: intervallo minimo iniziale di 15 secondi, salto dei controlli sotto carico o con tracking limitato; nessun recupero arretrato dei frame saltati.
- Acquisizione geometrica dettagliata soltanto in finestre esplicite con scadenza, interrotte se peggiorano termica, tracking o voce. Frequenze e durata vanno tarate con tracce reali.
- Misurare separatamente intervallo dei frame camera, aggiornamenti scena, tempo CPU del rig, memoria residente, lavoro di ricostruzione, latenza audio e stato termico. Gli FPS scena da soli non identificano il collo di bottiglia.

## Privacy e ciclo di vita

Salvataggio **locale ed esplicito**, distinto da uso camera e invio foto al modello. Prima di attivarlo aggiornare informativa e controlli: che cosa viene conservato, quali foto possono essere trasmesse, come cancellare una stanza e tutte le stanze. Nessun audio o dialogo completo nel record stanza.

Usare Application Support con protezione file iOS, scritture atomiche e migrazioni versionate. Escludere inizialmente mappe, keyframe e descrizioni dai backup/cloud; non registrare immagini o contenuti delle stanze nei log o nella control room di Robot Buddy. L’archivio locale non viene inviato al backend: una richiesta visiva contiene solo le evidenze strettamente necessarie. Verificare e documentare separatamente la politica del provider per le immagini inviate; l’assenza di persistenza nel nostro backend non dimostra assenza di retention presso il provider.

Camera e microfono si sospendono in background come oggi; ripresa esplicita. La stanza può restare su disco dopo il consenso, ma la sua geometria torna **da verificare** per le interazioni. Nessuna locomozione su dati obsoleti o ignoti; la memoria aiuta l’avatar e non garantisce la sicurezza degli spostamenti reali dell’utente.

## Sequenza di implementazione e verifica futura

1. Stabilizzare camera, voce e rig senza memoria stanza; acquisire tracce sul 14 Pro. La memoria non deve mascherare una perdita di buffer o una saturazione del main actor.
2. Introdurre `RoomStore` locale e salvataggio/ripresa `ARWorldMap`, con cancellazione e fallback senza memoria. Testare archivi corrotti, migrazioni e rilocalizzazione fallita.
3. Salvare il modello geometrico essenziale; usare RoomPlan soltanto nella prima scansione opzionale. Verificare l’allineamento dopo riavvio/interruzione su dispositivo reale.
4. Introdurre proposte visive su richiesta e validazione geometrica; aggiornare cache e collider per celle. Testare risposte tardive, cambi di epoch, oggetti occlusi, luce diversa, sedia spostata e persona di passaggio.
5. Solo dopo misure favorevoli, abilitare il controllo assistito opzionale. Confrontare una visita di almeno dieci minuti con memoria disattivata/attivata: nessuna regressione evidente di camera, voce, memoria o termica.

Le prove di rilocalizzazione, qualità LiDAR, tempi della scansione, consumo e fluidità richiedono un iPhone fisico. Questo documento non dichiara risolti quei requisiti e non aggiunge nuove feature attive all’app.
