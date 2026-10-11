import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { CityTransit } from "../src/observatory/CityTransit";

function positions(transit: CityTransit) {
  const vehicles = transit.root.getObjectByName("Moving tram and train carriages") as THREE.InstancedMesh;
  const pose = new THREE.Matrix4();
  return [0, 4].map(index => {
    vehicles.getMatrixAt(index, pose);
    return pose.elements[12];
  });
}

// Wrapping happens beyond the viewing envelope; measure motion along the loop.
function displacement(before: number, after: number) {
  return ((after - before + 165) % 110) - 55;
}

describe("continuous environmental transit", () => {
  it.each([0, 1])("advances on every 72 Hz frame in future %s", future => {
    const transit = new CityTransit();
    transit.setSmoothMotion(true);
    transit.setFuture(future);
    let before = positions(transit);
    for (let frame = 1; frame <= 144; frame++) {
      transit.update(frame * 1000 / 72);
      const after = positions(transit);
      expect(displacement(before[0], after[0])).toBeGreaterThan(0);
      expect(displacement(before[0], after[0])).toBeLessThan(0.04);
      expect(displacement(before[1], after[1])).toBeLessThan(0);
      expect(displacement(before[1], after[1])).toBeGreaterThan(-0.06);
      before = after;
    }
  });

  it("does not teleport or reverse during either transformation after several minutes", () => {
    const transit = new CityTransit();
    transit.setSmoothMotion(true);
    for (let time = 100; time <= 300000; time += 100) transit.update(time);
    let before = positions(transit);
    for (let frame = 1; frame <= 1152; frame++) {
      const amount = frame <= 576 ? frame / 576 : (1152 - frame) / 576;
      transit.setFuture(amount);
      transit.update(300000 + frame * 1000 / 72);
      const after = positions(transit);
      expect(displacement(before[0], after[0])).toBeGreaterThan(0);
      expect(displacement(before[0], after[0])).toBeLessThan(0.04);
      expect(displacement(before[1], after[1])).toBeLessThan(0);
      expect(displacement(before[1], after[1])).toBeGreaterThan(-0.06);
      before = after;
    }
  });

  it("resumes bounded motion after a paused or restarted clock", () => {
    const transit = new CityTransit();
    transit.setSmoothMotion(true);
    transit.setFuture(1);
    transit.update(50);
    const before = positions(transit);
    transit.update(60000);
    const resumed = positions(transit);
    expect(displacement(before[0], resumed[0])).toBeGreaterThan(0);
    expect(displacement(before[0], resumed[0])).toBeLessThan(0.3);
    expect(displacement(before[1], resumed[1])).toBeLessThan(0);
    expect(displacement(before[1], resumed[1])).toBeGreaterThan(-0.5);
    transit.update(0);
    expect(positions(transit)).toEqual(resumed);
    transit.update(1000 / 72);
    const restarted = positions(transit);
    expect(displacement(resumed[0], restarted[0])).toBeGreaterThan(0);
    expect(displacement(resumed[1], restarted[1])).toBeLessThan(0);
  });

  it("retains the decorative update limit when smooth motion is disabled", () => {
    const transit = new CityTransit();
    const before = positions(transit);
    transit.update(16);
    expect(positions(transit)).toEqual(before);
    transit.update(40);
    expect(positions(transit)).not.toEqual(before);
  });

  it("opens the environmental skyline and restores other themes without changing travel phase", () => {
    const transit = new CityTransit();
    transit.setSmoothMotion(true);
    transit.update(50);
    const infrastructure = transit.root.getObjectByName("Rail tracks, viaduct and tram stop") as THREE.InstancedMesh;
    const vehicles = transit.root.getObjectByName("Moving tram and train carriages") as THREE.InstancedMesh;
    const originalInfrastructure = infrastructure.instanceMatrix.array.slice();
    const originalVehicles = vehicles.instanceMatrix.array.slice();
    const originalShell = vehicles.geometry;
    const before = positions(transit);
    transit.setEnvironmentalLayout(true);
    expect(positions(transit)).toEqual(before);
    const pose = new THREE.Matrix4();
    for (let i = 0; i < infrastructure.count; i++) {
      infrastructure.getMatrixAt(i, pose);
      expect(pose.elements[12]).toBe(originalInfrastructure[i * 16 + 12]);
      expect(pose.elements[13]).toBe(originalInfrastructure[i * 16 + 13]);
      expect(pose.elements[14]).toBeCloseTo(originalInfrastructure[i * 16 + 14] - (i < 9 ? 7 : 0), 5);
    }
    for (let i = 0; i < vehicles.count; i++) {
      vehicles.getMatrixAt(i, pose);
      expect(pose.elements[14]).toBeCloseTo(i < 4 ? -8.4 : -19.5, 5);
      expect(vehicles.boundingSphere!.containsPoint(new THREE.Vector3().setFromMatrixPosition(pose))).toBe(true);
    }
    transit.setEnvironmentalLayout(true);
    expect(positions(transit)).toEqual(before);
    transit.setEnvironmentalLayout(false);
    expect(Array.from(infrastructure.instanceMatrix.array)).toEqual(Array.from(originalInfrastructure));
    expect(Array.from(vehicles.instanceMatrix.array)).toEqual(Array.from(originalVehicles));
    expect(vehicles.geometry).toBe(originalShell);
    transit.update(100);
    const after = positions(transit);
    expect(displacement(before[0], after[0])).toBeGreaterThan(0);
    expect(displacement(before[1], after[1])).toBeLessThan(0);
    transit.dispose();
  });

  it("adds rounded environmental shells within the existing six batches and releases the cached geometry", () => {
    const transit = new CityTransit();
    const triangleCount = () => transit.root.children.reduce((sum, object) => {
      const mesh = object as THREE.InstancedMesh;
      return sum + (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3 * mesh.count;
    }, 0);
    const originalTriangles = triangleCount();
    transit.setEnvironmentalLayout(true);
    expect(transit.root.children.length).toBe(6);
    expect(triangleCount() - originalTriangles).toBeGreaterThan(0);
    expect(triangleCount() - originalTriangles).toBeLessThan(1000);
    const vehicles = transit.root.getObjectByName("Moving tram and train carriages") as THREE.InstancedMesh;
    const rounded = vehicles.geometry;
    let disposed = false;
    rounded.addEventListener("dispose", () => { disposed = true; });
    transit.setEnvironmentalLayout(false);
    transit.setEnvironmentalLayout(true);
    expect(vehicles.geometry).toBe(rounded);
    transit.setEnvironmentalLayout(false);
    expect(triangleCount()).toBe(originalTriangles);
    transit.dispose();
    expect(disposed).toBe(true);
  });
});
