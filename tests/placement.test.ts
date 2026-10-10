import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  floorIntersection,
  isFloorPlane,
  pointInPolygon,
  polygonArea,
  proposePlacement,
} from "../src/xr/floorPlacement";
import { normalizeModel } from "../src/avatar/AvatarController";
const polygon = [
  { x: -2, z: -2 },
  { x: 2, z: -2 },
  { x: 2, z: 2 },
  { x: -2, z: 2 },
] as DOMPointReadOnly[];
describe("placement in world space", () => {
  it("places feet on calibrated floor, 1.75m ahead, facing viewer", () => {
    const pose = proposePlacement(
      new THREE.Vector3(2, 1.7, 3),
      new THREE.Quaternion(),
      -0.12,
    );
    expect(pose.position.toArray()).toEqual([2, -0.12, 1.25]);
    expect(pose.yaw).toBe(0);
  });
  it("projects pitched gaze onto floor without changing suggested distance", () => {
    const pose = proposePlacement(
      new THREE.Vector3(0, 1.6, 0),
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(-1.2, Math.PI / 2, 0),
      ),
      0,
    );
    expect(pose.position.y).toBe(0);
    expect(Math.hypot(pose.position.x, pose.position.z)).toBeCloseTo(1.75);
  });
  it("normalizes off-center asset to target height and feet at y=0", () => {
    const model = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2));
    mesh.position.set(3, 5, -2);
    model.add(mesh);
    normalizeModel(model, 1.6);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    expect(box.min.y).toBeCloseTo(0);
    expect(box.max.y).toBeCloseTo(1.6);
    expect(box.getCenter(new THREE.Vector3()).x).toBeCloseTo(0);
    expect(box.getCenter(new THREE.Vector3()).z).toBeCloseTo(0);
  });
  it("does not mutate viewer pose or follow later head motion", () => {
    const viewer = new THREE.Vector3(0, 1.6, 0);
    const pose = proposePlacement(viewer, new THREE.Quaternion(), 0);
    viewer.x = 3;
    expect(pose.position.x).toBe(0);
    expect(pose.position.y).toBe(0);
  });
  it("rejects elevated tables, walls, tiny planes, and uncertain floor references", () => {
    expect(isFloorPlane("horizontal", 0.75, 8, true)).toBe(false);
    expect(isFloorPlane("vertical", 0, 8, true)).toBe(false);
    expect(isFloorPlane("horizontal", 0, 0.2, true)).toBe(false);
    expect(isFloorPlane("horizontal", -1.6, 8, false)).toBe(false);
    expect(isFloorPlane("horizontal", -1.6, 8, false, "floor")).toBe(true);
    expect(isFloorPlane("horizontal", 0.05, 8, true)).toBe(true);
  });
  it("checks surface extent rather than using an unrelated floor polygon", () => {
    expect(polygonArea(polygon)).toBe(16);
    expect(pointInPolygon(0, 0, polygon)).toBe(true);
    expect(pointInPolygon(5, 0, polygon)).toBe(false);
  });
  it("raycasts only forward intersections with a reachable floor", () => {
    expect(
      floorIntersection(
        new THREE.Vector3(0, 1.6, 0),
        new THREE.Vector3(0, -1, -1).normalize(),
        0,
      )?.y,
    ).toBeCloseTo(0);
    expect(
      floorIntersection(
        new THREE.Vector3(0, 1.6, 0),
        new THREE.Vector3(0, 1, 0),
        0,
      ),
    ).toBeUndefined();
    expect(
      floorIntersection(
        new THREE.Vector3(0, 1.6, 0),
        new THREE.Vector3(0, -0.1, -1).normalize(),
        0,
      ),
    ).toBeUndefined();
  });
});
