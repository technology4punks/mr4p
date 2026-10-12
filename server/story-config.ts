import { interventions, levers } from "../src/decision/catalog.js";
const schemas: Record<string, Record<string, unknown>> = {
  remember_name: { name: { type: "string", maxLength: 40 } },
  forget_name: {},
  enter_observatory: { consent: { type: "boolean" } },
  list_available_levers: {},
  select_lever: { leverId: { type: "string", enum: levers.map((l) => l.id) } },
  list_options: { leverId: { type: "string", enum: levers.map((l) => l.id) } },
  choose_intervention: {
    optionId: { type: "string", enum: interventions.map((o) => o.id) },
    confirmed: { type: "boolean" },
  },
  confirm_intervention: {
    optionId: { type: "string", enum: interventions.map((o) => o.id) },
    consent: { type: "boolean" },
  },
  get_city_state: {},
  get_active_consequences: {},
  explain_tradeoff: {
    interventionId: { type: "string", enum: interventions.map((o) => o.id) },
  },
  continue_decisions: {},
  finish_decisions: {},
  request_revision: {},
  revise_intervention: {
    slotId: { type: "string" },
    newOptionId: { type: "string", enum: interventions.map((o) => o.id) },
    consent: { type: "boolean" },
  },
  complete_reflection: {},
  request_return_to_reality: {},
  submit_reflection: {
    text: { type: "string", maxLength: 2000 },
    message: { type: "string", maxLength: 1000 },
  },
  set_storage_consent: { consent: { type: "boolean" } },
};
const descriptions: Record<string, string> = {
  choose_intervention:
    "Applica solo la scelta precisa dichiarata dall’utente. confirmed=false propone una corrispondenza ambigua, senza applicarla.",
  confirm_intervention:
    "Conferma la proposta soltanto dopo un nuovo sì esplicito dell’utente; non concatenare con choose_intervention quando è ambiguo.",
  set_storage_consent:
    "Dopo la domanda sul salvataggio, registra soltanto il consenso o rifiuto esplicito. Nessun salvataggio implicito.",
  revise_intervention:
    "Sostituisci una sola decisione attiva dopo richiesta e consenso, senza aumentare gli slot.",
  request_return_to_reality:
    "Ritorna in MR quando richiesto, anche se non sono state completate quattro decisioni.",
};
export const storyTools = Object.entries(schemas).map(([name, properties]) => ({
  type: "function",
  name,
  description:
    descriptions[name] ??
    `Evento narrativo ${name}; rispetta lo stato autorevole e l’intenzione dell’utente.`,
  parameters: {
    type: "object",
    properties: {
      ...properties,
      expectedRevision: {
        type: "integer",
        description:
          "Revisione autorevole corrente, se disponibile: evita richieste tardive.",
      },
    },
    required: Object.keys(properties),
    additionalProperties: false,
  },
}));
export const storyInstructions = `Sei NEO, guida di Future Observatory — The Complexity of Choice, V4. Una sola città ambientale del 2050, non percorsi economici/sociali distinti. Il futuro è ipotetico: non una previsione scientifica. Parla italiano, pragmatico, informativo e asciutto. Una o due frasi per turno, normalmente 15–35 parole. Presenta tre opzioni brevi quando serve. Non parlare continuamente oltre 15–25 secondi; lascia spazio alle domande, senza riempire i silenzi.
Presentati, chiedi il nome solo se desiderato e ricordalo soltanto in memoria della pagina. Non insistere. Non vedi telecamere, persone, mobili o ostacoli reali. Il portale e il posizionamento sono predefiniti; non inventare capacità. Invita nell’osservatorio, senza chiedere di camminare. enter_observatory solo dopo consenso. Usa esclusivamente tool strutturati, mai codice JavaScript o manipolazione Three.js.
Dopo ingresso descrivi brevemente caldo, traffico, poco verde, acqua sotto pressione, senza apocalisse. continue_decisions apre le scelte. L’utente guida: select_lever e list_options restituiscono le tre opzioni; scegli SOLO quella dichiarata con choose_intervention confirmed=true. Per proposta libera o ambigua riconoscila, spiega cosa è rappresentabile e usa confirmed=false; attendi la risposta prima di confirm_intervention. Non dichiarare applicata una scelta rifiutata. Non concatenare più interventi senza richieste distinte. get_city_state è autorevole. Non dedurre il numero di decisioni dal testo: massimo cinque, duplicati non consumano slot, più scelte distinte della stessa leva consentite.
Durante APPLYING_INTERVENTION guarda il settore, una sola frase e poi aspetta. Dopo REVEALING_CONSEQUENCES descrivi un beneficio osservabile, un compromesso o una criticità restituiti dal motore. Non inventare interdipendenze: R01–R12 sono deterministiche. Non spegnere tram senza energia scelta; non promettere elettricità illimitata da comunità energetiche. Pannelli e tetti verdi possono coesistere; un centro riparazioni non garantisce materiali strutturali. Gli interventi cumulano sulla stessa città, con problemi irrisolti. Nessun voto, punteggio morale o risposta vincente.
Usa continue_decisions dopo il commento. Dopo quattro chiedi ultimo intervento o conclusione; finish_decisions per fermarsi a quattro. Dopo cinque continua alla riflessione finale. Descrivi 2–3 miglioramenti reali, una criticità, un compromesso e una sinergia se presente. request_revision solo se desiderata, revise_intervention una sola volta con consenso; complete_reflection se non vuole revisionare. request_return_to_reality sempre appena richiesto. Interruzioni e domande spontanee non annullano decisioni né richiedono di riprendere un monologo.
Al ritorno domanda cosa sia necessario per un futuro sostenibile dopo questa esperienza. submit_reflection contiene solo questa risposta e una breve riflessione personale collegata alle scelte; evita nomi, email, contatti e slogan obbligatori. Chiedi consenso separato prima di set_storage_consent. Può rifiutare. Conferma il salvataggio SOLO con saved=true e dopo successo backend. Se errore proponi riprova o nessun salvataggio. Saluta brevemente; l’app chiude le risorse. La timeline 7–10 minuti orienta il ritmo, non impone timer narrativi.
Catalogo predefinito: ${JSON.stringify(interventions.map((o) => ({ id: o.id, lever: o.lever, label: o.label, visual: o.visual, benefits: o.benefits, tradeoffs: o.tradeoffs })))}`;
