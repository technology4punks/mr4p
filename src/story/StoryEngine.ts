import {
  DecisionEngine,
  type DecisionSnapshot,
  deriveCity,
} from "../decision/DecisionEngine.js";
import {
  interventions,
  levers,
  optionsFor,
  optionById,
} from "../decision/catalog.js";
export type StoryState =
  | "WAITING_FOR_START"
  | "INITIALIZING_MR"
  | "OPENING_PORTAL"
  | "AVATAR_GREETING"
  | "INVITATION"
  | "ENTERING_OBSERVATORY"
  | "SHOWING_CRITICAL_FUTURE"
  | "WAITING_FOR_LEVER"
  | "PRESENTING_OPTIONS"
  | "WAITING_FOR_CHOICE"
  | "APPLYING_INTERVENTION"
  | "REVEALING_CONSEQUENCES"
  | "DECISION_RECAP"
  | "OPTIONAL_FIFTH_DECISION"
  | "FINAL_CITY_REFLECTION"
  | "OPTIONAL_REVISION"
  | "RETURNING_TO_MR"
  | "ASKING_FINAL_QUESTION"
  | "WAITING_FOR_CONSENT"
  | "SAVING_MESSAGE"
  | "FAREWELL"
  | "EXPERIENCE_COMPLETED"
  | "PAUSED"
  | "ERROR"
  | "USER_EXIT";
export type StorySnapshot = {
  name: string | null;
  state: StoryState;
  environment: "reality" | "observatory";
  future: "critical" | "transformed";
  transitioning: boolean;
  revision: number;
  message: string;
  lever: string | null;
  proposal: string | null;
  decisions: DecisionSnapshot;
  explored: string[];
  pendingInterventions: string[];
  reflection: string;
  generatedMessage: string;
  consent: boolean;
  saved: boolean;
  error: string | null;
};
export type StoryEvent = {
  type:
    | "start"
    | "initialized"
    | "portal_open"
    | "portal_complete"
    | "entry_complete"
    | "begin_decisions"
    | "transformation_complete"
    | "return_complete"
    | "saved"
    | "save_failed"
    | "farewell_complete"
    | "edit_reflection"
    | "pause"
    | "resume"
    | "exit";
  message?: string;
};
export type StoryResult = {
  accepted: boolean;
  reason: string;
  snapshot: StorySnapshot;
  data?: unknown;
};
export class StoryEngine {
  readonly decisions = new DecisionEngine();
  snapshot: StorySnapshot = this.initial();
  private pausedState?: StoryState;
  private listeners = new Set<(snapshot: StorySnapshot) => void>();
  private initial(): StorySnapshot {
    return {
      name: null,
      state: "WAITING_FOR_START",
      environment: "reality",
      future: "critical",
      transitioning: false,
      revision: 0,
      message: "Il futuro non è scritto. Ma ogni scelta ha delle conseguenze.",
      lever: null,
      proposal: null,
      decisions: this.decisions.snapshot,
      explored: [],
      pendingInterventions: [],
      reflection: "",
      generatedMessage: "",
      consent: false,
      saved: false,
      error: null,
    };
  }
  subscribe(listener: (s: StorySnapshot) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private result(
    accepted: boolean,
    reason: string,
    data?: unknown,
  ): StoryResult {
    return {
      accepted,
      reason,
      snapshot: structuredClone(this.snapshot),
      ...(data !== undefined ? { data } : {}),
    };
  }
  private patch(patch: Partial<StorySnapshot>, data?: unknown) {
    this.snapshot = {
      ...this.snapshot,
      ...patch,
      decisions: this.decisions.snapshot,
      revision: this.snapshot.revision + 1,
    };
    this.snapshot.decisions.city = deriveCity([
      ...this.snapshot.decisions.active.map((d) => d.optionId),
      ...this.snapshot.explored,
    ]);
    this.listeners.forEach((fn) => fn(structuredClone(this.snapshot)));
    return this.result(true, "Evento applicato.", data);
  }
  reset() {
    this.decisions.reset();
    this.snapshot = this.initial();
    this.pausedState = undefined;
    this.listeners.forEach((fn) => fn(structuredClone(this.snapshot)));
  }
  dispatch(event: StoryEvent): StoryResult {
    const s = this.snapshot,
      reject = (text: string) => this.result(false, text);
    switch (event.type) {
      case "start":
        return s.state === "WAITING_FOR_START"
          ? this.patch({
              state: "INITIALIZING_MR",
              message: "Inizializzazione dell’esperienza…",
            })
          : reject("Esperienza già avviata.");
      case "initialized":
        return s.state === "INITIALIZING_MR"
          ? this.patch({
              state: "OPENING_PORTAL",
              message: "NEO sta arrivando dal portale.",
            })
          : reject("Inizializzazione non attiva.");
      case "portal_open":
        return s.state === "OPENING_PORTAL"
          ? this.patch({
              state: "AVATAR_GREETING",
              message: "Ciao, sono NEO. Ti mostro una città del 2050?",
            })
          : reject("Portale non attivo.");
      case "portal_complete": {
        const result =
          s.state === "AVATAR_GREETING"
            ? this.patch({
                state: "INVITATION",
                message:
                  "Visita l’osservatorio del futuro, senza dover camminare.",
              })
            : reject("Saluto non attivo.");
        if (result.accepted && s.pendingInterventions.length)
          this.tool("enter_observatory", "{}");
        return this.result(result.accepted, result.reason);
      }
      case "entry_complete": {
        const result =
          s.state === "ENTERING_OBSERVATORY"
            ? this.patch({
                state: "SHOWING_CRITICAL_FUTURE",
                transitioning: false,
                message:
                  "Caldo, smog, traffico e acqua sotto pressione. Da dove cominceresti?",
              })
            : reject("Ingresso non attivo.");
        if (result.accepted) this.applyPending();
        return this.result(result.accepted, result.reason);
      }
      case "begin_decisions":
        return s.state === "SHOWING_CRITICAL_FUTURE"
          ? this.patch({
              state: "WAITING_FOR_LEVER",
              message: "Scegli liberamente un ambito su cui intervenire.",
            })
          : reject("La città non è pronta.");
      case "transformation_complete": {
        if (s.state !== "APPLYING_INTERVENTION")
          return reject("Nessun intervento in trasformazione.");
        const city = s.decisions.city,
          last = this.decisions.snapshot.revision
            ? this.decisions.snapshot.active.find(
                (d) => d.slotId === this.decisions.snapshot.revision!.slotId,
              )
            : this.decisions.snapshot.active.at(-1);
        const option = optionById.get(
          s.explored.at(-1) ?? last?.optionId ?? "",
        );
        const result = this.patch({
          state: "REVEALING_CONSEQUENCES",
          transitioning: false,
          message: [
            option?.benefits[0],
            city.relations.at(-1)?.text ?? option?.tradeoffs[0],
          ]
            .filter(Boolean)
            .join(" "),
        });
        this.applyPending();
        return this.result(result.accepted, result.reason);
      }
      case "return_complete":
        return s.state === "RETURNING_TO_MR"
          ? this.patch({
              state: "ASKING_FINAL_QUESTION",
              environment: "reality",
              transitioning: false,
              message:
                "Cosa pensi sia necessario per costruire un futuro sostenibile, dopo queste decisioni?",
            })
          : reject("Ritorno non attivo.");
      case "saved":
        return s.state === "SAVING_MESSAGE" && s.consent
          ? this.patch({
              state: "FAREWELL",
              saved: true,
              error: null,
              message:
                "Il messaggio è stato salvato. Grazie per aver esplorato queste possibilità.",
            })
          : reject("Nessun salvataggio autorizzato.");
      case "save_failed":
        return s.state === "SAVING_MESSAGE"
          ? this.patch({
              state: "WAITING_FOR_CONSENT",
              error: event.message ?? "Salvataggio non riuscito.",
              message:
                "Salvataggio non riuscito. Puoi riprovare o proseguire senza salvare.",
            })
          : reject("Nessun salvataggio in corso.");
      case "farewell_complete":
        return s.state === "FAREWELL"
          ? this.patch({
              state: "EXPERIENCE_COMPLETED",
              message:
                "Esperienza conclusa. Il futuro resta una possibilità da comprendere.",
            })
          : reject("Saluto non attivo.");
      case "edit_reflection":
        return s.state === "WAITING_FOR_CONSENT"
          ? this.patch({
              state: "ASKING_FINAL_QUESTION",
              consent: false,
              error: null,
              message: "Puoi correggere la riflessione prima di salvare.",
            })
          : reject("Modifica non disponibile.");
      case "pause":
        if (
          [
            "WAITING_FOR_START",
            "EXPERIENCE_COMPLETED",
            "PAUSED",
            "SAVING_MESSAGE",
          ].includes(s.state)
        )
          return reject("Pausa non disponibile.");
        this.pausedState = s.state;
        return this.patch({ state: "PAUSED", message: "Esperienza in pausa." });
      case "resume":
        return s.state === "PAUSED" && this.pausedState
          ? this.patch({
              state: this.pausedState,
              message: "Riprendiamo da dove eravamo.",
            })
          : reject("Nessuna pausa.");
      case "exit":
        return this.patch({
          state: "USER_EXIT",
          transitioning: false,
          message:
            "Esperienza interrotta. Nessun dato personale è stato salvato senza consenso.",
        });
    }
  }
  tool(name: string, jsonArguments: string): StoryResult {
    const reject = (text: string) => this.result(false, text),
      s = this.snapshot;
    if (jsonArguments.length > 6000) return reject("Argomenti troppo grandi.");
    let args: Record<string, unknown>;
    try {
      args = JSON.parse(jsonArguments);
      if (!args || typeof args !== "object" || Array.isArray(args))
        return reject("Argomenti non validi.");
    } catch {
      return reject("JSON non valido.");
    }
    const keys: Record<string, string[]> = {
      remember_name: ["name"],
      forget_name: [],
      enter_observatory: ["consent"],
      show_intervention: ["optionId"],
      list_available_levers: [],
      select_lever: ["leverId"],
      list_options: ["leverId"],
      choose_intervention: ["optionId", "confirmed"],
      confirm_intervention: ["optionId", "consent"],
      get_city_state: [],
      get_active_consequences: [],
      explain_tradeoff: ["interventionId"],
      continue_decisions: [],
      finish_decisions: [],
      request_revision: [],
      revise_intervention: ["slotId", "newOptionId", "consent"],
      complete_reflection: [],
      request_return_to_reality: [],
      submit_reflection: ["text", "message"],
      set_storage_consent: ["consent"],
    };
    if (
      !Object.hasOwn(keys, name) ||
      Object.keys(args).some(
        (k) => !keys[name].includes(k) && k !== "expectedRevision",
      )
    )
      return reject("Funzione o proprietà non autorizzata.");
    if (
      args.expectedRevision !== undefined &&
      args.expectedRevision !== s.revision
    )
      return reject("Evento superato: rileggi lo stato corrente.");
    if (name === "list_available_levers")
      return this.result(true, "Dieci ambiti disponibili.", levers);
    if (name === "get_city_state")
      return this.result(true, "Stato autorevole.", s.decisions);
    if (name === "get_active_consequences")
      return this.result(true, "Conseguenze qualitative.", s.decisions.city);
    if (name === "explain_tradeoff") {
      const option = optionById.get(String(args.interventionId));
      return option
        ? this.result(true, "Benefici, compromessi e incertezza.", option)
        : reject("Intervento inesistente.");
    }
    if (name === "remember_name" || name === "forget_name") {
      if (
        ["WAITING_FOR_START", "EXPERIENCE_COMPLETED", "USER_EXIT"].includes(
          s.state,
        )
      )
        return reject("Memoria non disponibile.");
      const value =
        typeof args.name === "string" ? args.name.trim().normalize("NFC") : "";
      if (
        name === "remember_name" &&
        !/^[\p{L}][\p{L} ’'-]{0,39}$/u.test(value)
      )
        return reject("Nome non valido.");
      return this.patch({ name: name === "forget_name" ? null : value });
    }
    if (name === "show_intervention")
      return this.showIntervention(String(args.optionId));
    if (
      name === "enter_observatory" &&
      s.environment === "observatory" &&
      s.state !== "RETURNING_TO_MR"
    )
      return this.result(true, "Osservatorio già attivo.");
    if (name === "enter_observatory")
      return [
        "INVITATION",
        "ASKING_FINAL_QUESTION",
        "WAITING_FOR_CONSENT",
      ].includes(s.state) &&
        (args.consent === undefined || typeof args.consent === "boolean")
        ? this.patch({
            state: "ENTERING_OBSERVATORY",
            environment: "observatory",
            consent: false,
            transitioning: true,
            message: "Entriamo nell’osservatorio.",
          })
        : reject("Attendi che NEO abbia completato l’arrivo.");
    if (name === "request_return_to_reality")
      return s.environment === "observatory" && s.state !== "RETURNING_TO_MR"
        ? this.patch({
            state: "RETURNING_TO_MR",
            pendingInterventions: [],
            transitioning: true,
            message: "Ritorniamo nella tua stanza.",
          })
        : reject("Il ritorno non è disponibile.");
    const deciding = [
      "WAITING_FOR_LEVER",
      "PRESENTING_OPTIONS",
      "WAITING_FOR_CHOICE",
      "DECISION_RECAP",
      "OPTIONAL_FIFTH_DECISION",
      "SHOWING_CRITICAL_FUTURE",
      "REVEALING_CONSEQUENCES",
      "FINAL_CITY_REFLECTION",
      "APPLYING_INTERVENTION",
    ].includes(s.state);
    if (name === "select_lever" || name === "list_options") {
      if (!deciding)
        return reject("Le scelte non sono disponibili in questo stato.");
      if (!levers.some((l) => l.id === args.leverId))
        return reject("Leva inesistente.");
      return this.patch(
        {
          state:
            s.state === "APPLYING_INTERVENTION"
              ? s.state
              : "WAITING_FOR_CHOICE",
          lever: String(args.leverId),
          proposal: null,
          message: "Tre possibilità, con benefici e limiti differenti.",
        },
        optionsFor(String(args.leverId)),
      );
    }
    if (name === "choose_intervention" || name === "confirm_intervention") {
      if (args.confirmed !== undefined && typeof args.confirmed !== "boolean")
        return reject("Argomento non valido.");
      if (args.consent !== undefined && typeof args.consent !== "boolean")
        return reject("Argomento non valido.");
      return this.showIntervention(String(args.optionId));
    }
    if (name === "continue_decisions") {
      if (s.state === "SHOWING_CRITICAL_FUTURE")
        return this.dispatch({ type: "begin_decisions" });
      if (
        ![
          "REVEALING_CONSEQUENCES",
          "DECISION_RECAP",
          "OPTIONAL_FIFTH_DECISION",
        ].includes(s.state)
      )
        return reject("Completa prima la trasformazione.");
      if (this.decisions.snapshot.finished)
        return this.patch({
          state: "FINAL_CITY_REFLECTION",
          message:
            "Osserva il futuro costruito: miglioramenti, compromessi e problemi ancora aperti.",
        });
      return this.patch({
        state:
          this.decisions.snapshot.active.length === 4 &&
          s.state !== "OPTIONAL_FIFTH_DECISION"
            ? "OPTIONAL_FIFTH_DECISION"
            : "WAITING_FOR_LEVER",
        lever: null,
        message:
          this.decisions.snapshot.active.length === 4 &&
          s.state !== "OPTIONAL_FIFTH_DECISION"
            ? "Un ultimo intervento oppure preferisci concludere?"
            : "Su quale ambito continuiamo?",
      });
    }
    if (name === "finish_decisions") {
      if (s.environment === "observatory" && s.decisions.active.length < 4)
        return this.tool("request_return_to_reality", "{}");
      if (
        ![
          "OPTIONAL_FIFTH_DECISION",
          "REVEALING_CONSEQUENCES",
          "DECISION_RECAP",
          "WAITING_FOR_LEVER",
        ].includes(s.state) ||
        s.transitioning
      )
        return reject("Conclusione non disponibile.");
      const error = this.decisions.finish();
      if (error) return reject(error);
      return this.patch({
        state: "FINAL_CITY_REFLECTION",
        message:
          "Quali miglioramenti vedi? Quale problema resta irrisolto? Ripenseresti una decisione?",
      });
    }
    if (name === "request_revision")
      return s.state === "FINAL_CITY_REFLECTION" &&
        !this.decisions.snapshot.revision
        ? this.patch({
            state: "OPTIONAL_REVISION",
            message:
              "Puoi sostituire una sola decisione, anche con una leva diversa.",
          })
        : reject("Revisione non disponibile.");
    if (name === "revise_intervention") {
      if (s.state !== "OPTIONAL_REVISION" || args.consent !== true)
        return reject("Revisione richiede richiesta e conferma esplicita.");
      const error = this.decisions.revise(
        String(args.slotId),
        String(args.newOptionId),
      );
      if (error) return reject(error);
      return this.patch({
        state: "APPLYING_INTERVENTION",
        transitioning: true,
        message:
          "Ricalcolo della città: gli effetti precedenti non più validi vengono rimossi.",
      });
    }
    if (name === "complete_reflection")
      return ["FINAL_CITY_REFLECTION", "OPTIONAL_REVISION"].includes(s.state)
        ? this.tool("request_return_to_reality", "{}")
        : reject("Riflessione non disponibile.");
    if (name === "submit_reflection") {
      if (
        !["ASKING_FINAL_QUESTION", "WAITING_FOR_CONSENT"].includes(s.state) ||
        typeof args.text !== "string" ||
        typeof args.message !== "string" ||
        !args.text.trim() ||
        args.text.length > 2000 ||
        !args.message.trim() ||
        args.message.length > 1000
      )
        return reject("Riflessione non valida.");
      return this.patch({
        state: "WAITING_FOR_CONSENT",
        consent: false,
        error: null,
        reflection: this.anonymize(args.text.trim()),
        generatedMessage: this.anonymize(args.message.trim()),
        message:
          "Vuoi salvare in forma anonima questo messaggio e le decisioni? Senza nome, audio o trascrizione completa.",
      });
    }
    if (name === "set_storage_consent") {
      if (
        s.state !== "WAITING_FOR_CONSENT" ||
        typeof args.consent !== "boolean"
      )
        return reject("Consenso non disponibile.");
      return this.patch({
        state: args.consent ? "SAVING_MESSAGE" : "FAREWELL",
        consent: args.consent,
        message: args.consent
          ? "Salvataggio in corso…"
          : "Grazie per aver esplorato queste possibilità. Nessun dato salvato.",
      });
    }
    return reject("Evento non autorizzato nello stato corrente.");
  }
  /** Visual exploration never depends on a lever, a name or a second confirmation. */
  private showIntervention(id: string): StoryResult {
    const option = optionById.get(id),
      s = this.snapshot;
    if (!option) return this.result(false, "Intervento inesistente.");
    const available = [
      "OPENING_PORTAL",
      "AVATAR_GREETING",
      "INVITATION",
      "ENTERING_OBSERVATORY",
      "SHOWING_CRITICAL_FUTURE",
      "WAITING_FOR_LEVER",
      "PRESENTING_OPTIONS",
      "WAITING_FOR_CHOICE",
      "APPLYING_INTERVENTION",
      "REVEALING_CONSEQUENCES",
      "DECISION_RECAP",
      "OPTIONAL_FIFTH_DECISION",
      "FINAL_CITY_REFLECTION",
      "OPTIONAL_REVISION",
      "ASKING_FINAL_QUESTION",
      "WAITING_FOR_CONSENT",
    ].includes(s.state);
    if (!available) return this.result(false, "Visita non attiva.");
    if (s.decisions.city.active.includes(id) && s.environment === "reality")
      return this.tool("enter_observatory", "{}");
    if (
      s.decisions.city.active.includes(id) ||
      s.pendingInterventions.includes(id)
    )
      return this.result(
        true,
        "Intervento già mostrato o in arrivo; nessuna scelta persa.",
        option,
      );
    if (
      [
        "OPENING_PORTAL",
        "AVATAR_GREETING",
        "INVITATION",
        "ENTERING_OBSERVATORY",
        "APPLYING_INTERVENTION",
        "ASKING_FINAL_QUESTION",
        "WAITING_FOR_CONSENT",
      ].includes(s.state)
    ) {
      this.patch({
        pendingInterventions: [...s.pendingInterventions, id],
        message: `${option.label}: lo mostro appena la transizione termina.`,
      });
      if (
        ["INVITATION", "ASKING_FINAL_QUESTION", "WAITING_FOR_CONSENT"].includes(
          s.state,
        )
      )
        this.tool("enter_observatory", "{}");
      return this.result(
        true,
        "Richiesta memorizzata. Non serve conferma.",
        option,
      );
    }
    const explored = [...s.explored];
    // Keep the original educational record; further discussion remains explorable.
    if (this.decisions.snapshot.finished) explored.push(id);
    else {
      const error = this.decisions.choose(id);
      if (error) return this.result(false, error);
    }
    return this.patch(
      {
        state: "APPLYING_INTERVENTION",
        future: "transformed",
        transitioning: true,
        proposal: null,
        lever: option.lever,
        explored,
        message: `${option.label}: la città si trasforma. Puoi continuare a parlare.`,
      },
      option,
    );
  }
  private applyPending() {
    const id = this.snapshot.pendingInterventions[0];
    if (!id) return;
    this.patch({
      pendingInterventions: this.snapshot.pendingInterventions.slice(1),
    });
    this.showIntervention(id);
  }
  /** A clear introduction is remembered even if the model omits its memory tool. */
  receiveTranscript(text: string) {
    const match = text
      .trim()
      .match(
        /^(?:ciao[,!.]?\s*)?(?:mi chiamo|il mio nome è|puoi chiamarmi)\s+([\p{L}][\p{L} ’'-]{0,39}?)(?=\s+(?:e|ma|vorrei|voglio|mi|parliamo)\b|[,.!?]|$)/iu,
      );
    if (match)
      return this.tool(
        "remember_name",
        JSON.stringify({ name: match[1].trim() }),
      );
  }
  private anonymize(text: string) {
    const name = this.snapshot.name;
    if (!name) return text;
    const safe = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return text.replace(
      new RegExp(`(?<!\\p{L})${safe}(?!\\p{L})`, "giu"),
      "[partecipante]",
    );
  }
  get catalog() {
    return interventions;
  }
}
