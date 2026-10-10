import { describe, expect, it, vi } from "vitest";
import { StoryEngine, type StoryEvent } from "../src/story/StoryEngine";
import {
  AdaptiveQuality,
  smoothTransition,
} from "../src/observatory/performance";
function enter(engine: StoryEngine) {
  expect(
    engine.tool("select_theme", '{"theme":"environmental"}').accepted,
  ).toBe(true);
  expect(engine.tool("enter_observatory", '{"consent":true}').accepted).toBe(
    true,
  );
  expect(engine.dispatch({ type: "entry_complete" }).accepted).toBe(true);
}
describe("authorized narrative flow", () => {
  it("gates both transitions on consent and renderer completion", () => {
    const engine = new StoryEngine();
    const listener = vi.fn();
    const unsubscribe = engine.subscribe(listener);
    expect(engine.tool("enter_observatory", '{"consent":true}').accepted).toBe(
      false,
    );
    engine.dispatch({ type: "start_discovery" });
    engine.tool("select_theme", '{"theme":"environmental"}');
    expect(engine.tool("enter_observatory", '{"consent":false}').accepted).toBe(
      false,
    );
    engine.tool("enter_observatory", '{"consent":true}');
    expect(engine.snapshot.state).toBe("ENTER_OBSERVATORY");
    expect(
      engine.tool("transform_future", '{"future":"sustainable","consent":true}')
        .accepted,
    ).toBe(false);
    engine.dispatch({ type: "entry_complete" });
    engine.tool("reflect", "{}");
    expect(
      engine.tool(
        "transform_future",
        '{"future":"sustainable","consent":false}',
      ).accepted,
    ).toBe(false);
    engine.tool("transform_future", '{"future":"sustainable","consent":true}');
    expect(engine.snapshot.transitioning).toBe(true);
    expect(engine.tool("show_future", '{"future":"critical"}').accepted).toBe(
      false,
    );
    engine.dispatch({ type: "transformation_complete" });
    expect(engine.snapshot.state).toBe("SUSTAINABLE_FUTURE");
    engine.tool("return_to_reality", "{}");
    engine.dispatch({ type: "return_complete" });
    expect(engine.snapshot.environment).toBe("reality");
    expect(engine.snapshot.state).toBe("CONCLUSION");
    expect(listener).toHaveBeenCalledTimes(9);
    unsubscribe();
    engine.dispatch({ type: "start_discovery" });
    expect(listener).toHaveBeenCalledTimes(9);
  });
  it.each(["environmental", "social", "economic"])(
    "visits and transforms both authored %s futures with explicit consent",
    (theme) => {
      const engine = new StoryEngine();
      expect(
        engine.tool("select_theme", JSON.stringify({ theme })).accepted,
      ).toBe(true);
      expect(engine.snapshot.theme).toBe(theme);
      expect(engine.snapshot.state).toBe("INVITATION");
      expect(
        engine.tool("enter_observatory", '{"consent":false}').accepted,
      ).toBe(false);
      expect(
        engine.tool("enter_observatory", '{"consent":true}').accepted,
      ).toBe(true);
      engine.dispatch({ type: "entry_complete" });
      const critical = engine.snapshot.message;
      expect(
        engine.tool(
          "transform_future",
          '{"future":"sustainable","consent":true}',
        ).accepted,
      ).toBe(true);
      engine.dispatch({ type: "transformation_complete" });
      expect(engine.snapshot.state).toBe("SUSTAINABLE_FUTURE");
      expect(engine.snapshot.message).not.toBe(critical);
    },
  );
  it.each(["entry", "critical", "transformation", "sustainable"])(
    "permits immediate return during %s and rejects late completions",
    (phase) => {
      const engine = new StoryEngine();
      engine.tool("select_theme", '{"theme":"environmental"}');
      engine.tool("enter_observatory", '{"consent":true}');
      if (phase !== "entry") engine.dispatch({ type: "entry_complete" });
      if (["transformation", "sustainable"].includes(phase))
        engine.tool(
          "transform_future",
          '{"future":"sustainable","consent":true}',
        );
      if (phase === "sustainable")
        engine.dispatch({ type: "transformation_complete" });
      expect(engine.tool("return_to_reality", "{}").accepted).toBe(true);
      expect(engine.dispatch({ type: "entry_complete" }).accepted).toBe(false);
      expect(
        engine.dispatch({ type: "transformation_complete" }).accepted,
      ).toBe(false);
      expect(
        engine.tool("select_theme", '{"theme":"environmental"}').accepted,
      ).toBe(false);
      engine.dispatch({ type: "return_complete" });
      enter(engine);
      expect(engine.snapshot.future).toBe("critical");
    },
  );
  it.each([
    ["entry_complete", "{}"],
    ["__proto__", "{}"],
    ["select_theme", '{"theme":["environmental"]}'],
    ["select_theme", '{"theme":"environmental","position":[0,0,0]}'],
    ["select_theme", "null"],
    ["select_theme", "[]"],
    ["select_theme", "{"],
    ["enter_observatory", '{"consent":"true"}'],
    ["return_to_reality", "x".repeat(2049)],
    ["transform_future", '{"future":"sustainable"}'],
  ])(
    "rejects untrusted tool %s with %s without changing state",
    (name, args) => {
      const engine = new StoryEngine();
      const before = { ...engine.snapshot };
      expect(engine.tool(name, args).accepted).toBe(false);
      expect(engine.snapshot).toEqual(before);
    },
  );
  it("rejects unknown internal events", () => {
    expect(
      new StoryEngine().dispatch({
        type: "move_camera",
      } as unknown as StoryEvent).accepted,
    ).toBe(false);
  });
});
describe("comfort and quality", () => {
  it("reduces resolution after sustained slow frames without oscillating or reacting to one hitch", () => {
    const quality = new AdaptiveQuality();
    quality.sample(30, true);
    quality.sample(72, true);
    expect(quality.quality).toBe("high");
    for (let i = 0; i < 3; i++) quality.sample(40, true);
    expect(quality.quality).toBe("balanced");
    expect(quality.framebufferScale).toBe(0.85);
    for (let i = 0; i < 3; i++) quality.sample(40, true);
    expect(quality.quality).toBe("low");
    quality.sample(90, true);
    expect(quality.quality).toBe("low");
    expect(quality.pixelRatio).toBeLessThan(1);
  });
  it("uses a smooth bounded eight-second transformation", () => {
    expect(smoothTransition(-1, 8)).toBe(0);
    expect(smoothTransition(4, 8)).toBe(0.5);
    expect(smoothTransition(8, 8)).toBe(1);
    expect(smoothTransition(12, 8)).toBe(1);
    expect(smoothTransition(0.01, 8)).toBeLessThan(0.00001);
  });
});

describe("name memory scoped to the current page", () => {
  it("remembers a declared name through every transition and can forget it", () => {
    const engine = new StoryEngine();
    expect(engine.tool("remember_name", '{"name":"Anna Maria"}').accepted).toBe(
      true,
    );
    enter(engine);
    engine.tool("return_to_reality", "{}");
    engine.dispatch({ type: "return_complete" });
    expect(engine.snapshot.name).toBe("Anna Maria");
    expect(new StoryEngine().snapshot.name).toBeNull();
    expect(engine.tool("forget_name", "{}").accepted).toBe(true);
    expect(engine.snapshot.name).toBeNull();
  });
  it.each(["", "x".repeat(41), "https://example.com", "<script>", "Anna123"])(
    "rejects invalid names: %s",
    (name) => {
      const engine = new StoryEngine();
      expect(
        engine.tool("remember_name", JSON.stringify({ name })).accepted,
      ).toBe(false);
      expect(engine.snapshot.name).toBeNull();
    },
  );
});
