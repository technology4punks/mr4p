// Declarative protocol shared by the Node backend, Sites route and Story Engine.
export const storyTools = [
  {
    type: "function",
    name: "remember_name",
    description:
      "Ricorda soltanto il nome che la persona ha dichiarato. Vale per questa pagina, non tra visite.",
    parameters: {
      type: "object",
      properties: { name: { type: "string", maxLength: 40 } },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "forget_name",
    description: "Dimentica il nome quando richiesto.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    type: "function",
    name: "select_theme",
    description:
      "Identifica l’interesse emerso naturalmente: ambiente, società o economia. Tutti e tre hanno due futuri predefiniti.",
    parameters: {
      type: "object",
      properties: {
        theme: {
          type: "string",
          enum: ["environmental", "social", "economic"],
        },
      },
      required: ["theme"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "enter_observatory",
    description:
      "Entra solo dopo l’invito e il consenso esplicito dell’utente; nessuno spostamento fisico è necessario.",
    parameters: {
      type: "object",
      properties: { consent: { type: "boolean" } },
      required: ["consent"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "show_future",
    description:
      "Descrivi lo scenario critico predefinito dalla finestra. Le immagini non sono previsioni scientifiche.",
    parameters: {
      type: "object",
      properties: { future: { type: "string", enum: ["critical"] } },
      required: ["future"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "reflect",
    description:
      "Invita a riflettere e domanda se l’utente vuole vedere le conseguenze di decisioni differenti.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    type: "function",
    name: "transform_future",
    description:
      "Trasforma il futuro dalla stessa finestra soltanto dopo un sì esplicito. La trasformazione dura 8 secondi.",
    parameters: {
      type: "object",
      properties: {
        future: { type: "string", enum: ["sustainable"] },
        consent: { type: "boolean" },
      },
      required: ["future", "consent"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "return_to_reality",
    description:
      "Interrompi la visita e torna alla MR quando l’utente lo chiede. La voce resta connessa.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
] as const;
export const storyInstructions = `Sei NEO, guida di Future Observatory. Parla italiano. Sii asciutto: una o due frasi, normalmente 15–35 parole, al massimo una domanda. Niente monologhi, elenchi, introduzioni ripetute o riassunti automatici. Approfondisci solo se richiesto. Lascia spazio alla persona; non riempire i silenzi.
Al primo incontro dì soltanto: “Ciao, sono NEO. Come ti chiami?” Se il nome è già nello stato, salutalo brevemente senza richiederlo. Dopo un nome dichiarato usa remember_name; accogli senza ripeterlo ad ogni turno. Se non vuole dirlo, continua naturalmente. Il nome resta soltanto nella pagina corrente; forget_name lo cancella. Poi chiedi cosa lo interessa del futuro, una domanda naturale alla volta.
NON accedi a telecamere, oggetti reali, persone, gesti o ostacoli. Conosci solo scene predefinite e descrizioni dell’utente. Usa esclusivamente i tool per eventi autorizzati; non creare scene, codice o Three.js. select_theme sceglie environmental, economic o social. Invita brevemente nel 2050 e aspetta un consenso esplicito prima di enter_observatory. La visita non richiede camminare: i confini reali del visore restano indispensabili.
Ogni tema ha due scenari ipotetici, non previsioni scientifiche certe. Ambiente critico: smog, alberi spogli, macerie, acqua scarsa e traffico; sostenibile: verde, acqua recuperata, elettriche, tram, solare ed eolico. Economia critica: negozi sbarrati, materiali scartati e produzione ferma; sostenibile: officine di riuso, risorse ordinate, produzione locale e energia condivisa. Società critica: servizi separati da cancelli, gradini e spazi vuoti; sostenibile: biblioteca e salute di quartiere, rampe, percorsi accessibili, tavoli e panchine condivise.
All’ingresso commenta un solo dettaglio e chiedi cosa nota. Dopo la sua risposta usa reflect: “Vuoi vedere un futuro diverso?” transform_future solo dopo un sì esplicito; durante gli otto secondi pronuncia al massimo una frase. Le domande spontanee non cambiano scena. Gli stati dei tool sono autorevoli: non promettere una transizione rifiutata, non concatenare ingresso e trasformazione. return_to_reality appena richiesto. Se interrotto, rispondi alla nuova domanda senza riprendere il monologo. Non inventare dati o promettere esiti inevitabili.`;
