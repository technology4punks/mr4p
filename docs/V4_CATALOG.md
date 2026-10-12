# Catalogo V4 · 10 leve e 30 interventi

Catalogo runtime: `src/decision/catalog.ts`. Descrizioni complete, benefici, compromessi, resa visiva e incertezza sono conservati nel catalogo e nella specifica. Ogni opzione ha uno strato predefinito realmente attivabile; nessun asset viene generato dal modello.

| ID | Intervento | Settore | Beneficio | Compromesso |
|---|---|---|---|---|
| MOB_BIKE | Piste ciclabili | mobility | Favorisce spostamenti brevi senza auto. | Continuità e sicurezza della rete. |
| MOB_TRAM | Tram elettrici | mobility | Elevata capacità di trasporto. | Investimenti importanti. |
| MOB_SCOOTER | Monopattini condivisi | mobility | Alternativa per alcuni tragitti brevi. | Sicurezza. |
| GREEN_TREES | Alberi lungo le strade | river | Ombreggiamento. | Acqua. |
| GREEN_PARK | Grande parco | river | Spazio verde pubblico. | Occupazione di suolo urbano. |
| GREEN_ROOFS | Tetti verdi | river | Vegetazione su superfici già costruite. | Carico strutturale. |
| ENERGY_ROOFTOP | Fotovoltaico sui tetti | roofs | Produzione rinnovabile distribuita. | Superfici idonee limitate. |
| ENERGY_SOLAR_FARM | Grandi impianti solari | roofs | Produzione rinnovabile su scala maggiore. | Localizzazione e uso del suolo. |
| ENERGY_COMMUNITY | Comunità energetiche e accumulo | roofs | Condivisione dell'energia. | Coordinamento. |
| BUILD_RETROFIT | Riqualificazione degli edifici | residential | Riduzione del fabbisogno energetico. | Costi. |
| BUILD_NEW | Nuovi edifici efficienti | residential | Possibilità di progettazione integrata. | Materiali. |
| BUILD_PASSIVE | Architettura passiva | residential | Minore domanda di riscaldamento e raffrescamento quando adeguatamente progettata. | Dipendenza dal clima e dall'orientamento. |
| WATER_LEAKS | Riparazione della rete idrica | productive | Riduzione delle perdite. | Investimenti. |
| WATER_RAIN | Raccolta dell'acqua piovana | productive | Risorsa integrativa per alcuni usi non potabili, se correttamente gestita. | Piogge stagionali. |
| WATER_REUSE | Riutilizzo di acque reflue trattate | productive | Riduzione della pressione sulle risorse potabili per usi appropriati. | Trattamento e controlli. |
| HEAT_REFLECT | Tetti e superfici riflettenti | residential | Riduzione dell'assorbimento di radiazione solare su alcune superfici. | Efficacia dipendente da clima, geometria e materiali. |
| HEAT_SHADE | Pensiline e ombreggiamento | residential | Migliore comfort per pedoni e utenti del trasporto. | Copertura limitata alle aree interessate. |
| HEAT_DISTRICT | Raffrescamento di quartiere | residential | Possibili economie di scala in contesti adatti. | Investimenti. |
| WASTE_REUSE | Centri di riparazione e riuso | productive | Allungamento della vita dei prodotti. | Organizzazione. |
| WASTE_RECYCLE | Riciclo avanzato | productive | Recupero di parte dei materiali. | Consumo energetico. |
| WASTE_ENERGY | Recupero energetico dal residuo | productive | Possibilità di trattare alcune frazioni residue non riciclabili. | Emissioni da controllare. |
| LOG_CARGO | Cargo bike | productive | Consegne urbane brevi con minore ingombro. | Capacità di carico. |
| LOG_EV | Furgoni elettrici | productive | Riduzione delle emissioni allo scarico. | Non eliminano congestione e occupazione della strada. |
| LOG_HUB | Microhub logistici | productive | Consolidamento delle consegne. | Spazio urbano. |
| BIO_RIVER | Rinaturalizzazione del fiume | river | Possibile miglioramento degli habitat. | Spazio. |
| BIO_CORRIDORS | Corridoi ecologici | river | Collegamento tra habitat. | Competizione per il suolo. |
| BIO_POLLINATORS | Giardini per impollinatori | river | Habitat locali. | Efficacia dipendente dal contesto. |
| FOOD_GARDENS | Orti urbani | periphery | Produzione locale limitata. | Superfici. |
| FOOD_VERTICAL | Vertical farming | periphery | Coltivazione controllata. | Consumi energetici potenzialmente elevati. |
| FOOD_RECOVERY | Recupero delle eccedenze alimentari | periphery | Riduzione degli sprechi quando efficace. | Necessità di reti logistiche. |

Gli interi di pressione sono metadati artistici interni che vengono aggregati in low/moderate/high, non stime economiche, energetiche o climatiche. Nessun punteggio viene mostrato. Scelte identiche sono rifiutate senza consumare slot; scelte differenti della medesima leva sono ammesse.
