# Future Observatory V4 · verifiche del 12 ottobre 2026

Le verifiche sono software, svolte in container; nessun visore fisico è disponibile. I dati storici nelle altre sottocartelle non rappresentano la V4 attuale.

| Verifica | Esito |
|---|---|
| Lint, typecheck e build Node/Vite | Passati |
| Unit test Node/shared | 178 passati, 15 file |
| Typecheck/build Sites vinext | Passati |
| Unit test Sites/shared/D1 route | 169 passati, 15 file |
| Browser Chromium desktop/Android, WebKit iPhone | 15 passati |
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

Non verificati: compositing/passthrough Quest Pro, hand tracking/pinch reali, controller/joystick reali, floor/anchor e camera room scale, microfono/echo/rumori e servizio Realtime live, comfort/stabilità e 72 FPS. I fallback additive/VR e ritorno AR richiedono gesto esplicito; non sono presentati come supporto hardware certificato.

La città usa geometrie procedurali e dettagli semplificati, con PBR realistici nella stanza. Non è fotorealistica e le conseguenze sono qualitative, non previsioni scientifiche. Purge D1 senza traffico può avvenire dopo la scadenza nominale, alla prima richiesta successiva. Il filtro testuale non garantisce l’assenza di ogni informazione identificante arbitraria.

Checklist operativa: [DEVICE_TESTS.md](DEVICE_TESTS.md). Gli scenari precedenti sono sostituiti dal solo percorso ambientale cumulativo V4 richiesto dalla specifica.
