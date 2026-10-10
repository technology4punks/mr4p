# NEO — Future Observatory

MVP React + TypeScript + Vite + Three.js/WebXR, con backend Node e voce OpenAI Realtime via WebRTC. RobotExpressive e gli asset Poly Haven CC0 sono inclusi nel repository: nessun asset remoto a runtime. [Architettura e prova dell’osservatorio](docs/FUTURE_OBSERVATORY.md).

Estensione narrativa dell’MVP: stanza 3D, città a profondità reale e trasformazione ambientale critico → sostenibile. **MR, voce live, persistenza e compatibilità su dispositivi fisici restano da validare.** [Risultati e limiti](docs/VALIDATION.md), [checklist hardware](docs/DEVICE_TESTS.md), [specifica](SPEC.md), [istruzioni progetto](AGENTS.md).

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

- **Future Observatory:** visita ambientale, stanza 5 × 5 m, skyline 3D a tre profondità, vera parallasse, transizione di otto secondi, oggetti narrativi e ritorno sempre disponibile. Pulsanti e voce condividono lo Story Engine; scena e WebRTC restano separati.

- **Anteprima 3D:** scena orbitabile con mouse/touch, zoom, statura 1,5–1,7 m, saluto, approvazione e dissenso. Nessuna simulazione AR tramite videocamera su iPhone.
- **MR:** pulsante soltanto dopo `isSessionSupported('immersive-ar')`; sfondo trasparente e `local-floor`, oppure `local` con calibrazione manuale obbligatoria. Solo la UI 3D segue l'utente; l'avatar è nel world space della scena.
- **Posizionamento:** marker a circa 1,75 m, attesa di tre secondi prima di valutare i piani sul `XRFrame`, quota/estensione/orientamento per escludere tavoli, hit-test opzionale vicino al pavimento, scelta con ray/controller o tocco, quota ±5 cm e conferma esplicita. Le superfici sono suggerimenti da verificare visivamente.
- **Anchor:** creazione sul frame attivo, aggiornamento da `anchorSpace`, salvataggio/restore dell'handle sullo stesso origin quando le API sono esposte. Posa congelata se il tracking degrada; reset locale e sul dispositivo se supportato. Un recenter senza anchor richiede nuovo posizionamento.
- **Voce:** microfono solo dopo click, secret effimero dal backend, SDP all'endpoint GA `/v1/realtime/calls`, VAD con interruzioni, mute/stop, cleanup e sblocco audio esplicito. Background, chiamate/interruzioni e perdita di rete terminano la sessione; la ripresa richiede un nuovo click.
- **Animazione:** `AnimationMixer`, crossfade e one-shot, head-follow lieve, gesture durante risposte lunghe. Bocca proxy sulla testa pilotata da RMS smussato dell'audio remoto effettivamente riprodotto: nessun visema fonetico, nessun movimento se l'audio è assente/bloccato.
- **Diagnostica:** capability, riferimento, piani, quota, anchor/persistenza, tracking, peer, livelli e FPS. Trascrizioni opzionali solo in memoria finché la vista debug è attiva, senza log di token o audio.

Nel visore punta il controller e usa il grilletto sul pannello 3D: Conferma, Riposiziona, Quota, Avvia/stop voce, Mute, Riattiva audio, Reset anchor, Esci. Toccare il pavimento sceglie un punto, poi occorre confermare. Se manca `local-floor`, regola il marker ai piedi e seleziona **Quota corretta** prima di confermare.

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

Sito di test privato: **https://neo-mr-avatar-test.sk1kko.chatgpt.site** (accedere con l’account proprietario e aprire top-level sul visore). Il sorgente Sites usa Vinext e route server Worker native con identità verificata dalla piattaforma; non esegue Express nel Worker. La chiave esistente rimane un segreto backend, senza variabili `VITE_*`. Dopo modifiche ai segreti occorre ridistribuire la versione perché il deployment usa una revisione del runtime.

Questa repository conserva il backend Node richiesto da AGENTS.md; l’adattamento Sites riusa lo stesso frontend e protocollo Story Engine. Servire solo `dist/` su hosting statico non abilita la voce. Lo stato dettagliato delle verifiche è in `docs/VALIDATION.md`; hardware e OpenAI live non sono attestati dai test automatici.

## Struttura

`src/App.tsx` contiene l'interfaccia React; `src/Experience.ts` gestisce scena e lifecycle. `src/xr` isola capability, pavimento, sessione e anchor; `src/avatar` animazioni e bocca; `src/audio` WebRTC/RMS; `src/ui/ui3d.ts` il pannello immersivo. `src/story` valida la narrazione; `src/observatory` contiene stanza, città, qualità e suoni. `server/` contiene backend sicuro e configurazione Realtime/Story; `tests/` test unitari, API e browser. [Crediti asset](ASSET_CREDITS.md).

## Fonti verificate

- [OpenAI Realtime WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc): client secret GA, SDP e data channel.
- [Meta Mixed Reality in Browser](https://developers.meta.com/vr/documentation/web/webxr-mixed-reality/): rilevamento capability, attesa dei piani, anchor e limiti di persistenza.
- [RobotExpressive](https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf/RobotExpressive): asset, clip e licenza CC0.

Il Quest può conservare al massimo otto anchor persistenti per origin; modalità privata, cancellazione dati o cambiamenti nei permessi della stanza possono invalidarli. L'app mantiene una sola posizione e non promette persistenza senza verifica hardware.
