# Verifiche Future Observatory — 10 ottobre 2026

## Controlli eseguiti

| Controllo | Esito |
|---|---|
| Lint | PASS |
| Typecheck frontend/backend | PASS |
| Build Vite + backend Node | PASS |
| Test unitari/API | PASS: 113 test, 10 file |
| Scanner bundle client | PASS: nessuna chiave/configurazione server nel client, asset avatar locale valido |
| Playwright produzione | PASS: 12 test, Chromium desktop / Pixel 7 emulato / WebKit iPhone 13 emulato |
| Sites typecheck / test / build | PASS: 104 test, 9 file; build Vinext/Worker |
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

Restano **NON VERIFICATI sul dispositivo fisico**: Quest Pro passthrough completamente coperto in AR, floor/anchor/drift, Guardian, recenter reale, continuità audio durante cambio sessione, refresh e 72 FPS; ARCore Android, Safari iPhone e voce OpenAI live. AR e VR richiedono rilevamento distinto: il compositor additive è rifiutato; session switching richiede chiusura e un nuovo gesto, mantenendo il peer dove il browser conserva la pagina attiva. Social/economic sono stati aggiunti nella revisione descritta in SIX_SCENARIOS.md. La città è un compromesso procedurale, non una ricostruzione fotorealistica di una metropoli.

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


## Revisione room scale

Richiesta dell’utente: orientamento verso il visore anche passando dietro, prima posizione automatica a 1–1,5 m e, dove possibile, vicinanza con collisioni. Implementati sguardo continuo testa/corpo senza alterare il root dell’anchor, avvio a 1,3 m dopo ricerca pavimento, fallback manuale per quota incerta o superfici rilevate, restore di un anchor vicino oppure sostituzione di un anchor lontano. Seguito laterale a 0,45 m/s nella sola stanza virtuale con pareti/arredi noti, raggio 35 cm, controllo dell’intero segmento e distanza personale; stop se non esiste un percorso diretto libero. In MR la posizione resta ancorata: non si assume che plane detection rilevi tutti gli ostacoli fisici.

Quality gate finale: npm run check PASS (lint, typecheck, build, **113 test**, scanner client); Sites typecheck e **104 test** PASS. Build Vinext/Worker eseguita anche dal commit sorgente pubblicato. Playwright **12/12 PASS**, un worker, Chromium desktop/Android e WebKit iPhone emulati. I test nuovi comprendono GLB reale, arco di rotazione corto, parent ruotato, stabilità della posa anchor, velocità/limiti del seguito, ostacoli, spazio personale, calibrazione, anchor restaurato vicino/lontano e chiusura XR durante eliminazione asincrona.

Campioni diagnostici browser software dopo il futuro sostenibile: desktop 9 FPS, Android emulato 10 FPS, WebKit iPhone emulato 55 FPS; ciascuno 73 draw call, 22.277 triangoli, 71 geometrie e 13 texture in qualità low. Trasformazione osservata 8,186 / 8,694 / 8,267 s. Non sono benchmark confrontabili fra device, non misurano il seguito immersivo e non attestano 72 FPS. Nessun nuovo asset, texture o draw call è introdotto dal seguito. Bundle Vite circa 972 kB / 269 kB gzip, warning dimensione non bloccante.

Passthrough, posizione iniziale, tracking, gaze e seguito immersivo restano **da verificare fisicamente sul Quest Pro**. La precedente prova dell’utente non certifica questa revisione. [Dettagli e limiti](ROOM_SCALE.md), checklist in DEVICE_TESTS.md.

La prima CI di questa revisione (run 38060366210) ha passato tutti i quality gate e 11/12 browser test, ma il test Android ha superato i 5 s aspettando il progressbar della trasformazione, con due worker in parallelo. Il download della traccia CI ha restituito 403; i log e i risultati locali rimangono disponibili. Playwright ora usa un solo worker quando CI è attivo, come nella prova locale 12/12; assert, timeout e retry restano invariati. Il risultato finale della nuova esecuzione è nei Checks della PR.


## Sei scenari, nome e interruzioni intelligenti — 10 ottobre 2026

- `npm run check`: lint, typecheck frontend/backend, build, **129 test unitari** e controllo bundle senza chiavi/endpoints server: PASS.
- Adapter Sites: typecheck, **120 test**, build Worker Vinext: PASS. Nessun cambio del segreto runtime.
- Playwright: **21 casi** su desktop Chromium, profilo Android Chromium e iPhone WebKit, un worker, nessun retry. Tre casi aggiuntivi fermano deliberatamente requestAnimationFrame e verificano il feedback immediato del controllo narrativo. Tutti i temi: ingresso, asset Poly Haven/Kenney, cambio prospettiva, trasformazione >= 6,5 s, ritorno e assenza di richieste microfono non autorizzate/errori JS. Controlli XR, nomi e interruzioni sono coperti da unit test; voce live e hardware non sono certificati.
- Quattro nuovi GLB CC0, texture e licenze: **241.590 byte**, checksum e riferimenti validati. Solo il quartiere selezionato viene renderizzato; le scene possono funzionare con fallback offline.

Campioni **software headless**, qualità low e voce spenta; FPS istantanei in diagnostica, non medie hardware o stima delle prestazioni Quest. Conteggi GPU non esprimono memoria in byte. La riduzione automatica di qualità è entrata in funzione.

| Tema | Desktop FPS / draw / triangoli | Android FPS / draw / triangoli | WebKit FPS / draw / triangoli |
|---|---|---|---|
| Ambiente | 5 / 73 / 22.277 | 10 / 73 / 22.277 | 48 / 73 / 22.277 |
| Economia | 9 / 67 / 18.379 | 14 / 66 / 18.377 | 55 / 66 / 18.377 |
| Società | 9 / 65 / 20.687 | 7 / 64 / 20.685 | 51 / 64 / 20.685 |

Trasformazioni misurate **8,07–8,73 s**. Conteggi al campione sostenibile: 65–71 geometrie GPU, 13–17 texture. Questi risultati mostrano il percorso di test e il budget della scena, senza dimostrare 72 FPS sul visore. Browser software e carico del container influenzano molto gli FPS.

Da riprovare sul Quest Pro: tutte le sei scene a 72 Hz, visibilità dal punto sicuro, passthrough occultato in AR, ritorno MR/sessione VR separata, menu controller/mani, sguardo e seguito room scale con ostacoli virtuali, voce durante trasformazioni, rumori/eco e parole d’interruzione. Il filtro ASR attende il riconoscimento dopo una breve pausa e può sbagliare; non è un classificatore acustico garantito. Il nome è memoria della pagina e non persiste dopo reload. I modelli Kenney sono leggeri e stilizzati; la città non è fotorealistica.

I run GitHub hanno evidenziato un difetto di feedback Android con il canvas fuori viewport: il DOM riceveva lo stato narrativo solo dal frame loop. La subscription ora pubblica immediatamente lo snapshot al clic, anche se il rendering è rallentato. Il test arma un MutationObserver prima dell’azione, osserva il progresso e riporta il canvas nel viewport per guardare la città cambiare. Restano la misura minima di 6,5 s, il controllo finale e nessun retry/aumento dei timeout. I campioni software sopra provengono dal run locale iniziale.


## Correzione microfono e UX — 10 ottobre 2026

Il feedback successivo dell’utente descrive un blocco dopo il primo scambio, controlli chiusi ancora legati alla testa e stato di ascolto ambiguo. Il codice distingue ora pausa XR e mute manuale, recupera la coda Realtime e ignora i completamenti tardivi di un altro turno. Pannello e scorciatoie sono entrambi fissi nello spazio. Uno stato con testo/colore/barra si trova presso NEO e nella pagina; **Riprendi ascolto** restituisce il turno nella connessione corrente. [Dettagli e prova fisica](VOICE_UX.md).

- Node: lint, typecheck, build, **141 test** e scanner segreti del bundle superati.
- Sites: typecheck, **132 test** e build Worker superati; backend, chiave e accesso pubblico conservati.
- Browser locale: **24/24 superati**, un worker, nessun retry, tre profili. Include tre scambi consecutivi, mute/recupero/stop anche con i frame grafici fermati; audio e WebRTC sono esplicitamente simulati. La simulazione del MediaDevices è fissata sull’oggetto navigator per avere lo stesso comportamento anche su WebKit headless; non richiede permessi o hardware.
- Nuovi test unitari riproducono cancellazione già conclusa o senza conferma, creazione rifiutata senza perdere il turno, pause XR/device, ritardi di trascrizione e riapertura protetta senza fine-buffer ricevuta. Test 3D verificano anche i controlli chiusi e l’indicatore indipendente dalla testa.

Nessun nuovo asset esterno. L’indicatore aggiunge tre piani e una texture; il testo si aggiorna solo al cambio di stato. Campioni software locali, voce spenta: 66–75 draw call e circa 18–22k triangoli, trasformazioni misurate di **8,01–9,88 s**. Campioni FPS **7–36**, non medie stabili. I nove JSON sono in [validation/voice-ux](validation/voice-ux). Questi sono snapshot headless, non misure Quest, né una verifica di 72 FPS. Vedere gli artefatti Playwright e la checklist aggiornata.

Restano da verificare fisicamente: almeno cinque scambi vocali sul visore, perdita/ritorno del focus, interruzione di una risposta, rumori/eco, pannello fermo aperto e chiuso, controller/pinch, passthrough e continuità audio durante le transizioni. Nessuna nuova verifica hardware è dichiarata completata.
