# Test fisici da completare

**Stato di tutte le prove sotto: NON ESEGUITO.** I test Playwright non sono prove su Quest Pro, ARCore o Safari iOS reale. Registrare URL HTTPS, commit, dispositivo, browser/versione, data, esito e diagnostica senza token/chiavi o trascrizioni personali.

## Preparazione

1. Distribuire backend e frontend su un host HTTPS scelto e approvato, con accesso privato e segreto OpenAI nel runtime. Il Site privato di test è https://neo-mr-avatar-test.sk1kko.chatgpt.site; aprirlo con l’account proprietario.
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
| Stanza e parallasse | Testa e piccoli spostamenti sicuri mostrano prospettiva coerente dei tre livelli; robot fermo | Non eseguito |
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
