import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { EnvironmentalPlanting } from "../src/observatory/EnvironmentalPlanting";

function meshes(planting: EnvironmentalPlanting) {
  return planting.root.children as THREE.InstancedMesh[];
}

function triangles(planting: EnvironmentalPlanting) {
  return meshes(planting).reduce((total, mesh) => total + (mesh.geometry.index?.count ?? mesh.geometry.getAttribute("position").count) / 3 * mesh.count, 0);
}

function dispose(planting: EnvironmentalPlanting) {
  meshes(planting).forEach(mesh => mesh.geometry.dispose());
  planting.materials.forEach(material => material.dispose());
}

describe("environmental planting", () => {
  it("keeps natural planting under three draws and 8,000 triangles with balanced low-quality coverage", () => {
    const planting = new EnvironmentalPlanting();
    try {
      planting.setFuture(1);
      expect(meshes(planting)).toHaveLength(3);
      expect(triangles(planting)).toBeLessThan(8000);
      const high = triangles(planting);
      planting.setQuality(true);
      expect(triangles(planting)).toBeLessThan(high * 0.6);
      const branches = planting.root.getObjectByName("Environmental branching trees") as THREE.InstancedMesh;
      const pose = new THREE.Matrix4();
      const sides = new Set<string>();
      for (let i = 0; i < branches.count; i += 5) {
        branches.getMatrixAt(i, pose);
        const x = pose.elements[12], z = pose.elements[14];
        sides.add(`${x < 0 ? "left" : "right"}-${z < -10 ? "far" : "near"}`);
        if (z > -10) expect(x >= 4.8 || x <= -8).toBe(true);
        for (const transportZ of [-8.4, -10, -12.5]) expect(Math.abs(z - transportZ)).toBeGreaterThan(1);
      }
      expect(sides.size).toBe(4);
      const reeds = planting.root.getObjectByName("Environmental rain-garden reeds") as THREE.InstancedMesh;
      const banks = new Set<string>();
      for (let i = 0; i < reeds.count; i++) {
        reeds.getMatrixAt(i, pose);
        const z = pose.elements[14];
        banks.add(z < -6 ? "rear" : "front");
        for (const path of [-6.65, -6.1, -8.4]) expect(Math.abs(z - path)).toBeGreaterThan(0.28);
      }
      expect(banks.size).toBe(2);
      planting.setQuality(false);
      expect(triangles(planting)).toBe(high);
    } finally {
      dispose(planting);
    }
  });

  it("retains geometry and conservative culling bounds throughout wind, growth and quality changes", () => {
    const planting = new EnvironmentalPlanting();
    try {
      const original = meshes(planting).map(mesh => mesh.geometry);
      const point = new THREE.Vector3(), matrix = new THREE.Matrix4();
      for (const future of [0, 0.5, 1]) {
        planting.setFuture(future);
        planting.update(120000);
        planting.setQuality(future === 0.5);
        expect(meshes(planting).map(mesh => mesh.geometry)).toEqual(original);
        for (const mesh of meshes(planting)) {
          expect(planting.materials.has(mesh.material as THREE.MeshStandardMaterial)).toBe(true);
          const vertices = mesh.geometry.getAttribute("position");
          for (let instance = 0; instance < mesh.count; instance++) {
            mesh.getMatrixAt(instance, matrix);
            for (let vertex = 0; vertex < vertices.count; vertex++) {
              point.fromBufferAttribute(vertices, vertex).applyMatrix4(matrix);
              // Reserve the full shader wind displacement around the authored geometry.
              expect(point.distanceTo(mesh.boundingSphere!.center) + 0.08).toBeLessThanOrEqual(mesh.boundingSphere!.radius);
            }
          }
        }
      }
      const crowns = planting.root.getObjectByName("Environmental broadleaf crowns")!;
      planting.setFuture(0);
      expect(crowns.visible).toBe(false);
      planting.setFuture(1);
      expect(crowns.visible).toBe(true);
    } finally {
      dispose(planting);
    }
  });

  it("animates wind and growth through uniforms without repeated instance matrix uploads", () => {
    const planting = new EnvironmentalPlanting();
    try {
      const crowns = planting.root.getObjectByName("Environmental broadleaf crowns") as THREE.InstancedMesh;
      const material = crowns.material as THREE.MeshStandardMaterial;
      const shader = { vertexShader: "#include <begin_vertex>", uniforms: {} } as Parameters<typeof material.onBeforeCompile>[0];
      material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
      const versions = meshes(planting).map(mesh => mesh.instanceMatrix.version);
      for (let i = 0; i < 720; i++) {
        planting.update(i * 1000 / 72);
        planting.setFuture(i / 719);
      }
      expect(meshes(planting).map(mesh => mesh.instanceMatrix.version)).toEqual(versions);
      expect(shader.uniforms.plantWindTime.value).toBeGreaterThan(9.9);
      expect(shader.uniforms.plantGrowth.value).toBe(1);
      expect(shader.vertexShader).toContain("instanceMatrix[3].x");
      expect(material.transparent).toBe(false);
    } finally {
      dispose(planting);
    }
  });
});
