import { beforeAll, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { AvatarController } from "../src/avatar/AvatarController";
import { afterAnimation } from "../src/avatar/animations";
import { rms, speechEnvelope } from "../src/audio/audioLevel";
import { turnToward } from "../src/avatar/facing";
let gltf: GLTF;
beforeAll(async () => {
  const file = await readFile("public/models/RobotExpressive.glb");
  gltf = await new GLTFLoader().parseAsync(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
    "",
  );
});
describe("real local asset and animation mixer", () => {
  it("contains required animation clips and a head node", () => {
    expect(gltf.animations.map((c) => c.name)).toEqual(
      expect.arrayContaining(["Idle", "Wave", "Yes", "No", "ThumbsUp"]),
    );
    expect(gltf.scene.getObjectByName("Head")).toBeDefined();
  });
  it("loads, places actual mesh feet at origin, scales to 1.6m and attaches mouth to head", async () => {
    vi.spyOn(GLTFLoader.prototype, "loadAsync").mockImplementation(
      async () => ({ ...gltf, scene: clone(gltf.scene) as THREE.Group }),
    );
    const avatar = new AvatarController();
    await avatar.load();
    const box = new THREE.Box3().setFromObject(avatar.root);
    expect(box.min.y).toBeCloseTo(0, 2);
    expect(box.max.y).toBeCloseTo(1.6, 1);
    const mouth = avatar.root
      .getObjectByName("Head")!
      .children.find(
        (obj) =>
          obj instanceof THREE.Mesh &&
          obj.material instanceof THREE.MeshBasicMaterial,
      );
    expect(mouth).toBeDefined();
    expect(avatar.root.parent).toBeNull();
    avatar.dispose();
  });
  it("runs greeting once, returns to base state and allows interruption", async () => {
    vi.spyOn(GLTFLoader.prototype, "loadAsync").mockImplementation(
      async () => ({ ...gltf, scene: clone(gltf.scene) as THREE.Group }),
    );
    const avatar = new AvatarController();
    await avatar.load();
    avatar.setState("listening");
    avatar.setState("greeting");
    avatar.update(10, 0, false);
    expect(avatar.state).toBe("listening");
    avatar.setState("negative");
    avatar.setState("speaking");
    expect(avatar.state).toBe("speaking");
    expect(afterAnimation("positive", "thinking")).toBe("thinking");
    avatar.dispose();
  });
  it("fallback remains usable when GLB is unavailable and finishes gestures", async () => {
    vi.spyOn(GLTFLoader.prototype, "loadAsync").mockRejectedValue(
      new Error("offline"),
    );
    const avatar = new AvatarController();
    expect((await avatar.load()).loaded).toBe(false);
    expect(new THREE.Box3().setFromObject(avatar.root).min.y).toBeCloseTo(0);
    avatar.setState("positive");
    avatar.update(1.3, 0, false);
    expect(avatar.state).toBe("idle");
    avatar.dispose();
  });
  it("turns the loaded robot toward a viewer behind it, even while idle, without changing its anchor pose", async () => {
    vi.spyOn(GLTFLoader.prototype, "loadAsync").mockImplementation(
      async () => ({ ...gltf, scene: clone(gltf.scene) as THREE.Group }),
    );
    const avatar = new AvatarController();
    await avatar.load();
    avatar.root.position.set(2, 0.04, -1.3);
    avatar.root.rotation.y = 0.4;
    const position = avatar.root.position.clone();
    const orientation = avatar.root.quaternion.clone();
    const viewer = new THREE.Vector3(2, 1.6, -3);
    for (let i = 0; i < 300; i++) avatar.update(1 / 72, 0, false, viewer);
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(
      avatar.visual.getWorldQuaternion(new THREE.Quaternion()),
    );
    expect(forward.z).toBeLessThan(-0.99);
    expect(avatar.root.position.equals(position)).toBe(true);
    expect(avatar.root.quaternion.angleTo(orientation)).toBeLessThan(1e-6);
    expect(avatar.state).toBe("idle");
    avatar.dispose();
  });
  it("faces a world-space viewer correctly with a rotated and translated observatory parent", async () => {
    vi.spyOn(GLTFLoader.prototype, "loadAsync").mockRejectedValue(new Error("offline"));
    const avatar = new AvatarController();
    await avatar.load();
    const room = new THREE.Group();
    room.position.set(5, 0.1, -4);
    room.rotation.y = Math.PI / 2;
    room.add(avatar.root);
    const viewer = new THREE.Vector3(5, 1.7, -1);
    for (let i = 0; i < 300; i++) avatar.update(1 / 72, 0, false, viewer);
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(
      avatar.visual.getWorldQuaternion(new THREE.Quaternion()),
    );
    expect(forward.z).toBeGreaterThan(0.99);
    expect(avatar.root.position.toArray()).toEqual([0, 0, 0]);
    avatar.dispose();
  });
});
describe("comfortable viewer-facing turns", () => {
  it("takes the short arc across +/- pi instead of spinning 360 degrees", () => {
    const angle = turnToward(Math.PI - 0.05, -Math.PI + 0.05, 0.016);
    expect(angle).toBeGreaterThan(Math.PI - 0.05);
  });
  it("limits turn speed and does not snap after tab suspension", () => {
    expect(Math.abs(turnToward(0, Math.PI, 10))).toBeCloseTo(0.105, 10);
    expect(turnToward(0.2, 2, 0)).toBeCloseTo(0.2);
  });
});
describe("speech energy", () => {
  it("computes RMS including silence and signed samples", () => {
    expect(rms([])).toBe(0);
    expect(rms([0, 0])).toBe(0);
    expect(rms([-0.5, 0.5])).toBe(0.5);
  });
  it("stays closed without audible audio, thresholds silence and smooths energy", () => {
    expect(speechEnvelope(0.8, 0.3, 0.016, false)).toBe(0);
    expect(speechEnvelope(0, 0.001, 0.016, true)).toBe(0);
    const envelope = speechEnvelope(0, 0.1, 0.016, true);
    expect(envelope).toBeGreaterThan(0);
    expect(envelope).toBeLessThan(0.9);
  });
});
