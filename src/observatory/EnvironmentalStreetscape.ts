import { cityRoutes } from "./CityPlan";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { CityBuilding } from "./FutureObservatory";

/** Environmental-only facade retrofit and waterfront. No new downloaded assets. */
export class EnvironmentalStreetscape {
  readonly root = new THREE.Group();
  readonly materials = new Set<THREE.MeshStandardMaterial>();
  readonly textures = new Set<THREE.Texture>();
  private envelope: THREE.MeshStandardMaterial;
  private buildings: THREE.InstancedMesh;
  private roundedEnvelope: THREE.BufferGeometry;
  private simpleEnvelope: THREE.BufferGeometry;
  private trim: THREE.MeshStandardMaterial;
  private glazing: THREE.MeshStandardMaterial;
  private weathering: THREE.InstancedMesh;
  private roofGardens: THREE.InstancedMesh;
  private fineDetails: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private future = 0;
  constructor(layout: CityBuilding[]) {
    this.root.name = "Environmental waterfront architecture";
    // Small deterministic mineral grain: shared by walls, stone and pavement.
    // One 128² RGBA texture, no network/Canvas dependency and no fragment noise loops.
    const data = new Uint8Array(128 * 128 * 4);
    let seed = 2050;
    for (let i = 0; i < data.length; i += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const grain = 220 + (seed >>> 27);
      data[i] = data[i + 1] = data[i + 2] = grain;
      data[i + 3] = 255;
    }
    const grain = new THREE.DataTexture(data, 128, 128);
    grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
    grain.repeat.set(6, 6);
    grain.magFilter = THREE.LinearFilter;
    grain.minFilter = THREE.LinearMipmapLinearFilter;
    grain.generateMipmaps = true;
    grain.colorSpace = THREE.SRGBColorSpace;
    grain.needsUpdate = true;
    this.textures.add(grain);
    const mat = (
      color: number,
      roughness = 0.8,
      metalness = 0,
      textured = false,
    ) => {
      const m = new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness,
        map: textured ? grain : null,
      });
      this.materials.add(m);
      return m;
    };
    this.envelope = mat(0x8a7660, 0.93, 0, true);
    this.trim = mat(0x746d60, 0.84, 0, true);
    this.glazing = mat(0x34414a, 0.32, 0.42);
    const cube = new THREE.BoxGeometry(1, 1, 1);
    const batch = (
      name: string,
      geometry: THREE.BufferGeometry,
      material: THREE.MeshStandardMaterial,
      poses: number[][],
    ) => {
      const mesh = new THREE.InstancedMesh(geometry, material, poses.length);
      mesh.name = name;
      poses.forEach((p, i) => {
        this.dummy.position.set(p[0], p[1], p[2]);
        this.dummy.scale.set(p[3], p[4], p[5]);
        this.dummy.rotation.set(0, p[6] ?? 0, p[7] ?? 0);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
      });
      mesh.computeBoundingSphere();
      this.root.add(mesh);
      return mesh;
    };
    // Keep balcony fronts clear of the rear edge of the rail corridor.
    // This local layout never changes the economic/social buildings.
    const near = layout
      .filter((b) => b.layer === "near")
      .map((b) => ({ ...b, z: Math.min(b.z, -21 - b.depth / 2) }));
    this.simpleEnvelope = cube;
    this.roundedEnvelope = new RoundedBoxGeometry(1, 1, 1, 1, 0.012);
    const buildings = (this.buildings = batch(
      "Environmental masonry envelopes",
      this.roundedEnvelope,
      this.envelope,
      near.map((b) => [b.x, b.height / 2, b.z, b.width, b.height, b.depth]),
    ));
    near.forEach((_, i) =>
      buildings.setColorAt(
        i,
        new THREE.Color().setHSL(
          0.09 + (i % 4) * 0.015,
          0.055,
          0.65 + (i % 5) * 0.045,
        ),
      ),
    );
    const stone: number[][] = [],
      glass: number[][] = [],
      scars: number[][] = [],
      gardens: number[][] = [],
      fins: number[][] = [];
    near.forEach((b, i) => {
      const front = b.z + b.depth / 2;
      const floors = Math.max(2, Math.floor(b.height / 2));
      const pitch = b.height / floors;
      // Roof coping, recessed plinth and real balcony projections cast their own
      // form through normals/parallax, without dynamic shadow maps.
      stone.push([b.x, 0.22, b.z, b.width + 0.12, 0.44, b.depth + 0.12]);
      stone.push([
        b.x,
        b.height + 0.07,
        b.z,
        b.width + 0.2,
        0.14,
        b.depth + 0.2,
      ]);
      gardens.push([
        b.x,
        b.height + 0.18,
        b.z,
        b.width * 0.75,
        0.18,
        b.depth * 0.65,
      ]);
      for (let floor = 0; floor < floors; floor++) {
        const y = (floor + 0.52) * pitch;
        glass.push([
          b.x,
          y,
          front + 0.026,
          b.width * 0.79,
          pitch * 0.61,
          0.055,
        ]);
        // Side glazing makes an oblique/room-scale viewpoint credible too.
        for (const side of [-1, 1])
          glass.push([
            b.x + side * (b.width / 2 + 0.025),
            y,
            b.z,
            0.05,
            pitch * 0.55,
            b.depth * 0.64,
          ]);
        stone.push([
          b.x,
          (floor + 1) * pitch - 0.07,
          front + 0.18,
          b.width + 0.12,
          0.13,
          0.44,
        ]);
        for (const side of [-1, 1])
          fins.push([
            b.x + side * b.width * 0.23,
            y,
            front + 0.09,
            0.07,
            pitch * 0.67,
            0.19,
          ]);
        if (floor % 2 === i % 2)
          gardens.push([
            b.x + b.width * 0.24,
            y - pitch * 0.34,
            front + 0.24,
            b.width * 0.4,
            0.16,
            0.24,
          ]);
        if ((floor + i) % 2 === 0)
          scars.push([
            b.x - b.width * 0.22,
            y + pitch * 0.25,
            front + 0.064,
            b.width * 0.18,
            pitch * 0.38,
            0.025,
          ]);
      }
    });
    // Permeable promenade, coping around rain gardens and slim cycle bollards.
    for (let i = 0; i < 30; i++) {
      const x = (i - 14.5) * 1.6;
      for (const z of [-4.3, -5.15]) stone.push([x, 0.012, z, 1.56, 0.09, 0.1]);
    }
    for (const x of [-25, -17, -9, 9, 17, 25]) {
      fins.push(
        [x, 1.9, -8.55, 0.065, 3.8, 0.065],
        [x + 0.28, 3.78, -8.55, 0.62, 0.045, 0.16],
      );
    }
    batch(
      "Facade reveals, balcony slabs and channel coping",
      cube,
      this.trim,
      stone,
    );
    batch("Recessed front and side glazing", cube, this.glazing, glass);
    this.fineDetails = batch(
      "Facade mullions and slender street lights",
      cube,
      mat(0x515959, 0.45, 0.45),
      fins,
    );
    const stain = mat(0x534337, 0.98);
    stain.userData.futureFade = "critical";
    this.weathering = batch("Weathered facade runoff", cube, stain, scars);
    const vegetation = mat(0x526d3c, 0.95);
    vegetation.userData.futureFade = "sustainable";
    this.roofGardens = batch(
      "Green roofs and balcony planting",
      cube,
      vegetation,
      gardens,
    );
    const paving = mat(0xa19b89, 0.96, 0, true);
    batch(
      "Permeable waterfront paving",
      cube,
      paving,
      cityRoutes.pedestrian.map((z) => [0, -0.073, z, 90, 0.018, 0.68]),
    );
    // Joints/grates add scale at close range in one batch; safely below feet.
    const joints: number[][] = [];
    for (let i = 0; i < 60; i++)
      joints.push([
        (i - 30) * 0.9,
        -0.06,
        cityRoutes.pedestrian[1],
        0.018,
        0.012,
        0.58,
      ]);
    for (let i = 0; i < 18; i++)
      joints.push([
        (i - 9) * 2.7,
        -0.047,
        cityRoutes.pedestrian[0],
        0.34,
        0.012,
        0.045,
      ]);
    batch("Paving joints and stormwater drains", cube, mat(0x68695f), joints);
    this.setFuture(0);
  }
  setFuture(amount: number) {
    this.future = THREE.MathUtils.clamp(amount, 0, 1);
    this.envelope.color
      .set(0x8a7660)
      .lerp(new THREE.Color(0xe0ddd1), this.future);
    this.envelope.roughness = 0.93 - this.future * 0.21;
    this.trim.color.set(0x746d60).lerp(new THREE.Color(0xb5b9ae), this.future);
    this.glazing.color
      .set(0x34414a)
      .lerp(new THREE.Color(0x71999c), this.future);
    this.weathering.visible = this.future < 0.999;
    this.roofGardens.visible = this.future > 0.002;
  }
  dispose() {
    // The alternate envelope may be detached when quality has dropped.
    this.roundedEnvelope.dispose();
  }
  setCityEfficiency(amount: number) {
    this.setFuture(amount);
    this.roofGardens.visible = false;
  }
  setQuality(low: boolean) {
    this.fineDetails.visible = !low;
    this.buildings.geometry = low ? this.simpleEnvelope : this.roundedEnvelope;
  }
}
