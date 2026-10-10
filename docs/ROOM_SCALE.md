# NEO vicino all’interlocutore

## Sguardo e posizione iniziale

Il robot ruota testa e corpo verso la posizione del visore in tutti gli stati, anche con voce spenta e quando l’utente gli passa dietro. La rotazione segue l’arco più corto, con smoothing e limite di circa 120°/s. La testa aggiunge un piccolo movimento orizzontale e verticale. Un gruppo visuale separato mantiene intatta la posa del root gestita dagli anchor; funziona anche con un osservatorio ruotato e con il robot procedurale di riserva.

All’ingresso in XR, dopo circa tre secondi di ricerca del pavimento, NEO viene posizionato automaticamente a **1,3 metri**, misurati orizzontalmente, davanti alla direzione del visore. Guardare in basso non cambia la distanza. Il pannello non si apre se local-floor è disponibile. I piedi usano il piano compatibile rilevato oppure la quota local-floor, da verificare visivamente; con riferimento local incerto serve la calibrazione. Un tavolo o una parete rilevati nel punto previsto fanno aprire il flusso manuale. Questi controlli non rilevano gli oggetti che WebXR non espone.

Un anchor persistente recuperato viene riusato se entro 20 cm dal punto iniziale previsto; se lontano, viene eliminato/sostituito mediante lo stesso AnchorManager. Riposiziona, correzione quota, selezione manuale, reset e recenter senza anchor continuano a richiedere una conferma. Hit-test non può spostare il punto automatico lontano dall’interlocutore.

## Seguito nell’osservatorio

Nella sessione immersiva il robot prova a rimanere vicino quando la distanza dall’utente esce dall’intervallo 0,8–1,7 m. Preferisce un punto a 1,15 m di lato e 0,35 m dietro; prova il lato opposto se quello preferito è bloccato. Girare soltanto la testa non sposta il robot. La velocità massima è **0,45 m/s**, con la clip Walking, senza muovere la camera né interrompere il peer voce.

Il controllo usa il volume della stanza, una sagoma del robot di raggio 35 cm e gli ingombri del davanzale/oggetti narrativi, panca e tavolino. L’ingombro del tavolino è riservato prima del download e aggiornato dal modello caricato in coordinate stanza. Il percorso è controllato lungo tutto il segmento, anche attraverso ostacoli sottili; conserva almeno 65 cm dall’utente, consentendo di allontanarsi se l’utente si avvicina di più. Se entrambi i percorsi sono bloccati il robot si ferma: non implementa un navigatore che aggira ogni arredo.

Il seguito si arresta durante transizioni di ingresso/uscita, tracking perso, sessione non visibile o posizione del visore fuori dalla stanza virtuale. Le pause non causano salti. Al ritorno in MR si ripristina la posizione salvata del robot e l’anchor reale. In anteprima desktop/iPhone il robot si volta verso la camera, ma non insegue la camera orbitabile.

## Limite nella stanza reale

Il seguito autonomo in MR resta disattivato. Plane detection può omettere mobili, persone e ostacoli: non basta per garantire collisioni nella stanza reale. Si applica il fallback richiesto dall’utente, **robot ancorato che guarda sempre l’interlocutore**. Non sono usate telecamere, riconoscimento oggetti o false mesh della stanza. Un futuro seguito reale richiederebbe una mappa affidabile e una validazione sul dispositivo.

Collisioni e limiti virtuali riguardano soltanto l’avatar. Rispettare sempre Guardian e gli ostacoli fisici; l’osservatorio non offre indicazioni sulla sicurezza della stanza reale.

## Verifica

Test automatici: avatar GLB reale che si volta dietro e dentro un parent ruotato, stabilità del root, arco breve e pause; avvio automatico, calibrazione, tavoli, posizione manuale, restore vicino/lontano, perdita tracking; seguito laterale, velocità, piedi, pareti, arredi, lato alternativo e distanza dall’utente. I mock XR non certificano Quest Pro: orientamento, floor/anchor, room scale, comfort e prestazioni richiedono una nuova prova fisica.
