# NEO — Future Observatory

MVP React + TypeScript + Vite + Three.js/WebXR, con backend Node e voce OpenAI Realtime via WebRTC. RobotExpressive e gli asset Poly Haven CC0 sono inclusi nel repository: nessun asset remoto a runtime. [Architettura e prova dell’osservatorio](docs/FUTURE_OBSERVATORY.md).

Nuova revisione 3D: tram e treno visibili in tutti i temi, traffico critico che avanza, pedoni e ciclisti, officine e piazze animate. [Dettagli delle sei ambientazioni](docs/SIX_SCENARIOS.md). [Candidato umanoide futuristico](docs/HUMANOID_CANDIDATE.md), separato dal robot attuale.

Estensione narrativa dell’MVP: stanza 3D, città a profondità reale e sei futuri e trasformazione critico → sostenibile. **MR, voce live, persistenza e compatibilità su dispositivi fisici restano da validare.** [Risultati e limiti](docs/VALIDATION.md), [checklist hardware](docs/DEVICE_TESTS.md), [specifica](SPEC.md), [istruzioni progetto](AGENTS.md).

## Avvio locale

Richiede Node **24.5+** (consigliato ultimo Node 24 LTS) e npm.

```sh
npm ci
cp .env.example .env
npm run dev
```

Apri `http://localhost:5173`. Il proxy Vite inoltra `/api` al backend sulla porta 3000. `.env` è ignorato da Git ed è caricato soltanto dal processo server. In sviluppo lascia `APP_ORIGIN` vuoto e `REQUIRE_PROXY_AUTH=false`. Configura `OPENAI_API_KEY` nel runtime server tramite un gestore di segreti; un `.env` locale non tracciato è supportato per sviluppo. **Mai usare `VITE_*` per segreti**, inserire la chiave nella pagina, in una chat o nel repository. Senza chiave, la preview funziona e la route voce risponde 503 con un messaggio recuperabile.

```sh
npm run check
npx playwright install --with-deps chromium webkit
npm run test:e2e
npm run build
npm start
```

`npm start` serve il bundle e la stessa API su `http://localhost:3000`. I comandi Node usano `--use-env-proxy` per rispettare proxy HTTP/HTTPS del runtime senza disabilitare TLS. I test E2E avviano il server di produzione locale senza chiavi API e con trasporto microfono negato simulato. La CI esegue gli stessi quality gate e salva screenshot/trace.

## Funzionamento

- **Future Observatory:** sei futuri ambientali, economici e sociali, stanza 5 × 5 m, skyline 3D a tre profondità, vera parallasse, transizione di otto secondi, oggetti narrativi e ritorno sempre disponibile. Pulsanti e voce condividono lo Story Engine; scena e WebRTC restano separati.

- **Anteprima 3D:** scena orbitabile con mouse/touch, zoom, statura 1,5–1,7 m, saluto, approvazione e dissenso. Nessuna simulazione AR tramite videocamera su iPhone.
- **MR:** pulsante soltanto dopo `isSessionSupported('immersive-ar')`; sfondo trasparente e `local-floor`, oppure `local` con calibrazione manuale obbligatoria. L’avatar è nel world space della scena e si volta gradualmente verso il visore, anche quando gli si passa dietro.
- **Posizionamento:** avvio automatico a 1,3 m dopo tre secondi di ricerca del pavimento; se una superficie rilevata occupa il punto previsto, viene richiesta una posizione manuale. Quota/estensione/orientamento escludono tavoli dal pavimento; hit-test e scelta con ray/controller o tocco restano nel flusso manuale, con quota ±5 cm e conferma. Le superfici sono suggerimenti da verificare visivamente.
- **Anchor:** creazione sul frame attivo, aggiornamento da `anchorSpace`, salvataggio/restore dell’handle sullo stesso origin quando le API sono esposte. Un anchor recuperato è riusato se entro 20 cm dal punto atteso a 1,3 m davanti al visore; altrimenti viene sostituito. Posa congelata se il tracking degrada; reset locale e sul dispositivo se supportato. Un recenter senza anchor richiede nuovo posizionamento.
- **Voce:** microfono solo dopo click, secret effimero dal backend, SDP all'endpoint GA `/v1/realtime/calls`, VAD con interruzioni, mute/stop, cleanup e sblocco audio esplicito. Background, chiamate/interruzioni e perdita di rete terminano la sessione; la ripresa richiede un nuovo click.
- **Animazione:** `AnimationMixer`, crossfade e one-shot, head-follow lieve, gesture durante risposte lunghe. Bocca proxy sulla testa pilotata da RMS smussato dell'audio remoto effettivamente riprodotto: nessun visema fonetico, nessun movimento se l'audio è assente/bloccato.
- **Diagnostica:** capability, riferimento, piani, quota, anchor/persistenza, tracking, peer, livelli e FPS. Trascrizioni opzionali solo in memoria finché la vista debug è attiva, senza log di token o audio.

Nel visore punta il controller e usa il grilletto sul pannello 3D: Conferma, Riposiziona, Quota, Avvia/stop voce, Mute, Riattiva audio, Reset anchor, Esci. Toccare il pavimento sceglie un punto, poi occorre confermare. Se manca `local-floor`, regola il marker ai piedi e seleziona **Quota corretta**; se hai regolato la quota manualmente, conferma il punto.

## HTTPS e accesso privato

Il progetto produce `dist/` e `dist-server/`. Serve **entrambi** con Node dietro un reverse proxy HTTPS; un hosting esclusivamente statico non può erogare la route voce. Non occorrono WebSocket custom: l'audio WebRTC va dal browser a OpenAI, il backend usa soltanto HTTPS.

È incluso un esempio [Caddy](deploy/Caddyfile) per un host scelto dall'utente. L’adattamento Sites è pubblicato separatamente; il backend Node rimane disponibile per hosting autonomo. Configura nel runtime del server:

| Variabile | Valore / comportamento |
|---|---|
| `NODE_ENV` | `production` |
| `OPENAI_API_KEY` | Segreto server OpenAI |
| `REALTIME_MODEL` | Default `gpt-realtime-2.1-mini`; confronto `gpt-realtime-2.1`, se abilitato |
| `REALTIME_VOICE` | Default `marin`; configurabile con una voce supportata |
| `APP_ORIGIN` | Origin HTTPS esatto, senza slash finale |
| `REQUIRE_PROXY_AUTH` | `true` in produzione |
| `PROXY_AUTH_SECRET` | Segreto condiviso solo tra proxy e backend |
| `TRUST_PROXY_HOPS` | Numero esatto di proxy fidati, per esempio `1` con Caddy direttamente davanti a Node |
| `TOKEN_LIMIT_PER_MINUTE` | Default `5` per IP |
| `TOKEN_GLOBAL_LIMIT_PER_MINUTE` | Default `30` per processo |

Configura Caddy con `NEO_DOMAIN`, `NEO_USER`, `NEO_PASSWORD_HASH` (hash prodotto con `caddy hash-password`) e lo stesso `PROXY_AUTH_SECRET`. Il proxy autentica tutto il sito e **sovrascrive** gli header `X-NEO-USER` e `X-NEO-PROXY-SECRET`. Il backend verifica il segreto con confronto a tempo costante. Il porto Node deve essere accessibile soltanto dal proxy; gli header inviati direttamente dal browser non sono un'identità.

In produzione la voce rifiuta accessi senza configurazione autenticata, origin corretto e prova del proxy. La route applica rate limit globale/per IP, `no-store`, timeout upstream e risposte sanificate; non accetta impostazioni del modello dal client. Sono impostati CSP, `frame-ancestors 'none'`, permessi microfono/XR sullo stesso origin e videocamera disabilitata. I piedi e il passthrough usano WebXR, non i pixel della videocamera.

I limiter sono in memoria **per processo**: per questo MVP usa una sola istanza. Prima di scalare occorre un limite condiviso presso il gateway. Il timer browser chiude le sessioni dopo 10 minuti, ma non è un limite contabile affidabile: un utente autorizzato può modificare il client. Configura budget e limiti nell'account OpenAI. ChatGPT e le API hanno fatturazione separata.

### Sites

Sito di test **pubblico**: **https://neo-mr-avatar-test.sk1kko.chatgpt.site** (aprire direttamente nel Meta Quest Browser; nessun login ChatGPT). Il sorgente Sites usa Vinext e route server Worker native e abilita esplicitamente l’avvio voce anonimo, con origine esatta e limiti di richiesta; non esegue Express nel Worker. La chiave esistente rimane un segreto backend, senza variabili `VITE_*`. Dopo modifiche ai segreti occorre ridistribuire la versione perché il deployment usa una revisione del runtime.

Questa repository conserva il backend Node richiesto da AGENTS.md; l’adattamento Sites riusa lo stesso frontend e protocollo Story Engine. Servire solo `dist/` su hosting statico non abilita la voce. Lo stato dettagliato delle verifiche è in `docs/VALIDATION.md`; hardware e OpenAI live non sono attestati dai test automatici.

## Struttura

`src/App.tsx` contiene l'interfaccia React; `src/Experience.ts` gestisce scena e lifecycle. `src/xr` isola capability, pavimento, sessione e anchor; `src/avatar` animazioni e bocca; `src/audio` WebRTC/RMS; `src/ui/ui3d.ts` il pannello immersivo. `src/story` valida la narrazione; `src/observatory` contiene stanza, città, qualità e suoni. `server/` contiene backend sicuro e configurazione Realtime/Story; `tests/` test unitari, API e browser. [Crediti asset](ASSET_CREDITS.md).

## Fonti verificate

- [OpenAI Realtime WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc): client secret GA, SDP e data channel.
- [Meta Mixed Reality in Browser](https://developers.meta.com/vr/documentation/web/webxr-mixed-reality/): rilevamento capability, attesa dei piani, anchor e limiti di persistenza.
- [RobotExpressive](https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf/RobotExpressive): asset, clip e licenza CC0.

Il Quest può conservare al massimo otto anchor persistenti per origin; modalità privata, cancellazione dati o cambiamenti nei permessi della stanza possono invalidarli. L'app mantiene una sola posizione e non promette persistenza senza verifica hardware.

## Controlli Quest e voce protetta

Il menu si chiude dopo il posizionamento: A/X o presa lo richiamano, grilletto/pinch selezionano e lo stick sceglie i pulsanti. Anche i comandi chiusi restano fermi nello spazio. Un indicatore accanto a NEO mostra quando si può parlare, quando ascolta, risponde o ha il microfono spento/in pausa. **Interrompi NEO / Riprendi ascolto** restituisce il turno senza riconnettere. Una pausa di focus XR si rimuove al ritorno, conservando il mute manuale. Le interruzioni intelligenti attendono una parola trascritta; resta disponibile la modalità protetta. Il selettore e il dock Quest cambiano tema senza uscire dall’osservatorio, anche durante le transizioni. Tutti i sei futuri hanno attività animata fin dall’ingresso e il confronto critico/sostenibile funziona in entrambe le direzioni. Il menu arrotondato viene collocato in alto a destra su apertura esplicita e rimane world-locked. NEO si presenta, chiede il nome e lo ricorda nella pagina; risponde normalmente in 10–25 parole, con informazioni concrete e domande solo quando utili. [Scenari e dialogo](docs/SIX_SCENARIOS.md). [Correzione ascolto e UX](docs/VOICE_UX.md). [Controlli e limiti](docs/QUEST_INTERACTION.md).

NEO guarda il visore a 360° in tutti gli stati. Nell’osservatorio room scale segue lentamente di fianco, con collisioni su pareti e arredi virtuali; in MR resta ancorato e si volta, perché i piani WebXR non garantiscono una mappa completa dei mobili reali. [Posizionamento, seguito e limiti](docs/ROOM_SCALE.md).
