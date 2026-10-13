import { describe, it, expect } from "vitest";
import { DecisionEngine, deriveCity } from "../src/decision/DecisionEngine";
import { interventions, levers, optionsFor } from "../src/decision/catalog";
describe("V4 deterministic decisions", () => {
  it("has ten levers and thirty complete interventions", () => {
    expect(levers).toHaveLength(10);
    expect(interventions).toHaveLength(30);
    for (const l of levers) {
      expect(optionsFor(l.id)).toHaveLength(3);
    }
    for (const o of interventions) {
      expect(o.benefits.length).toBeGreaterThan(0);
      expect(o.tradeoffs.length).toBeGreaterThan(0);
      expect(o.visual.length).toBeGreaterThan(0);
    }
  });
  it("allows distinct choices in one lever, duplicates consume no slot, six is rejected", () => {
    const d = new DecisionEngine();
    for (const id of [
      "MOB_BIKE",
      "MOB_TRAM",
      "GREEN_PARK",
      "ENERGY_ROOFTOP",
      "WATER_REUSE",
    ])
      expect(d.choose(id)).toBeNull();
    expect(d.snapshot.active).toHaveLength(5);
    expect(d.choose("MOB_BIKE")).toContain("già");
    expect(d.choose("LOG_EV")).not.toBeNull();
    expect(d.snapshot.active).toHaveLength(5);
  });
  it("can conclude only after four and preserves the original sequence during one revision", () => {
    const d = new DecisionEngine();
    expect(d.finish()).not.toBeNull();
    for (const id of ["MOB_BIKE", "MOB_TRAM", "GREEN_PARK", "ENERGY_ROOFTOP"])
      d.choose(id);
    expect(d.finish()).toBeNull();
    expect(d.revise("decision-3", "WATER_REUSE")).toBeNull();
    expect(d.snapshot.sequence[2].optionId).toBe("GREEN_PARK");
    expect(d.snapshot.active[2].optionId).toBe("WATER_REUSE");
    expect(d.snapshot.city.flags).not.toContain("R02");
    expect(d.revise("decision-2", "LOG_EV")).not.toBeNull();
  });
  const cases: [string, string[]][] = [
    ["R01", ["GREEN_TREES", "WATER_REUSE"]],
    ["R02", ["GREEN_PARK"]],
    ["R03", ["MOB_TRAM", "ENERGY_ROOFTOP"]],
    ["R04", ["MOB_TRAM"]],
    ["R05", ["MOB_BIKE", "LOG_CARGO"]],
    ["R06", ["GREEN_PARK", "BIO_CORRIDORS"]],
    ["R07", ["GREEN_ROOFS", "ENERGY_ROOFTOP"]],
    ["R08", ["ENERGY_SOLAR_FARM", "BIO_CORRIDORS"]],
    ["R09", ["FOOD_VERTICAL", "ENERGY_COMMUNITY"]],
    ["R10", ["HEAT_DISTRICT", "ENERGY_ROOFTOP"]],
    ["R11", ["BUILD_NEW", "WASTE_RECYCLE"]],
    ["R12", ["LOG_HUB", "LOG_CARGO"]],
  ];
  for (const [id, options] of cases)
    it(`activates ${id} independently of order`, () => {
      expect(deriveCity(options).flags).toContain(id);
      expect(deriveCity(options)).toEqual(deriveCity([...options].reverse()));
    });
  it("does not invent synergies or unlimited community generation", () => {
    const city = deriveCity(["MOB_SCOOTER", "HEAT_REFLECT"]);
    expect(city.flags).toEqual([]);
    expect(deriveCity(["MOB_TRAM", "ENERGY_COMMUNITY"]).flags).toContain("R04");
  });
  it("reconstructs, resets, and rejects unknown choices", () => {
    const d = new DecisionEngine();
    expect(d.choose("DROP TABLE")).not.toBeNull();
    d.choose("GREEN_TREES");
    const copy = d.snapshot;
    copy.active[0].optionId = "MOB_BIKE";
    expect(d.snapshot.active[0].optionId).toBe("GREEN_TREES");
    d.reset();
    expect(d.snapshot.city).toEqual(deriveCity([]));
  });
});
