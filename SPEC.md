# Quest Pro — Conversational MR Avatar

**Specifica eseguibile per Codex · MVP v1.1 · 10 ottobre 2026**

> **Obiettivo per Codex:** crea una web app completa e testabile sul **Meta Quest Pro**, senza Unity, che visualizzi nel passthrough un avatar tridimensionale **con i piedi sul pavimento e una posizione stabile nella stanza**, con cui conversare a voce in italiano mediante **OpenAI Realtime API**. Prepara il progetto per **deploy HTTPS**; Sites soltanto se disponibile nel territorio/workspace. Non fermarti a un mockup o a una pagina dimostrativa: implementa le funzionalità, i test e la gestione degli errori descritti sotto.
>
> **Vincolo di sicurezza:** non chiedere mai di incollare la chiave OpenAI in una pagina web, un prompt, il codice sorgente o un file tracciato da Git. Usa `OPENAI_API_KEY` soltanto lato server, come segreto del runtime Sites.

## 1. Risultato atteso

L'utente indossa il Quest Pro, apre l'URL HTTPS pubblicato in **Meta Quest Browser**, seleziona **Entra in realtà mista**, vede la propria stanza attraverso il passthrough a colori e posiziona un avatar **a scala umana** sul pavimento. L'avatar resta **nello stesso punto del mondo** mentre l'utente gira la testa, cammina e gli gira intorno. L'utente avvia la conversazione, parla nel microfono del visore e riceve risposte vocali naturali dall'avatar. Il personaggio passa tra animazioni appropriate (attesa, ascolto, risposta, saluto, reazioni), con un semplice indicatore di parlato e **movimento della bocca approssimato dall'ampiezza audio**. Dopo la chiusura e riapertura della sessione, l'app prova a ripristinare l'ancoraggio salvato.

### Criteri di accettazione prioritari

1. **MR reale sul Quest Pro:** sessione WebXR `immersive-ar`, sfondo trasparente, passthrough visibile.
2. **Piedi sul pavimento:** posizionamento rispetto al piano rilevato; fallback funzionale con `local-floor` e calibrazione manuale dell'altezza.
3. **World locking:** l'avatar non è figlio della camera; resta nello spazio reale quando la testa si muove o ruota.
4. **Anchoring:** usa WebXR Anchors quando disponibile; ripristina un persistent anchor quando consentito e possibile; fallisce in modo esplicito e recuperabile.
5. **Conversazione vocale bidirezionale:** microfono Quest → OpenAI Realtime API → voce riprodotta nel visore; avvio e stop espliciti.
6. **Avatar animato:** modello 3D locale al progetto; animazioni di base e almeno tre emote funzionanti; sincronizzazione visiva del parlato **best effort**, non visemi fonetici.
7. **Sicurezza e deploy:** chiave solo lato server; sito pubblicato via Sites se il runtime supporta tutte le API effettivamente necessarie; test finale sull'URL di produzione.

> **Nota sul perimetro:** l'avatar NON deve riconoscere sedie, tavoli o persone tramite le telecamere, muoversi autonomamente nella stanza, navigare ostacoli, né mantenere una memoria cloud tra sessioni. L'obiettivo è una presenza spaziale credibile e una conversazione naturale. La persistenza qui riguarda **la posizione**, non la cronologia del dialogo.


## 1 bis. Estensione multi-device obbligatoria (decisione del 10 ottobre 2026)

**Unico codebase e backend voce, tre modalità d'uso:**

| Dispositivo | Rendering | Posizionamento | Voce OpenAI |
|---|---|---|---|
| Meta Quest Pro / Quest Browser | `immersive-ar`, passthrough a colori | `local-floor`, plane detection + XR anchors se disponibili | Microfono visore, WebRTC |
| Android compatibile ARCore, Chrome | `immersive-ar` WebXR se supportato | Hit-test/plane detection e ancoraggio di sessione con feature detection, fallback calibrazione | Microfono smartphone, WebRTC |
| iPhone / Safari iOS | Three.js 3D nel browser (NON WebXR AR) | Scena 3D orbitabile; nessuna pretesa di world-locking nella stanza | Microfono smartphone, WebRTC |

**UX:** rilevamento capability all'avvio, non solo user agent; selettore/pulsante «Entra in realtà mista» solo dove `navigator.xr.isSessionSupported('immersive-ar')` lo conferma; «Anteprima 3D» ovunque; tasti touch responsivi e gestione dei permessi microfono. Su iPhone, non simulare AR usando soltanto la fotocamera: il requisito iOS MVP è **visualizzazione 3D + conversazione**. Un eventuale Quick Look USDZ non condivide automaticamente audio/conversazione live e non è parte di questa v1.1.

**Test aggiuntivi obbligatori:** verificare Android Chrome con un dispositivo ARCore reale; iPhone Safari per rendering, gesture touch, audio unlock e conversazione; testare cambio orientamento, ritorno da background, interruzione chiamata e permessi negati. Non dichiarare che i tre dispositivi supportano le medesime API spaziali.

## 1 ter. Avvio in Codex Cloud e pubblicazione: vincoli aggiornati

**Codex Cloud:** il passaggio del progetto avviene tramite repository GitHub selezionato nell'ambiente Cloud. Creare o selezionare un repository dedicato, caricare questa specifica e lo starter, pubblicare l'ambiente Cloud e avviare la task Codex leggendo `AGENTS.md` e questo documento. Non presumere che allegare un file a una chat lo trasmetta automaticamente a Codex Cloud. Codex deve operare su branch dedicato, rendere disponibili diff, test e PR.

**Disponibilità Sites:** al 10 ottobre 2026 la guida ufficiale OpenAI indica che **Sites non è disponibile nello Spazio Economico Europeo, inclusa l'Italia**. Questo cambia la raccomandazione precedente che presumeva accessibilità su Plus. Non bloccare lo sviluppo: mantenere applicazione distribuibile anche con Node.js su un host HTTPS (per esempio Google Cloud Run, previa scelta dell'utente). **Non eseguire deploy su servizi esterni senza conferma dell'ambiente e credenziali.** L'API key OpenAI resta segreto esclusivamente server-side. L'abbonamento ChatGPT Plus non copre il consumo di API OpenAI.

**Stato codice scaffold consegnato:** anteprima Three.js con placeholder procedurale e download script RobotExpressive, rilevamento WebXR, posizionamento preliminare su `local-floor`, anchor di sessione quando disponibile, backend token temporaneo e WebRTC, responsive UI e fallback iOS. **Da completare/validare:** floor-plane detection, hit-test, ancoraggi persistenti, UI immersiva per voce, build/typecheck e test su dispositivi fisici. Non dichiararli funzionanti finché non passano prove reali.

---

## 2. Architettura proposta

```text
Quest Pro / Meta Quest Browser (HTTPS)
 ├── WebXR immersive-ar → passthrough + tracking 6DoF
 ├── ReferenceSpace local-floor + XRPlane (se disponibili)
 ├── XRAnchor + persistent handle (se disponibili)
 ├── Three.js → GLB, AnimationMixer, grafica/UI 3D
 ├── getUserMedia(microfono) + AudioContext/AnalyserNode
 └── WebRTC (audio + data channel)
           │                   ▲
           │ client secret     │ audio di risposta
           ▼                   │
 Server HTTPS / API route (Sites soltanto se disponibile)      │
 └── POST /api/realtime-token   │
     └── OpenAI API: client secret temporaneo
         (OPENAI_API_KEY solo server)
                    │
                    ▼
          OpenAI Realtime API
       (gpt-realtime-2.1-mini)
```

**Stack preferito:** TypeScript + Vite + Three.js + GLTFLoader + WebXR API native. Interfaccia 2D essenziale in HTML/CSS; per i controlli visibili *durante* la sessione XR usare mesh/UI 3D con interazioni controller, invece di dare per scontato il DOM Overlay. Usa l'architettura full-stack compatibile con Sites e le sue route server; **non richiedere un processo Node persistente o WebSocket custom lato Sites**. Puoi adattare il framework allo starter ufficiale Sites, ma non cambiare i requisiti.

### Compatibilità da verificare prima dell'implementazione estesa

- Supporto `navigator.xr` e `navigator.xr.isSessionSupported('immersive-ar')` sul visore.
- `XRSession` con `local-floor`; plane detection, anchors e persistenza: **feature detection effettiva**, non user-agent sniffing.
- Possibilità per il runtime di ChatGPT Sites di distribuire asset GLB, erogare `/api/realtime-token` **sul server**, accedere in HTTPS a microfono e WebRTC, e aprire l'esperienza in finestra **top-level**, non in un iframe di anteprima.
- Se Sites non supporta un elemento indispensabile, **segnala il blocco con evidenza e proponi una correzione o una modalità di distribuzione alternativa; non simulare il requisito e non dichiarare successo.** L'obiettivo rimane Sites, senza passare automaticamente a hosting esterni.

## 3. Avatar placeholder scelto: RobotExpressive (CC0)

**Asset:** `RobotExpressive.glb` di Tomás Laulhé, adattato da Don McCurdy, disponibile negli esempi ufficiali Three.js. **Licenza: CC0 1.0**; registra comunque gli autori in `ASSET_CREDITS.md`.

- Scheda e licenza: <https://github.com/mrdoob/three.js/blob/dev/examples/models/gltf/RobotExpressive/README.md>
- Download modello: <https://github.com/mrdoob/three.js/blob/dev/examples/models/gltf/RobotExpressive/RobotExpressive.glb>
- URL asset diretto: <https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/RobotExpressive/RobotExpressive.glb>
- Esempio ufficiale con animazioni: <https://threejs.org/examples/webgl_animation_skinning_morph.html>
- Sorgente dell'esempio Three.js: <https://github.com/mrdoob/three.js/blob/dev/examples/webgl_animation_skinning_morph.html>

**Clip verificate nell'esempio Three.js:** `Idle`, `Walking`, `Running`, `Dance`, `Death`, `Sitting`, `Standing`, `Jump`, `Yes`, `No`, `Wave`, `Punch`, `ThumbsUp` (non necessariamente tutte utili nel MVP). **Morph target facciali:** `Angry`, `Surprised`, `Sad`. Non presumere che il modello fornisca visemi o un blendshape `mouthOpen`: **non li offre come prerequisito garantito**. Implementare il parlato con un piccolo elemento bocca 3D aggiuntivo agganciato alla testa, oppure un indicatore emissivo sulla faccia, pilotato dall'ampiezza della voce, con animazioni leggere della testa. Il risultato è **lip-sync visivo approssimativo**, non fonetico.

**Istruzioni asset per Codex:** scarica il `.glb` una sola volta in `public/models/RobotExpressive.glb`; non usare fetch runtime a GitHub; verifica caricamento e nomi delle clip a build/runtime; centra il modello sui piedi tramite bounding box, calibra una statura target di circa **1,5–1,7 metri** e mantieni altezza e scala configurabili. Non usare asset con licenza sconosciuta.

## 4. Requisiti funzionali

### 4.1 Avvio, diagnostica e fallback desktop

- Pagina di ingresso con nome app, pulsante **Entra in MR**, **Anteprima 3D desktop** e breve messaggio sui permessi di stanza/microfono.
- Esegui capability detection e visualizza diagnostica leggibile: WebXR AR, floor reference, plane detection, anchors, persistent anchors, microfono, connessione voce, asset loaded.
- Non richiedere il microfono prima del click dell'utente su **Parla con l'avatar**.
- Su desktop senza WebXR mostra una scena 3D orbitabile con pavimento simulato; disabilita in modo trasparente funzionalità reali di mixed reality/ancoraggio.
- Nel visore rendi il mondo virtuale trasparente, senza skybox opaco. Non presentare il video passthrough come una texture accessibile: il browser **non espone i pixel della camera**.

### 4.2 Pavimento e posizionamento

1. Richiedi una sessione `immersive-ar` e `local-floor` se supportato. Richiedi `plane-detection` e `anchors` con gestione di indisponibilità/permessi; se una feature opzionale fa fallire la sessione, riprova senza quella feature ma mostra lo stato ridotto.
2. Attendi alcuni frame / almeno **2–3 secondi** per la popolazione di `session.detectedPlanes` prima di concludere che non sono presenti superfici.
3. Se ci sono piani orizzontali, identifica il pavimento in maniera ragionevole (orientamento, quota rispetto a `local-floor`, estensione e vicinanza); **non** confondere il piano di un tavolo con il pavimento. Mostra una preview della posizione proposta e chiedi un click per confermare.
4. Se il pavimento non è rilevato, usa `local-floor` come quota iniziale `y=0` **solo se quel riferimento è disponibile e calibrato**; altrimenti chiedi calibrazione manuale. Fornisci `±` per regolare l'altezza e mostra un marcatore temporaneo ai piedi.
5. La prima posizione suggerita è circa **1,5–2 metri davanti all'utente**, con la base del modello a contatto col piano e volto rivolto verso chi lo posiziona. Non mantenere mai la coordinata di camera come parent dell'avatar dopo la conferma.
6. Consenti **Riposiziona** tramite controller/ray, oppure un flusso con marker e conferma se il raycast verso il pavimento non è disponibile. Salva una sola posizione per stanza/sessione in v1.
7. Se il piano non è più tracciato, **non attaccare l'avatar alla camera**; mantieni l'ultima posa valida e indica tracking degradato.

### 4.3 Anchor spaziale e persistenza

- Alla conferma della posa crea un `XRAnchor` (con la API supportata dall'implementazione corrente), associato al `XRSpace` opportuno.
- Ad ogni frame applica all'avatar la posa ottenuta dall'`anchorSpace` rispetto al reference space, gestendo pose temporaneamente non disponibili.
- Se disponibile, usa `requestPersistentHandle()` e conserva l'handle in `localStorage` sullo **stesso origin**. Alla sessione successiva tenta `restorePersistentAnchor(handle)`.
- Se il ripristino non funziona, mostra **Posizione non recuperata — riposiziona**, senza inventare una posizione stabile dalla sola stringa in storage.
- Offri **Reset posizione**: elimina l'handle sia dallo storage locale sia dal dispositivo tramite le API di eliminazione se esposte, poi torna al posizionamento iniziale.
- Ricorda i limiti di Meta: massimo **8 anchor persistenti** per sito e persistenza non garantita in modalità privata, dopo cancellazione della cronologia del sito o se cambiano permessi/configurazione della stanza.
- La posa deve restare stabile mentre l'utente ruota la testa, fa qualche passo e gira intorno all'avatar; **l'orientamento di testa/corpo può seguire l'utente con moderazione, ma la posizione world-space rimane fissa**.

### 4.4 Gestore delle animazioni

Crea `AvatarController` usando `THREE.AnimationMixer`, transizioni `crossFadeTo`/fade e un piccolo state machine:

| Stato | Comportamento |
|---|---|
| `idle` | `Idle` in loop, respirazione/micro-movimenti leggeri |
| `greeting` | `Wave` una volta, poi `Idle` |
| `listening` | `Idle` + orientamento lieve della testa verso utente, indicatore ascolto |
| `thinking` | `Idle`, piccolo gesto naturale senza interrompere l'audio |
| `speaking` | `Idle` + mouth proxy sincronizzato con RMS audio + piccoli gesti occasionali (`Yes`, `ThumbsUp`) |
| `positive` | `ThumbsUp` una volta, poi `Idle` |
| `negative` | `No` una volta, poi `Idle` |
| `error` | indicatore discreto + eventuale morph `Sad` |

- Non accumulare gesture incontrollate. Distinguere clip one-shot e loop; interrompere/crossfadare le one-shot quando necessario.
- Usa i morph `Angry`, `Surprised`, `Sad` solo quando appropriato; transizioni morbide.
- Movimento parlato: l'audio remoto WebRTC confluisce in un `AudioContext`/`AnalyserNode`; stima RMS/envelope, applica smoothing e mappa l'energia ad apertura bocca simulata, con quiet threshold. **Non far parlare la bocca quando l'audio è mutato o assente.**
- Aggiorna `AnimationMixer` sul delta time, non creando nuovi oggetti/clip ogni frame. Riduci draw call ed effetti superflui sul Quest Pro.
- Opzionale: un canale dati OpenAI può pilotare lo stato di risposta; non richiedere output strutturato aggiuntivo del modello per scegliere ogni gesto.

### 4.5 Voce e LLM OpenAI

**Modello di default:** `gpt-realtime-2.1-mini` per il costo inferiore del test; rendere configurabile lato server `gpt-realtime-2.1` per confronto qualitativo. **Lingua:** italiano; voce supportata dal modello, inizialmente `marin` se disponibile nella configurazione corrente (se non lo è, selezionarne una documentata senza bloccare l'MVP).

- Utilizzare **WebRTC** per audio a bassa latenza e un data channel per eventi e stato. Browser: `getUserMedia({ audio: true })`, `RTCPeerConnection`, traccia audio remota con riproduzione udibile nel visore.
- Sul server implementare `POST /api/realtime-token`: autentica/limita la chiamata secondo le funzionalità di Sites, legge `process.env.OPENAI_API_KEY`, chiama `POST https://api.openai.com/v1/realtime/client_secrets`, restituisce **solo** il client secret temporaneo e le informazioni strettamente necessarie.
- Per la configurazione della sessione usa **l'API GA corrente**, non l'endpoint legacy `/v1/realtime/sessions`. Non usare la normale API key direttamente dal client, nemmeno temporaneamente.
- Client: richiede il token alla propria route, crea offer SDP e connette a `https://api.openai.com/v1/realtime/calls` secondo la guida WebRTC corrente. Implementa lifecycle, error handling e chiusura della peer connection.
- Impostare istruzioni dell'avatar: amichevole, concreto, in italiano, conversazione breve, naturale, non finge di vedere l'ambiente fisico o di riconoscere oggetti.
- Voice activity detection configurata per turni conversazionali naturali, con interruzioni/barging-in quando supportate; gestire la transizione ascolto → risposta e ritorno.
- Consentire **Avvia conversazione**, **Disattiva/Riattiva microfono**, **Termina conversazione**. Chiudendo, fermare le tracks e liberare risorse audio/WebRTC.
- Fallback di debug: mostra trascrizione del dialogo solo quando disponibile negli eventi Realtime e non come sostituzione forzata dell'audio.
- Visualizzare errori chiari per microfono negato, sessione non autorizzata, quota raggiunta, rete indisponibile, modello non abilitato, audio che non parte.
- Su Safari/Browser embedded non garantire playback automatico: chiedi un'interazione esplicita prima dell'avvio e usa un meccanismo di audio unlock appropriato.

#### Prompt di sistema suggerito

```text
Sei NEO, un avatar tridimensionale presente nella stanza dell'utente tramite realtà mista.
Parla in italiano in modo naturale, amichevole e sintetico. Usa frasi relativamente brevi
adatte al dialogo vocale. Puoi discutere liberamente di argomenti generali e rispondere
alle domande. Sai di essere visualizzato in un ambiente fisico, ma NON hai accesso ai
fotogrammi delle telecamere né riconosci automaticamente oggetti, persone o gesti.
Se l'utente ti chiede cosa stai vedendo, dichiara il limite e chiedi una descrizione.
Non affermare di poterti muovere o interagire fisicamente con gli oggetti.
```

### 4.6 UI minima e debug

**Prima di entrare in MR:** titolo, verifica compatibilità, tasto MR, tasto anteprima 3D, breve spiegazione dei permessi.

**Dentro MR:** indicatore contestuale con stato `Posiziona` / `Pronto` / `Ascolto` / `Rispondo` / `Errore`; azioni **Posiziona**, **Conferma**, **Riposiziona**, **Avvia/Termina voce**, **Mute**, **Reset anchor**. Usa un pannello 3D ancorato temporaneamente allo sguardo o al controller **solo per la UI**, non per l'avatar, e dimensioni leggibili nel visore.

**Modalità debug attivabile:** reference space usato, n. piani, piano scelto, quota piedi, stato anchor (`session / persistent / failed`), stato peer connection, input mic, output audio level, FPS. Nessuna chiave, token o trascrizione sensibile nei log di produzione.

## 5. Struttura indicativa del progetto

Adattare a uno starter supportato da Sites, preservando responsabilità e nomi logici:

```text
/
├── README.md                       # setup locale, test Quest, deploy Sites
├── AGENTS.md                       # istruzioni durevoli per Codex
├── ASSET_CREDITS.md
├── .env.example                    # OPENAI_API_KEY= (mai il valore reale)
├── package.json
├── public/
│   └── models/RobotExpressive.glb
├── src/
│   ├── main.ts
│   ├── xr/
│   │   ├── capabilities.ts
│   │   ├── xrSession.ts
│   │   ├── floorPlacement.ts
│   │   └── anchors.ts
│   ├── avatar/
│   │   ├── AvatarController.ts
│   │   ├── animations.ts
│   │   └── speechVisual.ts
│   ├── audio/
│   │   ├── realtimeClient.ts
│   │   └── audioLevel.ts
│   ├── ui/
│   │   ├── ui2d.ts
│   │   └── ui3d.ts
│   └── styles.css
├── server/                         # oppure API routes native dello starter Sites
│   └── realtime-token.ts
└── tests/
    ├── placement.test.ts
    └── animation-state.test.ts
```

## 6. Piano operativo obbligatorio per Codex

**Esegui per fasi, senza fermarti dopo la progettazione.** Ogni fase produce codice, una build verificabile e un aggiornamento sintetico dello stato.

**Fase A — Compatibilità e scaffold.** Verifica documentazione corrente di Meta Quest Browser, Sites e OpenAI Realtime; crea starter full-stack compatibile con Sites; installa dipendenze minime; esegui `npm run build` e `npm run typecheck` (o equivalenti).

**Fase B — Avatar desktop.** Scarica RobotExpressive, aggiungilo localmente, renderizza scena preview, implementa scala/piedi e `AnimationMixer`, UI di stato, saluto e gesture manualmente provabili.

**Fase C — WebXR MR.** Implementa `immersive-ar`, passthrough trasparente, `local-floor`, plane detection, preview, conferma e posizionamento; assicurati che il root avatar non dipenda da head pose.

**Fase D — Anchor.** Aggiungi anchor alla posizione confermata, handle persistente e restore con fallback/diagnostica.

**Fase E — Conversazione.** Crea route server sicura per client secret, `RTCPeerConnection`, data channel, input/output audio, mute, stato VAD, errori e cleanup. Testa prima fuori da XR, poi in XR.

**Fase F — Animazioni conversazionali.** Collega transizioni agli eventi voce e ampiezza audio al mouth proxy. Riduci latenza percepita e jitter dell'avatar.

**Fase G — Quality gate e deploy HTTPS.** Esegui lint/typecheck/build/test automatici; prepara segreti nel runtime Sites senza includerli nel codice; crea una versione salvata, verifica il sito direttamente nel **Quest Browser sull'URL finale HTTPS**, poi pubblica soltanto la versione approvata e riporta URL e risultati reali del test.

**Cosa non fare:** niente Unity, APK, riconoscimento immagini, DB, login aggiuntivo complesso, avatar generativo, rigging manuale completo, editor 3D, infrastruttura esterna, API key nel frontend o simulazioni presentate come test effettivi del Quest.

## 7. Test e definizione di “fatto”

### Automatizzabili (Codex)

- `npm run build`, typecheck e lint passano; nessun errore JS bloccante nella demo desktop.
- Asset GLB caricato da URL relativo locale e clip `Idle`, `Wave`, `Yes`, `No`, `ThumbsUp` individuate.
- Test di unità della funzione che colloca il piede sul pavimento e delle transizioni degli stati animazione.
- Assenza di `OPENAI_API_KEY` e segreti nel bundle frontend e nel repository.
- `/api/realtime-token` gestisce metodi non consentiti, credenziali mancanti, errori upstream e limite richieste; non logga token o segreti.

### Da provare **fisicamente** con Quest Pro (non dichiarare verificati da test desktop)

| Test | Azione | Esito richiesto |
|---|---|---|
| MR | Aprire URL pubblicato, cliccare Entra in MR | Stanza reale visibile, avatar 3D renderizzato |
| Floor | Posizionare avatar | Piedi sul pavimento (eventuale correzione manuale) |
| Rotazione | Girare la testa a sinistra/destra | Avatar non segue la camera |
| Parallasse | Camminare 1–2 m e girargli intorno in sicurezza | Avatar resta nella medesima posizione fisica, salvo limitato drift tracking |
| Anchor | Recenter del visore, quando applicabile | Avatar mantiene allineamento il più possibile |
| Persistenza | Chiudere e riaprire sito nella stessa stanza | Tentativo di restore; se non riesce, errore chiaro e riposizionamento |
| Conversazione | Consentire microfono e parlare in italiano | Risposta OpenAI udibile, a turni naturali |
| Animazione voce | Parlare e attendere la risposta | Stato ascolto/risposta e bocca proxy coerenti con audio |
| Gestione errori | Negare microfono o staccare rete | UI recuperabile, nessuna pagina bianca |
| Pulizia | Terminare conversazione | Microfono e peer connection chiusi |

**Definizione di completamento:** il progetto è completo sul piano del codice solo quando tutti i controlli automatizzabili passano; è **validato su Quest Pro** soltanto dopo test fisici confermati; è **pubblicato** soltanto quando Sites restituisce un URL effettivo. Segnalare separatamente le voci ancora da verificare.

## 8. Distribuzione con ChatGPT Sites

1. Aprire **ChatGPT Work** sul web oppure **Work/Codex nell'app desktop** e avviare un progetto **@Sites**; chiedere di **importare/adattare il progetto Codex esistente** e controllare la compatibilità del runtime.
2. Creare il Site con accesso **solo proprietario / invitati** per il test, evitando l'esposizione pubblica dell'endpoint a chiunque.
3. Aprire **Sites → [progetto] → More actions → Settings**; aggiungere il segreto runtime `OPENAI_API_KEY` con il valore generato nella piattaforma API OpenAI. **Non** incollarlo nel testo di una chat o allegarlo a file. Configurare eventuale variabile non segreta per modello scelto.
4. Nella route token implementare controllo dell'accesso server, rate limit e controllo di uso; preferire un'identità autorizzata del Site dove disponibile. Le impostazioni di condivisione da sole non sono un sostituto di limiti sull'API.
5. Salvare una **versione** prima del deploy; poi distribuire su URL HTTPS Sites. Se si cambia un segreto, ridistribuire la versione appropriata.
6. Aprire **direttamente l'URL pubblicato** in Meta Quest Browser (non il riquadro preview incorporato in ChatGPT), concedere i permessi di spazio e microfono e completare i test del §7.
7. Se HTTPS, policy browser, iframe/Permissions-Policy, API server o supporto WebXR impediscono la prova, documentare l'esatto errore e non considerare il progetto validato.

> **Importante:** ChatGPT Plus/Sites e **l'API OpenAI hanno contabilità distinta**. La conversazione Realtime genera consumo API fatturabile; configura budget/limiti nell'account API. Per prove economiche usa `gpt-realtime-2.1-mini`, misura la durata delle sessioni e chiudi la connessione a fine test.

### Prompt finale da impartire a Codex / Sites

```text
Leggi QUEST_PRO_AR_AVATAR_MVP_CODEX.md e implementa integralmente il progetto.
Usa un progetto full-stack TypeScript compatibile con ChatGPT Sites,
Three.js + WebXR immersive-ar, il GLB RobotExpressive CC0 e OpenAI
Realtime API via WebRTC. Priorità assoluta: piedi sul pavimento,
world locking dell'avatar, anchor persistente con fallback, audio
bidirezionale stabile e chiave OpenAI solo lato server.

Implementa codice reale, non soltanto una demo visuale. Scarica l'asset
in public/models, predisponi route per client secret, test, README,
.env.example e ASSET_CREDITS.md. Esegui build/typecheck/test e risolvi
gli errori. Prepara un deploy con Sites, chiedendo esclusivamente la
configurazione del segreto OPENAI_API_KEY nel pannello sicuro di Sites.
Non dichiarare verificati i test hardware che non puoi eseguire.
Per la prova finale usa Meta Quest Pro e l'URL HTTPS effettivamente
pubblicato. Riporta URL, risultati, limitazioni e passi residui.
```

## 9. Fonti tecniche (verificate il 10/10/2026)

- Meta — Mixed Reality Support in Browser (Quest Pro, passthrough, piani, anchors): <https://developers.meta.com/vr/documentation/web/webxr-mixed-reality/>
- Meta — Browser specifications / capability detection: <https://developers.meta.com/vr/documentation/web/browser-specs/>
- Meta — WebXR overview: <https://developers.meta.com/vr/documentation/web/webxr-overview/>
- Three.js — RobotExpressive, autori e licenza CC0: <https://github.com/mrdoob/three.js/blob/dev/examples/models/gltf/RobotExpressive/README.md>
- Three.js — Example animations and facial morph targets: <https://threejs.org/examples/webgl_animation_skinning_morph.html>
- OpenAI — Realtime via WebRTC: <https://developers.openai.com/api/docs/guides/voice-webrtc>
- OpenAI — Create Realtime client secret: <https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create>
- OpenAI — Models and pricing: <https://developers.openai.com/api/docs/models> · <https://developers.openai.com/api/docs/pricing>
- OpenAI — ChatGPT Sites developer guide (hosting, versions, secrets): <https://learn.chatgpt.com/docs/sites>
- OpenAI — Creating and using ChatGPT Sites: <https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites>

---

**Stato attuale:** specifica di implementazione pronta; **MVP non ancora sviluppato, pubblicato o testato sul dispositivo**. Questo documento è l'input operativo per Codex.


## 8. Riferimenti aggiornati (10 ottobre 2026)

- OpenAI Codex Cloud: <https://learn.chatgpt.com/docs/cloud>
- Codex con piano ChatGPT e limiti Sites: <https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan>
- OpenAI Realtime WebRTC: <https://developers.openai.com/api/docs/guides/voice-webrtc>
- OpenAI client secrets: <https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create>
- Modello `gpt-realtime-2.1-mini`: <https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini>
- Meta WebXR Mixed Reality: <https://developers.meta.com/vr/documentation/web/webxr-mixed-reality/>
- Browser support WebXR: <https://caniuse.com/webxr>

## Aggiornamento autorizzato dall’utente — room scale

Le istruzioni successive dell’utente aggiornano i punti 4.2 e 4.3: prima posizione automatica a 1–1,5 m (target 1,3 m), sguardo continuo verso il visore anche passando dietro al robot. Il posizionamento manuale rimane un fallback e una correzione. In osservatorio il robot può seguire di lato con collisioni sull’ambiente virtuale noto; nella stanza reale si usa il fallback esplicitamente accettato dall’utente, posizione fissa e sguardo, senza presumere una mappa completa degli ostacoli dai piani XR. I requisiti hardware rimangono da verificare sul dispositivo fisico. Dettagli in docs/ROOM_SCALE.md.
