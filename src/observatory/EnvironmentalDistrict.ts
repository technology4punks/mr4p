import * as THREE from "three";
import { CycleTraffic } from "./CycleTraffic";
import { UrbanLife } from "./UrbanLife";

export class EnvironmentalDistrict {
  readonly root = new THREE.Group();
  readonly critical = new THREE.Group();
  readonly sustainable = new THREE.Group();
  readonly materials = new Set<
    THREE.MeshStandardMaterial | THREE.MeshBasicMaterial
  >();
  readonly cyclists = new CycleTraffic();
  readonly activity = new UrbanLife("environmental");
  private vehicles: THREE.InstancedMesh[] = [];
  private smoke: THREE.InstancedMesh;
  private blades: THREE.InstancedMesh;
  private water: THREE.MeshStandardMaterial;
  private body: THREE.MeshStandardMaterial;
  private future = 0;
  private time = -Infinity;
  private trafficTime = -Infinity;
  private trafficDistance = 0;
  private dummy = new THREE.Object3D();
  constructor() {
    this.root.name = "Environmental district";
    this.critical.name = "Critical infrastructure";
    this.sustainable.name = "Sustainable infrastructure";
    this.root.add(this.critical, this.sustainable, this.activity.root);
    this.sustainable.add(this.cyclists.root);
    this.cyclists.materials.forEach(m => this.materials.add(m));
    this.activity.materials.forEach(m => this.materials.add(m));
    const material = (color: number, roughness = 0.8, metalness = 0) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
      this.materials.add(m);
      return m;
    };
    const box = new THREE.BoxGeometry(1, 1, 1);
    const batch = (
      parent: THREE.Group,
      name: string,
      geometry: THREE.BufferGeometry,
      m: THREE.Material,
      poses: number[][],
    ) => {
      const mesh = new THREE.InstancedMesh(geometry, m, poses.length);
      mesh.name = name;
      poses.forEach((p, i) => {
        this.dummy.position.set(p[0], p[1], p[2]);
        this.dummy.scale.set(p[3], p[4], p[5]);
        this.dummy.rotation.set(0, p[6] ?? 0, p[7] ?? 0);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
      });
      mesh.computeBoundingSphere();
      parent.add(mesh);
      return mesh;
    };
    const rust = material(0x4a3529),
      rubble = material(0x716454),
      concrete = material(0xbabbb1);
    batch(
      this.critical,
      "Collapsed roadside barriers",
      box,
      rust,
      Array.from({ length: 14 }, (_, i) => [
        (i - 7) * 2.8,
        0.32,
        -7.6,
        1.8,
        0.17,
        0.25,
        0.15 * (i % 3),
        0.22 * (i % 4),
      ]),
    );
    batch(
      this.critical,
      "Rubble and abandoned infrastructure",
      box,
      rubble,
      Array.from({ length: 55 }, (_, i) => [
        (((i * 17) % 55) - 27) * 0.75,
        0.1 + (i % 3) * 0.04,
        -5.8 - (i % 4) * 0.11,
        0.2 + (i % 4) * 0.11,
        0.13 + (i % 3) * 0.08,
        0.24,
        i * 1.7,
        0.2,
      ]),
    );
    batch(
      this.critical,
      "Cracked pavement",
      box,
      rust,
      Array.from({ length: 26 }, (_, i) => [
        (i - 13) * 1.7,
        -0.045,
        -6.2,
        0.05,
        0.012,
        0.7 + (i % 3) * 0.3,
        i * 0.87,
      ]),
    );
    batch(
      this.critical,
      "Industrial chimneys",
      new THREE.CylinderGeometry(0.45, 0.65, 1, 8),
      rust,
      [-13, 3, 16].map((x, i) => [x, 6.3 + i, -28 - i * 2, 1, 12 + i * 2, 1]),
    );
    const soot = new THREE.MeshBasicMaterial({
      color: 0x342e2a,
      transparent: true,
      depthWrite: false,
    });
    soot.userData.baseOpacity = 0.32;
    this.materials.add(soot);
    this.smoke = batch(
      this.critical,
      "Industrial smoke",
      new THREE.SphereGeometry(1, 8, 5),
      soot,
      Array.from({ length: 18 }, () => [0, 0, 0, 1, 1, 1]),
    );
    // A dry channel becomes a retained-water garden without changing geometry.
    this.water = material(0x866543, 0.97);
    batch(this.root, "Water recovery channel", box, this.water, [
      [0, -0.02, -5.1, 55, 0.045, 0.65],
    ]);
    const green = material(0x54793d),
      leaf = material(0x397342),
      metal = material(0xbfc9c8, 0.3, 0.65);
    batch(this.sustainable, "Rain garden banks", box, green, [
      [0, -0.04, -4.55, 55, 0.04, 0.38],
      [0, -0.04, -5.6, 55, 0.04, 0.28],
    ]);
    batch(
      this.sustainable,
      "Rain garden shrubs",
      new THREE.SphereGeometry(1, 10, 7),
      leaf,
      Array.from({ length: 24 }, (_, i) => [
        (i - 12) * 1.1,
        0.26,
        -4.5,
        0.45,
        0.28 + (i % 3) * 0.05,
        0.25,
      ]),
    );
    batch(this.sustainable, "Cycling lane", box, material(0x669688), [
      [0, -0.055, -6.1, 55, 0.02, 0.5],
    ]);
    batch(
      this.sustainable,
      "EV charging stations",
      box,
      metal,
      Array.from({ length: 6 }, (_, i) => [
        (i - 3) * 4.8,
        0.6,
        -7.7,
        0.22,
        1.2,
        0.18,
      ]),
    );
    const screen = material(0x4fdec2, 0.2, 0.3);
    screen.emissive.set(0x175542);
    batch(
      this.sustainable,
      "Charging station displays",
      box,
      screen,
      Array.from({ length: 6 }, (_, i) => [
        (i - 3) * 4.8,
        0.84,
        -7.59,
        0.15,
        0.24,
        0.015,
      ]),
    );
    batch(
      this.sustainable,
      "Solar canopy supports",
      box,
      metal,
      [-4, -1, 2, 5].map((x) => [x, 1.3, -13, 0.07, 2.6, 0.07]),
    );
    batch(
      this.sustainable,
      "Solar mobility canopy",
      box,
      material(0x16344e, 0.22, 0.5),
      [[0.5, 2.7, -13, 10, 0.07, 1.6, 0, 0.035]],
    );
    const towers = [-15, 0, 15];
    batch(
      this.sustainable,
      "Wind turbine towers",
      new THREE.CylinderGeometry(0.1, 0.25, 1, 8),
      concrete,
      towers.map((x) => [x, 7, -36, 1, 14, 1]),
    );
    batch(
      this.sustainable,
      "Wind turbine hubs",
      new THREE.SphereGeometry(0.24, 8, 6),
      metal,
      towers.map((x) => [x, 14, -35.8, 1, 1, 1]),
    );
    this.blades = batch(
      this.sustainable,
      "Wind turbine rotors",
      box,
      concrete,
      Array.from({ length: 9 }, () => [0, 0, 0, 0.1, 2.8, 0.07]),
    );
    const shape = new THREE.Shape();
    shape.moveTo(-0.9, 0.05);
    shape.lineTo(0.84, 0.05);
    shape.quadraticCurveTo(1, 0.05, 0.96, 0.3);
    shape.quadraticCurveTo(0.91, 0.45, 0.66, 0.43);
    shape.lineTo(-0.68, 0.43);
    shape.quadraticCurveTo(-0.97, 0.4, -0.9, 0.05);
    const shell = new THREE.ExtrudeGeometry(shape, {
      depth: 0.76,
      bevelEnabled: true,
      bevelSize: 0.025,
      bevelThickness: 0.025,
      bevelSegments: 1,
      curveSegments: 3,
      steps: 1,
    });
    shell.translate(0, 0, -0.38);
    this.body = material(0x594a3c, 0.88, 0.1);
    const glazing = material(0x23373e, 0.2, 0.55),
      tyre = material(0x171c1e);
    this.vehicles.push(
      batch(
        this.root,
        "Street vehicles",
        shell,
        this.body,
        Array.from({ length: 15 }, () => [0, 0, 0, 1, 1, 1]),
      ),
      batch(
        this.root,
        "Vehicle cabins",
        box,
        glazing,
        Array.from({ length: 15 }, () => [0, 0, 0, 1, 1, 1]),
      ),
      batch(
        this.root,
        "Vehicle wheels",
        new THREE.CylinderGeometry(0.18, 0.18, 0.11, 10).rotateX(Math.PI / 2),
        tyre,
        Array.from({ length: 60 }, () => [0, 0, 0, 1, 1, 1]),
      ),
    );
    this.vehicles[0].userData.powertrain = "electric in sustainable future";
    for (const mesh of this.vehicles) mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.5, -10), 43);
    this.smoke.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 15, -30), 22);
    this.blades.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 14, -36), 19);
    for (const group of [this.critical, this.sustainable])
      group.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          const m = object.material as THREE.Material;
          m.userData.futureFade =
            group === this.critical ? "critical" : "sustainable";
        }
      });
    this.setFuture(0);
    this.update(0);
  }
  setFuture(value: number) {
    this.future = THREE.MathUtils.clamp(value, 0, 1);
    this.activity.setFuture(this.future);
    this.critical.visible = this.future < 0.999;
    this.sustainable.visible = this.future > 0.002;
    this.body.color.set(0x594a3c).lerp(new THREE.Color(0xd3e7e5), this.future);
    this.body.roughness = 0.88 - this.future * 0.55;
    this.body.metalness = 0.1 + this.future * 0.3;
    this.water.color.set(0x866543).lerp(new THREE.Color(0x427d83), this.future);
    this.water.roughness = 0.97 - this.future * 0.67;
    this.vehicles.forEach((mesh, i) => {
      mesh.count =
        this.future >= 0.999 ? (i === 2 ? 32 : 8) : i === 2 ? 60 : 15;
    });
    this.time = -Infinity;
  }
  update(time: number) {
    if (time - this.time < 33) return; // Decorative animation at 30 Hz, not XR locomotion.
    this.time = time;
    if (Number.isFinite(this.trafficTime) && time >= this.trafficTime) {
      const seconds = time / 1000;
      const criticalSpeed = 0.62 + Math.cos(seconds * 0.9) * 0.38;
      this.trafficDistance += Math.min(0.5, (time - this.trafficTime) / 1000) * THREE.MathUtils.lerp(criticalSpeed, 2.3, this.future);
    }
    this.trafficTime = time;
    this.activity.update(time);
    if (this.sustainable.visible) this.cyclists.update(time);
    for (let i = 0; i < 15; i++) {
      const visible = i < 8 ? 1 : Math.max(0.001, 1 - this.future);
      // Persistent cars occupy every second slot; critical-only cars fill the
      // gaps. Fading extra traffic never moves two cars into the same slot.
      const lane = i % 2;
      const slot = i < 8 ? Math.floor(i / 2) : Math.floor((i - 8) / 2) + 0.5;
      const x = (((this.trafficDistance + slot * 14 + (lane ? 32 : 28)) % 56) - 28) * (lane ? -1 : 1);
      const z = lane ? -11.05 : -9.95;
      this.dummy.position.set(x, 0.17, z);
      this.dummy.rotation.set(0, lane ? Math.PI : 0, 0);
      this.dummy.scale.setScalar(visible);
      this.dummy.updateMatrix();
      this.vehicles[0].setMatrixAt(i, this.dummy.matrix);
      this.dummy.position.y = 0.72;
      this.dummy.scale.set(1.03 * visible, 0.36 * visible, 0.69 * visible);
      this.dummy.updateMatrix();
      this.vehicles[1].setMatrixAt(i, this.dummy.matrix);
      for (let j = 0; j < 4; j++) {
        this.dummy.position.set(
          x + (j < 2 ? -0.62 : 0.62),
          0.19,
          z + (j % 2 ? 0.4 : -0.4),
        );
        this.dummy.scale.setScalar(visible);
        this.dummy.updateMatrix();
        this.vehicles[2].setMatrixAt(i * 4 + j, this.dummy.matrix);
      }
    }
    for (const mesh of this.vehicles) mesh.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 18; i++) {
      const stack = Math.floor(i / 6),
        puff = i % 6,
        drift = (time / 2800 + puff) % 6;
      this.dummy.position.set(
        [-13, 3, 16][stack] + drift * 0.38,
        12 + stack * 2 + drift * 0.65,
        -28 - stack * 2,
      );
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(
        0.65 + drift * 0.12,
        0.6 + drift * 0.11,
        0.7 + drift * 0.12,
      );
      this.dummy.updateMatrix();
      this.smoke.setMatrixAt(i, this.dummy.matrix);
    }
    this.smoke.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 9; i++) {
      const theta = time / 7000 + ((i % 3) * Math.PI * 2) / 3;
      this.dummy.position.set(
        [-15, 0, 15][Math.floor(i / 3)] - Math.sin(theta) * 1.4,
        14 + Math.cos(theta) * 1.4,
        -35.65,
      );
      this.dummy.rotation.set(0, 0, theta);
      this.dummy.scale.set(0.15, 2.8, 0.07);
      this.dummy.updateMatrix();
      this.blades.setMatrixAt(i, this.dummy.matrix);
    }
    this.blades.instanceMatrix.needsUpdate = true;
  }
  setQuality(low: boolean) {
    this.smoke.count = low ? 9 : 18;
    this.activity.setQuality(low);
  }
}
