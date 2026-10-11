import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { FutureObservatory } from "../src/observatory/FutureObservatory";

function visibleNames(scene: FutureObservatory) {
  const names = new Set<string>();
  scene.city.traverseVisible(object => names.add(object.name));
  return names;
}

describe("environmental visual refinement", () => {
  it("isolates planting, facade detail and lighting from the economic/social scenes", () => {
    const scene = new FutureObservatory();
    try {
      scene.setOpacity(1);
      scene.setFuture(1);
      const envelopes = scene.city.getObjectByName("Environmental masonry envelopes") as THREE.InstancedMesh;
      const pose = new THREE.Matrix4();
      for (let i = 0; i < envelopes.count; i++) {
        envelopes.getMatrixAt(i, pose);
        const front = pose.elements[14] + new THREE.Vector3().setFromMatrixScale(pose).z / 2;
        expect(front + .44).toBeLessThan(-19.5 - 1.45 / 2);
      }
      expect(visibleNames(scene).has("Environmental broadleaf crowns")).toBe(true);
      expect(visibleNames(scene).has("Street tree crowns")).toBe(false);
      for (const theme of ["social", "economic"] as const) {
        scene.setTheme(theme);
        const names = visibleNames(scene);
        expect(names.has("Environmental masonry envelopes")).toBe(false);
        expect(names.has("Environmental broadleaf crowns")).toBe(false);
        expect(names.has("Street tree crowns")).toBe(true);
        expect(scene.directional.position.z).toBe(-12);
      }
      scene.setTheme("environmental");
      expect(visibleNames(scene).has("Environmental masonry envelopes")).toBe(true);
      expect(visibleNames(scene).has("Street tree crowns")).toBe(false);
      expect(scene.directional.position.z).toBe(8);
    } finally { scene.dispose(); }
  });

  it("reuses architecture in both futures and fades weathering with the entire environment", () => {
    const scene = new FutureObservatory();
    try {
      scene.setOpacity(1);
      const architecture = scene.streetscape.root.children as THREE.InstancedMesh[];
      const geometry = architecture.map(o => o.geometry);
      const decay = scene.city.getObjectByName("Weathered facade runoff") as THREE.Mesh;
      const roofs = scene.city.getObjectByName("Green roofs and balcony planting") as THREE.Mesh;
      for (const amount of [0, .5, 1, .5, 0]) {
        scene.setFuture(amount);
        scene.setOpacity(.6);
        expect(architecture.map(o => o.geometry)).toEqual(geometry);
        expect((decay.material as THREE.Material).opacity).toBeCloseTo(.6 * (1 - amount));
        expect((roofs.material as THREE.Material).opacity).toBeCloseTo(.6 * amount);
      }
      const envelopes = scene.city.getObjectByName("Environmental masonry envelopes") as THREE.InstancedMesh;
      const detailedTriangles = (envelopes.geometry.index?.count ?? envelopes.geometry.attributes.position.count) / 3;
      scene.setQuality("low");
      const reducedTriangles = (envelopes.geometry.index?.count ?? envelopes.geometry.attributes.position.count) / 3;
      expect(reducedTriangles).toBeLessThan(detailedTriangles / 2);
      expect(scene.streetscape.root.getObjectByName("Facade mullions and slender street lights")!.visible).toBe(false);
      expect(scene.streetscape.textures.size).toBe(1);
      const texture = [...scene.streetscape.textures][0] as THREE.DataTexture;
      expect(texture.image.data.byteLength).toBe(65536);
    } finally { scene.dispose(); }
  });

  it("updates environmental road traffic every rendered frame without moving the camera or adding geometry", () => {
    const scene = new FutureObservatory();
    try {
      scene.setOpacity(1);
      scene.setFuture(1);
      const cars = scene.city.getObjectByName("Street vehicles") as THREE.InstancedMesh;
      const pose = new THREE.Matrix4();
      const geometry = cars.geometry;
      let previous = 0;
      for (let i = 0; i < 144; i++) {
        scene.update(i * 1000 / 72);
        cars.getMatrixAt(0, pose);
        if (i) expect(pose.elements[12] - previous).toBeCloseTo(2.3 / 72, 4);
        previous = pose.elements[12];
      }
      expect(cars.geometry).toBe(geometry);
      const camera = new THREE.PerspectiveCamera(62, 1100 / 760, .05, 150);
      camera.position.set(0, 1.6, 1.8);
      // The central hub projects inside the actual window, from the safe initial point.
      const turbines = scene.city.getObjectByName("Wind turbine hubs") as THREE.InstancedMesh;
      turbines.getMatrixAt(1, pose);
      const hub = new THREE.Vector3().setFromMatrixPosition(pose);
      const ray = hub.clone().sub(camera.position);
      const t = (-2.5 - camera.position.z) / ray.z;
      const windowY = camera.position.y + ray.y * t;
      expect(windowY).toBeGreaterThan(.74);
      expect(windowY).toBeLessThan(2.6);
    } finally { scene.dispose(); }
  });
});
