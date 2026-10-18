# My Personal Neo · iPhone nativo

App separata da Robot Buddy/Future Observatory. **SwiftUI + ARKit + RealityKit**, iOS 17+, tre avatar umani realistici USD Skel a 80 articolazioni; OpenAI Realtime via WebRTC e backend condiviso per visione e ricerca web. Nessuna chiave API nell’app.

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
4. Scegli **Sofia, Luca o Elena**, tocca **Entra con NEO** e consenti camera e microfono. Scansiona lentamente il pavimento: l’avatar appare automaticamente a circa 1,3 m davanti al telefono su una superficie misurata. Puoi riposizionarlo toccando il pavimento. Non seguire fisicamente l’avatar.
5. La voce parte con l’esperienza e il microfono resta attivo anche mentre NEO parla. Prova «Cosa vedi?», «Indica la sedia» e «Cerca il manuale di [marca e modello]». Durante l’esperienza non compaiono HUD, trascrizioni, punti o pannelli automatici. **Doppio tocco a due dita** oppure «apri i controlli» richiama il menu; qui puoi disattivare il microfono, vedere diagnostica/fonti o sospendere tutto. Restano gli indicatori privacy di iOS. In background entrambi si spengono; ripresa esplicita. Un fotogramma viene inviato a OpenAI soltanto su richiesta, non uno streaming video continuo. Nel menu puoi attivare esplicitamente **Osservazione assistita**: invia un fotogramma ogni 15 secondi solo con tracking stabile, aggiornando il contesto senza avviare monologhi o azioni. È disattivata di default e si spegne in background.

Backend iniziale: `https://neo-mr-avatar-test.sk1kko.chatgpt.site`. Gli endpoint sono `/api/personal-neo/token` e `/api/personal-neo/knowledge`. Non inserire chiavi OpenAI in Xcode, Info.plist o nel bundle. Il server mantiene la chiave già configurata per NEO, separando prompt/tool dalle sessioni di Robot Buddy.

## Cosa significa comprensione dell’ambiente

ARKit rileva geometria e tracking; LiDAR aggiunge profondità, mesh, occlusione e collisioni stimate. L’LLM riconosce oggetti in una foto e propone bounding box 2D e categorie. La fusione usa il frame/posa della foto, non la posizione della camera dopo la risposta: proietta il centro osservato nella depth map oppure esegue un raycast su superfici misurate. Se manca una misura, l’oggetto resta **solo visivo**, senza coordinate inventate. Le posizioni sono stime del centro, non sagome complete, riconoscimento universale o prova di un contatto preciso.

Il registro degli oggetti dura nella memoria della visita; una nuova osservazione sostituisce la precedente e cambia gli ID, così un tool tardivo non punta per errore un oggetto nuovo. Il modello chiama soltanto azioni disponibili, validate nell’app. Non eseguiamo codice, animazioni o procedure arbitrarie estratte dal web.

## Interazioni iniziali

- **Camminare e seguire**: passo procedurale lento (0,42 m/s), distanza discreta dall’utente, sguardo verso la camera. «Avvicinati alla sedia» usa solo un oggetto localizzato meno di 30 secondi fa, entro 3 m, con arresto a 75 cm. Ogni tratto verifica pavimento sotto i piedi e sweep a nove raggi su mesh/furniture misurati; geometria ignota, ostacoli o tracking limitato fermano il movimento. Non è navigazione universale: percorsi diretti, nessun aggiramento automatico, ostacoli sottili/mobili/non scansionati possono sfuggire.
- **Indicare** un oggetto localizzato, fermando la camminata.
- **Sedere** su una superficie orizzontale selezionata esplicitamente: posizione virtuale da controllare visivamente.
- **Pianoforte** come prima interazione precisa: tastiera a 88 tasti, calibrazione di tre punti reali (LA0 e DO8 alla stessa profondità, poi bordo posteriore di un tasto centrale). Raycast solo su superfici misurate. La geometria ricostruisce tutti gli 88 tasti e distingue bianchi/neri.
- **Suonare** una scala di DO o l’Inno alla gioia: posa seduta, IK di braccio/mano verso la posizione del tasto, **suono sintetico nell’app**, senza indicatori sovrapposti. Non vengono mossi tasti fisici. Per suono di uno strumento esterno servirebbe un’integrazione MIDI; per pressione meccanica serve un attuatore esterno, non implementati.
- **Judo**: saluto e schema illustrativo di spostamento sul rig. Non è motion capture, una lezione certificata o apprendimento automatico di nuove mosse da un manuale. Non invita a replicare con telefono in mano.

Il contatto dita/tasti, la posa seduta e la geometria vanno validati su iPhone/pianoforte reale; la sola build non li certifica. Per altri oggetti aggiungere un adattatore di interazione e relativa calibrazione, senza cambiare voce o fusione di scena.

## Test e distribuzione

Lo schema **MyPersonalNeo** comprende `MyPersonalNeoTests`: mapping tasti e rotazione, calibrazioni non valide, coordinate immagine/depth, autorizzazione dei turni e caricamento effettivo del rig USDZ. La pipeline `.github/workflows/personal-neo-ios.yml` esegue `xcodebuild test` su macOS con simulatore iPhone senza firma. Il simulatore non può verificare ARKit/LiDAR fisici. I risultati verificati sono in [docs/MY_PERSONAL_NEO.md](../docs/MY_PERSONAL_NEO.md).

Per distribuire via TestFlight: dopo il test dispositivo, imposta bundle ID/team/versione, crea la scheda App Store Connect, seleziona **Any iOS Device → Product → Archive → Distribute App → App Store Connect**. Aggiungi tester e verifica le dichiarazioni privacy (il manifest include foto/video, audio e contenuti utente inviati all’AI per funzionalità dell’app, senza tracking o identificativo utente allegato), inclusa la trasmissione a OpenAI e le eventuali conservazioni del provider. Non è stato eseguito alcun upload né creata una distribuzione TestFlight; non servono certificati per leggere o testare il progetto nel simulatore.

## Asset e riproducibilità

**Microsoft Rocketbox**, [repository ufficiale](https://github.com/microsoft/Microsoft-Rocketbox), [MIT](https://github.com/microsoft/Microsoft-Rocketbox/blob/master/LICENSE.md), revisione `0943055db6ec570bcef9f2c8b41c9e5467c808f9`. Tre persone virtuali adulte con texture di pelle/vestiti/capelli; nomi Sofia/Luca/Elena solo nell’app. Licenza completa nel bundle. Non richiedono account, un generatore esterno o download a runtime. Non è scansione di una persona scelta dall’utente né qualità cinematografica: asset realistici per mobile, volto animato in modo essenziale.

| Avatar | Originale | Joint | Triangoli | USDZ | Altezza |
|---|---|---|---|---|---|
| Sofia | Female_Adult_01 | 80 | 8,732 | 5,914,705 B | 1.68 m |
| Luca | Male_Adult_01 | 80 | 7,440 | 5,610,896 B | 1.78 m |
| Elena | Female_Adult_02 | 80 | 8,940 | 6,610,954 B | 1.65 m |

Tre mesh skinnate per persona, cinque texture diffuse/normal PNG fino a 1024 px, hair alpha cutout. Si carica un solo avatar per volta. Conversione FBX→glTF con Assimp 5.4.3→USD Skel con OpenUSD; joint riordinati e assi uniformati, pesi rimappati, scala metrica. Manifest con hash sorgenti e bundle. Pose, camminata, sguardo, bocca semplificata e IK sono locali; nessun motion clip scaricato. Preview JPG dagli originali, fonte e licenza identiche. Il robot precedente resta nel progetto web, non è più incluso nel bundle iOS.

Per creare corpi personalizzati esiste anche [MakeHuman](https://static.makehumancommunity.org/makehuman/faq/are_makehuman_files_free.html), con output del core CC0; non è integrato e gli asset community hanno licenze proprie. Per questa revisione abbiamo integrato direttamente tre modelli pronti, senza passare da servizi con quote o condizioni di esportazione variabili.

Rigenerazione opzionale, non necessaria per aprire Xcode:

```sh
python3 -m venv /tmp/neo-usd-tools
/tmp/neo-usd-tools/bin/pip install usd-core==26.8 numpy==2.5.4 Pillow==12.2.0
# Assimp 5.4.3 deve essere disponibile nel PATH (oppure ASSIMP=/percorso/assimp).
/tmp/neo-usd-tools/bin/python scripts/native/convert-humanoid.py
python3 scripts/native/generate-project.py
```

Xcode project e USDZ sono già versionati. WebRTC resta un package esterno con la propria licenza e gli avvisi upstream.

## Ascolto e recupero · revisione 2

WebRTC con cancellazione eco/rumore, near-field e VAD dedicato al nativo (threshold 0,6, silenzio 650 ms; Robot Buddy invariato). VAD non cancella risposte. Una frase riconosciuta di almeno due parole e 320 ms può interrompere; «stop», «aspetta», «no» e altre interruzioni esplicite funzionano da 180 ms. Una parola isolata generica durante il parlato non interrompe, mentre un nome o una risposta breve a NEO fermo restano validi. Le soglie sono euristiche, non riconoscimento del parlante; vanno tarate sul dispositivo. Si usa la durata audio del singolo item, sottraendo padding/silenzio: un ASR lento non trasforma un click in parlato lungo. Se manca l’ASR, viene chiesto di ripetere senza autorizzare strumenti.

Watchdog risposta e invio RTP, riattivazione della traccia e riconnessione automatica quando il trasporto si ferma. Cambio uscita audio senza spegnere il microfono; chiamate iOS sospendono l’audio e la fine dell’interruzione tenta il ripristino. Gli ultimi otto messaggi restano solo in RAM per recuperare contesto/nome dopo una riconnessione, cancellati alla fine dell’esperienza; nessuna nuova persistenza di dialoghi. Le restrizioni iOS possono impedire registrazione durante chiamate/background. Nessuna equivalenza prestazionale con la modalità vocale ChatGPT è certificata.
