import { optionById, type Resource } from "./catalog.js";
export type Decision = { slotId: string; optionId: string };
export type Revision = {
  slotId: string;
  previousOptionId: string;
  newOptionId: string;
};
export type Relation = {
  id: string;
  kind: "synergy" | "tradeoff" | "residual";
  text: string;
};
export type CityState = {
  active: string[];
  resources: Record<Resource, "low" | "moderate" | "high">;
  relations: Relation[];
  benefits: string[];
  tradeoffs: string[];
  residuals: string[];
  channels: {
    air: number;
    shade: number;
    water: number;
    vegetation: number;
    efficiency: number;
  };
  flags: string[];
};
export type DecisionSnapshot = {
  sequence: Decision[];
  active: Decision[];
  revision: Revision | null;
  finished: boolean;
  city: CityState;
};
const hasAny = (set: Set<string>, ids: string[]) =>
  ids.some((id) => set.has(id));
/** Reconstruction from current interventions, never incremental mesh mutations. */
export function deriveCity(ids: string[]): CityState {
  const active = [...new Set(ids)].sort();
  if (active.some((id) => !optionById.has(id)))
    throw new Error("Intervento inesistente");
  const set = new Set(active),
    has = (id: string) => set.has(id);
  const renewable = hasAny(set, ["ENERGY_ROOFTOP", "ENERGY_SOLAR_FARM"]);
  const energy = hasAny(set, [
    "ENERGY_ROOFTOP",
    "ENERGY_SOLAR_FARM",
    "ENERGY_COMMUNITY",
  ]);
  const water = hasAny(set, ["WATER_LEAKS", "WATER_RAIN", "WATER_REUSE"]);
  const relations: Relation[] = [];
  const add = (
    condition: boolean,
    id: string,
    kind: Relation["kind"],
    text: string,
  ) => {
    if (condition) relations.push({ id, kind, text });
  };
  add(
    hasAny(set, ["GREEN_TREES", "GREEN_PARK"]) && has("WATER_REUSE"),
    "R01",
    "synergy",
    "L’acqua trattata può contribuire a mantenere il verde, con una rete e un dimensionamento adeguati.",
  );
  add(
    has("GREEN_PARK") && !water,
    "R02",
    "residual",
    "Il parco introduce un fabbisogno idrico ancora da affrontare; specie adatte e manutenzione restano importanti.",
  );
  add(
    has("MOB_TRAM") && renewable,
    "R03",
    "synergy",
    "Le rinnovabili possono contribuire alla domanda del tram: rete e copertura effettiva vanno comunque valutate.",
  );
  add(
    has("MOB_TRAM") && !renewable,
    "R04",
    "residual",
    "Il tram continua a funzionare; l’approvvigionamento della nuova domanda elettrica rimane da valutare.",
  );
  add(
    has("MOB_BIKE") && has("LOG_CARGO"),
    "R05",
    "synergy",
    "La rete ciclabile serve spostamenti personali e alcune consegne con cargo bike.",
  );
  add(
    has("GREEN_PARK") && has("BIO_CORRIDORS"),
    "R06",
    "synergy",
    "Il parco può collegarsi ad altri habitat attraverso corridoi continui.",
  );
  add(
    has("ENERGY_ROOFTOP") && has("GREEN_ROOFS"),
    "R07",
    "tradeoff",
    "Tetti verdi e pannelli condividono superfici: alcuni tetti combinano le soluzioni, altri restano dedicati.",
  );
  add(
    has("ENERGY_SOLAR_FARM") && has("BIO_CORRIDORS"),
    "R08",
    "tradeoff",
    "I corridoi aggirano l’impianto solare: localizzazione e continuità degli habitat richiedono attenzione.",
  );
  add(
    has("FOOD_VERTICAL") && energy,
    "R09",
    "tradeoff",
    "La serra indoor richiede molta energia; la strategia energetica può contribuire, senza garantire copertura totale.",
  );
  add(
    has("HEAT_DISTRICT") && energy,
    "R10",
    "tradeoff",
    "Raffrescamento, domanda elettrica e rete devono essere progettati insieme.",
  );
  add(
    has("BUILD_NEW") && hasAny(set, ["WASTE_REUSE", "WASTE_RECYCLE"]),
    "R11",
    "synergy",
    "Materiali recuperati possono contribuire ai lavori; un centro di riuso non garantisce componenti strutturali idonei.",
  );
  add(
    has("LOG_HUB") && has("LOG_CARGO"),
    "R12",
    "synergy",
    "Le cargo bike partono dal microhub per alcune consegne dell’ultimo tratto.",
  );
  const options = active.map((id) => optionById.get(id)!);
  const resources = {} as CityState["resources"];
  for (const r of [
    "WATER",
    "ENERGY",
    "LAND",
    "INVESTMENT",
    "ACCESSIBILITY",
  ] as const) {
    const pressure = options.reduce(
      (n, o) => n + o.pressure[r],
      r === "WATER" || r === "ENERGY" ? 2 : 0,
    );
    resources[r] = pressure >= 4 ? "high" : pressure > 0 ? "moderate" : "low";
  }
  const residuals = [
    ...(!water
      ? ["La pressione sulle risorse idriche non è ancora affrontata."]
      : []),
    ...(!hasAny(set, ["MOB_BIKE", "MOB_TRAM", "MOB_SCOOTER"])
      ? ["Congestione e dipendenza dall’auto restano presenti."]
      : []),
    ...(!hasAny(set, [
      "HEAT_REFLECT",
      "HEAT_SHADE",
      "HEAT_DISTRICT",
      "GREEN_TREES",
      "GREEN_PARK",
    ])
      ? ["Il caldo estremo richiede ancora interventi dedicati."]
      : []),
    ...(has("FOOD_VERTICAL") && !energy
      ? [
          "La domanda energetica della serra non ha ancora una strategia dedicata.",
        ]
      : []),
    ...(has("HEAT_DISTRICT") && !energy
      ? [
          "La domanda del raffrescamento di quartiere resta da integrare con una strategia energetica.",
        ]
      : []),
    "Questa simulazione qualitativa non prevede quantitativamente il clima o l’efficacia reale degli interventi.",
  ];
  const count = (list: string[]) => list.filter(has).length;
  return {
    active,
    resources,
    relations,
    benefits: options.flatMap((o) => o.benefits.slice(0, 1)),
    tradeoffs: options.flatMap((o) => o.tradeoffs.slice(0, 1)),
    residuals,
    channels: {
      air: Math.min(
        0.55,
        count([
          "MOB_BIKE",
          "MOB_TRAM",
          "MOB_SCOOTER",
          "LOG_EV",
          "ENERGY_ROOFTOP",
          "ENERGY_SOLAR_FARM",
        ]) * 0.12,
      ),
      shade: Math.min(
        1,
        count([
          "GREEN_TREES",
          "GREEN_PARK",
          "HEAT_SHADE",
          "BUILD_PASSIVE",
          "HEAT_REFLECT",
        ]) * 0.23,
      ),
      water:
        count(["WATER_LEAKS", "WATER_RAIN", "WATER_REUSE", "BIO_RIVER"]) * 0.22,
      vegetation:
        count([
          "GREEN_TREES",
          "GREEN_PARK",
          "GREEN_ROOFS",
          "BIO_CORRIDORS",
          "BIO_POLLINATORS",
        ]) * 0.18,
      efficiency: count(["BUILD_RETROFIT", "BUILD_NEW", "BUILD_PASSIVE"]) * 0.3,
    },
    flags: relations.map((r) => r.id),
  };
}
export class DecisionEngine {
  private sequence: Decision[] = [];
  private active: Decision[] = [];
  private revision: Revision | null = null;
  private finished = false;
  get snapshot(): DecisionSnapshot {
    return {
      sequence: this.sequence.map((d) => ({ ...d })),
      active: this.active.map((d) => ({ ...d })),
      revision: this.revision && { ...this.revision },
      finished: this.finished,
      city: deriveCity(this.active.map((d) => d.optionId)),
    };
  }
  choose(optionId: string) {
    if (!optionById.has(optionId)) return "Intervento inesistente.";
    if (this.active.some((d) => d.optionId === optionId))
      return "Questo intervento è già attivo. Non consuma un altro slot.";
    if (this.finished || this.active.length >= 5)
      return "Le decisioni sono concluse; sono disponibili al massimo cinque interventi.";
    const decision = { slotId: `decision-${this.active.length + 1}`, optionId };
    this.sequence.push({ ...decision });
    this.active.push(decision);
    if (this.active.length === 5) this.finished = true;
    return null;
  }
  finish() {
    if (this.active.length < 4)
      return "Puoi concludere le decisioni dopo il quarto intervento, oppure interrompere la visita.";
    this.finished = true;
    return null;
  }
  revise(slotId: string, newOptionId: string) {
    if (!this.finished) return "Concludi prima le decisioni.";
    if (this.revision) return "La revisione è già stata utilizzata.";
    const old = this.active.find((d) => d.slotId === slotId);
    if (!old || !optionById.has(newOptionId))
      return "Slot o intervento inesistente.";
    if (this.active.some((d) => d.optionId === newOptionId))
      return "Intervento già attivo.";
    this.revision = { slotId, previousOptionId: old.optionId, newOptionId };
    this.active = this.active.map((d) =>
      d.slotId === slotId ? { slotId, optionId: newOptionId } : d,
    );
    return null;
  }
  reset() {
    this.sequence = [];
    this.active = [];
    this.revision = null;
    this.finished = false;
  }
}
