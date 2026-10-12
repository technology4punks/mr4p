import { describe, it, expect } from "vitest";
import { StoryEngine } from "../src/story/StoryEngine";
export function enter(s: StoryEngine) {
  for (const type of [
    "start",
    "initialized",
    "portal_open",
    "portal_complete",
  ] as const)
    s.dispatch({ type });
  s.tool("enter_observatory", '{"consent":true}');
  s.dispatch({ type: "entry_complete" });
  s.tool("continue_decisions", "{}");
}
function choice(s: StoryEngine, id: string, lever: string) {
  s.tool("select_lever", JSON.stringify({ leverId: lever }));
  const result = s.tool(
    "choose_intervention",
    JSON.stringify({ optionId: id, confirmed: true }),
  );
  if (result.accepted) {
    s.dispatch({ type: "transformation_complete" });
    s.tool("continue_decisions", "{}");
  }
  return result;
}
describe("V4 narrative state machine", () => {
  it("starts explicitly, rejects old themes and invalid tool arguments", () => {
    const s = new StoryEngine();
    expect(s.snapshot.state).toBe("WAITING_FOR_START");
    expect(s.tool("select_theme", '{"theme":"social"}').accepted).toBe(false);
    expect(s.tool("enter_observatory", '{"consent":true}').accepted).toBe(
      false,
    );
    expect(s.tool("select_lever", '{"leverId":"bad"}').accepted).toBe(false);
    expect(s.tool("get_city_state", '{"code":"execute"}').accepted).toBe(false);
    enter(s);
    expect(s.snapshot.state).toBe("WAITING_FOR_LEVER");
    expect(s.tool("select_lever", '{"leverId":"GREEN"}').accepted).toBe(true);
  });
  it("shows a relevant option without requiring lever selection or confirmation", () => {
    const s = new StoryEngine();
    enter(s);
    expect(
      s.tool(
        "choose_intervention",
        '{"optionId":"GREEN_PARK","confirmed":false}',
      ).accepted,
    ).toBe(true);
    expect(s.snapshot.decisions.active[0].optionId).toBe("GREEN_PARK");
    expect(s.snapshot.proposal).toBeNull();
    expect(
      s.tool(
        "show_intervention",
        '{"optionId":"MOB_TRAM","expectedRevision":0}',
      ).accepted,
    ).toBe(false);
    expect(
      s.tool("show_intervention", '{"optionId":"not-real"}').accepted,
    ).toBe(false);
  });
  it("remembers requests during arrival and entry, and automatically visits without permission", () => {
    const s = new StoryEngine();
    s.dispatch({ type: "start" });
    s.dispatch({ type: "initialized" });
    expect(
      s.tool("show_intervention", '{"optionId":"GREEN_TREES"}').accepted,
    ).toBe(true);
    s.dispatch({ type: "portal_open" });
    s.dispatch({ type: "portal_complete" });
    expect(s.snapshot.state).toBe("ENTERING_OBSERVATORY");
    expect(
      s.tool("show_intervention", '{"optionId":"MOB_TRAM"}').accepted,
    ).toBe(true);
    s.dispatch({ type: "entry_complete" });
    expect(s.snapshot.decisions.city.active).toContain("GREEN_TREES");
    s.dispatch({ type: "transformation_complete" });
    expect(s.snapshot.decisions.city.active).toEqual([
      "GREEN_TREES",
      "MOB_TRAM",
    ]);
    expect(s.snapshot.state).toBe("APPLYING_INTERVENTION");
  });
  it("accepts another topic while animating, preserves requests across name changes and makes duplicates idempotent", () => {
    const s = new StoryEngine();
    enter(s);
    s.receiveTranscript("Mi chiamo Luca.");
    s.tool("show_intervention", '{"optionId":"MOB_TRAM"}');
    s.tool("show_intervention", '{"optionId":"ENERGY_ROOFTOP"}');
    expect(
      s.tool("show_intervention", '{"optionId":"ENERGY_ROOFTOP"}').accepted,
    ).toBe(true);
    expect(s.snapshot.pendingInterventions).toEqual(["ENERGY_ROOFTOP"]);
    expect(s.tool("select_lever", '{"leverId":"WATER"}').accepted).toBe(true);
    expect(s.snapshot.state).toBe("APPLYING_INTERVENTION");
    s.dispatch({ type: "transformation_complete" });
    expect(s.snapshot.name).toBe("Luca");
    expect(s.snapshot.decisions.city.flags).toContain("R03");
    s.tool("request_return_to_reality", "{}");
    expect(s.snapshot.pendingInterventions).toEqual([]);
  });
  it("continues visual exploration after five choices while preserving the original anonymous record", () => {
    const s = new StoryEngine();
    enter(s);
    for (const optionId of [
      "GREEN_PARK",
      "MOB_TRAM",
      "ENERGY_ROOFTOP",
      "WATER_REUSE",
      "BUILD_RETROFIT",
      "LOG_EV",
      "FOOD_GARDENS",
    ]) {
      expect(
        s.tool("show_intervention", JSON.stringify({ optionId })).accepted,
      ).toBe(true);
      s.dispatch({ type: "transformation_complete" });
    }
    expect(s.snapshot.decisions.sequence).toHaveLength(5);
    expect(s.snapshot.decisions.active).toHaveLength(5);
    expect(s.snapshot.decisions.city.active).toHaveLength(7);
    expect(s.snapshot.explored).toEqual(["LOG_EV", "FOOD_GARDENS"]);
    expect(s.tool("get_city_state", "{}").data).toEqual(s.snapshot.decisions);
    s.reset();
    expect(s.snapshot.explored).toEqual([]);
  });
  it("offers the fifth decision, cumulative effects and a single cross-lever revision", () => {
    const s = new StoryEngine();
    enter(s);
    for (const [id, lever] of [
      ["GREEN_PARK", "GREEN"],
      ["WATER_REUSE", "WATER"],
      ["MOB_BIKE", "MOBILITY"],
      ["LOG_CARGO", "LOGISTICS"],
    ])
      expect(choice(s, id, lever).accepted).toBe(true);
    expect(s.snapshot.state).toBe("OPTIONAL_FIFTH_DECISION");
    expect(s.snapshot.decisions.city.flags).toEqual(
      expect.arrayContaining(["R01", "R05"]),
    );
    s.tool("finish_decisions", "{}");
    s.tool("request_revision", "{}");
    expect(
      s.tool(
        "revise_intervention",
        '{"slotId":"decision-1","newOptionId":"ENERGY_ROOFTOP","consent":true}',
      ).accepted,
    ).toBe(true);
    s.dispatch({ type: "transformation_complete" });
    s.tool("continue_decisions", "{}");
    expect(s.snapshot.state).toBe("FINAL_CITY_REFLECTION");
    expect(s.snapshot.decisions.city.flags).not.toContain("R01");
    expect(s.tool("request_revision", "{}").accepted).toBe(false);
  });
  it("keeps reflections in memory until consent, and acknowledges only backend success", () => {
    const s = new StoryEngine();
    enter(s);
    s.tool("request_return_to_reality", "{}");
    s.dispatch({ type: "return_complete" });
    s.tool(
      "submit_reflection",
      '{"text":"Capire le conseguenze richiede collaborazione.","message":"Le risorse sono collegate."}',
    );
    expect(s.snapshot.saved).toBe(false);
    expect(s.dispatch({ type: "saved" }).accepted).toBe(false);
    s.tool("set_storage_consent", '{"consent":true}');
    s.dispatch({ type: "save_failed" });
    expect(s.snapshot.state).toBe("WAITING_FOR_CONSENT");
    expect(s.snapshot.saved).toBe(false);
    s.tool("set_storage_consent", '{"consent":false}');
    s.dispatch({ type: "farewell_complete" });
    expect(s.snapshot.state).toBe("EXPERIENCE_COMPLETED");
  });
  it("pauses without losing choices, permits topic selection during transition, and permits exit", () => {
    const s = new StoryEngine();
    enter(s);
    s.tool("select_lever", '{"leverId":"GREEN"}');
    s.tool(
      "choose_intervention",
      '{"optionId":"GREEN_TREES","confirmed":true}',
    );
    expect(s.tool("select_lever", '{"leverId":"WATER"}').accepted).toBe(true);
    s.dispatch({ type: "pause" });
    s.dispatch({ type: "resume" });
    expect(s.snapshot.state).toBe("APPLYING_INTERVENTION");
    s.dispatch({ type: "exit" });
    expect(s.snapshot.state).toBe("USER_EXIT");
  });
});

it("returns or revisits without a minimum response count and does not consume a duplicate", () => {
  const s = new StoryEngine();
  enter(s);
  s.receiveTranscript("Mi chiamo Luca e vorrei vedere gli alberi.");
  expect(s.snapshot.name).toBe("Luca");
  s.tool("show_intervention", '{"optionId":"GREEN_TREES"}');
  s.dispatch({ type: "transformation_complete" });
  expect(s.tool("enter_observatory", "{}").accepted).toBe(true);
  expect(s.tool("finish_decisions", "{}").accepted).toBe(true);
  s.dispatch({ type: "return_complete" });
  expect(
    s.tool("show_intervention", '{"optionId":"GREEN_TREES"}').accepted,
  ).toBe(true);
  expect(s.snapshot.state).toBe("ENTERING_OBSERVATORY");
  expect(s.snapshot.decisions.active).toHaveLength(1);
});
