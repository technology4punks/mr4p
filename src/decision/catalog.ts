export type Resource =
  | "WATER"
  | "ENERGY"
  | "LAND"
  | "INVESTMENT"
  | "ACCESSIBILITY";
export type Sector =
  | "residential"
  | "mobility"
  | "river"
  | "productive"
  | "roofs"
  | "periphery";
export type Intervention = {
  id: string;
  label: string;
  lever: string;
  sector: Sector;
  description: string;
  benefits: string[];
  tradeoffs: string[];
  visual: string;
  pressure: Record<Resource, number>;
  uncertainty: string;
};
export const levers = [
  {
    id: "MOBILITY",
    label: "Mobilità urbana",
  },
  {
    id: "GREEN",
    label: "Verde urbano",
  },
  {
    id: "ENERGY",
    label: "Energia",
  },
  {
    id: "BUILDINGS",
    label: "Edifici",
  },
  {
    id: "WATER",
    label: "Acqua",
  },
  {
    id: "HEAT",
    label: "Caldo estremo",
  },
  {
    id: "WASTE",
    label: "Rifiuti e risorse",
  },
  {
    id: "LOGISTICS",
    label: "Logistica urbana",
  },
  {
    id: "BIODIVERSITY",
    label: "Biodiversità",
  },
  {
    id: "FOOD",
    label: "Alimentazione urbana",
  },
] as const;
export const interventions: Intervention[] = [
  {
    id: "MOB_BIKE",
    label: "Piste ciclabili",
    lever: "MOBILITY",
    sector: "mobility",
    description: "Favorisce spostamenti brevi senza auto.",
    benefits: [
      "Favorisce spostamenti brevi senza auto.",
      "Riduce parte del traffico se utilizzata.",
      "Richiede meno spazio per passeggero rispetto all'automobile.",
    ],
    tradeoffs: [
      "Continuità e sicurezza della rete.",
      "Accessibilità non universale.",
      "Efficacia variabile con distanza, topografia e condizioni locali.",
    ],
    visual:
      "Compaiono piste ciclabili. Parte della carreggiata cambia. Appaiono biciclette.",
    pressure: {
      WATER: 0,
      ENERGY: 0,
      LAND: -1,
      INVESTMENT: 1,
      ACCESSIBILITY: -1,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "MOB_TRAM",
    label: "Tram elettrici",
    lever: "MOBILITY",
    sector: "mobility",
    description: "Elevata capacità di trasporto.",
    benefits: [
      "Elevata capacità di trasporto.",
      "Possibile riduzione dell'uso dell'auto.",
      "Collegamento efficiente tra quartieri lungo il percorso.",
    ],
    tradeoffs: [
      "Investimenti importanti.",
      "Tempi di realizzazione.",
      "Maggior fabbisogno di energia elettrica.",
      "Necessità di integrazione con altri trasporti.",
    ],
    visual:
      "Binari. Fermate. Tram animato. Riorganizzazione di parte della strada.",
    pressure: {
      WATER: 0,
      ENERGY: 2,
      LAND: -1,
      INVESTMENT: 2,
      ACCESSIBILITY: 2,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "MOB_SCOOTER",
    label: "Monopattini condivisi",
    lever: "MOBILITY",
    sector: "mobility",
    description: "Alternativa per alcuni tragitti brevi.",
    benefits: [
      "Alternativa per alcuni tragitti brevi.",
      "Introduzione relativamente rapida.",
      "Potenziale integrazione con il trasporto pubblico.",
    ],
    tradeoffs: [
      "Sicurezza.",
      "Gestione dei parcheggi.",
      "Accessibilità limitata.",
      "Possibile sostituzione di spostamenti già effettuati a piedi.",
    ],
    visual: "Monopattini. Stazioni dedicate. Percorsi di micromobilità.",
    pressure: {
      WATER: 0,
      ENERGY: 1,
      LAND: 0,
      INVESTMENT: 1,
      ACCESSIBILITY: -1,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "GREEN_TREES",
    label: "Alberi lungo le strade",
    lever: "GREEN",
    sector: "river",
    description: "Ombreggiamento.",
    benefits: [
      "Ombreggiamento.",
      "Miglioramento del microclima.",
      "Potenziale beneficio per habitat urbani.",
    ],
    tradeoffs: [
      "Acqua.",
      "Manutenzione.",
      "Suolo disponibile per radici.",
      "Scelta di specie adatte.",
    ],
    visual:
      "Alberi che compaiono progressivamente lungo i viali, con chiome e ombre.",
    pressure: {
      WATER: 2,
      ENERGY: 0,
      LAND: -1,
      INVESTMENT: 1,
      ACCESSIBILITY: 1,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "GREEN_PARK",
    label: "Grande parco",
    lever: "GREEN",
    sector: "river",
    description: "Spazio verde pubblico.",
    benefits: [
      "Spazio verde pubblico.",
      "Possibile raffrescamento locale.",
      "Opportunità per habitat e attività all'aperto.",
    ],
    tradeoffs: [
      "Occupazione di suolo urbano.",
      "Manutenzione.",
      "Fabbisogno idrico, soprattutto con specie non adatte.",
      "Possibili effetti sui valori immobiliari e sull'accessibilità.",
    ],
    visual: "Un quartiere o terreno degradato diventa un grande parco.",
    pressure: {
      WATER: 3,
      ENERGY: 0,
      LAND: -3,
      INVESTMENT: 2,
      ACCESSIBILITY: 1,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "GREEN_ROOFS",
    label: "Tetti verdi",
    lever: "GREEN",
    sector: "river",
    description: "Vegetazione su superfici già costruite.",
    benefits: [
      "Vegetazione su superfici già costruite.",
      "Contributo all'isolamento e alla gestione delle acque meteoriche, in funzione del progetto.",
      "Potenziali microhabitat.",
    ],
    tradeoffs: [
      "Carico strutturale.",
      "Costi.",
      "Manutenzione.",
      "Possibile competizione o integrazione con impianti fotovoltaici.",
    ],
    visual: "Diversi tetti assumono vegetazione.",
    pressure: {
      WATER: 1,
      ENERGY: -1,
      LAND: 0,
      INVESTMENT: 2,
      ACCESSIBILITY: 0,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "ENERGY_ROOFTOP",
    label: "Fotovoltaico sui tetti",
    lever: "ENERGY",
    sector: "roofs",
    description: "Produzione rinnovabile distribuita.",
    benefits: [
      "Produzione rinnovabile distribuita.",
      "Utilizzo di superfici costruite.",
      "Minore necessità di nuovo suolo per gli impianti.",
    ],
    tradeoffs: [
      "Superfici idonee limitate.",
      "Costi iniziali.",
      "Necessità di rete e flessibilità.",
      "Produzione variabile.",
    ],
    visual: "Pannelli sui tetti.",
    pressure: {
      WATER: 0,
      ENERGY: -2,
      LAND: 0,
      INVESTMENT: 2,
      ACCESSIBILITY: 0,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "ENERGY_SOLAR_FARM",
    label: "Grandi impianti solari",
    lever: "ENERGY",
    sector: "roofs",
    description: "Produzione rinnovabile su scala maggiore.",
    benefits: [
      "Produzione rinnovabile su scala maggiore.",
      "Possibilità di contribuire significativamente alla domanda elettrica.",
    ],
    tradeoffs: [
      "Localizzazione e uso del suolo.",
      "Possibili interferenze con habitat o paesaggio.",
      "Necessità di collegamenti alla rete.",
    ],
    visual: "Parco fotovoltaico nella periferia visibile.",
    pressure: {
      WATER: 0,
      ENERGY: -3,
      LAND: -3,
      INVESTMENT: 2,
      ACCESSIBILITY: 0,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "ENERGY_COMMUNITY",
    label: "Comunità energetiche e accumulo",
    lever: "ENERGY",
    sector: "roofs",
    description: "Condivisione dell'energia.",
    benefits: [
      "Condivisione dell'energia.",
      "Maggiore flessibilità attraverso sistemi di accumulo.",
      "Possibile coinvolgimento locale.",
    ],
    tradeoffs: [
      "Coordinamento.",
      "Investimenti.",
      "Limiti regolatori e infrastrutturali.",
      "Necessità di produzione effettiva.",
    ],
    visual:
      "Piccoli impianti distribuiti, sistemi di accumulo e connessioni energetiche rappresentate in modo discreto. Non rappresentare le comunità energetiche come produzione elettrica gratuita o illimitata.",
    pressure: {
      WATER: 0,
      ENERGY: -1,
      LAND: 0,
      INVESTMENT: 2,
      ACCESSIBILITY: 1,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "BUILD_RETROFIT",
    label: "Riqualificazione degli edifici",
    lever: "BUILDINGS",
    sector: "residential",
    description: "Riduzione del fabbisogno energetico.",
    benefits: [
      "Riduzione del fabbisogno energetico.",
      "Possibilità di conservare la struttura esistente.",
      "Miglior comfort.",
    ],
    tradeoffs: [
      "Costi.",
      "Tempi e disagi dei lavori.",
      "Complessità degli interventi.",
    ],
    visual:
      "Facciate riqualificate, nuovi serramenti, isolamento e ombreggiamento.",
    pressure: {
      WATER: 0,
      ENERGY: -2,
      LAND: 0,
      INVESTMENT: 2,
      ACCESSIBILITY: 1,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "BUILD_NEW",
    label: "Nuovi edifici efficienti",
    lever: "BUILDINGS",
    sector: "residential",
    description: "Possibilità di progettazione integrata.",
    benefits: [
      "Possibilità di progettazione integrata.",
      "Elevata efficienza operativa.",
    ],
    tradeoffs: [
      "Materiali.",
      "Emissioni incorporate.",
      "Consumo di suolo, quando previsto.",
      "Necessità di valutare demolizione e costruzione nel ciclo di vita.",
    ],
    visual: "Alcuni edifici vengono sostituiti o trasformati.",
    pressure: {
      WATER: 0,
      ENERGY: -2,
      LAND: -2,
      INVESTMENT: 3,
      ACCESSIBILITY: 0,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "BUILD_PASSIVE",
    label: "Architettura passiva",
    lever: "BUILDINGS",
    sector: "residential",
    description:
      "Minore domanda di riscaldamento e raffrescamento quando adeguatamente progettata.",
    benefits: [
      "Minore domanda di riscaldamento e raffrescamento quando adeguatamente progettata.",
      "Migliore protezione dal calore.",
    ],
    tradeoffs: [
      "Dipendenza dal clima e dall'orientamento.",
      "Limiti del patrimonio edilizio esistente.",
      "Necessità di progettazione specifica.",
    ],
    visual: "Frangisole, facciate ombreggiate, nuove coperture e schermature.",
    pressure: {
      WATER: 0,
      ENERGY: -2,
      LAND: 0,
      INVESTMENT: 2,
      ACCESSIBILITY: 0,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "WATER_LEAKS",
    label: "Riparazione della rete idrica",
    lever: "WATER",
    sector: "productive",
    description: "Riduzione delle perdite.",
    benefits: [
      "Riduzione delle perdite.",
      "Maggiore efficienza delle risorse disponibili.",
    ],
    tradeoffs: [
      "Investimenti.",
      "Lavori sulle infrastrutture.",
      "Tempi di realizzazione.",
    ],
    visual:
      "Cantieri leggeri e successiva riqualificazione di alcune infrastrutture idriche.",
    pressure: {
      WATER: -2,
      ENERGY: 1,
      LAND: 0,
      INVESTMENT: 2,
      ACCESSIBILITY: 0,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "WATER_RAIN",
    label: "Raccolta dell'acqua piovana",
    lever: "WATER",
    sector: "productive",
    description:
      "Risorsa integrativa per alcuni usi non potabili, se correttamente gestita.",
    benefits: [
      "Risorsa integrativa per alcuni usi non potabili, se correttamente gestita.",
      "Possibile riduzione del deflusso durante eventi piovosi.",
    ],
    tradeoffs: [
      "Piogge stagionali.",
      "Capacità di accumulo.",
      "Necessità di manutenzione.",
      "Disponibilità limitata durante siccità prolungate.",
    ],
    visual: "Serbatoi, sistemi di raccolta e infrastrutture sui tetti.",
    pressure: {
      WATER: -1,
      ENERGY: 0,
      LAND: -1,
      INVESTMENT: 1,
      ACCESSIBILITY: 0,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "WATER_REUSE",
    label: "Riutilizzo di acque reflue trattate",
    lever: "WATER",
    sector: "productive",
    description:
      "Riduzione della pressione sulle risorse potabili per usi appropriati.",
    benefits: [
      "Riduzione della pressione sulle risorse potabili per usi appropriati.",
      "Possibile supporto all'irrigazione urbana.",
    ],
    tradeoffs: [
      "Trattamento e controlli.",
      "Reti dedicate.",
      "Investimenti e gestione.",
    ],
    visual: "Piccolo impianto di trattamento, serbatoi e infrastrutture.",
    pressure: {
      WATER: -3,
      ENERGY: 2,
      LAND: -1,
      INVESTMENT: 2,
      ACCESSIBILITY: 0,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "HEAT_REFLECT",
    label: "Tetti e superfici riflettenti",
    lever: "HEAT",
    sector: "residential",
    description:
      "Riduzione dell'assorbimento di radiazione solare su alcune superfici.",
    benefits: [
      "Riduzione dell'assorbimento di radiazione solare su alcune superfici.",
      "Possibile riduzione del fabbisogno di raffrescamento.",
    ],
    tradeoffs: [
      "Efficacia dipendente da clima, geometria e materiali.",
      "Possibili effetti di riflessione indesiderata.",
      "Manutenzione.",
    ],
    visual:
      "Coperture e superfici più chiare, aggiornamento delle ombre e dell'aspetto termico percepito.",
    pressure: {
      WATER: 0,
      ENERGY: -1,
      LAND: 0,
      INVESTMENT: 1,
      ACCESSIBILITY: 0,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "HEAT_SHADE",
    label: "Pensiline e ombreggiamento",
    lever: "HEAT",
    sector: "residential",
    description: "Migliore comfort per pedoni e utenti del trasporto.",
    benefits: [
      "Migliore comfort per pedoni e utenti del trasporto.",
      "Protezione diretta dal sole.",
    ],
    tradeoffs: [
      "Copertura limitata alle aree interessate.",
      "Costi e manutenzione.",
      "Necessità di integrazione urbanistica.",
    ],
    visual: "Pensiline, pergolati e percorsi ombreggiati.",
    pressure: {
      WATER: 0,
      ENERGY: 0,
      LAND: -1,
      INVESTMENT: 1,
      ACCESSIBILITY: 1,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "HEAT_DISTRICT",
    label: "Raffrescamento di quartiere",
    lever: "HEAT",
    sector: "residential",
    description: "Possibili economie di scala in contesti adatti.",
    benefits: [
      "Possibili economie di scala in contesti adatti.",
      "Gestione coordinata del raffrescamento.",
    ],
    tradeoffs: [
      "Investimenti.",
      "Complessità infrastrutturale.",
      "Domanda energetica.",
      "Risultati dipendenti dalla tecnologia adottata.",
    ],
    visual:
      "Centrale compatta, infrastruttura di distribuzione e variazioni discrete degli edifici serviti.",
    pressure: {
      WATER: 0,
      ENERGY: 3,
      LAND: -1,
      INVESTMENT: 3,
      ACCESSIBILITY: 1,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "WASTE_REUSE",
    label: "Centri di riparazione e riuso",
    lever: "WASTE",
    sector: "productive",
    description: "Allungamento della vita dei prodotti.",
    benefits: [
      "Allungamento della vita dei prodotti.",
      "Riduzione potenziale della necessità di nuovi materiali.",
      "Attività economiche locali.",
    ],
    tradeoffs: [
      "Organizzazione.",
      "Adesione della popolazione.",
      "Limiti di riparabilità di alcuni prodotti.",
    ],
    visual: "Nuovi centri di riuso, spazi recuperati e attività locali.",
    pressure: {
      WATER: 0,
      ENERGY: 0,
      LAND: -1,
      INVESTMENT: 1,
      ACCESSIBILITY: 1,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "WASTE_RECYCLE",
    label: "Riciclo avanzato",
    lever: "WASTE",
    sector: "productive",
    description: "Recupero di parte dei materiali.",
    benefits: [
      "Recupero di parte dei materiali.",
      "Minore necessità di alcune materie prime vergini.",
    ],
    tradeoffs: [
      "Consumo energetico.",
      "Qualità e selezione dei flussi.",
      "Residui non riciclabili.",
    ],
    visual: "Impianti, raccolta differenziata e infrastrutture.",
    pressure: {
      WATER: 0,
      ENERGY: 2,
      LAND: -1,
      INVESTMENT: 2,
      ACCESSIBILITY: 0,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "WASTE_ENERGY",
    label: "Recupero energetico dal residuo",
    lever: "WASTE",
    sector: "productive",
    description:
      "Possibilità di trattare alcune frazioni residue non riciclabili.",
    benefits: [
      "Possibilità di trattare alcune frazioni residue non riciclabili.",
      "Recupero di parte dell'energia contenuta nei rifiuti.",
    ],
    tradeoffs: [
      "Emissioni da controllare.",
      "Costi.",
      "Gestione dei residui.",
      "Possibile dipendenza da flussi continui di rifiuti.",
    ],
    visual:
      "Impianto dedicato, con emissioni rappresentate senza suggerire prestazioni non documentate.",
    pressure: {
      WATER: 0,
      ENERGY: -1,
      LAND: -1,
      INVESTMENT: 3,
      ACCESSIBILITY: 0,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "LOG_CARGO",
    label: "Cargo bike",
    lever: "LOGISTICS",
    sector: "productive",
    description: "Consegne urbane brevi con minore ingombro.",
    benefits: [
      "Consegne urbane brevi con minore ingombro.",
      "Possibile riduzione di alcuni veicoli commerciali.",
    ],
    tradeoffs: [
      "Capacità di carico.",
      "Distanze.",
      "Necessità di rete ciclabile sicura.",
    ],
    visual: "Cargo bike sulle strade.",
    pressure: {
      WATER: 0,
      ENERGY: 0,
      LAND: 0,
      INVESTMENT: 1,
      ACCESSIBILITY: 0,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "LOG_EV",
    label: "Furgoni elettrici",
    lever: "LOGISTICS",
    sector: "productive",
    description: "Riduzione delle emissioni allo scarico.",
    benefits: [
      "Riduzione delle emissioni allo scarico.",
      "Potenziale riduzione del rumore urbano.",
    ],
    tradeoffs: [
      "Non eliminano congestione e occupazione della strada.",
      "Necessità di ricarica.",
      "Domanda di energia e materiali.",
    ],
    visual: "Flotta elettrica e punti di ricarica.",
    pressure: {
      WATER: 0,
      ENERGY: 2,
      LAND: 0,
      INVESTMENT: 2,
      ACCESSIBILITY: 0,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "LOG_HUB",
    label: "Microhub logistici",
    lever: "LOGISTICS",
    sector: "productive",
    description: "Consolidamento delle consegne.",
    benefits: [
      "Consolidamento delle consegne.",
      "Possibilità di integrare mezzi più piccoli per l'ultimo tratto.",
    ],
    tradeoffs: ["Spazio urbano.", "Organizzazione.", "Costi operativi."],
    visual:
      "Piccoli hub di distribuzione, zone di carico e nuova organizzazione delle consegne.",
    pressure: {
      WATER: 0,
      ENERGY: 0,
      LAND: -2,
      INVESTMENT: 2,
      ACCESSIBILITY: 0,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "BIO_RIVER",
    label: "Rinaturalizzazione del fiume",
    lever: "BIODIVERSITY",
    sector: "river",
    description: "Possibile miglioramento degli habitat.",
    benefits: [
      "Possibile miglioramento degli habitat.",
      "Maggiore qualità ecologica.",
      "Potenziali benefici idrologici se il progetto è adeguato.",
    ],
    tradeoffs: [
      "Spazio.",
      "Complessità idraulica.",
      "Costi.",
      "Necessità di considerare i rischi di piena.",
    ],
    visual:
      "Un tratto di fiume canalizzato viene trasformato con sponde naturali e vegetazione.",
    pressure: {
      WATER: 0,
      ENERGY: 0,
      LAND: -2,
      INVESTMENT: 2,
      ACCESSIBILITY: 0,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "BIO_CORRIDORS",
    label: "Corridoi ecologici",
    lever: "BIODIVERSITY",
    sector: "river",
    description: "Collegamento tra habitat.",
    benefits: [
      "Collegamento tra habitat.",
      "Possibile miglioramento della connettività ecologica.",
    ],
    tradeoffs: [
      "Competizione per il suolo.",
      "Interruzioni dovute alle infrastrutture.",
      "Necessità di continuità.",
    ],
    visual: "Fasce verdi tra parchi, rive e quartieri.",
    pressure: {
      WATER: 1,
      ENERGY: 0,
      LAND: -2,
      INVESTMENT: 1,
      ACCESSIBILITY: 0,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "BIO_POLLINATORS",
    label: "Giardini per impollinatori",
    lever: "BIODIVERSITY",
    sector: "river",
    description: "Habitat locali.",
    benefits: [
      "Habitat locali.",
      "Maggiore diversità vegetale, se progettati con specie adeguate.",
      "Interventi distribuiti.",
    ],
    tradeoffs: [
      "Efficacia dipendente dal contesto.",
      "Manutenzione.",
      "Connessione con altri habitat.",
    ],
    visual: "Aiuole fiorite, giardini e piccole aree verdi.",
    pressure: {
      WATER: 1,
      ENERGY: 0,
      LAND: -1,
      INVESTMENT: 1,
      ACCESSIBILITY: 0,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "FOOD_GARDENS",
    label: "Orti urbani",
    lever: "FOOD",
    sector: "periphery",
    description: "Produzione locale limitata.",
    benefits: [
      "Produzione locale limitata.",
      "Partecipazione comunitaria.",
      "Possibile recupero di aree inutilizzate.",
    ],
    tradeoffs: [
      "Superfici.",
      "Acqua.",
      "Qualità del suolo.",
      "Capacità produttiva limitata.",
    ],
    visual: "Orti condivisi e piccoli spazi coltivati.",
    pressure: {
      WATER: 2,
      ENERGY: 0,
      LAND: -2,
      INVESTMENT: 1,
      ACCESSIBILITY: 1,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "FOOD_VERTICAL",
    label: "Vertical farming",
    lever: "FOOD",
    sector: "periphery",
    description: "Coltivazione controllata.",
    benefits: [
      "Coltivazione controllata.",
      "Possibilità di usare spazi costruiti.",
      "Riduzione di alcuni usi del suolo per determinate colture.",
    ],
    tradeoffs: [
      "Consumi energetici potenzialmente elevati.",
      "Costi.",
      "Convenienza limitata a determinate colture e contesti.",
    ],
    visual: "Edificio con serre verticali illuminate.",
    pressure: {
      WATER: 1,
      ENERGY: 3,
      LAND: 0,
      INVESTMENT: 3,
      ACCESSIBILITY: 0,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
  {
    id: "FOOD_RECOVERY",
    label: "Recupero delle eccedenze alimentari",
    lever: "FOOD",
    sector: "periphery",
    description: "Riduzione degli sprechi quando efficace.",
    benefits: [
      "Riduzione degli sprechi quando efficace.",
      "Migliore valorizzazione dei prodotti disponibili.",
    ],
    tradeoffs: [
      "Necessità di reti logistiche.",
      "Conservazione e distribuzione.",
      "Coordinamento operativo.",
    ],
    visual: "Mercato urbano, centro di recupero e attività di distribuzione.",
    pressure: {
      WATER: 0,
      ENERGY: 0,
      LAND: -1,
      INVESTMENT: 1,
      ACCESSIBILITY: 1,
    },
    uncertainty:
      "Effetti dipendenti da dimensionamento, condizioni locali, realizzazione e utilizzo.",
  },
];
export const optionById = new Map(
  interventions.map((option) => [option.id, option]),
);
export const optionsFor = (lever: string) =>
  interventions.filter((option) => option.lever === lever);
