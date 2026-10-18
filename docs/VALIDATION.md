# My Personal Neo iPhone · 18 ottobre 2026

Nuovo target nativo separato: [progetto, prove e limiti](MY_PERSONAL_NEO.md). Backend Node/client: lint, typecheck, build, **223 test** e bundle scan passati. Sites: typecheck, **209 test** e build passati. Tutti i **33 casi browser** verificati fra suite e ritest mirati, inclusi portale separato, percorso Buddy e control room. WebKit inizialmente bloccato da librerie host mancanti: dipendenze caricate in directory temporanea e tutti gli 11 casi ripassati; stabilizzato l’avvio del clock del test guidato.

Versione Sites 24 pubblicata; API personali live voce/visione/web search **200**, sorgenti consultabili, control room anonima **401**, Buddy pubblico invariato. Visione provata su immagine sintetica; browser audio simulato/negato. Build nativa app/test e test sul simulatore passati su macOS/Xcode 16.4 per il codice Swift e6fa330; pipeline e dettagli in MY_PERSONAL_NEO.md. Nessun iPhone o Quest fisico, allineamento dita/tasti, latenza voce, misura termica/FPS hardware o upload firmato verificato.

---

# Visita guidata e control room · 13 ottobre 2026

`npm run check` passato: lint, typecheck, build Node/client, **217 test** e verifica segreti nel bundle. Sites: typecheck, **206 test** e build Vinext passati. **30 test browser passati in un’unica esecuzione (9,6 minuti)** su desktop Chromium, Android emulato e iPhone WebKit. Nuove regressioni: ingresso dopo saluto facoltativo, deadline, frase conclusiva, consenso esplicito, backend indisponibile, coda seriale/ack, revoca prima di un invio tardivo, retention e allowlist backend. I test precedenti verificano anche il percorso libero e tre turni audio simulati.

[Control room desktop](validation/guided-control-room/control-room-desktop-chromium.png), [Android](validation/guided-control-room/control-room-android-chromium.png), [iPhone](validation/guided-control-room/control-room-iphone-webkit.png). Record e identità operatore nelle immagini sono fixture sintetiche: non provano il login dell’account operatore reale. Le API di accesso sono testate separatamente nei due backend.

Campioni diagnostici dell’intera visita libera con quattro scelte, renderer headless software: desktop 10 FPS/83 draw call, Android emulato 16 FPS/82 draw call, WebKit 24 FPS/82 draw call; tutti 74 geometrie e 16 texture. Sono valori istantanei del test, non medie né prestazioni mobili reali. [Dati grezzi](validation/guided-control-room/v4-performance-desktop-chromium.json). Geometrie/asset urbani invariati; nessun nuovo benchmark Quest o obiettivo 72 FPS certificato. Bundle client 1.092,34 kB (gzip 305,49 kB), senza post-processing aggiunto.

Microfono, modello e WebRTC dei test voce sono simulati. Restano da verificare sul Quest fisico: ascolto reale, comportamento del prompt, interruzioni/eco, mani/controller per richiamare il menu, compositing passthrough, confini e comfort. Checklist aggiornata in [DEVICE_TESTS.md](DEVICE_TESTS.md). Esito della pubblicazione e smoke pubblico in [DEPLOYMENT_V4.md](DEPLOYMENT_V4.md).

Sites versione 23 pubblicata con successo; smoke pubblico passato con deadline accelerata, frase, zero invii senza consenso, gate 401 e ciclo D1 sintetico creazione/cancellazione/revoca. Dettagli e limiti in [DEPLOYMENT_V4.md](DEPLOYMENT_V4.md).

---

## Pianta condivisa · 13 ottobre 2026

`npm run check` passato: lint, typecheck, build Node/client, 199 test e controllo segreti nel bundle. Typecheck, 190 test e build Sites passati. Otto regressioni spaziali controllano i volumi Three.js effettivi, lotti, tetti, camminatori, traffico, qualità ridotta e dissolvenze a quota fissa. Il cielo contiene lo skyline e rientra nel far plane della camera in room scale. Percorsi e interventi rimangono separati anche con tutti e trenta attivi. Nessun nuovo asset scaricato, nessuna modifica al dialogo o al backend.

Ispezione browser Chromium/SwiftShader: città critica, cinque interventi, trenta interventi, vista laterale, pianta e qualità ridotta; zero errori JavaScript. [Pianta e istruzioni](CITY_LAYOUT.md), [immagini e contatori](validation/city-layout/render-counts.json). Campioni a 1440×1000 e pixel ratio 1, nella sola stanza/città, senza avatar o precaricamento Poly Haven; i contatori non sono benchmark della visita completa né medie.

| Vista | Draw call | Triangoli |
|---|---:|---:|
| Critica | 39 | 21.416 |
| Cinque interventi | 64 | 28.548 |
| Trenta interventi | 204 | 35.588 |
| Trenta, qualità ridotta | 201 | 28.916 |
| Pianta dall’alto | 237 | 36.532 |

Il caso estremo accumula trenta scelte, oltre il percorso didattico iniziale: il suo numero di draw call resta un carico da misurare sul Quest. Le geometrie di origine sono condivise/instanziate; non è stata introdotta una simulazione fisica. FPS del Quest Pro, vista stereoscopica, voce live, input XR e confini reali non sono stati verificati fisicamente.

Tutti i 21 casi browser della build finale sono passati in una sola esecuzione (7,3 minuti): Chromium desktop, Android emulato e iPhone WebKit. Coprono ingresso, quattro scelte, revisione, ritorno, consenso e persistenza, restart, catalogo disponibile nelle trasformazioni e tre turni voce con mute/recovery. Audio e WebRTC sono simulati: nessuna certificazione del microfono o di Realtime live sul visore.

Sites versione 22 pubblicata con successo; smoke anonimo sul sito live passato con ingresso e parco/tram/fotovoltaico, zero errori JavaScript. Microfono negato per questa prova del fallback. Dettagli in [DEPLOYMENT_V4.md](DEPLOYMENT_V4.md).

---

## Bilanciamento dei turni dopo la versione 20

Passati lint, typecheck, build, controllo bundle e 191 test Node/shared; 182 test Sites/shared/route e build Vinext passati. Le nuove regressioni coprono saluto separato da messaggi utente, tool bloccati nei commenti, attesa in silenzio, richiesta reale che mostra subito il catalogo, priorità di speech/ASR su nuove risposte, tool tardivi di risposte annullate e commenti scartati dopo un conflitto. Il VAD da 850 ms è condiviso fra creazione sessione Node/Sites e aggiornamenti client. Recupero ASR, mute, connessione e memoria restano coperti.

Tutti i 21 casi browser sono passati in un’unica esecuzione: desktop Chromium, Android emulato e iPhone WebKit. La prova browser voce tenta anche un ingresso autonomo durante il saluto: viene rifiutato, l’invito resta disponibile e il microfono torna pronto. La successiva richiesta dell’utente continua ad aprire direttamente la visita. Audio, modello e WebRTC sono simulati: la taratura di fine frase e le interruzioni vanno provate sul Quest fisico. Nessun nuovo benchmark grafico o asset.

---

## Revisione del dialogo libero · 12 ottobre 2026

Passati lint, typecheck, build e controllo bundle; 185 test Node/shared e 176 test Sites/shared/D1. Le regressioni coprono ingresso senza autorizzazione, intervento senza leva, richiesta durante portale/ingresso/animazione, duplicati idempotenti, nome esplicito, ulteriori visualizzazioni oltre il registro di cinque scelte, ritorno anticipato e riapertura della visita. Il recupero ASR conserva audio e risponde una sola volta; testo tardivo aggiorna la memoria e un fallimento tardivo non cancella il turno. Mute e rumori sovrapposti restano rispettati.

Smoke del worker Sites locale: ingresso senza comando preliminare “Da dove cominciamo?”, GREEN_PARK, richiesta MOB_TRAM durante la trasformazione, entrambe le animazioni completate, nessun errore JavaScript. Il test browser voce usa tre turni, conserva Luca, mostra le ultime parole e invoca show_intervention senza usare il pulsante di ingresso; microfono e recupero rimangono attivi con RAF fermo. Audio/WebRTC sono simulati, non certificano la voce sul Quest.

I 21 casi browser sono passati fra suite e ritest mirati. Il primo errore desktop era un 404 mentre la build veniva rigenerata: ritest con build ferma passato. Il test nuovo della doppia trasformazione usa 45 secondi complessivi e mantiene 11 secondi per fase; viene verificato anche con RAF sospeso su desktop, Android e iPhone. Il budget iniziale di 30 secondi era insufficiente per portale, ingresso, due animazioni e interazioni su renderer software. Il normale percorso completo con grafica attiva resta coperto.

Le misure grafiche sotto restano campioni storici della V4; questa revisione non è un nuovo benchmark hardware. Nessun asset o post-processing aggiunto.

---

# Future Observatory V4 · verifiche del 12 ottobre 2026

Le verifiche sono software, svolte in container; nessun visore fisico è disponibile. I dati storici nelle altre sottocartelle non rappresentano la V4 attuale.

| Verifica | Esito |
|---|---|
| Lint, typecheck e build Node/Vite | Passati |
| Unit test Node/shared | 178 passati, 15 file |
| Typecheck/build Sites vinext | Passati |
| Unit test Sites/shared/D1 route | 169 passati, 15 file |
| Browser Chromium desktop/Android, WebKit iPhone | 18 casi passati, incluso il ritest Android |
| Verifica bundle client | Nessuna chiave/configurazione server nel client |
| Migration D1 locale | 2 comandi eseguiti correttamente |
| Worker Sites + D1 locale | POST 201, token errato DELETE 403, token valido DELETE 200 |
| Smoke browser sul worker Sites | Hydration, portale, ingresso, GREEN_PARK; zero errori console |

## Cosa coprono le prove

Catalogo di 10 leve/30 opzioni; slot e duplicati; scelte nella stessa leva; conclusione dopo 4/5; revisione unica anche fra leve; originale immutabile; 12 regole indipendenti dall’ordine; rimozione di conseguenze superate; città/room/parallasse e qualità adattiva; 30 strati applicabili e animazione cumulativa di sette secondi; connessioni fisiche delle regole e traffico critico attivo.

Story Engine: avvio esplicito, argomenti non autorizzati, eventi superati, proposta ambigua senza consumo slot, transizioni e pausa, riflessione/consenso, fallimento di salvataggio e rifiuto. Persistenza: validazione, campi identificanti, SQLite riaperto, hashing della cancellazione, retry idempotente e scadenza; SQL della migration D1 eseguito sia dai test sia nel worker locale.

Browser: percorso completo di quattro interventi, revisione, ritorno, consenso, vera API Node di salvataggio/cancellazione, ritorno anticipato, rifiuto senza scritture, restart, mouse/touch/layout. Il test voce verifica tre turni, ASR riconoscibile, ascolto/risposta, mute, recupero della traccia e stop con RAF fermo. Audio/WebRTC sono simulati, senza chiamate OpenAI live.

## Misure software

Campione finale: quattro decisioni con sostituzione del parco con corridoi, R03 attiva. Le misure provengono dal pannello developer; non sono medie di sessione né un benchmark del Quest.

| Profilo | FPS campionati | Draw call | Geometrie | Texture |
|---|---:|---:|---:|---:|
| Desktop Chromium / SwiftShader | 6 | 94 | 76 | 20 |
| Android emulato / SwiftShader | 15 | 94 | 76 | 20 |
| iPhone emulato / WebKit software | 19 | 94 | 74 | 16 |

La prima misura desktop, prima dell’instancing degli strati nuovi, aveva 125 draw call e 5 FPS. Gli strati statici condivisi hanno portato il campione a 94 draw call (−24,8%). Questi FPS software sono inferiori al target hardware; non dimostrano raggiungimento di 72 FPS. La qualità riduce skyline lontano e risoluzione, senza nascondere interventi attivi. I conteggi di geometrie/texture non sono byte di memoria GPU.

Dati e screenshot: [validation/v4](validation/v4). Le differenze di conteggio fra browser dipendono anche dal caricamento progressivo degli asset al momento del campione. Build frontend Node: circa 1,07 MB JS, 298 KB gzip; la build segnala il bundle principale grande. Nessun post-processing pesante o nuovo download di asset a runtime.

## Limiti e prova fisica

Non verificati: compositing/passthrough Quest Pro, hand tracking/pinch reali, controller/joystick reali, floor/anchor e camera room scale, microfono/echo/rumori e conversazione audio Realtime live, comfort/stabilità e 72 FPS. I fallback additive/VR e ritorno AR richiedono gesto esplicito; non sono presentati come supporto hardware certificato.

La città usa geometrie procedurali e dettagli semplificati, con PBR realistici nella stanza. Non è fotorealistica e le conseguenze sono qualitative, non previsioni scientifiche. Purge D1 senza traffico può avvenire dopo la scadenza nominale, alla prima richiesta successiva. Il filtro testuale non garantisce l’assenza di ogni informazione identificante arbitraria.

Checklist operativa: [DEVICE_TESTS.md](DEVICE_TESTS.md). Gli scenari precedenti sono sostituiti dal solo percorso ambientale cumulativo V4 richiesto dalla specifica.

Deploy pubblico e prova reale delle API D1/token: [DEPLOYMENT_V4.md](DEPLOYMENT_V4.md).

## Clock indipendente dal canvas

La CI remota ha rivelato una sospensione del rendering Android fuori viewport durante l’ingresso. L’avanzamento narrativo è ora verificato anche con `requestAnimationFrame` fermo, su tutti e tre i profili. Un controllo periodico delle sole transizioni mantiene i tempi senza effettuare nuovi render e viene cancellato al dispose. Il test del percorso con due portali, ritorno e saluto dispone di 60 secondi complessivi per la macchina con rendering software; le singole fasi mantengono scadenze e il test della trasformazione verifica 6–11 secondi.

Il secondo errore CI Android avveniva dopo un click già eseguito: Playwright restava in attesa di una navigazione, mentre il controllo aggiorna soltanto lo stato locale. Il test ora mantiene le verifiche di visibilità e interazione, evita quell’attesa (`noWaitAfter`) e controlla esplicitamente la comparsa delle leve. Il percorso Android completo è passato al ritest.
