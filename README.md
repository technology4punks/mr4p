# NEO · Future Observatory V4

[Site pubblico V4](https://neo-mr-avatar-test.sk1kko.chatgpt.site) · [PR #3](https://github.com/technology4punks/mr4p/pull/3) · [Deploy verificato](docs/DEPLOYMENT_V4.md)

**The Complexity of Choice**: una città del 2050 che cambia attraverso le decisioni del partecipante. React/TypeScript, Three.js/WebXR e conversazione OpenAI Realtime. La V4 estende avatar, stanza, controllo room scale e correzioni del microfono esistenti.

## Esperienza

Premi **INIZIA ESPERIENZA**: soltanto allora vengono richiesti microfono e, sui browser compatibili, una sessione AR. Un portale ancorato nello spazio introduce NEO. Dopo l’invito entri nell’osservatorio tridimensionale con finestra e città su tre livelli di profondità.

NEO fa una domanda alla volta e attende la tua risposta: i commenti dell’app non avviano nuove scene. Parla liberamente di ciò che ti interessa: NEO mostra direttamente gli interventi disponibili, senza conferme o selezione preventiva della leva. Nome e scelte restano in memoria durante la sessione, anche riconnettendo la voce. Scegli fra dieci ambiti e trenta interventi. Ogni scelta modifica lo stesso ambiente in sette secondi; la conversazione resta aperta. Puoi scegliere più opzioni distinte nello stesso ambito, concludere dopo quattro scelte oppure aggiungerne una quinta. Le prime cinque scelte formano il registro didattico; puoi continuare a esplorare altri interventi senza bloccare la visita. Le richieste durante le animazioni restano in coda. La città conserva benefici, compromessi e problemi residui. Nella riflessione finale puoi sostituire una sola scelta, anche con un altro ambito: gli effetti superati vengono rimossi.

Puoi fare domande, mettere in pausa o tornare alla realtà. Dopo una riflessione libera, NEO propone un messaggio collegato alle tue scelte. **Il consenso a salvarlo è separato**. La schermata finale permette di ricominciare; voce e XR vengono chiusi.

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
| `src/story/StoryEngine.ts` | stati, consensi, proposte ambigue e tool autorizzati |
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

Il microfono rimane aperto con interruzioni intelligenti: un evento VAD da solo non cancella l’audio. Il client aspetta parole riconoscibili e gestisce fine risposta, mute, pause XR, eventi tardivi e recupero della traccia. **Riprendi ascolto** riattiva l’acquisizione se il dispositivo l’ha sospesa. Non esiste un timer narrativo che obblighi a concludere la visita.

Menu e dock sono traslucidi, arrotondati e fermi nello spazio; un richiamo esplicito li riposiziona in alto a destra. Controller/raggio, stick per il focus e mani/pinch sono mantenuti. In XR le scelte sono disponibili nel menu, insieme a ritorno, revisione e consenso. Le risorse interne non compaiono nell’esperienza del partecipante.

## Persistenza e hosting

Node salva in `FUTURE_DB_PATH` (default `./data/future-observatory.sqlite`), su disco persistente. `RETENTION_DAYS` è configurabile da 1 a 365, default 30; il processo elimina record scaduti all’avvio, ogni ora e sulle operazioni di salvataggio/cancellazione. Un filesystem effimero non è adatto alla produzione.

Su **Sites** il progetto pubblico esistente usa D1, binding `DB`, schema e migration Drizzle. Il segreto OpenAI rimane nelle variabili runtime del Site. L’overlay riproducibile è in `deploy/sites/`; il client e il catalogo sono gli stessi della versione Node. I record scaduti vengono eliminati alle operazioni API e alla prima richiesta dopo ogni ora; in assenza totale di traffico la rimozione fisica attende una richiesta successiva. Non sono esposti endpoint di lettura pubblica.

Il backend Node in produzione conserva l’autenticazione tramite reverse proxy: `APP_ORIGIN`, `REQUIRE_PROXY_AUTH=true`, `PROXY_AUTH_SECRET` e numero esatto di hop. Il proxy deve rimuovere gli header ricevuti e impostare `X-NEO-USER` solo dopo l’autenticazione. Il Site pubblico usa il proprio endpoint con limiti per visitatori anonimi e origine esatta, senza richiedere login al visore.

Il salvataggio restituisce un identificativo e la scadenza. La cancellazione richiede un token privato, conservato in memoria durante la visita e scaricabile come ricevuta: conservalo se vuoi cancellare dopo aver chiuso la pagina. Il database conserva solo l’hash del token. Non usare nomi, contatti o altre informazioni identificanti nella riflessione.

## Documentazione e verifica

- [Specifica integrale V4](SPEC.md)
- [Catalogo dei 30 interventi](docs/V4_CATALOG.md)
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
