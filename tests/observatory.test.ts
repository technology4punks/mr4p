import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CivicDistrict } from "../src/observatory/CivicDistrict";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  cityLayout,
  FutureObservatory,
} from "../src/observatory/FutureObservatory";
describe("three-dimensional observatory", () => {
  it("keeps the procedural room usable when all progressive assets fail", async () => {
    const spies = [
      vi.spyOn(THREE.TextureLoader.prototype, "loadAsync"),
      vi.spyOn(GLTFLoader.prototype, "loadAsync"),
      vi.spyOn(RGBELoader.prototype, "loadAsync"),
    ];
    spies.forEach((spy) => spy.mockRejectedValue(new Error("Offline")));
    const scene = new FutureObservatory();
    try {
      await scene.preload({} as THREE.WebGLRenderer);
      expect(scene.assetStatus).toContain("0/4");
      scene.setOpacity(1);
      scene.setFuture(1);
      expect(scene.root.visible).toBe(true);
      expect(scene.room.children.length).toBeGreaterThan(10);
    } finally {
      scene.dispose();
      spies.forEach((spy) => spy.mockRestore());
    }
  });
  it("has three distinct city depth bands with genuine lateral and forward parallax", () => {
    const layout = cityLayout();
    expect(cityLayout()).toEqual(layout);
    expect(new Set(layout.map((b) => b.layer))).toEqual(
      new Set(["near", "middle", "far"]),
    );
    const camera = new THREE.PerspectiveCamera(52, 1, 0.05, 150);
    camera.position.set(0, 1.6, 0);
    camera.lookAt(0, 1.6, -20);
    camera.updateMatrixWorld();
    const near = new THREE.Vector3(1, 1.6, -12),
      far = new THREE.Vector3(1, 1.6, -72);
    const a = near.clone().project(camera),
      b = far.clone().project(camera);
    camera.position.x = 0.5;
    camera.updateMatrixWorld();
    const nearShift = Math.abs(near.clone().project(camera).x - a.x),
      farShift = Math.abs(far.clone().project(camera).x - b.x);
    expect(nearShift).toBeGreaterThan(farShift * 5);
    camera.position.z = -1;
    camera.updateMatrixWorld();
    expect(near.clone().project(camera).x).not.toBeCloseTo((a.x + b.x) / 2, 4);
    expect(
      layout.filter((b) => b.layer === "near").every((b) => b.z > -35 && b.z < -21),
    ).toBe(true);
    expect(
      layout.filter((b) => b.layer === "far").every((b) => b.z < -70),
    ).toBe(true);
  });
  it("reuses city geometry across both futures and supports ray interaction", () => {
    const scene = new FutureObservatory();
    const geometries = new Set<THREE.BufferGeometry>();
    scene.root.traverse((o) => {
      if (o instanceof THREE.Mesh) geometries.add(o.geometry);
    });
    const density = scene.fogDensity;
    scene.setOpacity(1);
    scene.setFuture(1);
    scene.root.updateMatrixWorld(true);
    expect(scene.fogDensity).toBeLessThan(density);
    const after = new Set<THREE.BufferGeometry>();
    scene.root.traverse((o) => {
      if (o instanceof THREE.Mesh) after.add(o.geometry);
    });
    expect(after).toEqual(geometries);
    const ray = new THREE.Ray(
      new THREE.Vector3(0, 0.93, 0),
      new THREE.Vector3(0, 0, -1),
    );
    expect(scene.narrativeRay(ray)).toContain("Acqua");
    const near = scene.city.children.filter(
      (o) => o instanceof THREE.InstancedMesh,
    );
    expect(near.length).toBeGreaterThan(3);
    scene.setOpacity(0);
    expect(scene.root.visible).toBe(false);
    scene.dispose();
  });
  it("ships verified CC0 source assets with intact glTF buffer and image references", () => {
    const root = new URL("../public/observatory/", import.meta.url);
    const manifest = JSON.parse(
      readFileSync(new URL("assets-manifest.json", root), "utf8"),
    );
    for (const file of manifest.files) {
      expect(file.license).toBe("CC0-1.0");
      const bytes = readFileSync(new URL(file.file, root));
      expect(bytes.length).toBe(file.bytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        file.sha256,
      );
    }
    const table = new URL("modern_coffee_table_01/table.gltf", root);
    const gltf = JSON.parse(readFileSync(table, "utf8"));
    expect(gltf.asset.version).toBe("2.0");
    for (const buffer of gltf.buffers)
      expect(readFileSync(new URL(buffer.uri, table)).length).toBe(
        buffer.byteLength,
      );
    for (const image of gltf.images)
      expect(readFileSync(new URL(image.uri, table)).length).toBeGreaterThan(
        100,
      );
  });
});

describe("environmental contrast and stable geometry", () => {
  it("moves critical traffic down the road and keeps lane spacing during both transformations", () => {
    const scene = new FutureObservatory();
    scene.setOpacity(1);
    scene.setQuality("low");
    const cars = scene.city.getObjectByName("Street vehicles") as THREE.InstancedMesh;
    const pose = new THREE.Matrix4();
    scene.update(0);
    cars.getMatrixAt(0, pose);
    const start = pose.elements[12];
    for (let time = 40; time <= 4000; time += 40) scene.update(time);
    cars.getMatrixAt(0, pose);
    expect(pose.elements[12] - start).toBeGreaterThan(1);
    for (let step = 0; step < 200; step++) {
      scene.setFuture(step < 100 ? step / 99 : (199 - step) / 99);
      scene.update(4040 + step * 40);
      const lanes: number[][] = [[], []];
      for (let i = 0; i < cars.count; i++) {
        cars.getMatrixAt(i, pose);
        lanes[i % 2].push(pose.elements[12]);
      }
      for (const lane of lanes) for (let a = 0; a < lane.length; a++) for (let b = a + 1; b < lane.length; b++) {
        const distance = Math.abs(lane[a] - lane[b]);
        expect(Math.min(distance, 56 - distance)).toBeGreaterThan(6.9);
      }
    }
    scene.dispose();
  });
  it.each(["environmental", "economic", "social"] as const)("shows tram and train immediately in both %s futures with stable geometry and safe culling bounds", (theme) => {
    const scene = new FutureObservatory();
    scene.setTheme(theme);
    scene.setOpacity(1);
    scene.setQuality("low");
    const vehicles = scene.city.getObjectByName("Moving tram and train carriages") as THREE.InstancedMesh;
    const geometry = vehicles.geometry;
    const camera = new THREE.PerspectiveCamera(52, 1, 0.05, 150);
    camera.position.set(0, 1.6, 0.35);
    camera.lookAt(0, 1.6, -20);
    camera.updateMatrixWorld();
    const pose = new THREE.Matrix4(), position = new THREE.Vector3();
    for (const future of [0, 1]) {
      scene.setFuture(future);
      scene.update(0);
      for (const index of [0, 4]) {
        vehicles.getMatrixAt(index, pose);
        position.setFromMatrixPosition(pose).project(camera);
        expect(Math.abs(position.x)).toBeLessThan(1);
        expect(Math.abs(position.y)).toBeLessThan(1);
      }
      const before = pose.clone();
      scene.update(1000);
      vehicles.getMatrixAt(4, pose);
      expect(pose.equals(before)).toBe(false);
      for (const time of [30000, 36667, 90000, 120000]) {
        scene.update(time);
        for (let i = 0; i < vehicles.count; i++) {
          vehicles.getMatrixAt(i, pose);
          expect(vehicles.boundingSphere!.containsPoint(position.setFromMatrixPosition(pose))).toBe(true);
        }
      }
    }
    expect(vehicles.geometry).toBe(geometry);
    scene.dispose();
  });
  it("keeps residents in the environmental future and reveals animated cyclists on the protected lane", () => {
    const scene = new FutureObservatory();
    scene.setOpacity(1);
    scene.setQuality("low");
    const people = scene.district.root.getObjectByName("Walking residents · bodies") as THREE.InstancedMesh;
    const cyclists = scene.district.root.getObjectByName("Bicycle wheels") as THREE.InstancedMesh;
    expect(people.instanceColor).not.toBeNull();
    scene.update(0);
    expect(people.count).toBe(6);
    expect(scene.district.sustainable.visible).toBe(false);
    scene.setFuture(1);
    scene.update(100);
    const before = new THREE.Matrix4(), after = new THREE.Matrix4();
    cyclists.getMatrixAt(0, before);
    scene.update(1100);
    cyclists.getMatrixAt(0, after);
    expect(after.equals(before)).toBe(false);
    expect(scene.district.sustainable.visible).toBe(true);
    expect(cyclists.boundingSphere!.containsPoint(new THREE.Vector3().setFromMatrixPosition(after))).toBe(true);
    scene.dispose();
  });
  it("removes industrial decay while revealing charging, renewables and dense trees", () => {
    const scene = new FutureObservatory();
    scene.setOpacity(1);
    scene.setFuture(0);
    expect(scene.district.critical.visible).toBe(true);
    expect(scene.district.sustainable.visible).toBe(false);
    const smoke = scene.city.getObjectByName(
      "Industrial smoke",
    ) as THREE.InstancedMesh;
    const vehicles = scene.city.getObjectByName(
      "Street vehicles",
    ) as THREE.InstancedMesh;
    const crowns = scene.city.getObjectByName(
      "Layered tree foliage",
    ) as THREE.InstancedMesh;
    const matrix = new THREE.Matrix4();
    crowns.getMatrixAt(0, matrix);
    const dryScale = new THREE.Vector3().setFromMatrixScale(matrix).length();
    const geometry = vehicles.geometry;
    scene.setFuture(0.5);
    scene.setOpacity(0.6);
    expect((smoke.material as THREE.Material).opacity).toBeCloseTo(0.096);
    expect(scene.district.critical.visible).toBe(true);
    expect(scene.district.sustainable.visible).toBe(true);
    scene.setFuture(1);
    scene.setOpacity(1);
    scene.update(5000);
    expect(scene.district.critical.visible).toBe(false);
    expect(scene.district.sustainable.visible).toBe(true);
    expect(scene.city.getObjectByName("EV charging stations")).toBeTruthy();
    expect(scene.city.getObjectByName("Wind turbine rotors")).toBeTruthy();
    crowns.getMatrixAt(0, matrix);
    expect(
      new THREE.Vector3().setFromMatrixScale(matrix).length(),
    ).toBeGreaterThan(dryScale * 100);
    expect(vehicles.geometry).toBe(geometry);
    const solid = new THREE.MeshStandardMaterial();
    expect(vehicles.material).toBeInstanceOf(solid.constructor);
    solid.dispose();
    scene.dispose();
  });
  it("keeps animated cars and turbines within conservative culling bounds at low quality", () => {
    const scene = new FutureObservatory();
    scene.setFuture(1);
    scene.setOpacity(1);
    scene.setQuality("low");
    for (const time of [0, 30000, 120000]) {
      scene.update(time);
      const mesh = scene.city.getObjectByName(
        "Street vehicles",
      ) as THREE.InstancedMesh;
      for (let i = 0; i < 5; i++) {
        const matrix = new THREE.Matrix4();
        mesh.getMatrixAt(i, matrix);
        expect(
          mesh.boundingSphere!.containsPoint(
            new THREE.Vector3().setFromMatrixPosition(matrix),
          ),
        ).toBe(true);
      }
    }
    expect(scene.district.sustainable.visible).toBe(true);
    scene.dispose();
  });
});

describe("six authored futures", () => {
  it.each(["economic", "social"] as const)("keeps %s residents at pavement level throughout their stride", (theme) => {
    const district = new CivicDistrict(theme);
    const legs = district.root.getObjectByName("Walking residents · legs") as THREE.InstancedMesh;
    legs.geometry.computeBoundingBox();
    for (const future of [0, 1]) {
      district.setFuture(future);
      for (const time of [0, 500, 2000]) {
        district.update(time);
        for (const index of [0, 1]) {
          const pose = new THREE.Matrix4();
          legs.getMatrixAt(index, pose);
          const foot = legs.geometry.boundingBox!.clone().applyMatrix4(pose).min.y;
          expect(foot).toBeGreaterThanOrEqual(0);
          expect(foot).toBeLessThan(0.06);
        }
      }
    }
    district.dispose();
  });
  it.each(["environmental", "economic", "social"] as const)(
    "animates both %s futures immediately, including at low quality, and keeps routes in culling bounds",
    (theme) => {
      const scene = new FutureObservatory();
      scene.setTheme(theme);
      scene.setOpacity(1);
      scene.setQuality("low");
      const district = theme === "environmental" ? scene.district : theme === "economic" ? scene.economic : scene.social;
      const mesh = district.root.getObjectByName(theme === "environmental" ? "Street vehicles" : "Walking residents · bodies") as THREE.InstancedMesh;
      const geometry = mesh.geometry;
      const start = new THREE.Matrix4(), end = new THREE.Matrix4();
      for (const future of [0, 1]) {
        scene.setFuture(future);
        scene.update(0);
        mesh.getMatrixAt(theme === "economic" ? 1 : 0, start);
        scene.update(2000);
        mesh.getMatrixAt(theme === "economic" ? 1 : 0, end);
        expect(end.equals(start)).toBe(false);
        for (const time of [5000, 120000]) {
          scene.update(time);
          for (let i = 0; i < mesh.count; i++) {
            mesh.getMatrixAt(i, end);
            expect(mesh.boundingSphere!.containsPoint(new THREE.Vector3().setFromMatrixPosition(end))).toBe(true);
          }
        }
      }
      expect(mesh.geometry).toBe(geometry);
      scene.dispose();
    },
  );
  it("preserves the transformed look and disables hidden district updates on an in-place theme change", () => {
    const scene = new FutureObservatory();
    scene.setOpacity(1);
    scene.setFuture(0.6);
    const updates = [vi.spyOn(scene.district, "update"), vi.spyOn(scene.economic, "update"), vi.spyOn(scene.social, "update")];
    scene.setTheme("social");
    scene.update(6000);
    expect(updates.map((s) => s.mock.calls.length)).toEqual([0, 0, 1]);
    expect(scene.social.critical.visible && scene.social.sustainable.visible).toBe(true);
    scene.setFuture(1);
    scene.setTheme("economic");
    expect(scene.economic.critical.visible).toBe(false);
    expect(scene.economic.sustainable.visible).toBe(true);
    scene.dispose();
  });
  it.each(["economic", "social"] as const)(
    "switches %s without leaving environmental effects or allocating transition geometry",
    (theme) => {
      const scene = new FutureObservatory();
      scene.setTheme(theme);
      scene.setOpacity(1);
      scene.setFuture(0);
      const district = theme === "economic" ? scene.economic : scene.social;
      expect(scene.district.root.visible).toBe(false);
      expect(district.root.visible).toBe(true);
      expect(district.critical.visible).toBe(true);
      expect(district.sustainable.visible).toBe(false);
      const geometry = new Set<THREE.BufferGeometry>();
      scene.root.traverse((o) => {
        if (o instanceof THREE.Mesh) geometry.add(o.geometry);
      });
      scene.setFuture(0.5);
      expect(district.critical.visible && district.sustainable.visible).toBe(
        true,
      );
      const material = (district.critical.children[0] as THREE.Mesh)
        .material as THREE.Material;
      expect(material.opacity).toBeCloseTo(0.5);
      scene.setFuture(1);
      expect(district.critical.visible).toBe(false);
      const after = new Set<THREE.BufferGeometry>();
      scene.root.traverse((o) => {
        if (o instanceof THREE.Mesh) after.add(o.geometry);
      });
      expect(after).toEqual(geometry);
      expect(
        scene.narrativeRay(
          new THREE.Ray(
            new THREE.Vector3(0, 0.93, 0),
            new THREE.Vector3(0, 0, -1),
          ),
        ),
      ).toContain(theme === "economic" ? "ripareresti" : "escluso");
      scene.setTheme("environmental");
      scene.setFuture(0);
      expect(district.root.visible).toBe(false);
      expect(scene.district.root.visible).toBe(true);
      scene.dispose();
    },
  );
  it("verifies CC0 Kenney payload and all external texture references under 250 KB", () => {
    const root = new URL("../public/scenarios/kenney/", import.meta.url);
    const manifest = JSON.parse(
      readFileSync(new URL("manifest.json", root), "utf8"),
    );
    expect(manifest.license).toBe("CC0-1.0");
    expect(manifest.payloadBytes).toBeLessThan(250000);
    expect(manifest.assets).toHaveLength(4);
    for (const file of manifest.files) {
      const bytes = readFileSync(new URL(file.path, root));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        file.sha256,
      );
    }
    for (const asset of manifest.assets) {
      const bytes = readFileSync(new URL(asset.path, root));
      expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
      const json = JSON.parse(
        bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
      );
      expect(json.asset.version).toBe("2.0");
      for (const image of json.images ?? [])
        if (image.uri)
          expect(
            readFileSync(new URL(image.uri, new URL(asset.path, root))).length,
          ).toBeGreaterThan(100);
    }
  });
});

it("loads instanced models with floor-aligned factory roof and human-sized furniture", async () => {
  const loader = vi
    .spyOn(GLTFLoader.prototype, "loadAsync")
    .mockImplementation(async () => {
      const scene = new THREE.Group();
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.47, 0.2),
        new THREE.MeshStandardMaterial(),
      );
      mesh.position.set(2, 0.235, 1);
      scene.add(mesh);
      return { scene } as never;
    });
  const factory = new CivicDistrict("economic"),
    social = new CivicDistrict("social");
  try {
    await factory.preload();
    await social.preload();
    const factoryBounds = new THREE.Box3().setFromObject(
      factory.root.getObjectByName("Kenney industrial/building-h.glb")!,
    );
    expect(factoryBounds.min.y).toBeCloseTo(0);
    expect(factoryBounds.max.y).toBeCloseTo(4);
    const benchBounds = new THREE.Box3().setFromObject(
      social.root.getObjectByName("Kenney furniture/bench.glb")!,
    );
    expect(benchBounds.min.y).toBeCloseTo(0);
    expect(benchBounds.max.y).toBeCloseTo(0.94);
    expect(social.assetCount).toBe(2);
  } finally {
    for (const district of [factory, social]) {
      district.dispose();
      district.root.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      district.materials.forEach((m) => m.dispose());
    }
    loader.mockRestore();
  }
});
