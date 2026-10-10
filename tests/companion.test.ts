import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { CompanionFollow } from "../src/avatar/CompanionFollow";
import { FutureObservatory } from "../src/observatory/FutureObservatory";
const room = new THREE.Box3(new THREE.Vector3(-2.5, 0, -2.5), new THREE.Vector3(2.5, 3, 2.5));
describe("companion in a known virtual room", () => {
  it("keeps its feet planted when already nearby, even if the viewer rotates their head", () => {
    const follower = new CompanionFollow(room, []);
    const robot = new THREE.Vector3(0.75, 0, -1);
    expect(follower.update(robot, new THREE.Vector3(0, 1.6, 0),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI), 0.05)).toBe(false);
    expect(robot.toArray()).toEqual([0.75, 0, -1]);
  });
  it("follows slowly to the side and slightly behind, never altering floor height", () => {
    const follower = new CompanionFollow(room, []);
    const robot = new THREE.Vector3(0.75, 0.04, -1);
    const viewer = new THREE.Vector3(-2, 1.6, 0);
    const before = robot.clone();
    expect(follower.update(robot, viewer, new THREE.Quaternion(), 10)).toBe(true);
    expect(robot.distanceTo(before)).toBeLessThanOrEqual(0.022501);
    for (let i = 0; i < 400; i++) follower.update(robot, viewer, new THREE.Quaternion(), 0.05);
    expect(robot.x).toBeCloseTo(-0.85, 1);
    expect(robot.z).toBeCloseTo(0.35, 1);
    expect(robot.y).toBe(0.04);
    expect(Math.hypot(robot.x - viewer.x, robot.z - viewer.z)).toBeCloseTo(1.2, 1);
  });
  it("stops at obstacles and room boundaries rather than tunnelling or teleporting", () => {
    const barrier = new THREE.Box3(new THREE.Vector3(-0.2, 0, -2.5), new THREE.Vector3(0.2, 2, 2.5));
    const follower = new CompanionFollow(room, [barrier]);
    const robot = new THREE.Vector3(1, 0, 0);
    const before = robot.clone();
    for (let i = 0; i < 100; i++) follower.update(robot, new THREE.Vector3(-1.5, 1.6, 0), new THREE.Quaternion(), 0.05);
    expect(robot.equals(before)).toBe(true);
    expect(follower.update(robot, new THREE.Vector3(3, 1.6, 0), new THREE.Quaternion(), 0.05)).toBe(false);
  });
  it("uses the other side if the preferred side is obstructed", () => {
    const obstacle = new THREE.Box3(new THREE.Vector3(0.6, 0, -0.4), new THREE.Vector3(1.6, 2, 0.8));
    const follower = new CompanionFollow(room, [obstacle]);
    const robot = new THREE.Vector3(-1.9, 0, 0);
    for (let i = 0; i < 200; i++) follower.update(robot, new THREE.Vector3(0, 1.6, 0), new THREE.Quaternion(), 0.05);
    expect(robot.x).toBeCloseTo(-1.15, 1);
    expect(robot.z).toBeCloseTo(0.35, 1);
  });
  it("does not cross the user's personal space while changing sides", () => {
    const follower = new CompanionFollow(room, []);
    const robot = new THREE.Vector3(-2, 0, 0);
    const viewer = new THREE.Vector3(0, 1.6, 0);
    for (let i = 0; i < 200; i++) {
      follower.update(robot, viewer, new THREE.Quaternion(), 0.05);
      expect(Math.hypot(robot.x, robot.z)).toBeGreaterThanOrEqual(0.65);
    }
    expect(robot.x).toBeLessThan(0);
  });
  it("includes window sill, bench and furniture footprints before asset loading", () => {
    const scene = new FutureObservatory();
    expect(scene.companionObstacles).toHaveLength(3);
    const follower = new CompanionFollow(scene.companionBounds, scene.companionObstacles);
    const robot = new THREE.Vector3(0.75, 0, -1);
    const before = robot.clone();
    follower.update(robot, new THREE.Vector3(1.85, 1.6, 1.1), new THREE.Quaternion(), 0.05);
    expect(robot.equals(before)).toBe(true);
    scene.dispose();
  });
});
