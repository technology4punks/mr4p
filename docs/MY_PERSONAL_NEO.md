> **Stato corrente: revisione 5 · 0.1.2 / build 5** — guida iniziale prima dell’avatar, corpo vincolato all’asse verticale e clip originali con piedi coordinati. La voce mantiene il motore della R4. Le sezioni 1–4 sono cronologia; guida corrente in [ios/README.md](../ios/README.md). La qualità su iPhone fisico deve essere verificata.

# My Personal Neo · app nativa iPhone

Nuovo progetto sulla branch `codex/my-personal-neo`, affiancato all’esperienza web esistente. Il requisito aggiornato dell’utente sostituisce il prototipo AR web con un’app nativa: riconoscere lo spazio e gli oggetti, conversarci e agire su riferimenti misurati. Il pianoforte è un esempio di interazione, non l’architettura dell’intero sistema.

## Architettura

| Livello | Implementazione | Limite concreto |
|---|---|---|
| Spazio | ARKit world tracking, superfici orizzontali/verticali | Tracking può essere limitato o perso |
| Profondità | Piani e sceneDepth durante acquisizioni limitate; nessuna mesh/physics continua | LiDAR opzionale; cache temporanea, nessuna occlusione degli arredi in R4 |
| Significato | Responses API: foto JPEG 960 px, JSON schema con oggetti/categorie/box | Riconoscimento probabilistico, non misurazione dei contatti |
| Fusione | Snapshot numerico al momento della foto, portrait/raw, depth con confidence; intersezione su piani copiati | Centro stimato su misura disponibile, nessuna coordinata inventata |
| Intelligence | OpenAI Realtime, tool autorizzati su richieste reali | Nessun codice grafico o azione arbitraria dal modello |
| Conoscenza | Web search server-side, risultati e URL citati verificabili | Modello/manuale generico non equivale a manuale esatto |
| Avatar | Uomo/donna/cane Quaternius CC0, 62/46 joint, palette 64 px; pose locali e IK umano | Dita, seduta e contatti da verificare fisicamente |
| Interazioni | Puntamento, seduta calibrata, tastiera 88 tasti, demo judo di base | Nessun azionamento meccanico o animazione universale appresa |

La voce usa WebRTC nativo con echo cancellation, riconoscimento prima delle interruzioni, coda dei risultati asincroni e recupero timeout/ASR. Un aggiornamento di scena è contesto di sistema, non risposta dell’utente. I tool tardivi non avviano una risposta oltre un nuovo turno. Il background chiude voce/scansione e richiede ripresa esplicita. La revisione 2 tenta il recupero del canale voce dopo rete/route/interruzioni audio iOS senza perdere il contesto in RAM. Nessun timer didattico o teletrasporto della visita V4. Osservazione assistita opzionale e disattivata di default: un frame ogni 15 secondi con tracking stabile, evitando analisi sovrapposte e turni parlati; aggiorna solo il contesto, senza risposte o azioni autonome. Non è comprensione continua di ogni evento né video in tempo reale.

## Backend separato, hosting condiviso

`POST /api/personal-neo/token` crea un token effimero con prompt e tool personali: osservare, cercare istruzioni, indicare oggetti, calibrare seduta/pianoforte, dimostrare e fermarsi. Robot Buddy continua a usare `/api/realtime-token` con il proprio prompt.

`POST /api/personal-neo/knowledge`: `look` richiede JPEG base64 limitato e domanda; `instructions` richiede soltanto query. Richieste limitate a 12/minuto per isolate su Sites (non un limite distribuito), origine autorizzata, niente lettura di URL arbitrari dal server. Solo destinazione OpenAI fissa; `store:false`, nessun archivio delle immagini o dialoghi nel backend. Search richiede un tool web reale; le citazioni ammesse sono HTTPS. Campi extra, box invalidi e payload eccessivi sono respinti. Fotogrammi/documenti sono dati non attendibili, non istruzioni.

Il client nativo imposta Origin sul dominio configurato: è un controllo del punto d’accesso pubblico, non una prova dell’identità dell’app. Per una distribuzione ampia prevedere App Attest/autenticazione e rate limiting distribuito prima di aumentare il traffico; nessun segreto statico dentro l’app. Le chiavi e i modelli di Robot Buddy restano invariati.

## Primo test fisico

1. iPhone/iOS/browser non necessari: installare da Xcode con team Apple Developer. [Guida](../ios/README.md).
2. Start esplicito, nessuna camera/microfono prima dell’attivazione. Verificare permessi negati, ripresa e interruzione/chiamata.
3. Scansionare pavimento e superfici nei primi 6 s; verificare passaggio a esplorazione senza scansione continua. Riscansionare dai controlli quando serve. Provare anche un dispositivo senza LiDAR.
4. Posizionare NEO sul pavimento; muovere il telefono, controllare ancoraggio, posa iniziale e animazione. La R4 privilegia camera/rig e non abilita occlusione degli arredi. Il rig deve essere visibile e finito.
5. «Cosa vedi?»: confrontare categorie, posizioni e sorgente della misura. Muovere il telefono mentre attende: la posa usata deve restare quella del fotogramma. Oggetti senza misura non devono ottenere coordinate fittizie.
6. «Indica la sedia», «Cerca il manuale di [modello]»: controllare strumento autorizzato e fonti. Una nuova richiesta deve interrompere la vecchia ricerca senza monologhi tardivi.
7. Dieci turni voce, interruzioni con parole, rumori, mute, riavvio dopo chiamata/background. Verificare latenza, eco e ripresa dell’ascolto.
8. Selezionare seduta e controllare posa. Tastiera: tre punti, scala, allineamento reale, dita e note; perdere tracking deve fermare la dimostrazione. Non attribuire il suono sintetico al pianoforte fisico.
9. Annotare modello iPhone, LiDAR sì/no, iOS/Xcode, build, timestamp, tracking, disallineamento in cm, latenza, FPS/termica e problemi.

Nessuna prova fisica o installazione firmata è implicita nei test del simulatore. La pubblicazione TestFlight/App Store richiede firma e upload dal team dell’utente; non è sostituibile da un URL web.

## Verifica automatica

Progetto Xcode e workflow macOS predisposti. Conversione OpenUSD verificata in Linux: topologia valida, 48 joint, 6 binding mesh, 18.299 triangoli, riapertura USDZ riuscita. Lint/typecheck, build Node/client e verifica segreti passati; **223 test Node/shared**, **209 Sites/shared/route** e build Sites passati. Tutti i **33 casi browser** passati fra suite e ritest mirati su desktop Chromium, Android emulato e WebKit/iPhone. Un test clock è stato stabilizzato lasciando partire l’intervallo narrativo prima del fast-forward; le librerie WebKit mancanti sono state caricate in una directory temporanea. Audio/WebRTC browser simulati. [Portale desktop](validation/personal-neo/portal-desktop.png), [Android](validation/personal-neo/portal-android.png), [iPhone](validation/personal-neo/portal-iphone.png).

La compilazione nativa app/test e il passaggio dei test sul simulatore sono verificati sul runner macOS con Xcode 16.4 per il codice Swift `e6fa330`. Pipeline: https://github.com/technology4punks/mr4p/actions/runs/39119838819. Import reale USD Skel verificato nel simulatore intermedio: 48 joint e posa animata; RealityKit aggrega le sei mesh USD in un ModelEntity, quindi il test finale controlla lo scheletro e il movimento, non il numero di nodi interni dell’importer. I test core coprono tastiera/calibrazione, proiezione immagine e gate vocale. Il manifest privacy dichiara i contenuti inviati ai servizi AI; le sue modifiche dichiarative successive sono validate anche con parser plist. Le misurazioni hardware non sono ancora disponibili.

Fonti tecniche: [scene reconstruction ARKit](https://developer.apple.com/documentation/arkit/arworldtrackingconfiguration/scenereconstruction), [scene depth](https://developer.apple.com/documentation/arkit/arconfiguration/framesemantics-swift.struct/scenedepth), [RealityKit joint transforms](https://developer.apple.com/documentation/realitykit/hasmodel/jointtransforms), [WebRTC OpenAI](https://developers.openai.com/api/docs/guides/voice-webrtc). Consultate il 18 ottobre 2026. Licenze/rig: [guida iOS](../ios/README.md), [manifest](../ios/MyPersonalNeo/Resources/AvatarManifest.json).

## Pubblicazione backend e pagina · 18 ottobre 2026

Sites **versione 24**, distribuzione `succeeded` alle **10:34:41 UTC**: [pagina pubblica](https://neo-mr-avatar-test.sk1kko.chatgpt.site/personal-neo), [Robot Buddy invariato](https://neo-mr-avatar-test.sk1kko.chatgpt.site). Commit sorgente Sites `ab1af6bf75feb5d18138e134865d4f647c9bd811`, deploy `appgdep_6ad4a0ad65108191a6c3a890aba1e9fd`. Ambiente revision 6 preservato, nessuna rotazione chiavi o migrazione dati nuova. La pagina è accesso al progetto/guida, non un’installazione dell’app nativa.

Smoke live anonimo passato: pagina, token personale **200** con sola verifica del valore effimero senza stamparlo, visione strutturata **200** su illustrazione sintetica (un oggetto), ricerca web reale **200** con una fonte, control room anonima **401**, ingresso Robot Buddy senza login e zero errori JavaScript. [Esiti](validation/personal-neo/public-smoke-v24.json), [pagina distribuita](validation/personal-neo/public-v24.png). Microfono negato nel browser: nessuna prova di voce live o ambiente iPhone reale.

Per l’installazione sul dispositivo usare il progetto Xcode e il team del proprietario; non sono stati creati certificati, provisioning, IPA firmate, upload App Store o inviti TestFlight.

## Revisione 2 · feedback iPhone

Tre avatar umani realistici selezionabili prima dello start; movimento lento e interazione sul pavimento misurato, sguardo verso la camera, gesto e animazione essenziale della bocca. Nessun HUD, trascrizione, puntino o apertura automatica di pannelli durante l’esperienza. Controlli con doppio tocco a due dita o voce; calibrazione guidata a voce. Stato diagnostico e fonti disponibili soltanto nei controlli richiamati.

Microfono full duplex dall’ingresso; filtro delle interruzioni su durata audio e parole riconosciute, isolamento degli item ASR e recupero canale/trasporto. Nessun cambio a prompt o microfono di Robot Buddy. Il recupero conserva al massimo otto messaggi in RAM e non crea archivi. Il menu e il sistema operativo consentono sempre sospensione.

Verifica hardware richiesta: ogni avatar (volto, capelli, ombre, sguardo), ancoraggio e posa seduta, pavimento/ostacoli con e senza LiDAR, dieci turni audio con brevi rumori e vere interruzioni, uscita Bluetooth/chiamata, ritorno dall’app in background e gesto controlli. Non sono disponibili nuove misure FPS, latenza o termica su dispositivo. I raggi stimano collisioni, non garantiscono contatto o comprensione totale. Nessun upload TestFlight eseguito.

### Validazione e pubblicazione revisione 2

Sites **versione 25**, `succeeded` il **18 ottobre 2026 alle 11:44:12 UTC**, runtime revision **6** preservato. Sorgente Sites `478f0bab7d1a5283c129305980d5a22bb7f1da44`, deploy `appgdep_6ad4b0f893cc819194a82d24a26bd1ac`. [Pagina pubblica](https://neo-mr-avatar-test.sk1kko.chatgpt.site/personal-neo), [smoke](validation/personal-neo/public-smoke-v25.json), [cattura pagina](validation/personal-neo/public-v25.png). Pagina/preview/licenza e ingresso Buddy **200**, creazione token effimero personale **200**, control room anonima **401**, zero errori JavaScript. Non sono state modificate variabili segrete, database, accessi o prompt/microfono di Robot Buddy.

`npm run check`: lint, typecheck, build, scansione bundle e **223 test** passati. Sites: typecheck, build e **209 test** passati. **33 casi browser** passati fra suite completa (30) e ritest mirato del portale (3) su Chromium desktop/Android e WebKit iPhone; il test del portale cercava il titolo precedente ed è stato aggiornato dopo la prima esecuzione. Questi test browser non verificano il microfono nativo.

Rendering di controllo delle geometrie e texture estratte dai tre USDZ: [anteprima](validation/personal-neo/human-assets-r2.png), non cattura RealityKit/dispositivo. Verifica statica: Y-up, altezza 1,65–1,78 m, profondità 0,33–0,36 m, cinque texture incluse e 80 joint ciascuno. Nessuna misura FPS/latency/termica iPhone disponibile.

Probe WebRTC di integrazione nel browser cloud con traccia sintetica vuota, senza microfono: creazione token e scambio SDP **201** riusciti, ma il peer è passato a `failed` senza aprire il data channel. Non è stata generata una risposta vocale né verificato `session.updated`. [Esito](validation/personal-neo/realtime-session-v25.json). Questo ambiente non certifica trasporto audio o configurazione runtime della sessione nativa: occorre il test iPhone. Gli errori ASR, rumori brevi, turni consecutivi e geometria vengono invece esercitati dai test core iOS.

Per aggiornare l’app già installata, scaricare la branch `codex/my-personal-neo` e ricompilare da Xcode con il proprio team. La pubblicazione Sites aggiorna backend e guida; non distribuisce un nuovo binario iOS.

## Revisione 3 · iPhone 14 Pro, compagni fumettosi e profilo leggero

Feedback utente: rallentamento grave nell’app nativa installata su iPhone 14 Pro. Non è dimostrata una causa unica negli asset. Cambiati sia contenuti sia lavoro continuo AR/rendering.

Uomo/donna **Suit**, cane **ShibaInu**, tutti Quaternius CC0. Una mesh/materiale e texture palette 64 px per modello; rig umano 62 joint, cane 46. Circa 1,59 MB complessivi dei tre USDZ, uno solo caricato. Rimossi Rocketbox/texture 1k dal bundle; le immagini precedenti restano soltanto nella documentazione storica. [Anteprima nuova](validation/personal-neo/toon-companions-r3.png), [manifest](../ios/MyPersonalNeo/Resources/AvatarManifest.json). Non è un render su dispositivo.

Modalità predefinita: ARKit piani + sceneDepth LiDAR, occlusori planari limitati; niente mesh classificata/colliders continui, person segmentation, cubemap automatiche o post-processing. Mesh dettagliata opzionale nei controlli nascosti. Pose/locomozione 30 Hz adattive a 20 Hz, lookup joint precalcolato, IK due iterazioni e verifica ostacoli su piani senza nove raycast fisici per frame. La camera/render non dipendono dal tick ridotto dell’animazione. I segnali vocali non ridisegnano i pannelli nascosti.

Cane: locomozione/coda/sguardo verso camera o oggetto; niente mano/pianoforte/sedia/judo. Tool e prompt rispettano la forma selezionata. Voce e esperienza senza HUD conservate. Nuova diagnostica soltanto nei controlli: FPS di aggiornamento scena e frequenza animazione. La diagnostica non è una misura GPU né una prova di fluidità su 14 Pro: verifica fisica ancora necessaria.

Verifica preliminare revisione 3: pipeline [39125544102](https://github.com/technology4punks/mr4p/actions/runs/39125544102), sorgente Swift `d46227f`, **build app/test e 9 test passati** su simulatore Xcode 16.4. Import effettivo uomo/donna/cane con singola mesh/materiale e texture verificato, insieme a proporzioni/pose e budget adattivo. Il tempo del test d’importazione è 0,647 s sul runner: non è FPS o latenza del dispositivo. `npm run check` e 223 test passati; Sites typecheck/build e 209 test passati; portale desktop/Android/WebKit ritestato (3/3). Le ulteriori modifiche di orientamento del cane sono sottoposte alla pipeline della branch.

Pagina/backend aggiornati a **Sites 26**, distribuzione `succeeded` il 18 ottobre 2026 alle **12:08:20 UTC**, runtime revision **6** preservato. Sorgente Sites `d36cb8ae2c73ead6dee79a47fe9e4791c7c6456c`, deploy `appgdep_6ad4b6a253408191ad9c24de8af2b778`. [Smoke pubblico](validation/personal-neo/public-smoke-v26.json): pagina, tutte e tre le preview, licenza e token vocale **200**, control room anonima **401**, ingresso Buddy **200**, nessun errore JavaScript. [Pagina pubblicata](validation/personal-neo/public-v26.png). Il servizio è aggiornato, ma per provare le ottimizzazioni AR occorre ricompilare l’app sul proprio iPhone.

**Esito finale revisione 3:** [pipeline 39126138979](https://github.com/technology4punks/mr4p/actions/runs/39126138979), codice Swift `b0c214d80a5a5d9ffa8e9465b8b269e0436d218a`: compilazione app/test e test del simulatore **success**, inclusi i nove casi della suite. Il codice compilato include la guardia finale delle capacità del cane e il suo orientamento agli oggetti; i nove test non costituiscono una verifica fisica di queste interazioni. Il successo dei test non misura frame rate, temperatura o continuità audio su iPhone 14 Pro; queste verifiche richiedono la nuova build sul dispositivo. Le modifiche successive a questo codice sono documentazione/sincronizzazione della pagina, senza ulteriori cambi Swift.


## Revisione 4 · blocco camera, T-pose e scansione a finestre

Il nuovo test utente sulla revisione 3 riporta ancora scatti seguiti da blocco camera e avatar in T-pose. Quindi la riduzione degli asset non dimostra una soluzione sufficiente. Non sono disponibili Instruments o tracce hardware del telefono: i seguenti sono difetti verificati nel codice, non una diagnosi esclusiva della causa del blocco.

1. **Rig:** il convertitore usava trasformazioni dei joint già animate con una mesh ancora in T-pose. Usa ora `meshGlobal * inverse(inverseBindMatrix)` per ricostruire i pivot bind. Verifica CPU sui veri vertici pesati: discesa media delle mani nella posa rilassata almeno **0,5276 m uomo / 0,5343 m donna**, senza aumentare bytes, triangoli o materiali. RealityKit riceve la posa immediatamente; non attende tracking normale per animare idle/gesti.
2. **Camera:** `inspect` tratteneva l’intero `ARFrame` per tutta la richiesta AI; richieste tool concorrenti potevano sovrapporre acquisizioni. Ora snapshot e JPEG sono di proprietà dell’app e la pipeline è seriale. La compressione avviene dopo il rilascio degli oggetti ARKit; niente rete con frame/pixel buffer conservati. Validazione di epoch/sessione e freschezza prima di assegnare coordinate.
3. **Lavoro continuo:** rimossi task main per frame e rigenerazione degli occlusori a ogni aggiornamento. Acquisizione 6 s, poi world tracking senza discovery/depth/mesh continui. Misure su richiesta fino a 1 s e rescan esplicito; cache solo numerica di 64 piani. Il movimento si arresta con supporto scaduto, tracking perso o ostacolo noto; non è un sistema di collisione universale.
4. **Audio/lifecycle:** filtro e debounce delle route, nessun feedback `categoryChange`→riconfigurazione. Avvio asincrono protetto da doppi tap e ritorni tardivi dal background; permessi camera/microfono risolti prima della scansione. Calibrazioni invalidate al cambio di riferimento e contesto voce aggiornato quando il tracking cambia, compreso il recupero.

Diagnostica solo nei controlli: FPS scena/camera separati, formato camera richiesto, età/gap massimo dei frame, CPU update massimo e fase. **30 FPS è la frequenza camera richiesta quando supportata, non una prestazione misurata su iPhone.** Nessuna nuova persistenza, chiave o modifica del backend/Buddy.

### Memoria stanza: progettata, non ancora attiva

[Disegno completo](SAVED_ROOMS_DESIGN.md) con fonti Apple: acquisizione iniziale opt-in, `ARWorldMap`, rilocalizzazione e memoria locale versionata; AI propone cambiamenti, misure reali li convalidano. L’aggiornamento incrementale riguarda celle/oggetti dell’app; ARKit non espone comandi LiDAR per singole ROI. Niente salvataggi foto/mappe in questa consegna.

### Validazione revisione 4

[CI 39140448293](https://github.com/technology4punks/mr4p/actions/runs/39140448293), sorgente nativa **`781e0bc6880be9a682e4053a74b6e32da072ef8a`**: **build simulatore Debug, build arm64 iPhone Release senza firma e 22 test iOS passati**, zero errori. Xcode 16.4. Run da Xcode è ora Release; versione 0.1.1, build 4 nei controlli. Test aggiunti su vera posa iniziale/import asincrono, tracking limitato, target invalidi, copia depth con stride e lifetime, snapshot/pose, finestre di scansione e notifiche audio. Suite XCTest eseguita in **1,145 s**; import/animazione dei tre compagni **0,729 s**, import asincrono e posa iniziale **0,084 s**, sul simulatore del runner. Questi tempi non misurano FPS, GPU, memoria o latenza sul telefono. `npm run check`: lint, typecheck, build, scansione bundle e **223 test passati**. Browser: **32/33** nella prima suite completa; timeout intermittente del caso di riavvio Android. Due esecuzioni diagnostiche mostrano che il portale riparte correttamente, ma il renderer software può ritardare i callback oltre 15 s (osservato 16,2 s). Adeguata a 30 s l’attesa del solo test riavvio/privacy; il test indipendente dei tempi narrativi resta invariato. Ritest su desktop, Android e WebKit: **6/6 passati**, compreso il test RAF sospeso. Tutti i 33 casi distinti risultano verificati tra suite e ritest, non in una singola esecuzione verde.

[Report strutturato della revisione 4](validation/personal-neo/native-r4-validation.json). Nessun nuovo deploy Sites richiesto: questa consegna aggiorna il binario nativo e la documentazione.

Per provare le correzioni è necessario **aggiornare `codex/my-personal-neo` e ricompilare/installare da Xcode**. Il sito/backend già pubblicato non aggiorna l’app installata; non è stato effettuato upload TestFlight. FPS, memoria residente, continuità audio/camera e termica sul 14 Pro restano da misurare con la nuova build.


## Revisione 5 · animazioni originali e preparazione guidata

Il test utente conferma voce migliorata ma postura/animazione ancora insoddisfacenti. Individuati due difetti distinti: quaternion `from/to` ambiguo nel dietrofront, capace di inclinare il corpo, e camminata manuale che non aggiornava i piedi indipendenti del rig sorgente. Ora il corpo usa esclusivamente yaw; le clip authored aggiornano tutte le articolazioni, incluse le traslazioni dei piedi. I test verificano segmenti anatomici reali e orientamento, oltre alla posa.

Quaternius CC0: `Idle_Neutral`, `Walk`, `Wave`, `Interact` per uomo/donna; `Idle`, `Walk`, `Idle_2` per il cane. Dati retargeted al bind esatto, validato al caricamento; campioni 24 Hz, interpolazione e crossfade 250 ms. Nessuna clip di combattimento o prop, nessun nuovo DCC/runtime. USDZ invariati; dati movimento circa 1,80 MB complessivi, uno solo caricato. [Manifest](../ios/MyPersonalNeo/Resources/MotionManifest.json), [anteprima CPU delle mesh](validation/personal-neo/authored-motion-r5.png), non una cattura del telefono. Verifica offline di tutti i frame: trasformazioni rigide, coordinate finite e suole a quota zero. Contatto durante interpolazione e sul pavimento reale richiede comunque verifica fisica.

Preparazione visibile **prima** dell’esperienza: camera e guida, avatar nascosto. Tracking normale, superficie orizzontale sufficientemente ampia e 1,5 s di stabilità rendono disponibile **Inserisci NEO**. Arredi classificati, superfici troppo piccole e ostacoli planari conosciuti bloccano l’appoggio. Budget massimo 30 s, riprova o annullamento; nessun inserimento automatico su timeout. Conferma esplicita, avatar e voce insieme, poi guida rimossa. Durante l’esperienza restano camera e avatar, controlli solo su richiesta. È verifica di un appoggio locale, non comprensione totale della stanza; mappe/foto non vengono salvate.

Seguito: fermata su supporto scaduto, tentativo di nuova misura limitato a 1 s ogni 8 s quando necessario. La camera deve vedere un punto del pavimento coerente con la profondità per riattualizzare il supporto. Nessuna richiesta AI aggiunta. Motore vocale, soglie VAD e backend preservati. Le transizioni e la seduta mantengono i controlli piedi collegati agli stinchi. La cadenza usa velocità di appoggio misurate dalle clip (circa 1,257 m/s uomo, 0,966 donna, 0,507 cane), rapportate allo spostamento di 0,42 m/s. IK a due segmenti durante l’appoggio mantiene fisse le coordinate orizzontali dei piedi nel mondo, senza scalare/allungare le gambe; il vincolo si rilascia al sollevamento o fuori portata. Le dimostrazioni interrompono la traslazione. Un test misura lo scivolamento del piede durante l’appoggio; dimostrazioni/contatti precisi restano sperimentali e da calibrare.

Validazione R5: [CI 39145719716](https://github.com/technology4punks/mr4p/actions/runs/39145719716), sorgente Swift **`979ff2fdb0de87b4a8f3b2affdf98864b5053184`**, Xcode 16.4. **Build simulatore Debug, build arm64 iPhone Release senza firma e 33 test iOS passati**, zero errori. Compresi import/animazioni reali dei tre rig, segmenti anatomici, appoggio durante camminata/crossfade/seduta, orientamento, guida, raffinamento quota del pavimento, snapshot e filtri vocali. XCTest 4,649 s; controllo camminata dei tre avatar 1,275 s sul simulatore del runner: non sono FPS o tempi del telefono. `npm run check`: lint/typecheck/build, bundle e **223 test passati**. Browser: **32/33** alla prima esecuzione, timeout di actionability su Android nel caso V4 cumulativo, **1/1 ritest mirato passato**. Tutti i 33 casi distinti verificati tra suite e ritest, nessun cambio al prodotto web. [Report R5](validation/personal-neo/native-r5-validation.json). I dati hardware restano non disponibili; non è dichiarata perfezione o fluidità sul dispositivo prima di un nuovo test sul 14 Pro.
