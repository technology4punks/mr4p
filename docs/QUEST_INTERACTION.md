# Revisione dei controlli Quest e del futuro ambientale

La prova dell'utente sul visore ha confermato che la base era utilizzabile, ma ha evidenziato menu sempre visibile, selezione non funzionante e interruzioni vocali causate dai rumori. Questa revisione risponde a quel feedback. I nuovi comportamenti richiedono una nuova prova fisica sul Quest Pro.

## Menu immersivo

- Con local-floor il pannello resta chiuso durante l’avvio automatico a 1,3 m; si apre se occorre calibrare o scegliere un punto libero. Nel riposizionamento manuale si chiude dopo la conferma. Restano due piccoli comandi: Menu e Avvia voce / Interrompi NEO / Riprendi ascolto, secondo lo stato.
- A/X, clic dello stick o presa del controller aprono/chiudono il pannello. Puntatore, cursore e bordo illuminato indicano il pulsante selezionato; il grilletto attiva l'azione.
- Lo stick sceglie i pulsanti con una zona morta e ripetizione controllata. Spostare intenzionalmente il controller restituisce il controllo al puntatore. Lo stick non sposta la camera.
- Con il tracciamento mani disponibile: raggio della mano e pinch. Si richiede hand-tracking come funzionalità opzionale; gli eventi nativi e il controllo delle articolazioni hanno deduplicazione e isteresi.
- Pannello e comandi chiusi rimangono fermi nello spazio anche girando la testa o camminando. Un’apertura esplicita del menu lo richiama davanti all’utente; una nuova sessione o un reset del riferimento ne inizializza la posa. Le azioni nascoste non intercettano i raggi.
- Le funzioni di calibrazione restano in Posizionamento; nell'osservatorio compaiono Futuro sostenibile e Torna alla realtà.
- Nessuna dipendenza da DOM Overlay, modelli di controller esterni o locomozione artificiale.

## Voce in un ambiente rumoroso

La modalità predefinita è ora **Interruzioni intelligenti**: il microfono resta aperto durante la voce di NEO, con echo cancellation, noise suppression e auto gain disabilitato dove supportato. VAD 0,60, pre-roll 350 ms, pausa 700 ms, riduzione near_field. Interruzioni e risposte automatiche del server sono disattivate: il client decide dopo una trascrizione riconoscibile. Un solo evento VAD o un rumore non cancella la voce.

Una parola reale (anche “sì” o “no”), con durata minima se sovrapposta all’audio, può cancellare la risposta e svuotare l’audio remoto preservando l’input dell’utente. Si attende la fine della vecchia generazione prima di una sola nuova risposta. La trascrizione viene normalmente prodotta dopo una breve pausa: il filtro introduce quella latenza, ma non deve aspettare che NEO termini il monologo. È una euristica basata su ASR, non un classificatore infallibile di rumori o eco.

La modalità **protetta** blocca il microfono fino a 350 ms dopo la fine dell’audio; **Interrompi NEO / Riprendi ascolto** restituisce esplicitamente il turno, riattiva un mute scelto dall’utente e tenta di sbloccare l’audio senza ricreare il peer. Mute, stop e background conservano la precedenza. Il cambio di scenario non chiude WebRTC. Sensibilità, rumori, eco e latenza reali richiedono nuova prova sul visore.

## Stato di ascolto e recupero dopo un turno

L’indicatore sopra NEO e il pannello della pagina condividono parole e colori: **Puoi parlare**, **Ti ascolto**, **Sto preparando la risposta**, **NEO risponde**, **Microfono spento**, **Microfono in pausa**, **Audio da riattivare** e **Voce interrotta**. La barra mostra l’energia del microfono locale, non la comprensione delle parole da parte del modello. I colori accompagnano il testo, senza sostituirlo. Il segnale segue la posizione dell’avatar; gira per restare leggibile ma non cambia posizione con la testa. Il menu resta distinto e chiudibile.

La perdita temporanea di focus WebXR sospende solo l’input. Il ritorno a `visible` o la fine della sessione XR rimuove quella pausa e conserva un eventuale mute manuale. La pagina realmente nascosta continua invece a terminare la connessione: non avvia microfoni automaticamente in background.

La coda Realtime correla gli eventi mediante `response.id` / `response_id`: un completamento o uno svuotamento tardivo del turno precedente non modifica quello nuovo. Una cancellazione già completata e una conferma persa non lasciano il client in attesa infinita. Le richieste rifiutate perché il server sta ancora rispondendo conservano il turno dell’utente. Una trascrizione che non arriva entro 10 s ritorna allo stato pronto con invito a ripetere; un evento tardivo non genera una risposta inattesa.

In modalità protetta si preferisce sempre `output_audio_buffer.stopped`, successivo alla fine della generazione. Se manca, il recupero locale richiede **generazione completata, audio realmente rilevato e almeno 2,5 s di silenzio udibile**. È un fallback, non una misura certa della fine del buffer sul server; va provato con pause, eco e rete reale sul Quest. La coda e i timer sono ripuliti allo stop. Nessun segreto o testo del dialogo viene aggiunto ai log.

Fonti del ciclo eventi: [OpenAI Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations) e [server events](https://developers.openai.com/api/reference/resources/realtime/server-events).

## I due futuri ambientali

La stessa strada cambia gradualmente in otto secondi.

| Critico | Sostenibile |
|---|---|
| Cielo arancio e smog più denso | Cielo chiaro, aria più trasparente |
| Camini industriali e fumo animato | Turbine eoliche e pensilina solare |
| Traffico congestionato, auto deteriorate | Cinque auto elettriche in movimento, meno traffico |
| Barriere collassate, macerie e crepe | Colonnine di ricarica e pista ciclabile |
| Alberi spogli | Chiome stratificate, arbusti e verde più fitto |
| Canale asciutto | Acqua recuperata e giardini di raccolta |
| Facciate scure e deteriorate | Facciate rigenerate, tetti solari e tram |

Veicoli e acqua riutilizzano le stesse geometrie e cambiano materiali e quantità. Infrastrutture critiche e sostenibili si dissolvono durante la trasformazione; alberi e pannelli crescono gradualmente. Il fumo è una piccola mesh istanziata, non una simulazione volumetrica o un effetto pesante.

La nuova geometria è procedurale e non richiede download o editor. Gli asset Poly Haven CC0 e RobotExpressive sono conservati; la successiva estensione economica/sociale integra quattro asset Kenney CC0 verificati. Lo scenario resta un'ipotesi narrativa.

## Carico e verifiche

Le decorazioni animate sono aggiornate a 30 Hz; camera, tracking XR e robot conservano il frame loop del renderer. Il profilo low mantiene gli alberi vicini, riduce le chiome e i rami lontani e dimezza il fumo; dopo la trasformazione vengono renderizzati cinque veicoli invece di quindici. I bounds conservativi evitano la scomparsa delle auto animate per culling.

I test verificano menu ancorato, raggi su soli pulsanti visibili, selezione controller, pinch, deduplicazione, navigazione, protezione microfono, rispetto del mute, timer dopo lo stop e trasformazione senza nuove geometrie. Le prove browser desktop/Android/iPhone non attestano hand tracking, passthrough o 72 FPS sul Quest.

La revisione room scale aggiunge sguardo continuo a 360° e seguito nella sola stanza virtuale: vedere [ROOM_SCALE.md](ROOM_SCALE.md).
