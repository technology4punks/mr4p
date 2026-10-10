# Test fisici da completare

**La checklist completa sotto non è ancora validata.** La prova iniziale dell’utente conferma la base e segnala menu/interazione e sensibilità del microfono; i nuovi controlli e la nuova voce richiedono una nuova prova fisica. I test Playwright non sono prove su Quest Pro, ARCore o Safari iOS reale. Registrare URL HTTPS, commit, dispositivo, browser/versione, data, esito e diagnostica senza token/chiavi o trascrizioni personali.

## Preparazione

1. Aprire il Site pubblico https://neo-mr-avatar-test.sk1kko.chatgpt.site direttamente nel Meta Quest Browser, senza login ChatGPT. Il segreto OpenAI resta nel backend.
2. Verificare `APP_ORIGIN`, proxy autenticato, CSP/Permissions-Policy, rate limit, budget API e `/api/health`. Aprire direttamente l'URL, non un iframe.
3. Assicurarsi di avere spazio libero e guardian calibrato per muoversi. Non occorrono permessi videocamera; MR usa il compositor WebXR.
4. Attivare Diagnostica solo per la prova, poi disattivarla per eliminare le trascrizioni in memoria.

## Quest Pro / Quest Browser

| Prova | Azione | Esito atteso | Esito reale |
|---|---|---|---|
| Capability | Aprire URL HTTPS | MR offerta dopo verifica runtime; permesso mic ancora non richiesto | Non eseguito |
| Passthrough | Entra in realtà mista | Stanza reale visibile, nessuno sfondo opaco | Non eseguito |
| Piani | Attendere ≥3 s, confrontare pavimento e tavolo | Tavolo escluso; diagnostica riferimento/piani/marker leggibile | Non eseguito |
| Fallback quota | Negare piani o stanza non configurata | `local-floor` verificato visivamente; se `local`, Quota corretta obbligatoria | Non eseguito |
| Feet | Regolare ±5 cm, scegliere ray, confermare | Base del modello sul pavimento | Non eseguito |
| Rotazione | Girare testa in entrambe le direzioni | Solo il pannello segue lo sguardo; avatar resta nello stesso punto | Non eseguito |
| Parallasse | Camminare 1–2 m e girare attorno in sicurezza | Posizione fisica fissa, misurare eventuale drift | Non eseguito |
| Tracking | Oscurare tracking / perdere piano | Ultima posa valida mantenuta e diagnostica degradata | Non eseguito |
| Recenter | Recenter del visore | Anchor mantiene allineamento; senza anchor viene chiesto riposizionamento | Non eseguito |
| Riposizionamento | Riposiziona / nuova conferma | Vecchio handle eliminato prima del nuovo; una posizione | Non eseguito |
| Persistenza | Chiudere e riaprire sullo stesso origin/stanza | Tentativo restore; nessuna posa inventata se fallisce | Non eseguito |
| Reset | Reset posizione | Storage e dispositivo ripuliti quando API disponibile; errore esplicito se fallisce | Non eseguito |
| Voce XR | Avvia dal pannello 3D, consentire mic, parlare italiano | Risposta udibile, VAD e turni coerenti | Non eseguito |
| Barge-in | Interrompere NEO durante risposta | Output interrotto e ritorno ascolto | Non eseguito |
| Mouth | Parlato, silenzio, audio bloccato | Proxy RMS coerente con audio effettivo; chiuso senza output | Non eseguito |
| Mute/stop | Mute, unmute, Termina, esci da MR | Mic disabilitato/riattivato; stop libera tracks e peer | Non eseguito |
| Errori | Negare mic, togliere rete, simulare quota/modello non abilitato | Messaggio recuperabile, riavvio esplicito, niente pagina bianca | Non eseguito |

## Android reale ARCore / Chrome

| Prova | Azione | Esito atteso | Esito reale |
|---|---|---|---|
| Capability | Chrome su telefono ARCore | MR solo se il runtime la conferma | Non eseguito |
| Hit-test/planes | Puntare pavimento, selezionare e confermare | Nessun tavolo scelto automaticamente; APIs opzionali diagnosticate | Non eseguito |
| UI touch MR | Toccare pannello e pavimento | Posizionamento, calibrazione, voce e uscita utilizzabili | Non eseguito |
| World-lock | Muovere telefono dopo conferma | Posa fissa per sessione, anchor solo se supportato | Non eseguito |
| Voce | Avvia, parla, mute, stop | Audio bidirezionale effettivo | Non eseguito |
| Lifecycle | Ruotare schermo, background/foreground, chiamata telefonica | Rendering adattato; risorse voce liberate, nuovo avvio esplicito | Non eseguito |
| Permessi/rete | Negare mic / interrompere rete | Recupero UI e nessun mic residuo | Non eseguito |

## iPhone reale / Safari

| Prova | Azione | Esito atteso | Esito reale |
|---|---|---|---|
| Fallback | Aprire URL in Safari | Anteprima 3D, nessuna falsa promessa WebXR/passthrough | Non eseguito |
| Rendering | Caricare GLB, provare emote e statura | Asset locale, clip e bocca disponibili | Non eseguito |
| Touch | Orbitare con dito e zoom a due dita | Gesture fluide, pulsanti raggiungibili | Non eseguito |
| Audio unlock | Avvia con click; se necessario Riattiva audio | Audio realmente udibile tramite altoparlante/auricolari | Non eseguito |
| Voce live | Parlare italiano e interrompere risposta | Microfono → OpenAI → voce nel telefono | Non eseguito |
| Orientamento | Portrait/landscape durante preview e voce | Canvas/UI ridimensionati, nessuna pagina bianca | Non eseguito |
| Background/chiamata | Cambiare app / ricevere una chiamata / tornare | Cleanup o errore chiaro; nessuna ripresa del mic senza click | Non eseguito |
| Permessi | Negare e poi riabilitare mic | Spiegazione e retry funzionanti | Non eseguito |

## Registrazione

```text
URL HTTPS:
Commit:
Dispositivo / OS:
Browser / versione:
Data / tester:
Test:
Esito: PASS / FAIL / NON SUPPORTATO
Riferimento / piani / anchor / peer:
Problema e passi per riprodurlo:
```

Un anchor persistente non è garantito in modalità privata, dopo cancellazione dati o modifiche nei permessi/configurazione stanza. Il limite Meta indicato dalla specifica è otto per origin. Se la cancellazione dispositivo fallisce, l'app impedisce di creare altri anchor persistenti e offre retry del reset; può comunque creare un anchor di sessione.

## Future Observatory — Quest Pro

Tutte le seguenti prove sono **NON ESEGUITE** sul dispositivo fisico.

| Prova | Esito atteso | Esito reale |
|---|---|---|
| Interesse e consenso | Dialogo naturale, tema ambientale, invito e ingresso solo dopo accettazione | Non eseguito |
| Copertura del passthrough AR | Pareti/cielo coprono completamente il mondo reale; registrare blendMode | Non eseguito |
| Stanza e parallasse | Testa e piccoli spostamenti sicuri mostrano prospettiva coerente dei tre livelli; robot vicino al fianco, senza attraversare arredi virtuali | Non eseguito |
| Transizione sostenibile | Luce, cielo, smog, vegetazione, pannelli/tram e suoni cambiano in circa 8 s | Non eseguito |
| Voce durante transizioni | Conversazione, domande e interruzioni restano udibili, stesso peer | Non eseguito |
| Ritorno anticipato | Uscita durante ingresso/trasformazione; ripristino posizione MR e anchor | Non eseguito |
| Fallback VR separato | Prepara VR chiude AR, nuovo click avvia VR, robot presente; ritorno richiede nuovo gesto MR | Non eseguito |
| Reset riferimento | Ritorno prevedibile e verifica della posizione reale dopo recenter | Non eseguito |
| Oggetti narrativi | Controller seleziona acqua/energia/mobilità senza spostare l’avatar | Non eseguito |
| Comfort e confini | Nessuna locomozione, iniziale punto sicuro, Guardian reale disponibile | Non eseguito |
| Performance 72 Hz | Registrare supportedFrameRates, FPS, draw call, triangoli, conteggi GPU e livello adattivo per 2 min | Non eseguito |
| Android/iPhone | Ingresso 3D touch, trasformazione, ritorno e audio sul telefono fisico | Non eseguito |

Per i limiti di sessione/compositing e i fallback, vedere FUTURE_OBSERVATORY.md. Non convertire questa tabella in PASS sulla base delle simulazioni XR.

## Nuova prova dopo la revisione dei controlli

1. Attendere circa tre secondi: NEO deve apparire a 1,3 m sul pavimento, senza conferma se local-floor è disponibile; girando la testa restano solo due piccoli comandi laterali.
2. A/X e presa: aprire/chiudere; puntare un pulsante, osservare cursore/bordo illuminato e premere il grilletto.
3. Con menu aperto: muovere lo stick, selezionare con grilletto; poi spostare il controller e tornare alla selezione a raggio. Nessuna locomozione.
4. Passare alle mani, verificare puntamento/pinch e un solo comando per gesto, anche tenendo il pinch. Annotare eventuali permessi/non disponibilità del browser.
5. Avviare la voce con rumore moderato: NEO deve completare la risposta. Parla / interrompi deve permettere una domanda senza riconnettere. Verificare mute e modalità Interruzioni vocali.
6. Entrare nel futuro critico, trasformarlo, osservare auto elettriche, ricarica e verde, quindi tornare alla MR mantenendo la voce.
7. Registrare FPS/draw call per almeno 60 s in ogni futuro, con e senza pannello; non usare i numeri del renderer software come misura del Quest.


## Room scale e orientamento — nuova prova fisica richiesta

- Entrare rivolti in direzioni differenti: piedi sul pavimento e distanza orizzontale 1–1,5 m. Verificare altezza e un eventuale fallback manuale.
- Girare intorno a NEO e passargli dietro, rispettando Guardian: testa e corpo devono voltarsi gradualmente anche con voce spenta. In MR i piedi restano ancorati.
- Chiudere/riaprire: un anchor vicino al punto iniziale può essere riusato; un anchor lontano richiede un nuovo posizionamento automatico.
- In osservatorio: piccoli spostamenti room scale, seguito laterale a circa 1,2 m, velocità limitata. NEO deve fermarsi se pareti, panca o tavolino impediscono il percorso. Non chiedere grandi spostamenti solo per provarlo.
- Perdere tracking / aprire la dashboard: nessun inseguimento su pose vecchie; al ritorno, nessuno scatto. Il ritorno MR deve ripristinare l’anchor reale.
- In MR non è attivo il seguito fisico: piani incompleti e ostacoli non rilevati non sono considerati una stanza libera. Le collisioni virtuali non sostituiscono Guardian.

Esiti di questa revisione: **NON ESEGUITI sul Quest Pro**. I test automatici usano geometrie note e pose simulate.


## Nuova prova: sei scenari e voce filtrata

- Visitare ambiente, economia e società dal selettore e da Tema nel menu Quest; confrontare ciascuna coppia dalla stessa posizione. Controllare edifici, rampe, piazze e oggetti narrativi dopo il caricamento.
- Verificare il nome attraverso entrata, trasformazione, ritorno e riavvio voce; chiedere di dimenticarlo. Ricaricare: non deve restare salvato.
- Durante una risposta, produrre un lieve rumore: NEO deve continuare. Dire “Aspetta” o una breve domanda: deve interrompere dopo il riconoscimento e rispondere alla nuova frase. Ripetere a volume basso, con ventilazione, eco e altre voci; annotare latenza e falsi positivi.
- Verificare mute, modalità protetta, Parla / interrompi e ritorno MR mentre si parla. Misurare FPS/frame time in tutti i sei scenari; nessun risultato headless sostituisce questa prova.


## Nuova prova ascolto e menu fisso

La correzione descritta in [VOICE_UX.md](VOICE_UX.md) richiede una nuova prova sul Quest Pro. Stato di ogni voce: **non eseguito su hardware**.

- Almeno cinque scambi consecutivi: alla fine di ogni risposta compare Puoi parlare e il microfono resta disponibile.
- Aprire un pannello del browser/sistema e tornare: l’ascolto riprende dalla sola pausa XR. Ripetere con mute manuale: resta spento.
- Girare la testa e camminare poco entro i limiti reali: menu aperto e comandi chiusi non seguono la testa. A/X o presa richiama il pannello, grilletto/pinch seleziona.
- Stato accanto a NEO coerente durante ascolto, risposta, mute, pausa e permesso revocato; la barra non promette comprensione delle parole.
- Interrompi NEO e Riprendi ascolto durante una risposta o un turno fermo: nessuna riconnessione richiesta, nessuna risposta duplicata, rispetto del mute quando non si chiede esplicitamente di riattivare.
- Provare le modalità intelligenti/protette con rumore, una parola reale, pausa lunga, trasformazione di scenario e ritorno MR/VR. Rilevare FPS e latenza audio sul dispositivo.
