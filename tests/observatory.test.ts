import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
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
      layout.filter((b) => b.layer === "near").every((b) => b.z > -25),
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
