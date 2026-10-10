# Risultati — 10 ottobre 2026

## Verificato automaticamente

| Controllo | Risultato |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS frontend, test e backend |
| `npm run build` | PASS Vite + compilazione Node |
| `npm test` | PASS: 53 test, 6 file |
| `npm run verify:bundle` | PASS: nessun marker chiave/server-only nel frontend; GLB incluso |
| `npm audit --audit-level=high` | PASS: zero vulnerabilità (anche dev dependencies) |
| Playwright Chromium desktop | PASS: preview, asset, emote, resize, errori microfono e API |
| Playwright Chromium profilo Pixel 7 | PASS: stessa suite con viewport/touch mobile |
| Playwright WebKit profilo iPhone 13 | PASS: stessa suite WebKit con viewport/touch iPhone |

I test leggono e caricano realmente il GLB nel browser e in GLTFLoader; verificano le clip richieste, scala e base del modello. I test XR usano un runtime **mock** per attesa piani, quota/estensione, rifiuto tavolo, fallback/calibrazione, world-space, recenter, feature fallback e permessi. I test anchor verificano restore, tracking temporaneamente perso, scala, cancellazione device/storage, race del reset e prevenzione dell'accumulo. WebRTC/Realtime sono testati con trasporto **mock** per negoziazione GA, mute, cleanup, permesso negato, cancellazione durante avvio, background ed eventi audio. Nessun token reale è stato emesso e nessuna chiamata OpenAI live è stata effettuata.

Ambiente: Node 24.19, Linux Debian 13, rendering software per le prove browser. Per WebKit, il Cloud non consentiva l'installazione di librerie di sistema da root: le librerie Debian mancanti sono state estratte in `/tmp` e il launcher locale di Playwright è stato configurato per ereditarne il percorso. La verifica del cache `ldconfig` è stata saltata perché non include librerie locali; il browser e i test sono stati effettivamente eseguiti. Nessuna modifica del launcher è parte del progetto. In CI su Ubuntu si usa normalmente `playwright install --with-deps`.

La build segnala un warning non bloccante sulla dimensione del bundle JS (~875 kB, ~238 kB gzip, include Three.js e React). Il GLB è ~454 kB. Non sono misurazioni di FPS sul Quest; la qualità grafica evita ombre ed effetti costosi e limita il pixel ratio della preview.

## Non verificato / non pubblicato

- Passthrough reale Quest Pro, tracking fisico, piedi sul pavimento della stanza, drift e recenter sul visore.
- API effettivamente concesse per piani, hit-test, anchor e persistenza su Quest/Android.
- Android Chrome su dispositivo ARCore fisico.
- Safari iOS fisico, zoom multitouch reale, audio unlock, interruzioni da chiamata e voce live.
- Conversazione OpenAI live: segreto `OPENAI_API_KEY` non configurato nell'ambiente; la route restituisce 503 senza esporre credenziali.
- URL HTTPS di produzione, autenticazione del proxy in produzione e budget API.
- Runtime Sites: nessuna distribuzione eseguita; il backend Node richiede adattamento a route native se quel runtime viene scelto. Nessun URL Sites disponibile da riportare.

La checklist operativa è in [DEVICE_TESTS.md](DEVICE_TESTS.md). Questi limiti sono criteri di validazione hardware/hosting ancora aperti, non vengono considerati superati da test desktop.
