# Verifiche Future Observatory — 10 ottobre 2026

## Controlli eseguiti

| Controllo | Esito |
|---|---|
| Lint | PASS |
| Typecheck frontend/backend | PASS |
| Build Vite + backend Node | PASS |
| Test unitari/API | PASS: 96 test, 9 file |
| Scanner bundle client | PASS: nessuna chiave/configurazione server nel client, asset avatar locale valido |
| Playwright produzione | PASS: 12 test, Chromium desktop / Pixel 7 emulato / WebKit iPhone 13 emulato |
| Sites typecheck / test / build | PASS: 74 test, 6 file; build Vinext/Worker |
| Sites browser locale | PASS: tre profili, avatar, layout, permesso microfono negato, asset CC0, ingresso, trasformazione, ritorno, API privata (prova iniziale) |

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

Il Site esistente è **pubblico** su richiesta dell’utente: **https://neo-mr-avatar-test.sk1kko.chatgpt.site**. L’adattamento riusa il frontend e abilita esplicitamente l’avvio voce anonimo, con controllo origine e limiti per isolate (5 avvii/minuto nel bucket anonimo condiviso, 30 globali). Il backend Node separato conserva la protezione del proxy. Il runtime conserva OPENAI_API_KEY come segreto backend (revisione 5); nessun valore è copiato nel checkout o nel browser. Presenza del segreto non dimostra autorizzazione/quota OpenAI. L’accesso pubblico già autorizzato viene mantenuto.

Restano **NON VERIFICATI sul dispositivo fisico**: Quest Pro passthrough completamente coperto in AR, floor/anchor/drift, Guardian, recenter reale, continuità audio durante cambio sessione, refresh e 72 FPS; ARCore Android, Safari iPhone e voce OpenAI live. AR e VR richiedono rilevamento distinto: il compositor additive è rifiutato; session switching richiede chiusura e un nuovo gesto, mantenendo il peer dove il browser conserva la pagina attiva. Social/economic non hanno ambientazioni nella prima versione. La città è un compromesso procedurale, non una ricostruzione fotorealistica di una metropoli.

La checklist hardware rimane in [DEVICE_TESTS.md](DEVICE_TESTS.md), le scelte e i limiti WebXR in [FUTURE_OBSERVATORY.md](FUTURE_OBSERVATORY.md), gli asset e le licenze in [ASSET_CREDITS.md](../ASSET_CREDITS.md).

## Revisione dopo il feedback Quest

La prova iniziale dell’utente conferma la base sul visore e segnala menu non interattivo/sempre visibile e interruzioni eccessive del microfono. La revisione aggiunge menu chiudibile e fisso nello spazio quando aperto, raggi/controller/pinch, voce protetta e distretto ambientale più marcato. Il nuovo comportamento fisico resta da riprovare: non è certificato dai mock XR.

Controlli della revisione: npm run check PASS (lint, typecheck, build, 96 test, scanner client); Sites typecheck e 74 test PASS. Playwright: 12/12 PASS eseguendo un worker, con Chromium desktop/Android e WebKit iPhone emulati. La prima esecuzione con tre worker ha avuto un timeout Android sull’apparizione del progressbar; il contesto mostrava REFLECTION e trasformazione al 2%, con renderer software a 1 FPS. Si è ridotta la concorrenza dell’ambiente di prova, mantenendo gli stessi test e assert. Non è stato nascosto il fallimento con retry automatici.

Campioni finali dopo l’ottimizzazione, nello scenario sostenibile:

| Profilo headless | FPS campionato | Draw call | Triangoli | Geometrie GPU | Texture GPU | Trasformazione osservata |
|---|---:|---:|---:|---:|---:|---:|
| Chromium desktop | 6 | 73 | 22.277 | 71 | 13 | 8,611 s |
| Chromium Android | 41 | 73 | 22.277 | 71 | 13 | 8,686 s |
| WebKit iPhone | 56 | 73 | 22.277 | 71 | 13 | 8,607 s |

Tutti erano in qualità low. Sono snapshot del renderer software, con viewport e carichi diversi, non prestazioni medie del Quest né confronti validi fra device. Prima dell’ottimizzazione dei dettagli lontani e del numero di veicoli lo stesso scenario aveva 34.797 triangoli; ora 22.277. L’obiettivo 72 FPS sul Quest resta da misurare. Il nuovo bundle Vite è circa 966 kB / 267 kB gzip, con il warning dimensione non bloccante.

I nuovi test coprono anche timer/mute del microfono, fine generazione prima della fine audio, interruzione esplicita senza chiusura peer, opt-in delle interruzioni vocali, pulsanti nascosti, pannello fermo quando gira la testa, comandi duplicati, joystick/pinch e bounds dei veicoli animati. Gli screenshot aggiornati sono in docs/screenshots. [Funzioni e limiti](QUEST_INTERACTION.md).
