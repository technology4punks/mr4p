# NEO · Future Observatory V4

[Site pubblico V4](https://neo-mr-avatar-test.sk1kko.chatgpt.site) · [PR #3](https://github.com/technology4punks/mr4p/pull/3) · [Deploy verificato](docs/DEPLOYMENT_V4.md)

**The Complexity of Choice**: una città del 2050 che cambia attraverso le decisioni del partecipante. React/TypeScript, Three.js/WebXR e conversazione OpenAI Realtime. La V4 estende avatar, stanza, controllo room scale e correzioni del microfono esistenti.

## Esperienza

Premi **INIZIA ESPERIENZA**: soltanto allora vengono richiesti microfono e, sui browser compatibili, una sessione AR. Un portale ancorato nello spazio introduce NEO. Dopo l’invito entri nell’osservatorio tridimensionale con finestra e città su tre livelli di profondità.

La **visita guidata** è attiva di default. NEO saluta e chiede il nome una sola volta, senza renderlo obbligatorio. Poi annuncia il viaggio in un futuro ipotetico segnato da decisioni sbagliate, in cui possiamo cambiare qualcosa. La città risponde agli interessi espressi: trenta interventi in dieci ambiti, senza conferme o leva preliminare. Una domanda alla volta, poi ascolto; il silenzio non inventa decisioni.

Dopo quattro scelte completate, oppure tre dopo due minuti, torni automaticamente alla realtà. Il limite è **210 secondi attivi** dall’invito, esclusa una pausa esplicita; transizioni e chiusura aggiungono alcuni secondi. NEO lascia una frase breve collegata alle scelte, senza questionario finale. Puoi fare domande, interromperlo o tornare prima. Nome e parole restano soltanto nella memoria della pagina e vengono azzerati al restart.

Disattivando **Visita guidata** prima dello Start resta disponibile il percorso libero precedente: esplorazione, quattro/cinque decisioni, una revisione e riflessione finale. Le animazioni durano sette secondi e le richieste durante le transizioni restano in coda. Le conseguenze cumulative conservano benefici, compromessi e problemi residui.

La registrazione è facoltativa: seleziona **Registra dati anonimi** prima dello Start per registrare anche una visita incompleta, oppure salva esplicitamente alla fine. Un “sì” alla storia non autorizza il salvataggio. Nessun nome, email, audio o dialogo completo dei partecipanti viene registrato. Un backend indisponibile non blocca il ritorno o la frase conclusiva.

La [control room da PC](https://neo-mr-avatar-test.sk1kko.chatgpt.site/control-room) richiede accesso ChatGPT e allowlist degli operatori verificata nel backend. Il visore rimane pubblico. Dettagli: [visita guidata e control room](docs/GUIDED_CONTROL_ROOM.md).

La V4 contiene esclusivamente lo scenario ambientale. Le precedenti città sociali/economiche e il pulsante che rendeva tutto sostenibile sono sostituiti dal modello cumulativo richiesto in `SPEC.md`.

## Avvio locale

Node **24.5+** (SQLite nativo), npm:

```sh
npm ci
cp .env.example .env
npm run dev
```

Configura `OPENAI_API_KEY` esclusivamente nel backend. `REALTIME_MODEL` e `REALTIME_VOICE` sono modificabili; i default esistenti sono preservati. Vite inoltra `/api` al backend. Per una build di produzione locale:

```sh
npm run build
npm start
```

La modalità 3D è utilizzabile anche se manca una chiave o viene negato il microfono. Le funzioni vocali richiedono HTTPS o localhost e accesso al servizio OpenAI.

## Componenti

| Modulo | Responsabilità |
|---|---|
| `src/decision/catalog.ts` | 10 leve, 30 interventi, benefici, compromessi e metadati |
| `src/decision/DecisionEngine.ts` | slot, duplicati, revisione e ricostruzione delle 12 regole |
| `src/story/GuidedVisit.ts` | durata attiva, ritorno e frase conclusiva |
| `src/admin/ControlRoom.tsx` | consultazione protetta, filtri e CSV della pagina |
| `src/recording/ExperienceRecorder.ts` | registro anonimo asincrono con consenso e ricevuta |
| `src/story/StoryEngine.ts` | stati, consensi, proposte ambigue e tool autorizzati |
| `src/observatory/CityPlan.ts` | pianta condivisa, percorsi e lotti riservati senza sovrapposizioni |
| `src/observatory/CityTransformationEngine.ts` | strati e collegamenti predefiniti sulla stessa città |
| `src/Experience.ts` | portale, transizioni, avatar, UI e persistenza |
| `src/audio/realtimeClient.ts` | WebRTC, turni, interruzioni e recupero input |
| `server/story-config.ts` | prompt V4 e schema dei tool Realtime |
| `server/session-store.ts` | SQLite persistente, scadenza e cancellazione |

Nessuna geometria viene generata dal modello linguistico. I cinque contesti interni WATER, ENERGY, LAND, INVESTMENT e ACCESSIBILITY sono qualitativi e non costituiscono un punteggio educativo né una simulazione scientifica.

## Developer panel

È chiuso nella modalità normale. **Developer → Ingresso manuale** avvia l’osservatorio senza microfono; puoi applicare tutti i trenta interventi in visite ripetute, vedere risorse, interdipendenze, draw call, FPS, connessione e stato del salvataggio. Reset permette di ripetere la simulazione. Il normale percorso finale offre la revisione.

## Voce e menu

Start precede qualsiasi acquisizione audio. NEO usa risposte concise e informative, conosce scelte e stato autorevole e chiede chiarimenti sulle intenzioni ambigue. Il nome è una memoria transitoria della visita, esclusa dal salvataggio.

Il microfono rimane aperto con interruzioni intelligenti: un evento VAD da solo non cancella l’audio. Il client aspetta parole riconoscibili e gestisce fine risposta, mute, pause XR, eventi tardivi e recupero della traccia. **Riprendi ascolto** riattiva l’acquisizione se il dispositivo l’ha sospesa. Il timer guidato chiude la visita, ma non inventa risposte o scelte. La modalità libera conserva l’esplorazione senza scadenza.

Il menu chiuso non mostra i tre vecchi comandi rapidi. Controller A/X, stick o gesto mani lo richiamano; sulla pagina resta il piccolo menu a scomparsa. I pannelli aperti sono traslucidi, arrotondati e fermi nello spazio; un richiamo esplicito li riposiziona in alto a destra. Controller/raggio, stick per il focus e mani/pinch sono mantenuti. In XR le scelte sono disponibili nel menu, insieme a ritorno, revisione e consenso. Le risorse interne non compaiono nell’esperienza del partecipante.

## Persistenza e hosting

Node salva in `FUTURE_DB_PATH` (default `./data/future-observatory.sqlite`), su disco persistente. `RETENTION_DAYS` è configurabile da 1 a 365, default 30; il processo elimina record scaduti all’avvio, ogni ora e sulle operazioni di salvataggio/cancellazione. Un filesystem effimero non è adatto alla produzione.

Su **Sites** il progetto pubblico esistente usa D1, binding `DB`, schema e migration Drizzle. Il segreto OpenAI rimane nelle variabili runtime del Site. L’overlay riproducibile è in `deploy/sites/`; il client e il catalogo sono gli stessi della versione Node. I record scaduti vengono eliminati alle operazioni API e alla prima richiesta dopo ogni ora; in assenza totale di traffico la rimozione fisica attende una richiesta successiva. Non sono esposti endpoint di lettura pubblica.

Il backend Node in produzione conserva l’autenticazione tramite reverse proxy: `APP_ORIGIN`, `REQUIRE_PROXY_AUTH=true`, `PROXY_AUTH_SECRET` e numero esatto di hop. Il proxy deve rimuovere gli header ricevuti e impostare `X-NEO-USER` e `X-NEO-EMAIL` solo dopo l’autenticazione. La control room richiede inoltre `CONTROL_ROOM_ALLOWED_EMAILS`; senza configurazione nega l’accesso. Il Site pubblico usa il proprio endpoint con limiti per visitatori anonimi e origine esatta, senza richiedere login al visore.

Il salvataggio restituisce un identificativo e la scadenza. La cancellazione richiede un token privato, conservato in memoria durante la visita e scaricabile come ricevuta: conservalo se vuoi cancellare dopo aver chiuso la pagina. Il database conserva solo l’hash del token. Non usare nomi, contatti o altre informazioni identificanti nella riflessione.

## Documentazione e verifica

- [Specifica integrale V4](SPEC.md)
- [Catalogo dei 30 interventi](docs/V4_CATALOG.md)
- [Pianta della città e verifica delle distanze](docs/CITY_LAYOUT.md)
- [Interdipendenze e trasformazioni](docs/V4_INTERDEPENDENCIES.md)
- [API e privacy](docs/V4_PERSISTENCE.md)
- [Architettura e journey](docs/FUTURE_OBSERVATORY.md)
- [Asset e licenze](ASSET_CREDITS.md)
- [Prove e misure](docs/VALIDATION.md)
- [Checklist dei dispositivi](docs/DEVICE_TESTS.md)

```sh
npm run check
npm run test:e2e
```

Le prove browser usano Chromium desktop/Android e WebKit iPhone, con rendering software. Il test vocale simula acquisizione e WebRTC: non certifica microfono, servizio Realtime live o latenza hardware. Il target Quest Pro resta 72 FPS, da misurare sul dispositivo. Nessun post-processing pesante; geometrie condivise, instancing, frustum culling e qualità adattiva preservano gli interventi scelti.

## Limiti WebXR

Si preferisce occultare il passthrough con la stanza opaca dentro `immersive-ar`; il compositing effettivo non è verificato sul Quest Pro. Il blend additive non può essere reso opaco: il percorso propone una sessione VR separata con gesto esplicito. AR/VR non sono intercambiabili automaticamente. In VR il ritorno chiude la sessione e richiede un nuovo gesto AR, mantenendo la conversazione quando disponibile.

La stanza virtuale non segnala gli ostacoli fisici. Camera XR, portal lock, tracking mani, anchoring locale, ingresso/ritorno e confini vanno verificati sul visore. Android usa AR solo se rilevata; iPhone e desktop usano camera 3D mouse/touch senza locomozione XR artificiale.
