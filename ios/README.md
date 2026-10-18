# My Personal Neo · iPhone nativo

SwiftUI + ARKit + RealityKit, iOS 17+, OpenAI Realtime/WebRTC. App separata da Robot Buddy; chiavi nel backend esistente. **Revisione 5 · versione 0.1.2, build 5**: preparazione guidata prima dell’avatar, orientamento verticale e animazioni originali Quaternius al posto della camminata articolare manuale. La voce mantiene il motore e le soglie della revisione 4. Verifica fisica della nuova build su iPhone 14 Pro ancora necessaria.

## Installazione / aggiornamento

Serve un Mac con Xcode 16+ e un iPhone iOS 17+. LiDAR opzionale; iPhone 14 Pro lo supporta.

```sh
git clone --branch codex/my-personal-neo https://github.com/technology4punks/mr4p.git mr4p-personal-neo
cd mr4p-personal-neo
open ios/MyPersonalNeo.xcodeproj
```

1. Lascia risolvere **stasel/WebRTC 155.0.0**. Scegli il tuo team Apple Developer in Signing & Capabilities; Automatic Signing. Nessun certificato o team nel progetto.
2. Collega l’iPhone, autorizza il Mac e abilita Modalità sviluppatore nelle Impostazioni iOS. Scegli il dispositivo e premi Run: lo schema usa **Release** per provare le prestazioni, mentre i test restano Debug. Nei controlli verifica **build 5 / versione 0.1.2**. Se hai già installato una revisione, aggiorna la branch e ricompila: il sito non aggiorna il binario iOS.
3. Scegli **Donna, Uomo o Cane**, poi **Prepara la stanza**. Dopo i permessi si apre una guida sulla camera, senza avatar. Inquadra una zona libera di pavimento a circa 1,3 m e muovi lentamente il telefono, restando fermo. Una superficie sufficientemente ampia deve rimanere stabile per 1,5 s; tracking instabile, piani piccoli/inclinati e arredi noti impediscono l’inserimento. La preparazione ha un budget massimo di 30 s, con riprova esplicita.
4. Quando compare **Inserisci NEO**, verifica che la zona sia pavimento libero e premi il pulsante: l’avatar compare, la guida scompare e parte la voce. La voce ascolta anche durante le risposte. Prova «Cosa vedi?», «Indica la sedia», «Avvicinati alla sedia», «Cerca il manuale di [marca/modello]».
5. **Nessun HUD o pannello automatico**: doppio tocco a due dita, oppure «apri i controlli», per menu, stato voce, diagnostica, fonti e sospensione. Gli indicatori privacy iOS restano. Background sospende camera e voce; ripresa esplicita.

Backend: `https://neo-mr-avatar-test.sk1kko.chatgpt.site`, endpoint `/api/personal-neo/token` e `/api/personal-neo/knowledge`. Nessuna chiave in Xcode/Info.plist/bundle. Token effimeri diretti WebRTC; prompt/tool isolati da Buddy. Fotogrammi singoli solo su richiesta; osservazione assistita opzionale invia un frame ogni 15 secondi con tracking stabile, senza avviare azioni/monologhi. Nessun archivio foto/dialoghi nel nostro backend. Ultimi otto messaggi solo in RAM per recupero voce, cancellati alla fine; la scelta avatar viene conservata sul dispositivo.

## Preparazione, movimento e prestazioni

La preparazione verifica un **appoggio locale**, non certifica una scansione completa della stanza. Usa piani e profondità disponibili, senza RoomPlan, mesh/colliders triangolari, foto AI o archivi. L’inserimento richiede una superficie di 60×60 cm per i personaggi, 90×90 cm per il cane, approssimativamente orizzontale e stabile; tavoli/sedute classificati e ostacoli planari noti vengono esclusi. Classificazione e geometria restano stime: controllare la zona scelta. Il timeout offre una riprova e non inserisce l’avatar su coordinate inventate.

Un errore di orientamento usava un quaternion `from/to` per girarsi: a 180° poteva scegliere un asse orizzontale, inclinando il corpo. Ora ogni orientamento del corpo è **solo yaw**, incluso il pianoforte. I test coprono l’intero giro e l’esatto dietrofront.

I rig sorgenti hanno piedi con controlli indipendenti. Ruotare soltanto anche/ginocchia lasciava i piedi fermi, deformando la posa. I movimenti standard usano adesso le clip CC0 **Idle_Neutral/Idle, Walk, Wave/Idle_2 e Interact**, convertite offline nello stesso bind degli USDZ. Sono conservate anche le traslazioni dei piedi. Campioni a 24 Hz interpolati con slerp, transizioni di 250 ms, scala articolare sempre unitaria, root motion orizzontale rimosso e appoggio delle suole normalizzato. La cadenza segue la velocità reale di traslazione, usando la velocità dei piedi in appoggio misurata dalle clip, per ridurre lo scivolamento. La seduta esplicita aggiorna anche i controlli indipendenti dei piedi; IK limitata allo spazio raggiungibile davanti al corpo.

[Anteprima delle mesh deformate](../docs/validation/personal-neo/authored-motion-r5.png): verifica CPU delle pose, **non cattura RealityKit o iPhone**. Niente clip di armi/combattimento o oggetti aggiuntivi. Le piccole dimostrazioni di judo restano illustrazioni locali, non addestramento.

Dopo l’inserimento si sospendono discovery e profondità continui. Le osservazioni AI rimangono seriali con JPEG/snapshot propri, senza buffer ARKit durante la rete. Se NEO deve seguire e il supporto è scaduto, si ferma e tenta una finestra di misura di 1 s, al massimo ogni 8 s. Il pavimento viene riconsiderato recente solo con misure aggiornate o profondità coerente con il punto attuale; una misura non disponibile non autorizza il passo. Pareti/arredi noti e supporto ai piedi limitano la navigazione, senza garanzia su ostacoli ignoti o mobili.

Un solo avatar, una mesh/materiale e palette 64 px; niente person segmentation, cubemap, occlusori generati o post-processing. Camera richiesta a 30 FPS quando disponibile, pose 30 Hz adattive a 20 Hz. Le clip sono dati locali preparati prima della camera, non modelli caricati per frame. Nessun nuovo invio AI durante la guida.

Dopo la preparazione lo schermo torna a **camera e avatar**. Controlli su doppio tocco a due dita o voce, senza HUD: FPS camera/scena, età/gap dei frame, CPU update e fase. Non sono misure GPU; FPS/termica su iPhone 14 Pro devono essere rilevati sul dispositivo.

### Stanze salvate: prossima fase

Il progetto richiesto è documentato in [SAVED_ROOMS_DESIGN.md](../docs/SAVED_ROOMS_DESIGN.md): memoria locale, `ARWorldMap`, rilocalizzazione, keyframe facoltativi e proposte AI validate da misure geometriche. Non attiva persistenza o invii nuovi. ARKit non espone una ROI LiDAR per rimisurare soltanto un oggetto: l’app potrà aggiornare selettivamente le proprie celle, acquisendo misure in finestre brevi.

## Interazioni e limiti

ARKit misura; OpenAI riconosce oggetti in una foto. La fusione usa la copia di posa/intrinseci della foto e profondità/piani misurati nello stesso riferimento: nessuna coordinata inventata, nessuna comprensione totale. Le localizzazioni sono centri stimati, non superfici complete; scadono per avvicinamento dopo 30 secondi.

Passo lento 0,42 m/s; seguito discreto e avvicinamento entro 3 m con arresto a 75 cm. Supporto ignoto/tracking limitato/ostacoli misurati fermano il movimento; nessun aggiramento automatico. Sguardo verso la camera e pose locali; il cane cammina, guarda l’oggetto e muove la coda, **non esegue gesti umani**.

Uomo/donna: indicazione con braccio, seduta selezionata su superficie misurata, pianoforte 88 tasti calibrato in tre punti (LA0, DO8, bordo posteriore), scala/Inno alla gioia con IK e audio sintetico. Nessuna pressione meccanica dei tasti. Judo solo saluto/spostamento illustrativi predefiniti, non addestramento o motion capture dal web. Per cane pianoforte/seduta su sedia/judo sono respinti dal client e dal prompt.

La calibrazione è guidata a voce senza punti/etichette sovrapposti. Per istruzioni su oggetti viene cercato un manuale con fonti: un documento generico non identifica il modello specifico.

## Voce

WebRTC con eco/noise suppression e near-field. VAD nativo: threshold 0,6, silenzio 650 ms, nessun interrupt/response automatico. Parole e durata audio validano il turno: frasi da 320 ms possono interrompere, «stop/aspetta/no» da 180 ms. Rumori e sillabe non autorizzano azioni; item rifiutati rimossi dal contesto. Nomi/risposte brevi ammessi quando NEO ascolta. Soglie euristiche, non identificazione del parlante.

Watchdog RTP dall’apertura canale, recupero traccia/connessione e cambi uscita audio; interruzioni iOS sospendono e tentano ripristino al termine. Una trascrizione mancante chiede di ripetere senza strumenti e non può generare chiarimenti tardivi dopo un nuovo turno. Le restrizioni iOS possono impedire audio in chiamata/background. Non è certificata equivalenza con ChatGPT Voice.

## Asset CC0 e riproducibilità

[Quaternius](https://quaternius.com), **CC0 1.0**, licenze dei tre pacchetti incluse in `Quaternius-CC0.txt`; sorgenti/download/hash nel manifest del bundle. Uomo **Suit**, donna **Suit**, cane **ShibaInu**. Stile fumettoso e geometria essenziale; non modelli/servizi proprietari Ready Player Me. Solo corpo riggato: armi/accessori e clip di combattimento dei pacchetti non sono inclusi. Nessuna AI genera animazioni durante la conversazione.

| Compagno | Joint | Triangoli | USDZ | Altezza |
|---|---|---|---|---|
| Man | 62 | 6,634 | 692,018 B | 1.72 m |
| Woman | 62 | 6,482 | 678,613 B | 1.66 m |
| Dog | 46 | 1,950 | 219,626 B | 0.6 m |

Una texture 64px ciascuno: budget teorico RGBA8 16 KiB prima dei mipmap, non misura GPU. Le clip aggiungono circa **1,80 MB** complessivi, una sola libreria caricata. File dei tre USDZ complessivi circa **1,59 MB**, rispetto ai precedenti 18,14 MB; non tutti sono caricati contemporaneamente. [Anteprima geometrie/texture convertite](../docs/validation/personal-neo/toon-companions-r3.png); è un rendering di controllo, non una cattura RealityKit sul telefono.

Fonti: [uomo](https://quaternius.com/packs/ultimatemodularcharacters.html), [donna](https://quaternius.com/packs/ultimatemodularwomen.html), [cane](https://quaternius.com/packs/ultimateanimatedanimals.html). Dati glTF gratuiti, nessun DCC o modellazione manuale. Script recupera i pivot dalle inverse bind matrices, verifica la discesa effettiva dei vertici pesati delle mani, conserva rig/pesi, uniforma assi/scala e unisce mesh/materiali in una palette locale. Le quattro clip selezionate vengono preparate da `bake-avatar-motions.py`; il runtime campiona solo i dati TRS locali. Fonti, hash e verifiche in `MotionManifest.json`.

```sh
python3 -m venv /tmp/neo-usd-tools
/tmp/neo-usd-tools/bin/pip install usd-core==26.8 numpy==2.5.4 Pillow==12.2.0
/tmp/neo-usd-tools/bin/python scripts/native/convert-humanoid.py
/tmp/neo-usd-tools/bin/python scripts/native/bake-avatar-motions.py
python3 scripts/native/generate-project.py
```

Il vecchio convertitore Rocketbox è conservato come `convert-rocketbox.py` per riprodurre la revisione precedente; quei modelli non sono più risorse dell’app. Xcode project e nuovi USDZ sono versionati. WebRTC mantiene licenze/avvisi upstream.

## Verifica e distribuzione

`MyPersonalNeoTests` esercita import reale di tutti e tre i rig, un solo materiale/mesh, texture, proporzioni, pose/camminata, geometria tastiera/calibrazione, proiezione foto/depth, filtro rumore/turni e budget adattivo. CI macOS/Xcode: build simulatore/test Debug e app iPhone Release senza firma. Dettagli e risultati finali in [docs/MY_PERSONAL_NEO.md](../docs/MY_PERSONAL_NEO.md).

Test fisico necessario su **iPhone 14 Pro**: ricompilare dalla branch aggiornata e provare ogni compagno. Ruotare attorno all’avatar fino all’esatto dietrofront; camminare solo dove sicuro. Per almeno 3 minuti muovere lentamente la camera; verificare guida e avatar nascosto fino alla conferma, assenza di T-pose, età/gap camera e voce. Chiedere «cosa vedi?» più volte, anche con rete lenta: una sola osservazione in corso e camera sempre libera. Poi riscansione, dieci turni voce/rumori/interruzioni, Bluetooth/chiamata, background/ripresa e calibrazioni. Annotare iOS, commit/build, FPS camera/scena, massimi gap/update, latenza e termica. Non sono stati creati certificati, provisioning o upload TestFlight/App Store. Per TestFlight usare il proprio team, scheda App Store Connect, Product→Archive→Distribute App e verifica privacy/provider.
