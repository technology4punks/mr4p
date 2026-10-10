export type Theme = "environmental" | "social" | "economic";
export type StoryState =
  | "INTRODUCTION"
  | "DISCOVER_INTEREST"
  | "INVITATION"
  | "ENTER_OBSERVATORY"
  | "CRITICAL_FUTURE"
  | "REFLECTION"
  | "SUSTAINABLE_FUTURE"
  | "RETURN_TO_REALITY"
  | "CONCLUSION";
export type StorySnapshot = {
  state: StoryState;
  theme: Theme | null;
  environment: "reality" | "observatory";
  future: "critical" | "sustainable";
  transitioning: boolean;
  revision: number;
  message: string;
};
export type StoryEvent =
  | { type: "start_discovery" }
  | { type: "select_theme"; theme: Theme }
  | { type: "enter_observatory"; consent: boolean }
  | { type: "entry_complete" }
  | { type: "show_future"; future: "critical" }
  | { type: "reflect" }
  | { type: "transform_future"; future: "sustainable"; consent: boolean }
  | { type: "transformation_complete" }
  | { type: "return_to_reality" }
  | { type: "return_complete" };
export type StoryResult = {
  accepted: boolean;
  reason: string;
  snapshot: StorySnapshot;
};
export const scenarioRegistry: Record<
  Theme,
  { available: boolean; title: string }
> = {
  environmental: { available: true, title: "Ambiente" },
  social: { available: false, title: "Società" },
  economic: { available: false, title: "Economia" },
};
export class StoryEngine {
  snapshot: StorySnapshot = {
    state: "INTRODUCTION",
    theme: null,
    environment: "reality",
    future: "critical",
    transitioning: false,
    revision: 0,
    message: "Un incontro, poi una finestra sul 2050.",
  };
  private listeners = new Set<(snapshot: StorySnapshot) => void>();
  subscribe(listener: (snapshot: StorySnapshot) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  dispatch(event: StoryEvent): StoryResult {
    const s = this.snapshot;
    const reject = (reason: string): StoryResult => ({
      accepted: false,
      reason,
      snapshot: { ...s },
    });
    let patch: Partial<StorySnapshot>;
    switch (event.type) {
      case "start_discovery":
        if (s.environment !== "reality" || s.transitioning)
          return reject(
            "Torna alla realtà prima di iniziare una nuova visita.",
          );
        patch = {
          state: "DISCOVER_INTEREST",
          theme: null,
          future: "critical",
          message: "Racconta a NEO cosa ti interessa della sostenibilità.",
        };
        break;
      case "select_theme":
        if (!Object.hasOwn(scenarioRegistry, event.theme))
          return reject("Tema non disponibile.");
        if (s.environment !== "reality" || s.transitioning)
          return reject("Il tema si sceglie prima della visita.");
        patch = {
          theme: event.theme,
          state: scenarioRegistry[event.theme].available
            ? "INVITATION"
            : "DISCOVER_INTEREST",
          message: scenarioRegistry[event.theme].available
            ? "Vieni con NEO nel 2050. Puoi scegliere di entrare quando vuoi."
            : "Interesse riconosciuto. Questa prima visita è disponibile soltanto per l’ambiente.",
        };
        break;
      case "enter_observatory":
        if (!event.consent)
          return reject("È necessario il tuo consenso per entrare.");
        if (
          s.state !== "INVITATION" ||
          s.theme !== "environmental" ||
          s.transitioning
        )
          return reject(
            "Scegli prima lo scenario ambientale e attendi l’invito.",
          );
        patch = {
          state: "ENTER_OBSERVATORY",
          environment: "observatory",
          future: "critical",
          transitioning: true,
          message:
            "Rimani comodamente nel tuo spazio sicuro. La stanza prende forma.",
        };
        break;
      case "entry_complete":
        if (s.state !== "ENTER_OBSERVATORY")
          return reject("Nessun ingresso da completare.");
        patch = {
          state: "CRITICAL_FUTURE",
          transitioning: false,
          message:
            "2050 · Un futuro critico, ipotetico. Guarda la città dalla stessa finestra.",
        };
        break;
      case "show_future":
        if (
          event.future !== "critical" ||
          s.environment !== "observatory" ||
          s.transitioning ||
          s.future !== "critical"
        )
          return reject(
            "Lo scenario critico non è disponibile in questo momento.",
          );
        patch = {
          state: "CRITICAL_FUTURE",
          message:
            "Caldo, smog e verde secco: conseguenze possibili, non una previsione.",
        };
        break;
      case "reflect":
        if (s.state !== "CRITICAL_FUTURE" || s.transitioning)
          return reject("Esplora prima il futuro critico.");
        patch = {
          state: "REFLECTION",
          message:
            "Vuoi vedere cosa sarebbe potuto succedere con decisioni diverse?",
        };
        break;
      case "transform_future":
        if (event.future !== "sustainable" || !event.consent)
          return reject("Il futuro alternativo richiede un sì esplicito.");
        if (
          !["CRITICAL_FUTURE", "REFLECTION"].includes(s.state) ||
          s.transitioning
        )
          return reject("La trasformazione non è disponibile in questo stato.");
        patch = {
          state: "REFLECTION",
          future: "sustainable",
          transitioning: true,
          message:
            "La città cambia gradualmente. Puoi continuare a parlare con NEO.",
        };
        break;
      case "transformation_complete":
        if (
          s.state !== "REFLECTION" ||
          !s.transitioning ||
          s.future !== "sustainable"
        )
          return reject("Nessuna trasformazione da completare.");
        patch = {
          state: "SUSTAINABLE_FUTURE",
          transitioning: false,
          message:
            "2050 · Un futuro sostenibile possibile. Stessa città, decisioni diverse.",
        };
        break;
      case "return_to_reality":
        if (s.environment === "reality") return reject("Sei già nella realtà.");
        if (s.state === "RETURN_TO_REALITY")
          return reject("Il ritorno è già in corso.");
        patch = {
          state: "RETURN_TO_REALITY",
          transitioning: true,
          message: "Ritorno graduale alla realtà. La conversazione continua.",
        };
        break;
      case "return_complete":
        if (s.state !== "RETURN_TO_REALITY")
          return reject("Nessun ritorno da completare.");
        patch = {
          state: "CONCLUSION",
          environment: "reality",
          transitioning: false,
          message: "Bentornato. Quale scelta vorresti portare nel presente?",
        };
        break;
      default:
        return reject("Evento non autorizzato.");
    }
    this.snapshot = { ...s, ...patch, revision: s.revision + 1 };
    this.listeners.forEach((listener) => listener({ ...this.snapshot }));
    return {
      accepted: true,
      reason: "Evento applicato.",
      snapshot: { ...this.snapshot },
    };
  }
  tool(name: string, jsonArguments: string): StoryResult {
    const reject = (reason: string): StoryResult => ({
      accepted: false,
      reason,
      snapshot: { ...this.snapshot },
    });
    if (jsonArguments.length > 2048) return reject("Argomenti troppo grandi.");
    let args: Record<string, unknown>;
    try {
      const value: unknown = JSON.parse(jsonArguments);
      if (!value || typeof value !== "object" || Array.isArray(value))
        return reject("Argomenti non validi.");
      args = value as Record<string, unknown>;
    } catch {
      return reject("JSON non valido.");
    }
    const keys: Record<string, string[]> = {
      select_theme: ["theme"],
      enter_observatory: ["consent"],
      show_future: ["future"],
      reflect: [],
      transform_future: ["future", "consent"],
      return_to_reality: [],
    };
    if (
      !Object.hasOwn(keys, name) ||
      Object.keys(args).some((k) => !keys[name].includes(k))
    )
      return reject("Funzione o proprietà non autorizzata.");
    switch (name) {
      case "select_theme":
        if (
          typeof args.theme === "string" &&
          ["environmental", "social", "economic"].includes(args.theme)
        )
          return this.dispatch({ type: name, theme: args.theme as Theme });
        break;
      case "enter_observatory":
        if (typeof args.consent === "boolean")
          return this.dispatch({ type: name, consent: args.consent });
        break;
      case "show_future":
        if (args.future === "critical")
          return this.dispatch({ type: name, future: "critical" });
        break;
      case "reflect":
        return this.dispatch({ type: name });
      case "transform_future":
        if (args.future === "sustainable" && typeof args.consent === "boolean")
          return this.dispatch({
            type: name,
            future: "sustainable",
            consent: args.consent,
          });
        break;
      case "return_to_reality":
        return this.dispatch({ type: name });
    }
    return reject("Parametri non validi.");
  }
}
