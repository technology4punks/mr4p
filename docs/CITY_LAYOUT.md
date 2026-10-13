# Pianta della città · revisione del 13 ottobre 2026

La V4 conserva una città e trenta interventi cumulativi. `CityPlan.ts` è la pianta condivisa da edifici, vegetazione, persone, ciclisti, traffico e trasporto pubblico. Le combinazioni usano gli stessi spazi riservati; non sovrappongono nuovi edifici a quelli esistenti. La conversazione e le regole decisionali restano invariate.

## Sezione del viale

Coordinate locali, metri; la finestra si trova davanti al viale. Tutti i percorsi sono paralleli lungo X. Nessun personaggio viene spostato lateralmente dalla trasformazione del futuro.

| Elemento | Z |
|---|---:|
| Due marciapiedi pedonali | −5,5 / −6,2 |
| Filare alberato e pergole laterali | −7,7 |
| Monopattini | −9,05 |
| Biciclette / cargo sulla pista protetta | −9,65 / −10,4 |
| Fermata e pensilina | −12 |
| Tram | −13,3 |
| Due corsie automobilistiche | −15,1 / −16,85 |
| Furgoni elettrici | −18,6 |
| Cargo sul percorso di servizio | −20,1 |
| Ferrovia sopraelevata | −33 |

I pedoni mantengono corsie e distanza longitudinale in entrambi gli stati della città. Velocità integrata, senza riavviare il percorso quando cambia l’aria. Le chiome non invadono il cammino; il centro del panorama rimane aperto e il filare occupa i lati. Rain garden, griglie e bordi restano separati dalle persone. `CityTransit` possiede l’unica fermata, i binari e i veicoli: eliminata l’infrastruttura duplicata del relativo intervento.

## Lotti e tetti

| Fascia | Funzioni riservate |
|---|---|
| Z −25 | Acqua trattata, parco, impollinatori, energia condivisa, recupero alimentare, microhub |
| Z −41 | Orti, riuso, riciclo, raffrescamento |
| Z −53 / −54 | Nuova costruzione, fotovoltaico, serra verticale, trattamento residui |
| Z −30 | Corso d’acqua, prima della ferrovia |
| X −0,8 | Corridoio ecologico con interruzione presso la ferrovia |

Gli edifici di base sono selezionati da una griglia deterministica, escludendo lotti, vegetazione, corso d’acqua e ferrovia con un margine. Edifici intermedi e skyline occupano due fasce successive, senza collisioni con gli interventi in primo piano. Il cielo da 140 m resta entro il far plane da 150 m della camera anche spostandosi nella stanza. Insegne e arredi devono rientrare nei lotti. I quattro interventi sul tetto condividono gli edifici reali: coating sotto, verde a sinistra, pannelli a destra, raccolta acqua sul retro. R08 aggiunge habitat sul bordo dell’impianto solare, senza traslare l’intero corridoio attraverso gli edifici. Gli interventi su tetti/facciate e la linea aerea del tram compaiono con una dissolvenza a quota fissa: non attraversano edifici o veicoli durante la crescita. La dissolvenza si compone con quella MR/VR, senza renderli opachi durante il ritorno. Il segnale temporaneo di una scelta è piccolo, posto sul lotto/tetto corretto.

## Verifica riproducibile

`tests/city-plan.test.ts` controlla le **geometrie e matrici effettive** di Three.js, comprese le singole istanze e i loro antenati: margini dei lotti, separazione dei tetti, pedoni rispetto ad alberi/arredi, persone fra loro, ingombri dei veicoli/ciclisti rispetto agli ostacoli e al traffico. Campioni con tutti i trenta interventi, sottoinsiemi, rimozioni, crescita intermedia e qualità ridotta. Il caso completo verifica contemporaneamente tutte le occupazioni riservate; non è una enumerazione delle 2³⁰ combinazioni.

Per l’ispezione visiva, avviare `npx vite --host 127.0.0.1` e aprire `/scripts/city-layout-preview.html`. Parametri: `?sample` (cinque interventi), `?all`, `?all&side`, `?all&map`, `?all&low`. La pagina è uno strumento di sviluppo separato; non è importata dall’applicazione o inclusa nella build di produzione. Le immagini e i contatori software sono in `docs/validation/city-layout/`.

La separazione è progettata nei percorsi predefiniti, senza introdurre fisica o pathfinding costosi. Non comprende ostacoli della stanza reale, utenti o oggetti aggiunti da terzi. I budget GPU, la vista stereoscopica e il comfort richiedono una prova fisica sul Quest Pro; i contatori del browser software non certificano 72 FPS.
