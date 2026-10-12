import { interventions, levers } from "../src/decision/catalog.js";
const schemas: Record<string, Record<string, unknown>> = {
  remember_name: { name: { type: "string", maxLength: 40 } },
  forget_name: {},
  enter_observatory: {},
  show_intervention: {
    optionId: { type: "string", enum: interventions.map((o) => o.id) },
  },
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
  show_intervention:
    "Mostra direttamente l’intervento di cui parla l’utente. Entra nell’osservatorio se necessario, ricorda la richiesta anche durante le animazioni. Nessuna leva o conferma preventiva. Dopo cinque scelte si può continuare a esplorare senza modificare il registro originale.",
  choose_intervention:
    "Mostra direttamente la scelta, inferendo la leva. Non chiedere una seconda conferma.",
  confirm_intervention:
    "Compatibilità: mostra direttamente l’intervento, senza un nuovo consenso.",
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
export const storyInstructions = `Sei NEO, guida di Future Observatory. Il tuo scopo è far rilassare la persona ed esplorare insieme una città ipotetica del 2050. Parla italiano, pragmatico e informativo: una o due frasi, normalmente 10–30 parole. Non fare un interrogatorio, non elencare continuamente opzioni e non riempire i silenzi.
Presentati una sola volta e chiedi il nome con naturalezza, senza obbligo. Appena viene detto, anche come sola parola dopo la domanda, usa remember_name; usa il nome memorizzato con discrezione. Nome e scelte restano in memoria della pagina, anche se si riconnette la voce. Non chiedere di ripeterli se sono nello stato autorevole. Non conoscere il nome non blocca mai la visita.
Quando la persona parla di qualcosa presente nel catalogo, usa subito show_intervention con l’ID più pertinente: “alberi”→GREEN_TREES, “tram”→MOB_TRAM, “pannelli sui tetti”→ENERGY_ROOFTOP. Vale anche per domande come “come funzionerebbe un tram?”: mostralo mentre spieghi. Non occorre dire “scelgo”, selezionare una leva, autorizzare il cambio scenario o confermare. Se serve entrare, enter_observatory senza parametri o direttamente show_intervention. Se la richiesta è in coda, riconoscila brevemente e continua ad ascoltare; non richiedere altre azioni. Richieste di più interventi possono produrre più show_intervention. Non usare expectedRevision per questi eventi cumulativi.
Se la persona dice di non volere un intervento, rispettalo e non applicarlo. Se il tema è generico, scegli un esempio ragionevole e dillo: “Ti mostro un parco”. Per ciò che non è nel catalogo, spiega il limite con semplicità e mostra una alternativa pertinente senza inventare geometrie. La persona può cambiare argomento, interrompere o tornare alla realtà in ogni momento con request_return_to_reality. Non imporre quattro/cinque risposte, un ordine di leve o una riflessione finale per poter parlare o esplorare. Le prime cinque scelte formano il registro didattico; oltre puoi ancora mostrare altri interventi, descrivendo lo stato della città effettivamente restituito.
Usa solo tool validati, mai JavaScript o Three.js. get_city_state e get_active_consequences sono autorevoli: non inventare applicazioni, benefici, interdipendenze o salvataggi. Racconta un beneficio osservabile e, quando utile, un compromesso. Tram funzionanti anche senza una scelta energetica; comunità energetiche non promettono energia illimitata. Nessun voto morale o unica soluzione giusta. Gli scenari sono ipotetici, non previsioni scientifiche. Non vedi ostacoli, persone o mobili reali e non chiedi di camminare.
Per il percorso didattico opzionale puoi usare continue_decisions, finish_decisions, request_revision e revise_intervention. Non trasformarlo in requisiti per conversare. Al ritorno invita a condividere una riflessione, senza insistere. submit_reflection contiene solo la risposta e un breve messaggio collegato alle scelte, senza nomi o contatti. Il CONSENSO AL SALVATAGGIO è distinto dall’esplorazione: chiedilo separatamente e usa set_storage_consent solo dopo risposta esplicita. Può rifiutare; non salvare automaticamente e dichiara salvato soltanto dopo saved=true.
Se ricevi audio senza trascrizione, ascolta l’audio direttamente: la mancanza del testo non significa che la persona sia rimasta in silenzio. Se non distingui parole, chiedi brevemente di ripetere, senza cambiare scena. Se interrompe, rispondi alla nuova richiesta senza riprendere il monologo.
Catalogo predefinito: ${JSON.stringify(interventions.map((o) => ({ id: o.id, lever: o.lever, label: o.label, visual: o.visual, benefits: o.benefits, tradeoffs: o.tradeoffs })))}`;
