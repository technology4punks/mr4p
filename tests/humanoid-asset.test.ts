import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { normalizeModel } from "../src/avatar/AvatarController";

it("ships an attributed optional humanoid with finite skin weights and a bounded standalone budget", async () => {
  const root = new URL("../public/models/humanoid/", import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL("manifest.json", root), "utf8"));
  const bytes = readFileSync(new URL(manifest.file, root));
  expect(manifest.license).toBe("CC-BY-3.0");
  expect(readFileSync(new URL("LICENSE.md", root), "utf8")).toContain("joney_lol");
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(manifest.sha256);
  expect(bytes.length).toBeLessThan(1600000);
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
  expect(gltf.animations).toHaveLength(0); // Candidate is not an animated drop-in replacement.
  let triangles = 0, meshes = 0;
  gltf.scene.traverse(object => {
    if (!(object instanceof THREE.SkinnedMesh)) return;
    meshes++;
    expect(object.skeleton.bones).toHaveLength(48);
    const weights = object.geometry.getAttribute("skinWeight");
    for (const value of weights.array) expect(Number.isFinite(value)).toBe(true);
    triangles += (object.geometry.index?.count ?? object.geometry.getAttribute("position").count) / 3;
  });
  expect(meshes).toBe(6);
  expect(triangles).toBe(18299);
  normalizeModel(gltf.scene, 1.6);
  gltf.scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(gltf.scene);
  expect(bounds.min.y).toBeCloseTo(0, 5);
  expect(bounds.max.y).toBeCloseTo(1.6, 5);
});
