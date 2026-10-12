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
  it("holds ambiguous proposals for explicit confirmation and rejects stale revisions", () => {
    const s = new StoryEngine();
    enter(s);
    s.tool("select_lever", '{"leverId":"GREEN"}');
    s.tool(
      "choose_intervention",
      '{"optionId":"GREEN_PARK","confirmed":false}',
    );
    expect(s.snapshot.decisions.active).toHaveLength(0);
    expect(
      s.tool(
        "confirm_intervention",
        '{"optionId":"GREEN_TREES","consent":true}',
      ).accepted,
    ).toBe(false);
    expect(
      s.tool(
        "confirm_intervention",
        JSON.stringify({
          optionId: "GREEN_PARK",
          consent: true,
          expectedRevision: 0,
        }),
      ).accepted,
    ).toBe(false);
    expect(
      s.tool("confirm_intervention", '{"optionId":"GREEN_PARK","consent":true}')
        .accepted,
    ).toBe(true);
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
  it("pauses without losing choices, rejects selection during transition, and permits exit", () => {
    const s = new StoryEngine();
    enter(s);
    s.tool("select_lever", '{"leverId":"GREEN"}');
    s.tool(
      "choose_intervention",
      '{"optionId":"GREEN_TREES","confirmed":true}',
    );
    expect(s.tool("select_lever", '{"leverId":"WATER"}').accepted).toBe(false);
    s.dispatch({ type: "pause" });
    s.dispatch({ type: "resume" });
    expect(s.snapshot.state).toBe("APPLYING_INTERVENTION");
    s.dispatch({ type: "exit" });
    expect(s.snapshot.state).toBe("USER_EXIT");
  });
});
