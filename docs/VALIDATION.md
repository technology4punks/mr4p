# Verifiche Future Observatory — 10 ottobre 2026

## Controlli eseguiti

| Controllo | Esito |
|---|---|
| Lint | PASS |
| Typecheck frontend/backend | PASS |
| Build Vite + backend Node | PASS |
| Test unitari/API | PASS: 83 test, 8 file |
| Scanner bundle client | PASS: nessuna chiave/configurazione server nel client, asset avatar locale valido |
| Playwright produzione | PASS: 12 test, Chromium desktop / Pixel 7 emulato / WebKit iPhone 13 emulato |
| Sites typecheck / test / build | PASS: 57 test, 5 file; build Vinext/Worker |
| Sites browser locale | PASS: tre profili, avatar, layout, permesso microfono negato, asset CC0, ingresso, trasformazione, ritorno, API privata |

La suite mantiene i test dell’MVP e aggiunge consenso, temi non disponibili, strumenti sconosciuti/argomenti errati, ritorno in ogni fase, completamenti tardivi, eventi Realtime completi/deduplicati, risposta differita e mantenimento del peer. I test XR usano un runtime **mock**: richiesta AR/VR distinta, posa narrativa separata dagli anchor, handle MR conservato entrando in VR e nuovo posizionamento dopo recenter senza anchor. I test della scena verificano fasce di profondità, parallasse, riuso della geometria, oggetti selezionabili, checksum/licenze e riferimenti glTF. Il fallback procedurale resta utilizzabile quando tutti gli asset falliscono.

I browser caricano effettivamente i materiali PBR, il glTF del tavolino, l’HDRI e l’avatar. Il flusso completo 3D viene provato con trascinamento/touch, trasformazione e ritorno, anche prima della fine dell’ingresso. Il microfono non viene richiesto caricando o visitando la scena. WebRTC e API OpenAI sono mock nei test: **nessuna conversazione live è certificata**.

Ambiente Linux Debian 13, Node 24.19. Chromium usa SwiftShader software; WebKit usa le librerie locali di Playwright descritte nelle prove MVP. Si tratta di browser headless con viewport emulati, non di telefoni o Quest reali. I risultati precedenti dell’MVP rimangono coperti dai test conservati.

## Misure grafiche software

Snapshot della diagnostica dopo SUSTAINABLE_FUTURE durante il test locale dell’adattamento Sites (viewport portato a 390 × 844 in tutti i profili). Questi sono campioni di un secondo, **non medie stabili né benchmark comparabili al visore**; il costo del renderer software e dell’emulazione cambia fra browser.

| Browser / profilo | FPS campionato | Draw call | Triangoli | Geometrie GPU | Texture GPU | Qualità |
|---|---:|---:|---:|---:|---:|---|
| Chromium desktop, viewport mobile | 40 | 55 | 16.233 | 58 | 13 | low |
| Chromium Pixel 7 emulato | 8 | 55 | 16.233 | 58 | 13 | low |
| WebKit iPhone 13 emulato | 61 | 55 | 16.233 | 58 | 13 | low |

Lo screenshot finale del backend Node a viewport desktop 1280 × 720 mostrava 12 FPS, 57 draw call e 16.161 triangoli nella vista ruotata. La scena usa istanze e materiali riutilizzati; il percorso low rimuove normal/roughness/reflection sampling e skyline lontano, conservando le finestre vicine. Non sono attive ombre o post-processing. La lentezza dei renderer software non permette di stabilire il collo di bottiglia CPU/GPU del Quest: misurarlo sul visore resta necessario prima di dichiarare 72 FPS. La diagnostica mostra conteggi, non byte GPU non esposti affidabilmente da WebGL.

Artefatti automatici: screenshot `test-results/critical-*.png`, `sustainable-*.png`, `preview-*.png`, allegato diagnostico browser e `performance-*.json` nelle esecuzioni successive; la CI conserva `test-results/`. I campioni riportati sopra provengono dall’output effettivo del test Sites locale.

Asset nuovi: 6.308.432 byte dei 12 file Poly Haven CC0; tavolino 4.504 triangoli. Bundle Vite finale circa 919 kB / 253 kB gzip, con warning non bloccante sulla dimensione. Il caricamento 3D dell’MVP resta un singolo bundle; gli asset osservatorio sono caricati progressivamente e hanno fallback.

## Hosting e limiti aperti

Il Site privato esistente è **https://neo-mr-avatar-test.sk1kko.chatgpt.site**. L’adattamento riusa il frontend e fornisce la route token con identità server Sites. Il runtime conserva OPENAI_API_KEY come segreto backend (revisione 5); nessun valore è copiato nel checkout o nel browser. Presenza del segreto non dimostra autorizzazione/quota OpenAI. Non si modificano i permessi del Site.

Restano **NON VERIFICATI sul dispositivo fisico**: Quest Pro passthrough completamente coperto in AR, floor/anchor/drift, Guardian, recenter reale, continuità audio durante cambio sessione, refresh e 72 FPS; ARCore Android, Safari iPhone e voce OpenAI live. AR e VR richiedono rilevamento distinto: il compositor additive è rifiutato; session switching richiede chiusura e un nuovo gesto, mantenendo il peer dove il browser conserva la pagina attiva. Social/economic non hanno ambientazioni nella prima versione. La città è un compromesso procedurale, non una ricostruzione fotorealistica di una metropoli.

La checklist hardware rimane in [DEVICE_TESTS.md](DEVICE_TESTS.md), le scelte e i limiti WebXR in [FUTURE_OBSERVATORY.md](FUTURE_OBSERVATORY.md), gli asset e le licenze in [ASSET_CREDITS.md](../ASSET_CREDITS.md).
