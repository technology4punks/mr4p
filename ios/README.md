# My Personal Neo · iPhone nativo

App separata da Robot Buddy/Future Observatory. **SwiftUI + ARKit + RealityKit**, iOS 17+, avatar USD Skel a 48 articolazioni; OpenAI Realtime via WebRTC e backend condiviso per visione e ricerca web. Nessuna chiave API nell’app.

## Prova sul tuo iPhone

Serve un Mac con Xcode 16+ e un iPhone con iOS 17+. LiDAR è consigliato per ricostruzione/depth; senza LiDAR rimangono tracking, superfici, voce e visione, con localizzazioni più limitate.

```sh
git clone --branch codex/my-personal-neo https://github.com/technology4punks/mr4p.git mr4p-personal-neo
cd mr4p-personal-neo
open ios/MyPersonalNeo.xcodeproj
```

1. Lascia risolvere il package **WebRTC 155.0.0** da `stasel/WebRTC`.
2. Target **MyPersonalNeo → Signing & Capabilities → Team**: seleziona il tuo account Apple Developer; lascia Automatic Signing. Se necessario cambia `com.technology4punks.MyPersonalNeo` con un bundle ID disponibile nel tuo team. Nessun certificato/team è incorporato nel repository.
3. Collega l’iPhone, autorizza il Mac e abilita **Impostazioni → Privacy e sicurezza → Modalità sviluppatore**. Scegli l’iPhone come destinazione e premi Run.
4. Tocca **Entra con NEO** e consenti la fotocamera. Muovi lentamente il telefono; quando il tracking è stabile, tocca una superficie del pavimento per posizionare l’avatar.
5. Tocca **Avvia voce** e consenti il microfono. Prova «Cosa vedi?», «Indica la sedia» e «Cerca il manuale di [marca e modello]». Fotocamera e voce si attivano separatamente. Un fotogramma viene inviato a OpenAI soltanto su richiesta, non uno streaming video continuo. Nel menu puoi attivare esplicitamente **Osservazione assistita**: invia un fotogramma ogni 15 secondi solo con tracking stabile, aggiornando il contesto senza avviare monologhi o azioni. È disattivata di default e si spegne in background.

Backend iniziale: `https://neo-mr-avatar-test.sk1kko.chatgpt.site`. Gli endpoint sono `/api/personal-neo/token` e `/api/personal-neo/knowledge`. Non inserire chiavi OpenAI in Xcode, Info.plist o nel bundle. Il server mantiene la chiave già configurata per NEO, separando prompt/tool dalle sessioni di Robot Buddy.

## Cosa significa comprensione dell’ambiente

ARKit rileva geometria e tracking; LiDAR aggiunge profondità, mesh, occlusione e collisioni stimate. L’LLM riconosce oggetti in una foto e propone bounding box 2D e categorie. La fusione usa il frame/posa della foto, non la posizione della camera dopo la risposta: proietta il centro osservato nella depth map oppure esegue un raycast su superfici misurate. Se manca una misura, l’oggetto resta **solo visivo**, senza coordinate inventate. Le posizioni sono stime del centro, non sagome complete, riconoscimento universale o prova di un contatto preciso.

Il registro degli oggetti dura nella memoria della visita; una nuova osservazione sostituisce la precedente e cambia gli ID, così un tool tardivo non punta per errore un oggetto nuovo. Il modello chiama soltanto azioni disponibili, validate nell’app. Non eseguiamo codice, animazioni o procedure arbitrarie estratte dal web.

## Interazioni iniziali

- **Indicare** un oggetto localizzato, senza camminare attraverso la stanza.
- **Sedere** su una superficie orizzontale selezionata esplicitamente: posizione virtuale da controllare visivamente.
- **Pianoforte** come prima interazione precisa: tastiera a 88 tasti, calibrazione di tre punti reali (LA0 e DO8 alla stessa profondità, poi bordo posteriore di un tasto centrale). Raycast solo su superfici misurate. La geometria ricostruisce tutti gli 88 tasti e distingue bianchi/neri.
- **Suonare** una scala di DO o l’Inno alla gioia: posa seduta, IK di braccio/mano verso la posizione del tasto, evidenziazione e **suono sintetico nell’app**. Non vengono mossi tasti fisici. Per suono di uno strumento esterno servirebbe un’integrazione MIDI; per pressione meccanica serve un attuatore esterno, non implementati.
- **Judo**: saluto e schema illustrativo di spostamento sul rig. Non è motion capture, una lezione certificata o apprendimento automatico di nuove mosse da un manuale. Non invita a replicare con telefono in mano.

Il contatto dita/tasti, la posa seduta e la geometria vanno validati su iPhone/pianoforte reale; la sola build non li certifica. Per altri oggetti aggiungere un adattatore di interazione e relativa calibrazione, senza cambiare voce o fusione di scena.

## Test e distribuzione

Lo schema **MyPersonalNeo** comprende `MyPersonalNeoTests`: mapping tasti e rotazione, calibrazioni non valide, coordinate immagine/depth, autorizzazione dei turni e caricamento effettivo del rig USDZ. La pipeline `.github/workflows/personal-neo-ios.yml` esegue `xcodebuild test` su macOS con simulatore iPhone senza firma. Il simulatore non può verificare ARKit/LiDAR fisici. I risultati verificati sono in [docs/MY_PERSONAL_NEO.md](../docs/MY_PERSONAL_NEO.md).

Per distribuire via TestFlight: dopo il test dispositivo, imposta bundle ID/team/versione, crea la scheda App Store Connect, seleziona **Any iOS Device → Product → Archive → Distribute App → App Store Connect**. Aggiungi tester e verifica le dichiarazioni privacy (il manifest include foto/video, audio e contenuti utente inviati all’AI per funzionalità dell’app, senza tracking o identificativo utente allegato), inclusa la trasmissione a OpenAI e le eventuali conservazioni del provider. Non è stato eseguito alcun upload né creata una distribuzione TestFlight; non servono certificati per leggere o testare il progetto nel simulatore.

## Asset e riproducibilità

“Rigged robot” di **joney_lol**, [Poly Pizza](https://poly.pizza/m/BwjA6Thdzd), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). GLB già presente nel progetto, convertito in USD Skel senza DCC; pesi non finiti corretti nella versione preesistente. USDZ: 540.181 byte, 18.299 triangoli, 6 mesh skinnate, 48 joint, altezza 1,6 m. Il manifest contiene gli hash. Pose/IK e icona geometrica sono originali; licenza inclusa nell’app.

Rigenerazione opzionale, non necessaria per aprire Xcode:

```sh
python3 -m venv /tmp/neo-usd-tools
/tmp/neo-usd-tools/bin/pip install usd-core==26.8 numpy==2.5.4
/tmp/neo-usd-tools/bin/python scripts/native/convert-humanoid.py
python3 scripts/native/generate-project.py
```

Xcode project e USDZ sono già versionati. WebRTC resta un package esterno con la propria licenza e gli avvisi upstream.
