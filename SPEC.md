> Aggiornamento prioritario del 13 ottobre 2026: visita guidata predefinita di circa 3–4 minuti. Saluto breve, nome facoltativo, annuncio del teletrasporto verso un futuro critico ipotetico; nessuna ulteriore autorizzazione per le scene. Mostrare interventi pertinenti alle risposte effettive, ascoltare dopo ogni domanda. Ritorno dopo poche scelte o 210 secondi attivi e frase da ricordare, senza riflessione obbligatoria. Eliminare i tre comandi persistenti XR, mantenere menu nascosto richiamabile. Aggiungere una control room PC con registro anonimo soltanto dopo consenso separato e accesso operatori autenticato/allowlist; esperienza visore pubblica. La modalità libera conserva il percorso esteso sottostante. Vedi [GUIDED_CONTROL_ROOM.md](docs/GUIDED_CONTROL_ROOM.md).

---

> Correzione del bilanciamento dopo il test della versione 20: NEO deve attendere la risposta dopo ogni domanda. I commenti dell’app, il nome da solo e il silenzio non avviano visite o interventi. Un interesse espresso continua a bastare per mostrare direttamente il catalogo, senza autorizzazioni aggiuntive. Separare commenti applicativi e veri turni vocali, preservando interruzioni e recupero del microfono. Vedi [VOICE_UX.md](docs/VOICE_UX.md).

> Aggiornamento richiesto dall’utente il 12 ottobre 2026: il flusso conversazionale deve essere libero. Ingresso e interventi visivi non richiedono consenso, leva preliminare o conferma; nome e numero di scelte non bloccano la visita. Conservare richieste durante le transizioni e consentire esplorazione oltre le prime cinque scelte del registro didattico. Il consenso **al salvataggio** resta distinto e obbligatorio. Questa integrazione prevale sui precedenti vincoli di conferma/rigidità della specifica sottostante. Implementazione e limiti: [VOICE_UX.md](docs/VOICE_UX.md).

# FUTURE OBSERVATORY — V4
## The Complexity of Choice
### Specifica completa per Codex — Esperienza Mixed Reality con simulazione narrativa della sostenibilità ambientale

---

# 0. ISTRUZIONI PRIORITARIE PER CODEX

Stai sviluppando Future Observatory, un'esperienza immersiva basata su Meta Quest Pro, WebXR, Three.js e OpenAI Realtime.

Questo documento definisce la nuova versione del progetto e **sostituisce tutte le precedenti istruzioni riguardanti gli scenari narrativi, le categorie di sostenibilità e il sistema di decisioni**.

Prima di procedere:

1. Analizza il repository esistente.
2. Leggi README.md, SPEC.md e AGENTS.md.
3. Identifica le funzionalità già implementate.
4. Conserva tutto il codice funzionante compatibile con questa specifica.
5. Non ricominciare il progetto da zero.
6. Non eliminare le funzionalità tecniche già operative.
7. Aggiorna la documentazione affinché non contenga più requisiti narrativi obsoleti.
8. Procedi con l'implementazione effettiva, senza fermarti alla sola pianificazione.

La nuova esperienza è dedicata **esclusivamente alla sostenibilità ambientale**.

Elimina completamente la selezione iniziale tra sostenibilità ambientale, sociale ed economica.

Elimina le relative ambientazioni autonome.

Gli aspetti sociali ed economici possono emergere come conseguenze delle decisioni ambientali, ma non devono diventare scenari separati.

Non creare tre città, tre storie o tre percorsi narrativi.

L'obiettivo è realizzare un'unica esperienza curata, credibile, fluida, coinvolgente e fortemente interattiva.

---

# 1. VISIONE DEL PROGETTO

## Titolo

**Future Observatory — The Complexity of Choice**

## Concept

L'utente incontra un avatar AI nella propria stanza reale attraverso il passthrough del Meta Quest Pro.

L'avatar emerge da un portale virtuale, conversa con l'utente e lo invita a visitare il proprio osservatorio nel futuro.

L'osservatorio è una stanza tridimensionale virtuale, con una grande finestra panoramica affacciata su una città del 2050.

La città rappresenta inizialmente un futuro ambientalmente critico, conseguenza plausibile di politiche insufficienti e problemi rimasti irrisolti.

L'avatar invita l'utente a modificarne il destino.

L'utente dispone di **10 ambiti di intervento**, ma può effettuare **un massimo di 5 decisioni**, con la possibilità di concludere dopo la quarta.

Ogni decisione produce trasformazioni concrete e riconoscibili nella città.

Le conseguenze dipendono non soltanto dalla singola decisione, ma anche dagli interventi precedenti.

Una soluzione apparentemente positiva può presentare limiti, introdurre nuovi fabbisogni o entrare in conflitto con altre scelte.

Il robot accompagna il partecipante nella scoperta di queste interdipendenze.

## Messaggio educativo

La sostenibilità non è un elenco di comportamenti giusti o sbagliati.

È un problema sistemico, caratterizzato da risorse limitate, esigenze differenti, conseguenze indirette, incertezze e compromessi.

Non esiste necessariamente un unico futuro corretto.

**Il risultato dell'esperienza è la consapevolezza che prendere decisioni davvero sostenibili richiede una visione complessa e integrata.**

Non creare un quiz.

Non attribuire punteggi morali.

Non introdurre una combinazione prestabilita di risposte vincenti.

---

# 2. AMBIENTAZIONI

Devono esistere esclusivamente due configurazioni ambientali principali della stessa città.

## 2.1 CRITICAL FUTURE

La città del 2050 in una condizione ambientale critica.

Elementi:
- Atmosfera calda.
- Cielo opaco.
- Smog.
- Traffico congestionato.
- Pochissima vegetazione.
- Edifici poco efficienti.
- Infrastrutture deteriorate.
- Territorio impermeabilizzato.
- Corso d'acqua degradato.
- Presenza limitata di spazi naturali.

La città deve apparire credibile, non necessariamente post-apocalittica.

Evita immagini catastrofiche stereotipate.

Deve sembrare una città contemporanea che ha progressivamente accumulato problemi ambientali.

## 2.2 TRANSFORMED FUTURE

È esattamente la stessa città, modificata dagli interventi dell'utente.

Non deve essere una seconda città indipendente.

Non deve essere necessariamente un paradiso verde.

Alcuni problemi possono migliorare, altri rimanere irrisolti.

Il risultato finale è diverso per ciascun partecipante.

Le trasformazioni devono essere cumulative.

Esempio:

Se l'utente realizza piste ciclabili, poi installa pannelli solari e successivamente pianta alberi, la città deve mostrare contemporaneamente tutti e tre gli interventi.

Non resettare una trasformazione quando ne viene applicata un'altra, salvo conflitti esplicitamente gestiti.

## Vincolo tecnico

Utilizzare un'unica geometria urbana principale.

Le trasformazioni devono avvenire attraverso:
- Attivazione e disattivazione di asset.
- Cambiamenti dei materiali.
- Animazioni.
- Modifiche dell'illuminazione.
- Modifiche atmosferiche.
- Variazioni del traffico e degli elementi ambientali.
- Combinazioni di oggetti predefiniti.

Non generare nuove ambientazioni 3D tramite AI durante l'esperienza.

---

# 3. ARCHITETTURA TECNOLOGICA

Mantenere preferibilmente lo stack attuale:

- React.
- TypeScript.
- Vite.
- Three.js.
- WebXR.
- OpenAI Realtime API tramite WebRTC.
- Backend Node.js.
- Database persistente per il messaggio finale e le decisioni.
- Asset 3D glTF/GLB.

Non utilizzare:
- Unity.
- Unreal Engine.
- Blender.
- 3ds Max.
- Altri software di modellazione 3D manuale.

Utilizzare modelli gratuiti già disponibili online, geometrie procedurali e trasformazioni JavaScript/TypeScript.

Privilegiare asset con licenze permissive e documentate.

Possibili fonti:
- https://polyhaven.com
- https://kenney.nl/assets
- https://quaternius.com

Verificare le licenze degli asset realmente scaricati.

Non presupporre che tutti i file di un pacchetto siano gratuiti.

La chiave API OpenAI deve rimanere esclusivamente nel backend.

Per il browser utilizzare credenziali temporanee e il flusso di autenticazione supportato dalla Realtime API.

---

# 4. USER JOURNEY COMPLETA

## 4.1 Start

La webapp presenta una schermata iniziale chiara.

Titolo:

FUTURE OBSERVATORY

Sottotitolo:

"Il futuro non è scritto. Ma ogni scelta ha delle conseguenze."

Pulsante principale:

**INIZIA ESPERIENZA**

L'utente deve iniziare esplicitamente.

Non avviare automaticamente il microfono.

Richiedere i permessi necessari, verificare WebXR e mostrare messaggi comprensibili in caso di incompatibilità.

## 4.2 Portale Mixed Reality

Dopo l'avvio:

1. Attiva il passthrough quando supportato.
2. Identifica o stima il pavimento.
3. Posiziona un portale a circa 2 metri davanti al visore.
4. Il portale deve restare fisso nello spazio.
5. Il portale si apre.
6. L'avatar emerge con un'animazione.
7. Si gira verso l'utente.
8. Saluta e inizia una breve conversazione.
9. Il portale si richiude.

Il portale non deve seguire la testa.

L'avatar deve avere i piedi sul pavimento.

Utilizzare riferimenti spaziali WebXR e funzionalità di hit-test dove disponibili.

Prevedere sempre un sistema di posizionamento manuale.

Non presumere che il browser supporti ancoraggi persistenti tra sessioni.

## 4.3 Introduzione narrativa

L'avatar introduce la storia.

Esempio di intenzione narrativa:

"Voglio mostrarti una città del futuro. Una città che ha dovuto affrontare le conseguenze delle decisioni prese molti anni prima. Ma c'è ancora qualcosa che possiamo fare."

La conversazione deve essere breve e naturale.

## 4.4 Ingresso nell'osservatorio

L'utente entra in una stanza virtuale tridimensionale.

Grande finestra panoramica davanti a lui.

All'esterno è visibile la città critica del 2050.

L'avatar rimane presente e continua a parlare.

Preferire una transizione visiva progressiva dall'AR alla scena virtuale, verificando le capacità effettive del browser.

Se è necessaria una nuova sessione immersive-vr, gestire un'interazione esplicita dell'utente e conservare il contesto narrativo.

Non dichiarare possibile un cambio automatico di modalità senza averne verificato il supporto.

## 4.5 Osservazione della città

Il robot descrive sinteticamente alcuni problemi:
- Inquinamento.
- Caldo.
- Traffico.
- Mancanza di verde.
- Pressione sulle risorse.

Poi chiede:

"Se potessi cambiare il futuro di questa città, da dove cominceresti?"

Si apre il sistema delle decisioni.

## 4.6 Decisioni dell'utente

L'utente seleziona liberamente gli ambiti su cui intervenire.

Per ogni intervento:
1. Sceglie un ambito.
2. Il robot introduce il problema.
3. Presenta tre possibili soluzioni.
4. L'utente sceglie.
5. La città si trasforma.
6. L'avatar descrive i risultati.
7. Vengono evidenziati eventuali compromessi.
8. L'utente decide come continuare.

Dopo quattro decisioni, l'utente può concludere oppure effettuare un quinto intervento.

## 4.7 Revisione finale

L'utente osserva la città risultante.

Il robot propone di ripensare una delle decisioni.

È consentita al massimo una revisione.

La revisione non consuma uno slot aggiuntivo.

## 4.8 Ritorno alla realtà

L'osservatorio scompare.

L'utente torna nell'ambiente reale.

Il robot rimane presente in Mixed Reality, con un posizionamento sicuro e stabile.

## 4.9 Messaggio al futuro

Il robot pone una domanda riflessiva.

La risposta può essere salvata nel backend previo consenso.

L'avatar saluta e l'esperienza termina.

---

# 5. REGOLE DEL DECISION ENGINE

Sono disponibili dieci leve.

Ogni leva offre tre interventi.

L'utente può realizzare fino a cinque interventi complessivi.

## Libertà di scelta

Non imporre un ordine predefinito.

Non obbligare a selezionare ambiti differenti.

L'utente può intervenire più volte sullo stesso tema scegliendo interventi distinti.

Esempio:

Decisione 1: costruire una rete di tram.

Decisione 2: realizzare piste ciclabili.

Entrambe appartengono alla mobilità, ma consumano due slot distinti.

Le due infrastrutture devono poter coesistere.

Se l'utente ripete una scelta identica già applicata, non consumare automaticamente un altro intervento: ricorda che è già stata realizzata e chiedi se vuole modificarla o aggiungere qualcosa.

## Conclusione

Dopo la quarta decisione il robot chiede:

"Vuoi realizzare un ultimo intervento oppure preferisci osservare il futuro che hai costruito?"

Se l'utente continua, può effettuare il quinto.

Dopo il quinto, la fase decisionale termina.

L'utente può comunque interrompere l'esperienza in qualsiasi momento.

---

# 6. LE DIECI LEVE — DEFINIZIONE COMPLETA

Le scelte seguenti costituiscono il catalogo iniziale del simulatore.

Ogni intervento deve avere:
- Identificatore stabile.
- Etichetta.
- Descrizione.
- Benefici plausibili.
- Limiti e compromessi.
- Trasformazioni visive.
- Variabili di stato coinvolte.
- Flag per le interdipendenze.
- Eventuali condizioni narrative.

I benefici e gli svantaggi sono dipendenti dal contesto. Non trasformarli in affermazioni scientifiche assolute.

## LEVA 01 — MOBILITÀ URBANA

Problema iniziale: traffico elevato e dipendenza dalle automobili.

### MOB_BIKE — Piste ciclabili

Intervento:
Realizzazione di una rete ciclabile protetta.

Benefici:
- Favorisce spostamenti brevi senza auto.
- Riduce parte del traffico se utilizzata.
- Richiede meno spazio per passeggero rispetto all'automobile.

Criticità:
- Continuità e sicurezza della rete.
- Accessibilità non universale.
- Efficacia variabile con distanza, topografia e condizioni locali.

Trasformazione visiva:
- Compaiono piste ciclabili.
- Parte della carreggiata cambia.
- Appaiono biciclette.

### MOB_TRAM — Tram elettrici

Benefici:
- Elevata capacità di trasporto.
- Possibile riduzione dell'uso dell'auto.
- Collegamento efficiente tra quartieri lungo il percorso.

Criticità:
- Investimenti importanti.
- Tempi di realizzazione.
- Maggior fabbisogno di energia elettrica.
- Necessità di integrazione con altri trasporti.

Trasformazione visiva:
- Binari.
- Fermate.
- Tram animato.
- Riorganizzazione di parte della strada.

### MOB_SCOOTER — Monopattini condivisi

Benefici:
- Alternativa per alcuni tragitti brevi.
- Introduzione relativamente rapida.
- Potenziale integrazione con il trasporto pubblico.

Criticità:
- Sicurezza.
- Gestione dei parcheggi.
- Accessibilità limitata.
- Possibile sostituzione di spostamenti già effettuati a piedi.

Trasformazione visiva:
- Monopattini.
- Stazioni dedicate.
- Percorsi di micromobilità.

---

## LEVA 02 — VERDE URBANO

Problema iniziale: poco verde, superfici calde e scarsità di ombra.

### GREEN_TREES — Alberi lungo le strade

Benefici:
- Ombreggiamento.
- Miglioramento del microclima.
- Potenziale beneficio per habitat urbani.

Criticità:
- Acqua.
- Manutenzione.
- Suolo disponibile per radici.
- Scelta di specie adatte.

Visivo:
Alberi che compaiono progressivamente lungo i viali, con chiome e ombre.

### GREEN_PARK — Grande parco

Benefici:
- Spazio verde pubblico.
- Possibile raffrescamento locale.
- Opportunità per habitat e attività all'aperto.

Criticità:
- Occupazione di suolo urbano.
- Manutenzione.
- Fabbisogno idrico, soprattutto con specie non adatte.
- Possibili effetti sui valori immobiliari e sull'accessibilità.

Visivo:
Un quartiere o terreno degradato diventa un grande parco.

### GREEN_ROOFS — Tetti verdi

Benefici:
- Vegetazione su superfici già costruite.
- Contributo all'isolamento e alla gestione delle acque meteoriche, in funzione del progetto.
- Potenziali microhabitat.

Criticità:
- Carico strutturale.
- Costi.
- Manutenzione.
- Possibile competizione o integrazione con impianti fotovoltaici.

Visivo:
Diversi tetti assumono vegetazione.

---

## LEVA 03 — ENERGIA

Problema iniziale: produzione energetica ad alto impatto ambientale.

### ENERGY_ROOFTOP — Fotovoltaico sui tetti

Benefici:
- Produzione rinnovabile distribuita.
- Utilizzo di superfici costruite.
- Minore necessità di nuovo suolo per gli impianti.

Criticità:
- Superfici idonee limitate.
- Costi iniziali.
- Necessità di rete e flessibilità.
- Produzione variabile.

Visivo:
Pannelli sui tetti.

### ENERGY_SOLAR_FARM — Grandi impianti solari

Benefici:
- Produzione rinnovabile su scala maggiore.
- Possibilità di contribuire significativamente alla domanda elettrica.

Criticità:
- Localizzazione e uso del suolo.
- Possibili interferenze con habitat o paesaggio.
- Necessità di collegamenti alla rete.

Visivo:
Parco fotovoltaico nella periferia visibile.

### ENERGY_COMMUNITY — Comunità energetiche e accumulo

Benefici:
- Condivisione dell'energia.
- Maggiore flessibilità attraverso sistemi di accumulo.
- Possibile coinvolgimento locale.

Criticità:
- Coordinamento.
- Investimenti.
- Limiti regolatori e infrastrutturali.
- Necessità di produzione effettiva.

Visivo:
Piccoli impianti distribuiti, sistemi di accumulo e connessioni energetiche rappresentate in modo discreto.

Non rappresentare le comunità energetiche come produzione elettrica gratuita o illimitata.

---

## LEVA 04 — EDIFICI

### BUILD_RETROFIT — Riqualificazione degli edifici

Benefici:
- Riduzione del fabbisogno energetico.
- Possibilità di conservare la struttura esistente.
- Miglior comfort.

Criticità:
- Costi.
- Tempi e disagi dei lavori.
- Complessità degli interventi.

Visivo:
Facciate riqualificate, nuovi serramenti, isolamento e ombreggiamento.

### BUILD_NEW — Nuovi edifici efficienti

Benefici:
- Possibilità di progettazione integrata.
- Elevata efficienza operativa.

Criticità:
- Materiali.
- Emissioni incorporate.
- Consumo di suolo, quando previsto.
- Necessità di valutare demolizione e costruzione nel ciclo di vita.

Visivo:
Alcuni edifici vengono sostituiti o trasformati.

### BUILD_PASSIVE — Architettura passiva

Benefici:
- Minore domanda di riscaldamento e raffrescamento quando adeguatamente progettata.
- Migliore protezione dal calore.

Criticità:
- Dipendenza dal clima e dall'orientamento.
- Limiti del patrimonio edilizio esistente.
- Necessità di progettazione specifica.

Visivo:
Frangisole, facciate ombreggiate, nuove coperture e schermature.

---

## LEVA 05 — ACQUA

### WATER_LEAKS — Riparazione della rete idrica

Benefici:
- Riduzione delle perdite.
- Maggiore efficienza delle risorse disponibili.

Criticità:
- Investimenti.
- Lavori sulle infrastrutture.
- Tempi di realizzazione.

Visivo:
Cantieri leggeri e successiva riqualificazione di alcune infrastrutture idriche.

### WATER_RAIN — Raccolta dell'acqua piovana

Benefici:
- Risorsa integrativa per alcuni usi non potabili, se correttamente gestita.
- Possibile riduzione del deflusso durante eventi piovosi.

Criticità:
- Piogge stagionali.
- Capacità di accumulo.
- Necessità di manutenzione.
- Disponibilità limitata durante siccità prolungate.

Visivo:
Serbatoi, sistemi di raccolta e infrastrutture sui tetti.

### WATER_REUSE — Riutilizzo di acque reflue trattate

Benefici:
- Riduzione della pressione sulle risorse potabili per usi appropriati.
- Possibile supporto all'irrigazione urbana.

Criticità:
- Trattamento e controlli.
- Reti dedicate.
- Investimenti e gestione.

Visivo:
Piccolo impianto di trattamento, serbatoi e infrastrutture.

---

## LEVA 06 — CALDO ESTREMO

### HEAT_REFLECT — Tetti e superfici riflettenti

Benefici:
- Riduzione dell'assorbimento di radiazione solare su alcune superfici.
- Possibile riduzione del fabbisogno di raffrescamento.

Criticità:
- Efficacia dipendente da clima, geometria e materiali.
- Possibili effetti di riflessione indesiderata.
- Manutenzione.

Visivo:
Coperture e superfici più chiare, aggiornamento delle ombre e dell'aspetto termico percepito.

### HEAT_SHADE — Pensiline e ombreggiamento

Benefici:
- Migliore comfort per pedoni e utenti del trasporto.
- Protezione diretta dal sole.

Criticità:
- Copertura limitata alle aree interessate.
- Costi e manutenzione.
- Necessità di integrazione urbanistica.

Visivo:
Pensiline, pergolati e percorsi ombreggiati.

### HEAT_DISTRICT — Raffrescamento di quartiere

Benefici:
- Possibili economie di scala in contesti adatti.
- Gestione coordinata del raffrescamento.

Criticità:
- Investimenti.
- Complessità infrastrutturale.
- Domanda energetica.
- Risultati dipendenti dalla tecnologia adottata.

Visivo:
Centrale compatta, infrastruttura di distribuzione e variazioni discrete degli edifici serviti.

---

## LEVA 07 — RIFIUTI E RISORSE

### WASTE_REUSE — Centri di riparazione e riuso

Benefici:
- Allungamento della vita dei prodotti.
- Riduzione potenziale della necessità di nuovi materiali.
- Attività economiche locali.

Criticità:
- Organizzazione.
- Adesione della popolazione.
- Limiti di riparabilità di alcuni prodotti.

Visivo:
Nuovi centri di riuso, spazi recuperati e attività locali.

### WASTE_RECYCLE — Riciclo avanzato

Benefici:
- Recupero di parte dei materiali.
- Minore necessità di alcune materie prime vergini.

Criticità:
- Consumo energetico.
- Qualità e selezione dei flussi.
- Residui non riciclabili.

Visivo:
Impianti, raccolta differenziata e infrastrutture.

### WASTE_ENERGY — Recupero energetico dal residuo

Benefici:
- Possibilità di trattare alcune frazioni residue non riciclabili.
- Recupero di parte dell'energia contenuta nei rifiuti.

Criticità:
- Emissioni da controllare.
- Costi.
- Gestione dei residui.
- Possibile dipendenza da flussi continui di rifiuti.

Visivo:
Impianto dedicato, con emissioni rappresentate senza suggerire prestazioni non documentate.

---

## LEVA 08 — LOGISTICA URBANA

### LOG_CARGO — Cargo bike

Benefici:
- Consegne urbane brevi con minore ingombro.
- Possibile riduzione di alcuni veicoli commerciali.

Criticità:
- Capacità di carico.
- Distanze.
- Necessità di rete ciclabile sicura.

Visivo:
Cargo bike sulle strade.

### LOG_EV — Furgoni elettrici

Benefici:
- Riduzione delle emissioni allo scarico.
- Potenziale riduzione del rumore urbano.

Criticità:
- Non eliminano congestione e occupazione della strada.
- Necessità di ricarica.
- Domanda di energia e materiali.

Visivo:
Flotta elettrica e punti di ricarica.

### LOG_HUB — Microhub logistici

Benefici:
- Consolidamento delle consegne.
- Possibilità di integrare mezzi più piccoli per l'ultimo tratto.

Criticità:
- Spazio urbano.
- Organizzazione.
- Costi operativi.

Visivo:
Piccoli hub di distribuzione, zone di carico e nuova organizzazione delle consegne.

---

## LEVA 09 — BIODIVERSITÀ

### BIO_RIVER — Rinaturalizzazione del fiume

Benefici:
- Possibile miglioramento degli habitat.
- Maggiore qualità ecologica.
- Potenziali benefici idrologici se il progetto è adeguato.

Criticità:
- Spazio.
- Complessità idraulica.
- Costi.
- Necessità di considerare i rischi di piena.

Visivo:
Un tratto di fiume canalizzato viene trasformato con sponde naturali e vegetazione.

### BIO_CORRIDORS — Corridoi ecologici

Benefici:
- Collegamento tra habitat.
- Possibile miglioramento della connettività ecologica.

Criticità:
- Competizione per il suolo.
- Interruzioni dovute alle infrastrutture.
- Necessità di continuità.

Visivo:
Fasce verdi tra parchi, rive e quartieri.

### BIO_POLLINATORS — Giardini per impollinatori

Benefici:
- Habitat locali.
- Maggiore diversità vegetale, se progettati con specie adeguate.
- Interventi distribuiti.

Criticità:
- Efficacia dipendente dal contesto.
- Manutenzione.
- Connessione con altri habitat.

Visivo:
Aiuole fiorite, giardini e piccole aree verdi.

---

## LEVA 10 — ALIMENTAZIONE URBANA

### FOOD_GARDENS — Orti urbani

Benefici:
- Produzione locale limitata.
- Partecipazione comunitaria.
- Possibile recupero di aree inutilizzate.

Criticità:
- Superfici.
- Acqua.
- Qualità del suolo.
- Capacità produttiva limitata.

Visivo:
Orti condivisi e piccoli spazi coltivati.

### FOOD_VERTICAL — Vertical farming

Benefici:
- Coltivazione controllata.
- Possibilità di usare spazi costruiti.
- Riduzione di alcuni usi del suolo per determinate colture.

Criticità:
- Consumi energetici potenzialmente elevati.
- Costi.
- Convenienza limitata a determinate colture e contesti.

Visivo:
Edificio con serre verticali illuminate.

### FOOD_RECOVERY — Recupero delle eccedenze alimentari

Benefici:
- Riduzione degli sprechi quando efficace.
- Migliore valorizzazione dei prodotti disponibili.

Criticità:
- Necessità di reti logistiche.
- Conservazione e distribuzione.
- Coordinamento operativo.

Visivo:
Mercato urbano, centro di recupero e attività di distribuzione.

---

# 7. RISORSE CONDIVISE E VINCOLI DELLA CITTÀ

Implementare un sistema interno di risorse e vincoli narrativi.

Non serve una simulazione scientifica numerica.

Per l'MVP utilizzare stati qualitativi e flag.

## Le cinque dimensioni interne

### WATER

Disponibilità e pressione sulle risorse idriche.

### ENERGY

Domanda elettrica, capacità di produzione e necessità di infrastrutture.

### LAND

Disponibilità e utilizzo del suolo e delle superfici urbane.

### INVESTMENT

Costi, tempi, capacità di realizzazione e manutenzione.

### ACCESSIBILITY

Distribuzione dei benefici e accessibilità degli interventi.

A queste possono essere associati risultati ambientali specifici, come qualità dell'aria, ombreggiamento e connettività ecologica.

Non mostrare automaticamente all'utente tutte queste variabili.

La comprensione deve avvenire principalmente attraverso la città e la voce dell'avatar.

Non introdurre un punteggio finale di sostenibilità.

---

# 8. INTERDIPENDENZE — REGOLE FONDAMENTALI

Il Decision Engine deve implementare almeno le seguenti 12 relazioni.

Le condizioni devono essere simmetriche rispetto all'ordine delle scelte, quando logicamente appropriato.

Ad esempio, scegliere acqua dopo verde deve produrre la stessa sinergia che scegliere verde dopo acqua, pur adattando il dialogo all'ordine.

## R01 — Verde + acqua

GREEN_TREES o GREEN_PARK + WATER_REUSE

Effetto:
La strategia idrica può contribuire a sostenere la vegetazione durante periodi secchi, se correttamente dimensionata.

Visivo:
Il verde appare meglio mantenuto; si evidenziano le infrastrutture idriche.

Narrazione:
"Abbiamo collegato due problemi che sembravano separati: il verde urbano e la disponibilità d'acqua."

## R02 — Parco + stress idrico

GREEN_PARK senza adeguata strategia idrica.

Effetto:
Compare un fabbisogno irrisolto, non un fallimento automatico.

Visivo:
Una porzione del parco può mostrare manutenzione difficile o vegetazione meno vigorosa, senza rappresentare una previsione inevitabile.

Narrazione:
"Creare un parco è un'ottima opportunità. Ma quali specie e quali risorse useremo per mantenerlo?"

## R03 — Tram + produzione rinnovabile

MOB_TRAM + ENERGY_ROOFTOP o ENERGY_SOLAR_FARM.

Effetto:
La produzione rinnovabile può contribuire a soddisfare la nuova domanda elettrica, senza suggerire copertura automatica o totale.

Visivo:
Tram attivi e impianti energetici visibili.

Narrazione:
"Stiamo collegando il trasporto pubblico a una strategia di produzione energetica."

## R04 — Tram senza interventi energetici

MOB_TRAM con domanda energetica aggiuntiva non ancora affrontata.

Effetto:
Viene evidenziata la necessità di valutare approvvigionamento e rete.

Non spegnere i tram arbitrariamente.

Narrazione:
"Abbiamo cambiato la mobilità, ma non abbiamo ancora deciso come sostenere la maggiore domanda elettrica."

## R05 — Piste ciclabili + cargo bike

MOB_BIKE + LOG_CARGO.

Effetto:
La stessa rete può essere utile alle persone e a parte della distribuzione urbana.

Visivo:
Le cargo bike usano la rete ciclabile.

Narrazione:
"Una singola infrastruttura sta offrendo benefici a due sistemi differenti."

## R06 — Parco + corridoi ecologici

GREEN_PARK + BIO_CORRIDORS.

Effetto:
Possibile miglioramento della connettività tra aree naturali.

Visivo:
Connessioni verdi dal parco verso altri habitat.

Narrazione:
"Un parco isolato è importante. Una rete di spazi verdi può svolgere funzioni ecologiche aggiuntive."

## R07 — Fotovoltaico + tetti verdi

ENERGY_ROOFTOP + GREEN_ROOFS.

Effetto:
Possibile competizione per superfici, carichi e manutenzione, ma anche integrazione in progetti compatibili.

Visivo:
Alcuni tetti vengono riconfigurati con installazioni combinate, altri mantengono una singola soluzione.

Non cancellare automaticamente tutti i pannelli.

Narrazione:
"Queste due soluzioni non sono necessariamente incompatibili. Ma dobbiamo progettarle insieme."

## R08 — Impianti solari + corridoi ecologici

ENERGY_SOLAR_FARM + BIO_CORRIDORS.

Effetto:
Possibile competizione per il territorio.

Visivo:
Alcuni tracciati verdi devono aggirare o integrare correttamente l'area degli impianti.

Narrazione:
"L'energia pulita è fondamentale. Anche il luogo in cui la produciamo può fare la differenza."

## R09 — Vertical farming + energia

FOOD_VERTICAL + qualsiasi intervento energetico pertinente.

Effetto:
La coltivazione indoor introduce un fabbisogno energetico significativo; una strategia energetica adeguata può contribuire a ridurne alcuni impatti.

Visivo:
Serra tecnologica con infrastruttura energetica.

Narrazione:
"Abbiamo ridotto alcuni vincoli agricoli, ma ora dobbiamo considerare l'energia necessaria per gestire l'impianto."

## R10 — Raffrescamento + energia

HEAT_DISTRICT + interventi ENERGY.

Effetto:
Collegamento tra comfort termico, domanda elettrica e infrastrutture.

Visivo:
Edifici serviti e centrale di raffrescamento, con eventuale integrazione energetica.

Narrazione:
"Raffrescare la città richiede anche una strategia per alimentare e gestire gli impianti."

## R11 — Edifici nuovi + riuso delle risorse

BUILD_NEW + WASTE_REUSE o altri interventi pertinenti di recupero dei materiali.

Effetto:
Possibilità di valorizzare il riuso e la riduzione dei materiali vergini, senza presupporre che un centro di riparazione domestica sia sufficiente a fornire componenti strutturali.

Visivo:
Elementi edilizi recuperati o piccole infrastrutture di riutilizzo dei materiali, se compatibili con la scena.

Narrazione:
"Progettare nuovi edifici significa anche domandarci quali risorse utilizziamo e quali possiamo recuperare."

## R12 — Microhub + cargo bike

LOG_HUB + LOG_CARGO.

Effetto:
Una rete logistica di quartiere può rendere più efficiente l'uso delle cargo bike per alcune consegne.

Visivo:
Cargo bike che partono da un hub.

Narrazione:
"Le due soluzioni si completano: una organizza la distribuzione, l'altra gestisce parte dell'ultimo tratto."

---

# 9. REGOLE PER LE CONSEGUENZE

Le conseguenze devono essere:

1. Plausibili.
2. Dipendenti dal contesto.
3. Coerenti con le decisioni precedenti.
4. Visualizzabili, quando possibile.
5. Comprensibili.
6. Non punitive.

Non inventare catastrofi improvvise.

Non degradare arbitrariamente la città per obbligare l'utente a scegliere un altro intervento.

Non fare apparire una soluzione sempre vincente.

Distinguere sempre tra:

**Beneficio ottenuto:** un effetto direttamente collegato all'intervento.

**Criticità residua:** un problema non ancora affrontato.

**Trade-off:** un compromesso associato alla scelta.

**Sinergia:** un beneficio derivante dalla combinazione di più interventi.

**Incertezza:** un effetto che dipende da condizioni non rappresentate dal simulatore.

Non trattare l'assenza di una decisione come prova automatica di peggioramento.

Se una combinazione non è prevista nel catalogo, applicare gli effetti individuali senza inventare un'interdipendenza.

---

# 10. CITY TRANSFORMATION ENGINE

Ogni intervento deve modificare concretamente la città.

Non è sufficiente visualizzare una notifica.

Non è sufficiente cambiare un indicatore.

Esempi:
- Piste ciclabili reali nella scena.
- Tram in movimento.
- Monopattini.
- Alberi.
- Parchi.
- Tetti verdi.
- Pannelli fotovoltaici.
- Edifici riqualificati.
- Impianti idrici.
- Pensiline.
- Cargo bike.
- Impianti di trattamento.
- Corridoi ecologici.
- Serre.
- Mercati.

## Organizzazione della città

Suddividere la scena in settori logici:

1. Quartiere residenziale.
2. Asse principale della mobilità.
3. Area verde e fiume.
4. Area produttiva e logistica.
5. Tetti e infrastrutture energetiche.
6. Periferia.

Tutti i settori principali devono essere riconoscibili dall'osservatorio, entro i limiti di visibilità della finestra.

L'avatar deve poterli indicare.

Non costruire una città navigabile.

L'utente rimane all'interno dell'osservatorio.

## Regola importante

Le trasformazioni devono essere deterministiche.

A parità di interventi attivi, la città deve essere ricostruibile nello stesso stato.

Non accumulare trasformazioni irreversibili direttamente sulle mesh senza una rappresentazione dello stato.

Utilizzare uno stato strutturato come sorgente di verità.

Il renderer deve derivare da quello stato quali oggetti, materiali e animazioni sono attivi.

Gestire la coesistenza di interventi che interessano le stesse superfici.

---

# 11. INTERAZIONE CON L'AVATAR AI

L'avatar rimane il principale sistema di interazione.

Non trasformare l'esperienza in una dashboard.

## Compiti dell'avatar

- Presentare la città.
- Ascoltare l'utente.
- Capire quale problema vuole affrontare.
- Presentare le tre alternative della leva selezionata.
- Interpretare risposte naturali.
- Confermare le scelte ambigue.
- Commentare i cambiamenti visivi.
- Ricordare gli interventi precedenti.
- Spiegare conseguenze e compromessi.
- Riconoscere interdipendenze.
- Invitare l'utente a riflettere.
- Gestire la conclusione.

## Esempio conversazionale

Robot:

"Da dove vorresti iniziare?"

Utente:

"Renderei la città più verde."

Robot:

"Possiamo piantare alberi lungo le strade, creare un grande parco oppure trasformare i tetti degli edifici. Quale preferisci?"

Utente:

"Mi piacciono i parchi."

Il Decision Engine registra GREEN_PARK.

La città si trasforma.

Il robot si volta verso la finestra.

Robot:

"Guarda. Abbiamo creato nuovi spazi verdi e ombreggiati. Ma questa città soffre ancora di siccità. Come garantiamo che il parco possa resistere?"

Utente:

"Potremmo recuperare l'acqua."

Il robot riconosce la leva WATER.

Presenta le alternative appropriate.

L'utente sceglie WATER_REUSE.

La città si trasforma nuovamente.

Il sistema attiva la sinergia R01.

Robot:

"Adesso abbiamo affrontato due problemi insieme. Non bastava creare il verde: dovevamo pensare anche a come mantenerlo."

Questo tipo di conversazione deve rappresentare il cuore del progetto.

## Gestione delle proposte libere

L'utente può proporre soluzioni non previste.

In questi casi l'avatar deve:
1. Riconoscere il valore della proposta, senza approvarla automaticamente.
2. Discuterla brevemente.
3. Identificare eventuali alternative simili disponibili.
4. Chiedere conferma prima di attivare una scelta che non corrisponde chiaramente alla proposta.

Non dichiarare eseguito un intervento che il sistema non può rappresentare.

L'AI non deve inventare asset, funzioni o trasformazioni inesistenti.

---

# 12. TOOL CALLING E VALIDAZIONE

OpenAI Realtime deve essere integrato con il Decision Engine attraverso tool strutturati.

Tool suggeriti:

- list_available_levers()
- select_lever(leverId)
- list_options(leverId)
- choose_intervention(optionId)
- confirm_intervention(optionId)
- get_city_state()
- get_active_consequences()
- explain_tradeoff(interventionId)
- continue_decisions()
- finish_decisions()
- request_revision()
- revise_intervention(slotId, newOptionId)
- complete_reflection()
- request_return_to_reality()

L'AI non deve modificare direttamente le mesh.

Non deve inviare codice JavaScript da eseguire.

Non deve creare regole arbitrarie di simulazione.

Ogni tool call deve essere validata attraverso schema tipizzato e stato narrativo corrente.

Non consentire:
- Più di cinque interventi attivi.
- Due interventi identici duplicati.
- Interventi inesistenti.
- Revisioni multiple.
- Passaggi narrativi in uno stato non valido.
- Salvataggi senza consenso.

Prevedere gestione di tool call duplicate, ritardate o ricevute fuori ordine.

L'applicazione deve poter essere controllata anche senza OpenAI attraverso una modalità di debug.

---

# 13. REVISIONE FINALE

Dopo la quarta o quinta decisione, il robot invita a osservare la città.

La riflessione deve essere specifica.

Non limitarti a frasi generiche.

Il robot dovrebbe descrivere:
- Due o tre miglioramenti osservabili.
- Una criticità residua.
- Un compromesso particolarmente significativo.
- Una sinergia eventualmente creata.

Poi chiede:

"Se potessi ripensare una delle tue decisioni, cambieresti qualcosa?"

## Regole

È ammessa una sola revisione.

La revisione può sostituire un intervento attivo con un altro intervento disponibile, anche appartenente a una leva diversa.

Non è consentito aumentare il numero di interventi.

Dopo la revisione:
1. Rimuovere l'intervento precedente.
2. Inserire il nuovo intervento.
3. Ricalcolare le risorse qualitative.
4. Ricalcolare tutte le interdipendenze.
5. Aggiornare coerentemente la città.
6. Eliminare effetti visivi non più validi.
7. Commentare il cambiamento.

Il ricalcolo deve derivare dallo stato corrente, non da una catena incontrollata di mutazioni precedenti.

Se l'utente non desidera modificare nulla, procedere alla conclusione.

---

# 14. FEEDBACK VISIVO E NARRATIVO

La scelta approvata per l'MVP è:

**Trasformazione della città + spiegazione dell'avatar.**

Non aggiungere dashboard di punteggi, indicatori permanenti o HUD di sostenibilità nell'esperienza principale.

La comunicazione dei risultati deve essere diegetica, cioè integrata nel mondo narrativo.

Esempio:
- L'avatar guarda verso il quartiere interessato.
- L'illuminazione richiama per un momento il settore.
- Avviene la trasformazione 3D.
- Il robot spiega il risultato.
- Può seguire una breve domanda riflessiva.

Eventuali indicatori numerici e informazioni tecniche devono rimanere nel pannello developer.

Non utilizzare valori apparentemente scientifici senza un modello verificato.

---

# 15. COMPORTAMENTO DELL'AVATAR

L'avatar deve sembrare presente nello spazio.

Stati suggeriti:
- IDLE
- LISTENING
- THINKING
- TALKING
- POINTING
- OBSERVING
- REFLECTING
- GREETING
- FAREWELL

Funzionalità:
- Orientamento naturale verso l'utente.
- Rotazione verso il settore della città interessato.
- Piccoli movimenti della testa.
- Gesti contestuali.
- Espressività compatibile con il modello.
- Lip-sync approssimato e stabile.
- Movimento coerente con l'audio.
- Pause naturali.

Quando avviene una trasformazione, l'avatar deve guardarla e attirare l'attenzione dell'utente.

Non deve seguire nervosamente ogni piccolo movimento del visore.

Il robot deve ricordare le decisioni e riprenderle verbalmente.

Non deve leggere lunghi monologhi.

Limitare per quanto possibile gli interventi continui a circa 15–25 secondi, lasciando spazio alle domande.

---

# 16. SOUND DESIGN

Mantenere il sound design immersivo.

Gli effetti devono cambiare insieme alla città.

Esempi:
- Traffico urbano iniziale.
- Ambiente secco e ventoso.
- Tram che attraversa la città.
- Suoni leggeri della vegetazione.
- Attività nei nuovi parchi.
- Rumori di mezzi di consegna.
- Variazioni dell'attività industriale.
- Suoni d'acqua nelle zone riqualificate.

Evitare effetti eccessivamente drammatici.

Usare audio ottimizzato e spazializzato dove appropriato.

La voce dell'avatar deve rimanere facilmente comprensibile.

Applicare ducking al suono ambientale mentre il robot parla.

Evitare brusche variazioni di volume.

---

# 17. STORIA E MACCHINA A STATI

Aggiornare lo Story Engine.

Stati suggeriti:

WAITING_FOR_START

INITIALIZING_MR

OPENING_PORTAL

AVATAR_GREETING

INVITATION

ENTERING_OBSERVATORY

SHOWING_CRITICAL_FUTURE

WAITING_FOR_LEVER

PRESENTING_OPTIONS

WAITING_FOR_CHOICE

APPLYING_INTERVENTION

REVEALING_CONSEQUENCES

DECISION_RECAP

OPTIONAL_FIFTH_DECISION

FINAL_CITY_REFLECTION

OPTIONAL_REVISION

RETURNING_TO_MR

ASKING_FINAL_QUESTION

WAITING_FOR_CONSENT

SAVING_MESSAGE

FAREWELL

EXPERIENCE_COMPLETED

Gestire anche:
- PAUSED
- ERROR
- USER_EXIT

La transizione tra stati deve essere esplicita.

Il numero di decisioni deve essere gestito dal Decision Engine, non dedotto dal testo della conversazione.

Gli eventi del modello devono essere validati prima di modificare lo stato.

---

# 18. OSSERVATORIO E CAMERA

La stanza osservatorio rimane una stanza 3D semplice, realistica e curata.

Dimensioni indicative: 5 × 5 metri.

Grande finestra panoramica.

Città esterna a profondità stratificata.

Utilizzare:
- Edifici 3D in primo piano.
- Geometrie semplificate sullo sfondo.
- Skyline.
- Illuminazione.
- Atmosfera.
- Texture PBR.

La finestra deve restituire parallasse quando l'utente si sposta.

Non usare una semplice immagine piatta come unico elemento della città.

L'utente può guardare e fare piccoli spostamenti fisici, compatibilmente con lo spazio reale.

Non obbligare l'utente a camminare fisicamente per completare l'esperienza.

Non implementare locomozione artificiale continua nell'MVP.

La sicurezza del movimento fisico ha priorità sull'effetto scenografico.

---

# 19. BACKEND E MEMORIA DELLE DECISIONI

Mantenere il salvataggio della riflessione finale nel backend, con consenso esplicito.

Aggiungere la possibilità di registrare la sequenza delle decisioni associate alla sessione.

Schema suggerito:

future_sessions
- id
- experience_version
- decision_sequence
- active_interventions
- triggered_interdependencies
- revised_decision
- final_reflection
- generated_future_message
- consent_to_store
- created_at

Le decisioni devono mantenere l'ordine originale.

La revisione deve essere tracciabile.

La persistenza dei dati relativi al partecipante deve avvenire soltanto secondo il flusso di consenso approvato.

Prima del consenso, mantenere i dati di sessione necessari alla simulazione in memoria temporanea, evitando la raccolta persistente di risposte personali.

Non salvare:
- Audio originale.
- Trascrizione completa.
- Nome.
- Email.
- Altri identificativi non necessari.

Utilizzare identificativi anonimi per la sessione.

Riutilizzare il database esistente se compatibile.

In caso di nuovo database, scegliere una soluzione persistente appropriata all'hosting.

Prevedere validazione, gestione errori, protezione dagli abusi, retention configurabile e cancellazione dei dati.

Non confermare il salvataggio prima dell'esito positivo del backend.

---

# 20. MESSAGGIO FINALE

L'utente torna nella propria stanza reale.

L'avatar lo guarda.

Domanda suggerita:

"Dopo aver visto quanto possono essere complesse le nostre decisioni, cosa pensi sia davvero necessario per costruire un futuro sostenibile?"

L'utente risponde liberamente.

Il robot produce una riflessione breve e personale, collegata alla risposta e alle scelte effettuate.

Non deve trasformare necessariamente la risposta in uno slogan.

Dopo l'eventuale salvataggio, conclude:

"Il futuro non dipende soltanto dalle decisioni che prendiamo, ma anche dalla nostra capacità di comprenderne le conseguenze. Grazie per aver esplorato con me questa possibilità."

Il messaggio può essere personalizzato dal modello.

L'avatar saluta e scompare.

Chiudere microfono, connessione Realtime e risorse XR.

Mostrare una schermata conclusiva con possibilità di ricominciare.

---

# 21. TIMELINE INDICATIVA

Durata obiettivo: circa 7–10 minuti, variabile in base alla conversazione.

00:00–00:30
Start e inizializzazione.

00:30–01:00
Portale e apparizione dell'avatar.

01:00–01:40
Invito e ingresso nell'osservatorio.

01:40–02:20
Presentazione della città critica.

02:20–03:10
Prima decisione.

03:10–04:00
Seconda decisione.

04:00–04:50
Terza decisione.

04:50–05:40
Quarta decisione.

05:40–06:30
Quinta decisione opzionale.

06:30–07:30
Riflessione e revisione opzionale.

07:30–08:10
Ritorno in Mixed Reality.

08:10–09:30
Messaggio personale, consenso, eventuale salvataggio e saluto.

La timeline serve a mantenere un ritmo narrativo.

Non deve interrompere l'utente tramite timer rigidi.

La durata può aumentare in presenza di conversazioni spontanee.

---

# 22. COMPATIBILITÀ DISPOSITIVI

## Meta Quest Pro

Esperienza principale:
- Passthrough.
- Portale MR.
- Avatar ancorato.
- Conversazione vocale.
- Osservatorio.
- Città interattiva.
- Ritorno MR.

## Android

- AR dove supportata.
- Fallback 3D.
- Conversazione vocale.
- Città trasformabile.

## iPhone

- Modalità 3D nel browser.
- Navigazione touch.
- Conversazione vocale.
- Osservatorio.
- Decisioni e trasformazioni.

Non presumere il supporto WebXR immersive-ar su Safari iOS.

## Desktop

- Modalità 3D.
- Mouse e tastiera.
- Controlli per sviluppatore.
- Possibilità di testare tutte le decisioni.

La logica del Decision Engine deve essere indipendente dal dispositivo.

---

# 23. PERFORMANCE E REALISMO

Priorità:
1. Fluidità sul Quest Pro.
2. Chiarezza delle trasformazioni.
3. Qualità visiva dell'osservatorio.
4. Credibilità della città.
5. Stabilità del sistema vocale.

Obiettivo indicativo: 72 FPS stabili, da verificare sul dispositivo fisico.

Utilizzare:
- InstancedMesh.
- Frustum culling.
- LOD.
- Texture compresse.
- Geometrie condivise.
- Materiali PBR ottimizzati.
- Precaricamento degli asset.
- Cache delle risorse.
- Rendering adattivo dove opportuno.

Evitare:
- Geometrie pesantissime.
- Shader costosi.
- Post-processing non necessario.
- Ricaricamento completo della scena dopo ogni scelta.
- Duplicazione degli asset per ogni combinazione.
- Luci dinamiche e ombre eccessive.

Se una trasformazione risulta costosa, utilizzare una soluzione visiva più semplice.

Ogni intervento deve rimanere riconoscibile.

---

# 24. PANNELLO DEVELOPER

Mantenere un sistema di debug separato dall'esperienza.

Funzioni:
- Avvio manuale dell'osservatorio.
- Selezione delle leve.
- Attivazione dei 30 interventi.
- Visualizzazione dello stato della città.
- Visualizzazione delle interdipendenze attive.
- Numero di interventi utilizzati.
- Test della revisione.
- Reset della simulazione.
- Diagnostica della connessione OpenAI.
- FPS e draw call.
- Stato del salvataggio backend.

Deve essere possibile testare tutte le decisioni senza indossare il Quest Pro.

Il pannello non deve essere visibile ai partecipanti nella modalità normale.

---

# 25. TEST AUTOMATICI

Implementare test per il Decision Engine senza richiedere OpenAI o WebXR.

Casi minimi:

1. Selezione di una leva valida.
2. Rifiuto di una leva inesistente.
3. Attivazione di un intervento.
4. Applicazione di quattro interventi.
5. Possibilità di concludere dopo quattro.
6. Attivazione del quinto.
7. Blocco del sesto.
8. Selezione di due interventi diversi nella stessa leva.
9. Prevenzione di duplicati.
10. Attivazione di ciascuna delle 12 interdipendenze.
11. Indipendenza dall'ordine delle scelte, dove appropriato.
12. Gestione di combinazioni non previste.
13. Revisione di un intervento.
14. Ricalcolo delle conseguenze dopo revisione.
15. Eliminazione degli effetti visivi obsoleti.
16. Reset della simulazione.
17. Validazione delle tool call.
18. Gestione delle risposte ambigue.
19. Salvataggio con consenso.
20. Mancato salvataggio senza consenso.
21. Gestione degli errori di backend.
22. Ricostruzione deterministica dello stato cittadino.

Aggiungere test di integrazione per la macchina narrativa e il renderer dove possibile.

Eseguire build, typecheck e test.

Le funzioni dipendenti dal visore devono essere segnalate come non verificate finché non vengono realmente provate sul dispositivo.

---

# 26. CRITERI DI ACCETTAZIONE

L'MVP è pronto per la validazione quando:

- È presente uno Start esplicito.
- Il portale appare davanti al visore.
- L'avatar emerge dal portale.
- L'avatar conversa tramite OpenAI.
- L'utente entra nell'osservatorio.
- Vede una città ambientalmente critica.
- Può scegliere liberamente tra 10 ambiti.
- Ogni ambito offre tre interventi.
- Può realizzare quattro o cinque interventi.
- Può scegliere interventi differenti nello stesso ambito.
- Ogni intervento provoca una trasformazione visiva coerente.
- Le modifiche della città sono cumulative.
- Le interdipendenze previste vengono riconosciute.
- L'avatar spiega benefici e compromessi.
- L'avatar mantiene memoria delle decisioni.
- Non vengono mostrati punteggi morali.
- La città finale può risultare migliorata ma imperfetta.
- È consentita una revisione finale.
- La revisione aggiorna coerentemente lo stato.
- L'utente torna nella Mixed Reality.
- Il robot pone una domanda riflessiva.
- La risposta viene salvata soltanto con consenso.
- Il robot saluta.
- La sessione termina correttamente.
- L'esperienza funziona nei fallback supportati.
- Build e test disponibili passano.

Non dichiarare testati i requisiti WebXR hardware senza prove effettive.

---

# 27. IMPLEMENTAZIONE — ORDINE DI LAVORO

Procedi in questo ordine.

## Fase 1 — Analisi

- Analizza il repository.
- Identifica le funzioni esistenti.
- Aggiorna la specifica.
- Rimuovi la vecchia selezione ambientale/sociale/economica.
- Conserva l'esperienza tecnica già funzionante.

## Fase 2 — Decision Engine

- Definisci i 10 ambiti.
- Definisci i 30 interventi.
- Implementa la struttura dati.
- Implementa cinque risorse qualitative.
- Implementa le regole di conseguenza.
- Implementa le 12 interdipendenze.
- Aggiungi test.

## Fase 3 — City Transformation Engine

- Identifica i settori della città.
- Associa gli interventi alle trasformazioni.
- Gestisci effetti cumulativi.
- Implementa le sinergie visive.
- Gestisci conflitti e superfici condivise.
- Implementa reset e ricostruzione deterministica.

## Fase 4 — Conversazione

- Integra il Decision Engine con OpenAI Realtime.
- Implementa i tool strutturati.
- Gestisci selezione di leve e opzioni.
- Aggiungi memoria di sessione.
- Implementa narrazione delle conseguenze.

## Fase 5 — Comportamento avatar

- Gaze tracking.
- Indicazione degli interventi.
- Gesti.
- Stati conversazionali.
- Lip-sync.
- Espressività.

## Fase 6 — User experience

- Scelta libera.
- Quattro interventi minimi.
- Quinto opzionale.
- Revisione finale.
- Riflessione.
- Ritorno MR.
- Messaggio conclusivo.

## Fase 7 — Backend

- Memorizzazione delle decisioni previo consenso.
- Persistenza della riflessione.
- Validazione.
- Gestione errori.
- Retention e cancellazione.

## Fase 8 — Ottimizzazione e verifica

- Verifica delle prestazioni.
- Test desktop.
- Verifica fallback mobile.
- Build.
- Typecheck.
- Test automatici.
- Documentazione.
- Pull request.

---

# 28. CONSEGNA RICHIESTA

Non limitarti a descrivere una soluzione.

Implementa direttamente il codice necessario nel repository.

Aggiorna:
- SPEC.md.
- AGENTS.md.
- README.md.
- Documentazione del Decision Engine.
- Catalogo degli interventi.
- Documentazione delle interdipendenze.
- Asset credits.
- Documentazione delle API e del database.
- Istruzioni di test e deploy.

Prepara una branch o una pull request coerente con il lavoro già in corso, evitando di sovrascrivere modifiche esistenti.

Al termine fornisci:

1. Funzionalità implementate.
2. Eventuali funzionalità incomplete.
3. I 30 interventi disponibili.
4. Le interdipendenze realmente funzionanti.
5. Gli asset effettivamente integrati.
6. I risultati di build e test.
7. I limiti WebXR rilevati.
8. Le istruzioni di test sul Quest Pro.
9. Lo stato del deploy, senza inventare URL.
10. Il link alla pull request.

Se una funzionalità non è realizzabile nel browser o richiede verifiche hardware, documenta precisamente il limite e implementa il fallback più semplice, senza compromettere il funzionamento del resto.

---

# 29. PRINCIPI DI GAME DESIGN NON NEGOZIABILI

**1. Nessuna risposta universalmente corretta.**

Ogni scelta deve essere interpretata nel suo contesto.

**2. L'utente guida la storia.**

L'AI non sceglie al posto suo.

**3. La città è la principale interfaccia di feedback.**

L'utente deve vedere le conseguenze delle proprie azioni.

**4. Le decisioni hanno memoria.**

Le trasformazioni e i compromessi si accumulano.

**5. Le interdipendenze sono il centro dell'esperienza.**

Un intervento può modificare il significato di uno precedente.

**6. Il robot non giudica.**

Aiuta a comprendere, non assegna voti.

**7. Le conseguenze devono essere credibili.**

Niente effetti catastrofici inventati per sorprendere.

**8. Il risultato finale può essere imperfetto.**

La sostenibilità è un processo, non un premio.

**9. Fluidità e comfort hanno priorità sul fotorealismo.**

Soprattutto sul Meta Quest Pro.

**10. Una sola città, molte possibilità.**

Non costruire decine di scenari 3D differenti.

---

# 30. LA MORALE FINALE

Il partecipante deve terminare l'esperienza con questa consapevolezza:

"Pensavo che rendere una città sostenibile significasse semplicemente aggiungere alberi, pannelli solari e trasporti puliti. Ora capisco che ogni scelta influenza altre scelte e che costruire un futuro migliore richiede di affrontare la complessità."

L'esperienza non deve limitarsi a raccontare la sostenibilità.

Deve farla sperimentare.

Il robot non deve necessariamente pronunciare questa morale in forma letterale: deve aiutare l'utente a scoprirla attraverso le proprie decisioni.

**Il futuro non è semplicemente ciò che scegliamo. È anche l'insieme delle conseguenze che siamo disposti a comprendere.**

Procedi con lo sviluppo completo, senza fermarti alla sola pianificazione.
