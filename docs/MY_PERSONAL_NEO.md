# My Personal Neo · app nativa iPhone

Nuovo progetto sulla branch `codex/my-personal-neo`, affiancato all’esperienza web esistente. Il requisito aggiornato dell’utente sostituisce il prototipo AR web con un’app nativa: riconoscere lo spazio e gli oggetti, conversarci e agire su riferimenti misurati. Il pianoforte è un esempio di interazione, non l’architettura dell’intero sistema.

## Architettura

| Livello | Implementazione | Limite concreto |
|---|---|---|
| Spazio | ARKit world tracking, superfici orizzontali/verticali | Tracking può essere limitato o perso |
| Profondità | Scene mesh classificata, depth, occlusione/physics RealityKit, solo se supportate | LiDAR non è presente su tutti gli iPhone; mesh stimata |
| Significato | Responses API: foto JPEG 960 px, JSON schema con oggetti/categorie/box | Riconoscimento probabilistico, non misurazione dei contatti |
| Fusione | Frame e posa al momento della foto, trasformazione portrait/raw, campionamento depth con confidence; fallback raycast | Centro stimato su misura disponibile, nessuna coordinata inventata |
| Intelligence | OpenAI Realtime, tool autorizzati su richieste reali | Nessun codice grafico o azione arbitraria dal modello |
| Conoscenza | Web search server-side, risultati e URL citati verificabili | Modello/manuale generico non equivale a manuale esatto |
| Avatar | USD Skel 48 joint, 6 mesh, pose locali e IK braccio/mano | Dita, seduta e contatti da verificare fisicamente |
| Interazioni | Puntamento, seduta calibrata, tastiera 88 tasti, demo judo di base | Nessun azionamento meccanico o animazione universale appresa |

La voce usa WebRTC nativo con echo cancellation, riconoscimento prima delle interruzioni, coda dei risultati asincroni e recupero timeout/ASR. Un aggiornamento di scena è contesto di sistema, non risposta dell’utente. I tool tardivi non avviano una risposta oltre un nuovo turno. Il passaggio in background o l’interruzione audio iOS chiude la voce e sospende la scansione; ripresa esplicita. Nessun timer didattico o teletrasporto della visita V4. Osservazione assistita opzionale e disattivata di default: un frame ogni 15 secondi con tracking stabile, evitando analisi sovrapposte e turni parlati; aggiorna solo il contesto, senza risposte o azioni autonome. Non è comprensione continua di ogni evento né video in tempo reale.

## Backend separato, hosting condiviso

`POST /api/personal-neo/token` crea un token effimero con prompt e tool personali: osservare, cercare istruzioni, indicare oggetti, calibrare seduta/pianoforte, dimostrare e fermarsi. Robot Buddy continua a usare `/api/realtime-token` con il proprio prompt.

`POST /api/personal-neo/knowledge`: `look` richiede JPEG base64 limitato e domanda; `instructions` richiede soltanto query. Richieste limitate a 12/minuto per isolate su Sites (non un limite distribuito), origine autorizzata, niente lettura di URL arbitrari dal server. Solo destinazione OpenAI fissa; `store:false`, nessun archivio delle immagini o dialoghi nel backend. Search richiede un tool web reale; le citazioni ammesse sono HTTPS. Campi extra, box invalidi e payload eccessivi sono respinti. Fotogrammi/documenti sono dati non attendibili, non istruzioni.

Il client nativo imposta Origin sul dominio configurato: è un controllo del punto d’accesso pubblico, non una prova dell’identità dell’app. Per una distribuzione ampia prevedere App Attest/autenticazione e rate limiting distribuito prima di aumentare il traffico; nessun segreto statico dentro l’app. Le chiavi e i modelli di Robot Buddy restano invariati.

## Primo test fisico

1. iPhone/iOS/browser non necessari: installare da Xcode con team Apple Developer. [Guida](../ios/README.md).
2. Start esplicito, nessuna camera/microfono prima dell’attivazione. Verificare permessi negati, ripresa e interruzione/chiamata.
3. Scansionare pareti, tavolo, sedia; controllare contatore superfici/mesh. Provare anche un dispositivo senza LiDAR.
4. Posizionare NEO sul pavimento; muovere il telefono, controllare ancoraggio e occlusione. Il rig deve essere visibile e finito.
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
