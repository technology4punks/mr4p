import { describe, it, expect } from "vitest";
import { StoryEngine } from "../src/story/StoryEngine";
import { GuidedVisit, takeaway } from "../src/story/GuidedVisit";
function visit() {
  const s = new StoryEngine();
  s.dispatch({ type: "start", guided: true });
  for (const type of ["initialized", "portal_open", "portal_complete"] as const)
    s.dispatch({ type });
  return s;
}
describe("short guided experience", () => {
  it("waits for a greeting reply or an optional-name interval, never speaks over a turn", () => {
    const g = new GuidedVisit();
    g.begin(1000);
    expect(g.shouldIntroduce(2000, false)).toBe(false);
    expect(g.shouldIntroduce(17000, true)).toBe(false);
    expect(g.shouldIntroduce(17000, false)).toBe(true);
    g.replied = true;
    expect(g.shouldIntroduce(2000, false)).toBe(true);
    g.introducedAt = 2000;
    expect(g.shouldIntroduce(20000, false)).toBe(false);
  });
  it("returns at 210 active seconds without requiring a name or four decisions", () => {
    const s = visit(),
      g = new GuidedVisit();
    g.begin(0);
    s.tool("enter_observatory", "{}");
    s.dispatch({ type: "entry_complete" });
    expect(g.shouldReturn(s.snapshot, 209999)).toBe(false);
    expect(g.shouldReturn(s.snapshot, 210000)).toBe(true);
    expect(g.reason).toBe("deadline");
    expect(s.dispatch({ type: "guided_finish" }).accepted).toBe(true);
    s.dispatch({ type: "return_complete" });
    expect(s.snapshot.environment).toBe("reality");
    expect(s.snapshot.state).toBe("WAITING_FOR_CONSENT");
    expect(s.snapshot.generatedMessage).toContain("Il futuro");
    expect(s.snapshot.consent).toBe(false);
    s.dispatch({ type: "guided_close" });
    expect(s.snapshot.state).toBe("FAREWELL");
    expect(s.snapshot.saved).toBe(false);
  });
  it("finishes after three completed choices from two minutes, never invents a choice or completes a growing city early", () => {
    const s = visit(),
      g = new GuidedVisit();
    g.begin(0);
    s.tool("enter_observatory", "{}");
    s.dispatch({ type: "entry_complete" });
    for (const id of ["GREEN_TREES", "MOB_TRAM", "WATER_REUSE"]) {
      s.tool("show_intervention", JSON.stringify({ optionId: id }));
      s.dispatch({ type: "transformation_complete" });
    }
    expect(g.shouldReturn(s.snapshot, 119999)).toBe(false);
    expect(g.shouldReturn(s.snapshot, 120000)).toBe(true);
    s.tool("show_intervention", JSON.stringify({ optionId: "ENERGY_ROOFTOP" }));
    expect(g.shouldReturn(s.snapshot, 120001)).toBe(false);
    s.dispatch({ type: "transformation_complete" });
    expect(g.shouldReturn(s.snapshot, 120001)).toBe(true);
    s.dispatch({ type: "guided_finish" });
    s.dispatch({ type: "return_complete" });
    expect(s.snapshot.generatedMessage).toContain("verde");
    expect(s.snapshot.generatedMessage).toContain("mobilità");
    expect(s.snapshot.generatedMessage).not.toContain("Luca");
    expect(s.snapshot.pendingInterventions).toEqual([]);
  });
  it("suspends active time on explicit pause and resets on restart", () => {
    const g = new GuidedVisit();
    g.begin(100);
    g.shiftTime(30000);
    expect(g.elapsed(31000)).toBe(900);
    g.reset();
    expect(g.startedAt).toBeNull();
  });
  it("gives a final thought on an early requested return without a questionnaire or fake storage consent", () => {
    const s = visit();
    s.tool("remember_name", JSON.stringify({ name: "Luca" }));
    s.tool("enter_observatory", "{}");
    s.dispatch({ type: "entry_complete" });
    s.tool("request_return_to_reality", "{}");
    s.dispatch({ type: "return_complete" });
    expect(s.snapshot.generatedMessage).not.toContain("Luca");
    expect(s.snapshot.reflection).toBe("");
    expect(s.snapshot.saved).toBe(false);
    expect(s.tool("enter_observatory", "{}").accepted).toBe(false);
  });
  it("creates a short interconnected thought only from selected themes", () => {
    const phrase = takeaway(["MOB_TRAM", "WATER_REUSE", "ENERGY_ROOFTOP"]);
    expect(phrase).toContain("mobilità, acqua e energia");
    expect(phrase.split(" ").length).toBeLessThan(25);
  });
});

it("an unavailable recording backend cannot hold the guided goodbye open", () => {
  const s = visit();
  s.tool("enter_observatory", "{}");
  s.dispatch({ type: "entry_complete" });
  s.dispatch({ type: "guided_finish" });
  s.dispatch({ type: "return_complete" });
  s.tool("set_storage_consent", JSON.stringify({ consent: true }));
  s.dispatch({ type: "save_failed", message: "Backend offline" });
  expect(s.snapshot.consent).toBe(false);
  expect(s.snapshot.saved).toBe(false);
  expect(s.dispatch({ type: "guided_close" }).accepted).toBe(true);
  expect(s.snapshot.generatedMessage).toContain("Il futuro");
});

it("an explicit retry clears a transient failure before a new save", () => {
  const s = visit();
  s.tool("enter_observatory", "{}");
  s.dispatch({ type: "entry_complete" });
  s.dispatch({ type: "guided_finish" });
  s.dispatch({ type: "return_complete" });
  s.tool("set_storage_consent", JSON.stringify({ consent: true }));
  s.dispatch({ type: "save_failed", message: "Offline" });
  s.tool("set_storage_consent", JSON.stringify({ consent: true }));
  expect(s.snapshot.error).toBeNull();
  expect(s.snapshot.state).toBe("SAVING_MESSAGE");
});
