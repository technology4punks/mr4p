# Revisione dei controlli Quest e del futuro ambientale

La prova dell'utente sul visore ha confermato che la base era utilizzabile, ma ha evidenziato menu sempre visibile, selezione non funzionante e interruzioni vocali causate dai rumori. Questa revisione risponde a quel feedback. I nuovi comportamenti richiedono una nuova prova fisica sul Quest Pro.

## Menu immersivo

- Con local-floor il pannello resta chiuso durante l’avvio automatico a 1,3 m; si apre se occorre calibrare o scegliere un punto libero. Nel riposizionamento manuale si chiude dopo la conferma. Restano due piccoli comandi laterali: Menu e Parla / interrompi.
- A/X, clic dello stick o presa del controller aprono/chiudono il pannello. Puntatore, cursore e bordo illuminato indicano il pulsante selezionato; il grilletto attiva l'azione.
- Lo stick sceglie i pulsanti con una zona morta e ripetizione controllata. Spostare intenzionalmente il controller restituisce il controllo al puntatore. Lo stick non sposta la camera.
- Con il tracciamento mani disponibile: raggio della mano e pinch. Si richiede hand-tracking come funzionalità opzionale; gli eventi nativi e il controllo delle articolazioni hanno deduplicazione e isteresi.
- Quando aperto, il pannello rimane nel punto in cui è stato richiamato, invece di inseguire la testa. Le azioni nascoste non intercettano i raggi.
- Le funzioni di calibrazione restano in Posizionamento; nell'osservatorio compaiono Futuro sostenibile e Torna alla realtà.
- Nessuna dipendenza da DOM Overlay, modelli di controller esterni o locomozione artificiale.

## Voce in un ambiente rumoroso

La modalità predefinita protegge la risposta di NEO. Echo cancellation e noise suppression restano attive; l'auto gain viene disabilitato dove il browser lo supporta. Il backend configura riduzione del rumore near_field, VAD con soglia 0,75, pre-roll 350 ms, pausa 900 ms e interruzione automatica disattivata.

Il microfono smette temporaneamente di trasmettere durante la riproduzione della voce remota, fino a 350 ms dopo la fine dell'audio. La fine della generazione non riapre il microfono prima della fine effettiva della riproduzione. Mute manuale, stop e chiusura della pagina hanno precedenza sui timer.

Per parlare mentre NEO risponde, usare **Parla / interrompi**: cancella la risposta, svuota l'audio remoto e restituisce il turno mantenendo il peer WebRTC. Le **Interruzioni vocali** sono riattivabili nel menu o nella pagina per ambienti silenziosi. In quella modalità si può interrompere parlando, senza premere un pulsante.

Il cambio di ambiente non chiude la conversazione. Le chiavi restano nel backend. La prova automatica verifica le impostazioni e il rilascio del token; sensibilità, latenza ed eco reali richiedono il microfono del visore.

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

La nuova geometria è procedurale e non richiede download o editor. Gli asset Poly Haven CC0 e RobotExpressive sono conservati; non sono stati aggiunti asset esterni o licenze da verificare. Lo scenario resta un'ipotesi narrativa.

## Carico e verifiche

Le decorazioni animate sono aggiornate a 30 Hz; camera, tracking XR e robot conservano il frame loop del renderer. Il profilo low mantiene gli alberi vicini, riduce le chiome e i rami lontani e dimezza il fumo; dopo la trasformazione vengono renderizzati cinque veicoli invece di quindici. I bounds conservativi evitano la scomparsa delle auto animate per culling.

I test verificano menu ancorato, raggi su soli pulsanti visibili, selezione controller, pinch, deduplicazione, navigazione, protezione microfono, rispetto del mute, timer dopo lo stop e trasformazione senza nuove geometrie. Le prove browser desktop/Android/iPhone non attestano hand tracking, passthrough o 72 FPS sul Quest.

La revisione room scale aggiunge sguardo continuo a 360° e seguito nella sola stanza virtuale: vedere [ROOM_SCALE.md](ROOM_SCALE.md).
