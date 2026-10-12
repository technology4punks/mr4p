// @vitest-environment happy-dom
import { it, expect, beforeEach, vi } from "vitest";
import * as THREE from "three";
import {
  FutureObservatory,
  cityLayout,
} from "../src/observatory/FutureObservatory";
import { deriveCity } from "../src/decision/DecisionEngine";
import { interventions } from "../src/decision/catalog";
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    fillRect: vi.fn(),
    fillText: vi.fn(),
  } as unknown as ReturnType<HTMLCanvasElement["getContext"]>);
});
it("uses one deterministic city with three depths and a real room opening", () => {
  expect(cityLayout()).toEqual(cityLayout());
  expect(new Set(cityLayout().map((b) => b.layer)).size).toBe(3);
  const scene = new FutureObservatory();
  scene.setOpacity(1);
  expect(scene.root.visible).toBe(true);
  const before = scene.city.uuid;
  for (const option of interventions) {
    const city = deriveCity([option.id]);
    scene.transformations.apply(city, 0, false);
    scene.applyCityState(city);
    expect(scene.city.uuid).toBe(before);
    expect(scene.transformations.visibleInterventions).toContain(option.id);
  }
  scene.dispose();
});
it("cumulates interventions and removes obsolete layers after revision", () => {
  const scene = new FutureObservatory();
  const t = scene.transformations;
  t.apply(
    deriveCity(["MOB_BIKE", "GREEN_PARK", "ENERGY_ROOFTOP", "WATER_REUSE"]),
    0,
    false,
  );
  expect(t.visibleInterventions).toEqual(
    expect.arrayContaining([
      "MOB_BIKE",
      "GREEN_PARK",
      "ENERGY_ROOFTOP",
      "WATER_REUSE",
    ]),
  );
  t.apply(
    deriveCity(["MOB_BIKE", "ENERGY_ROOFTOP", "WATER_REUSE", "GREEN_ROOFS"]),
    0,
    false,
  );
  expect(t.visibleInterventions).not.toContain("GREEN_PARK");
  expect(t.state.flags).toContain("R07");
  expect(t.layers.get("GREEN_ROOFS")!.visible).toBe(true);
  expect(t.layers.get("ENERGY_ROOFTOP")!.visible).toBe(true);
  scene.dispose();
});
it("keeps tram moving without an energy decision and preserves independent water/green channels", () => {
  const scene = new FutureObservatory();
  scene.setOpacity(1);
  scene.applyCityState(deriveCity(["MOB_TRAM"]));
  expect(scene.transit.root.visible).toBe(true);
  expect(scene.transformations.layers.get("GREEN_TREES")!.visible).toBe(false);
  const state = deriveCity(["ENERGY_ROOFTOP"]);
  scene.applyCityState(state);
  expect(scene.transit.root.visible).toBe(false);
  expect(state.channels.water).toBe(0);
  scene.dispose();
});
it("reduces quality without hiding chosen interventions and has no autonomous economic/social city", () => {
  const scene = new FutureObservatory();
  scene.transformations.apply(deriveCity(["FOOD_VERTICAL"]), 0, false);
  scene.setQuality("low");
  expect(scene.transformations.layers.get("FOOD_VERTICAL")!.visible).toBe(true);
  expect(scene.city.children.some((c) => /economic|social/i.test(c.name))).toBe(
    false,
  );
  scene.dispose();
});
it("keeps room and city in spatial coordinates for parallax and safely fades passthrough", () => {
  const scene = new FutureObservatory();
  const bounds = new THREE.Box3().setFromObject(scene.room);
  expect(bounds.getSize(new THREE.Vector3()).x).toBeGreaterThan(5);
  scene.setOpacity(0.5);
  expect(scene.root.visible).toBe(true);
  scene.setOpacity(0);
  expect(scene.root.visible).toBe(false);
  scene.dispose();
});
it("animates cumulative additions and revision removals over seven seconds without reallocating geometry", () => {
  const scene = new FutureObservatory(),
    t = scene.transformations;
  const before = scene.city.uuid;
  t.apply(deriveCity(["MOB_BIKE"]), 0, false);
  t.apply(deriveCity(["MOB_BIKE", "GREEN_TREES"]), 1000);
  t.update(4500);
  expect(t.layers.get("GREEN_TREES")!.scale.y).toBeCloseTo(0.5);
  expect(t.layers.get("MOB_BIKE")!.scale.y).toBe(1);
  t.update(8000);
  expect(t.layers.get("GREEN_TREES")!.scale.y).toBe(1);
  t.apply(deriveCity(["MOB_BIKE", "ENERGY_ROOFTOP"]), 9000);
  t.update(16000);
  expect(t.layers.get("GREEN_TREES")!.visible).toBe(false);
  expect(scene.city.uuid).toBe(before);
  scene.dispose();
});
for (const [rule, options] of [
  ["R01", ["GREEN_PARK", "WATER_REUSE"]],
  ["R03", ["MOB_TRAM", "ENERGY_ROOFTOP"]],
  ["R06", ["GREEN_PARK", "BIO_CORRIDORS"]],
  ["R08", ["ENERGY_SOLAR_FARM", "BIO_CORRIDORS"]],
  ["R09", ["FOOD_VERTICAL", "ENERGY_COMMUNITY"]],
  ["R10", ["HEAT_DISTRICT", "ENERGY_ROOFTOP"]],
  ["R11", ["BUILD_NEW", "WASTE_RECYCLE"]],
] as [string, string[]][])
  it(`${rule} reveals its authored connection and removes it when invalidated`, () => {
    const scene = new FutureObservatory(),
      t = scene.transformations;
    t.apply(deriveCity(options), 0, false);
    expect(t.relationLayers.get(rule)!.visible).toBe(true);
    t.apply(deriveCity([options[0]]), 0, false);
    expect(t.relationLayers.get(rule)!.visible).toBe(false);
    scene.dispose();
  });
it("keeps the critical city dynamic from its first frame", () => {
  const scene = new FutureObservatory();
  scene.setOpacity(1);
  const vehicles = scene.district.root.getObjectByName(
    "Street vehicles",
  ) as THREE.InstancedMesh;
  scene.update(0);
  const before = new THREE.Matrix4();
  vehicles.getMatrixAt(0, before);
  scene.update(1000);
  const after = new THREE.Matrix4();
  vehicles.getMatrixAt(0, after);
  expect(after.elements).not.toEqual(before.elements);
  scene.dispose();
});
