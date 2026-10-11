# Due futuri ambientali — revisione visiva, 11 ottobre 2026

Questa revisione riguarda soltanto l'aspetto e il movimento delle ambientazioni ambientali. Avatar, menu, conversazione, prompt e backend rimangono quelli esistenti. I quartieri economico e sociale conservano geometria, illuminazione e composizione precedenti; il solo correttivo condiviso è la continuità della velocità del trasporto durante la trasformazione.

## Aspetto

- Facciate con finestre anche sui lati, rientranze, balconi, coronamenti, plinti, macchie di dilavamento nel futuro critico e tetti/balconi verdi nel sostenibile. Gli edifici sono arretrati localmente dove necessario per non intersecare la nuova ferrovia.
- Luce naturale più leggibile sul fronte degli edifici; smog color polvere, rami secchi, erbe secche, macerie e traffico lento caratterizzano il futuro critico. Aria limpida, verde, acqua, ciclisti, auto elettriche e rinnovabili caratterizzano quello positivo.
- 14 alberi con rami e chiome asimmetriche, quattro gruppi di foglie ciascuno, e 104 ciuffi d'erba/canne. Nel profilo ridotto rimangono 8 alberi e 52 ciuffi, distribuiti su entrambi i lati e due distanze. Crescita e vento agiscono nello shader senza ricreare geometrie o inviare matrici a ogni frame.
- Pavimentazione drenante, giunti, griglie, bordi del canale e lampioni sottili. Alcuni dettagli bassi si vedono avvicinandosi alla finestra: non richiedono di spostarsi per comprendere lo scenario.
- Il treno passa più lontano (z −19,5 m) per lasciare leggere la città; tram in primo piano, treno e auto hanno spazi distinti. Carrozzerie ferroviarie arrotondate. Turbine più basse visibili dall'osservazione iniziale.

## Fluidità e budget

Auto, biciclette, persone ambientali e trasporto pubblico aggiornano le pose a ogni frame renderizzato. Non significa che il dispositivo raggiunga una specifica frequenza. Le distanze di auto/tram/treno/biciclette sono integrate nel tempo; la trasformazione non moltiplica più tutto il tempo trascorso per la nuova velocità. Dopo una pausa non si recuperano secondi di movimento in un salto. Fumo e pale lontane conservano aggiornamenti decorativi limitati; il tracking XR non dipende da questi aggiornamenti.

La vegetazione usa 3 batch instanziati: 7.936 triangoli nel profilo completo e 4.468 in quello ridotto. Il vento aggiorna soltanto uniformi. Facciate e dettagli condividono una texture procedurale RGBA 128×128 (65.536 byte base, con mipmap); nessun download aggiuntivo. Nel profilo ridotto si omettono montanti/lampioni e si sostituiscono i minuscoli smussi delle facciate con la geometria semplice già allocata. Restano i rientri e i balconi tridimensionali. Nessun post-processing o shadow map aggiunto.

## Verifica

Test dedicati verificano: continuità dei trasporti a intervalli di 1/72 s anche dopo cinque minuti, trasformazione in entrambe le direzioni, pausa/ripresa, isolamento dei temi, riuso delle geometrie, budget della vegetazione, bounds di culling con margine per il vento, assenza di upload delle matrici per il vento, separazione edifici/ferrovia e visibilità geometrica del mozzo centrale dalla finestra.

I render di confronto sono misure su Chromium con SwiftShader in un container, non sul Quest. Costi, immagini e risultati finali sono riportati in `validation/environmental-visuals/`. Il confronto della scena isolata esclude avatar/UI e usa la camera iniziale (0; 1,6; 1,8), 1.100×760 pixel e lo stesso profilo. Non si usano i tempi FPS del container per sostenere miglioramenti di velocità sul visore: compilazione shader e carico condiviso li rendono non rappresentativi.

Restano da verificare sul Meta Quest Pro: frame time reale durante entrambe le trasformazioni, leggibilità dei dettagli in stereo, compositing del passthrough e comfort room-scale. La finestra e l'ambiente non sostituiscono i confini di sicurezza reali del visore.

### Costi misurati della scena isolata

| Profilo | Futuro | Draw call | Triangoli prima | Triangoli dopo |
|---|---|---:|---:|---:|
| Ridotto | Critico | 57 | 17.088 | 18.848 |
| Ridotto | Sostenibile | 67 | 25.352 | 21.528 |
| Completo | Critico | 59 | 20.496 | 25.676 |
| Completo | Sostenibile | 69 | 34.304 | 30.180 |

Nel profilo ridotto il futuro positivo usa circa il 15% di triangoli in meno. Quello critico aggiunge circa il 10% per rami/facciate; nel profilo completo il dettaglio comporta un aumento maggiore. Sono costi geometrici, non una misura di accelerazione della GPU o una garanzia di 72 FPS. La qualità adattiva esistente continua a ridurre il carico.
