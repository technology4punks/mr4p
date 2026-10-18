# My Personal Neo · iPhone nativo

SwiftUI + ARKit + RealityKit, iOS 17+, OpenAI Realtime/WebRTC. App separata da Robot Buddy; chiavi solo nel backend già configurato. **Revisione 4**: correzione dei pivot del rig, acquisizione AR a finestre e snapshot indipendenti dalla camera, dopo blocco video e T-pose segnalati su **iPhone 14 Pro**. Il codice corregge cause concrete; continuità camera, FPS e termica devono ancora essere verificati sul dispositivo.

## Installazione / aggiornamento

Serve un Mac con Xcode 16+ e un iPhone iOS 17+. LiDAR opzionale; iPhone 14 Pro lo supporta.

```sh
git clone --branch codex/my-personal-neo https://github.com/technology4punks/mr4p.git mr4p-personal-neo
cd mr4p-personal-neo
open ios/MyPersonalNeo.xcodeproj
```

1. Lascia risolvere **stasel/WebRTC 155.0.0**. Scegli il tuo team Apple Developer in Signing & Capabilities; Automatic Signing. Nessun certificato o team nel progetto.
2. Collega l’iPhone, autorizza il Mac e abilita Modalità sviluppatore nelle Impostazioni iOS. Scegli il dispositivo e premi Run: lo schema usa **Release** per provare le prestazioni, mentre i test restano Debug. Nei controlli verifica **build 4 / versione 0.1.1**. Se hai già installato una revisione, aggiorna la branch e ricompila: il sito non aggiorna il binario iOS.
3. Scegli **Donna, Uomo o Cane**, poi **Entra con NEO**. Camera e microfono richiedono consenso. Scansiona lentamente il pavimento senza camminare: il compagno appare a circa 1,3 m su superficie misurata. Un tocco singolo riposiziona sul pavimento.
4. La voce si avvia con l’esperienza e ascolta anche durante le risposte. Prova «Cosa vedi?», «Indica la sedia», «Avvicinati alla sedia», «Cerca il manuale di [marca/modello]».
5. **Nessun HUD o pannello automatico**: doppio tocco a due dita, oppure «apri i controlli», per menu, stato voce, diagnostica, fonti e sospensione. Gli indicatori privacy iOS restano. Background sospende camera e voce; ripresa esplicita.

Backend: `https://neo-mr-avatar-test.sk1kko.chatgpt.site`, endpoint `/api/personal-neo/token` e `/api/personal-neo/knowledge`. Nessuna chiave in Xcode/Info.plist/bundle. Token effimeri diretti WebRTC; prompt/tool isolati da Buddy. Fotogrammi singoli solo su richiesta; osservazione assistita opzionale invia un frame ogni 15 secondi con tracking stabile, senza avviare azioni/monologhi. Nessun archivio foto/dialoghi nel nostro backend. Ultimi otto messaggi solo in RAM per recupero voce, cancellati alla fine; la scelta avatar viene conservata sul dispositivo.

## Profilo leggero e diagnostica

La revisione 3 non ha risolto il blocco segnalato sul dispositivo. La revisione 4 corregge tre percorsi distinti: buffer camera trattenuti durante la rete, lavoro continuo sul main actor e rig convertito con pivot della posa animata anziché della posa bind.

- **Acquisizione iniziale di 6 secondi**: piani orizzontali/verticali e `sceneDepth` opzionale; poi world tracking senza richiesta continua di piani, profondità, mesh o colliders. Il controllo nascosto **Riscansiona superfici** apre una nuova finestra. Togliere `sceneDepth` interrompe il flusso richiesto dall’app, non controlla direttamente l’accensione hardware del LiDAR.
- **Una osservazione per volta**: finestra di misura fino a 1 s, JPEG massimo 960 px e 550 KB; posa, intrinseci, piani e profondità vengono copiati. Nessun `ARFrame`, `ARDepthData` o buffer camera viene conservato durante richieste AI. Immagine materializzata senza rendering differito, compressione JPEG su task di utilità. Risposte precedenti a un cambio tracking/sessione o oltre 30 s scartate.
- **Nessun task per frame o occlusore generato**: massimo 64 piani numerici in RAM. Rimossa la rigenerazione di mesh planari sul main actor. Nessuna occlusione fisica degli arredi promessa in questa revisione; sono prioritari camera stabile e rig animato. Segmentation, cubemap, motion blur, profondità di campo, grain e grounding shadows disabilitati.
- **Camera a 30 FPS quando il formato è supportato**, scegliendo la risoluzione più bassa disponibile a quella frequenza. È una richiesta di configurazione, non una misura ottenuta. Pose a 30 Hz, adattive a 20 Hz sotto carico, rendering indipendente.
- **Rig corretto**: pivot recuperati dalle inverse bind matrices glTF; postura rilassata assegnata prima del primo tick; idle e gesti continuano durante tracking limitato, mentre navigazione e IK spaziale si fermano. Import asincrono prima della camera, cache degli indici/gerarchia e due iterazioni IK. Una sola mesh/materiale, palette 64 px, uno solo dei tre compagni caricato.
- **Audio**: notifiche `categoryChange` ignorate; cambi dispositivo filtrati, raggruppati e deduplicati, senza riattivare AVAudioSession o ricreare WebRTC. Configurazione audio idempotente, microfono full duplex conservato.

I controlli nascosti mostrano separatamente FPS scena e camera, frequenza richiesta, età dell’ultimo frame, gap massimo camera, massimo tempo CPU dell’aggiornamento e fase di acquisizione. I valori della scena non sono tempo GPU. Nessun HUD aggiunto.

La geometria è una cache temporanea, non una stanza salvata: il seguito si ferma dopo **20 s senza misure recenti**, lo sguardo continua. Un nuovo scan/«osserva» aggiorna le superfici viste; ostacoli ignoti, sottili o mobili possono sfuggire. La ripresa dopo background ricrea il riferimento e invalida oggetti/calibrazioni precedenti.

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

Una texture 64px ciascuno: budget teorico RGBA8 16 KiB prima dei mipmap, non misura GPU. File dei tre USDZ complessivi circa **1,59 MB**, rispetto ai precedenti 18,14 MB; non tutti sono caricati contemporaneamente. [Anteprima geometrie/texture convertite](../docs/validation/personal-neo/toon-companions-r3.png); è un rendering di controllo, non una cattura RealityKit sul telefono.

Fonti: [uomo](https://quaternius.com/packs/ultimatemodularcharacters.html), [donna](https://quaternius.com/packs/ultimatemodularwomen.html), [cane](https://quaternius.com/packs/ultimateanimatedanimals.html). Dati glTF gratuiti, nessun DCC o modellazione manuale. Script recupera i pivot dalle inverse bind matrices, verifica la discesa effettiva dei vertici pesati delle mani, conserva rig/pesi, uniforma assi/scala e unisce mesh/materiali in una palette locale. Le clip sorgenti non sono caricate; gesti/locomozione/IK locali in Swift.

```sh
python3 -m venv /tmp/neo-usd-tools
/tmp/neo-usd-tools/bin/pip install usd-core==26.8 numpy==2.5.4 Pillow==12.2.0
/tmp/neo-usd-tools/bin/python scripts/native/convert-humanoid.py
python3 scripts/native/generate-project.py
```

Il vecchio convertitore Rocketbox è conservato come `convert-rocketbox.py` per riprodurre la revisione precedente; quei modelli non sono più risorse dell’app. Xcode project e nuovi USDZ sono versionati. WebRTC mantiene licenze/avvisi upstream.

## Verifica e distribuzione

`MyPersonalNeoTests` esercita import reale di tutti e tre i rig, un solo materiale/mesh, texture, proporzioni, pose/camminata, geometria tastiera/calibrazione, proiezione foto/depth, filtro rumore/turni e budget adattivo. CI macOS/Xcode: build simulatore/test Debug e app iPhone Release senza firma. Dettagli e risultati finali in [docs/MY_PERSONAL_NEO.md](../docs/MY_PERSONAL_NEO.md).

Test fisico necessario su **iPhone 14 Pro**: ricompilare dalla branch aggiornata e provare ogni compagno. Per almeno 3 minuti muovere lentamente la camera; controllare passaggio acquisizione→esplorazione dopo 6 s, assenza di T-pose, età/gap camera e voce. Chiedere «cosa vedi?» più volte, anche con rete lenta: una sola osservazione in corso e camera sempre libera. Poi riscansione, dieci turni voce/rumori/interruzioni, Bluetooth/chiamata, background/ripresa e calibrazioni. Annotare iOS, commit/build, FPS camera/scena, massimi gap/update, latenza e termica. Non sono stati creati certificati, provisioning o upload TestFlight/App Store. Per TestFlight usare il proprio team, scheda App Store Connect, Product→Archive→Distribute App e verifica privacy/provider.
