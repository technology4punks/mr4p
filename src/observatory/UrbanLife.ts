import * as THREE from "three";

/** Authored street activity, with no camera motion or per-frame allocations. */
export class UrbanLife {
  readonly root = new THREE.Group();
  readonly materials = new Set<THREE.MeshStandardMaterial>();
  private people: THREE.InstancedMesh[] = [];
  private vehicle = new THREE.Group();
  private wheels: THREE.InstancedMesh;
  private parcels?: THREE.InstancedMesh;
  private warning: THREE.MeshStandardMaterial;
  private dummy = new THREE.Object3D();
  private lastTime = -Infinity;
  private future = 0;
  private low = false;
  constructor(readonly theme: "environmental" | "economic" | "social") {
    this.root.name = `${theme} street activity`;
    const material = (color: number) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness: 0.78 });
      this.materials.add(m);
      return m;
    };
    const batch = (name: string, geometry: THREE.BufferGeometry, m: THREE.MeshStandardMaterial, count: number, parent = this.root) => {
      const mesh = new THREE.InstancedMesh(geometry, m, count);
      mesh.name = name;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      // Routes stay inside this street envelope, including limb/vehicle extents.
      mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, -9), 35);
      parent.add(mesh);
      return mesh;
    };
    const clothing = material(0x627c86), skin = material(0xb28e75);
    this.people = [
      batch("Walking residents · bodies", new THREE.CapsuleGeometry(0.15, 0.43, 2, 6), clothing, 12),
      batch("Walking residents · heads", new THREE.SphereGeometry(0.12, 8, 6), skin, 12),
      batch("Walking residents · legs", new THREE.CylinderGeometry(0.065, 0.045, 0.65, 6), material(0x39484b), 24),
      batch("Walking residents · arms", new THREE.CylinderGeometry(0.045, 0.035, 0.55, 6), clothing, 24),
    ];
    // Instance colours vary residents without extra textures or draw calls.
    for (let i = 0; i < 12; i++) {
      const clothes = new THREE.Color([0xb9d6ce, 0xe2c69c, 0x9bb7d2, 0xc5a7aa][i % 4]);
      this.people[0].setColorAt(i, clothes);
      this.people[1].setColorAt(i, new THREE.Color([0xe7c5a1, 0xb88761, 0x856349, 0xd7ad91][i % 4]));
      for (let side = 0; side < 2; side++) this.people[3].setColorAt(i * 2 + side, clothes);
    }
    const cube = new THREE.BoxGeometry(1, 1, 1);
    const box = (scale: number[], at: number[], m: THREE.MeshStandardMaterial) => {
      const mesh = new THREE.Mesh(cube, m);
      mesh.scale.set(scale[0], scale[1], scale[2]);
      mesh.position.set(at[0], at[1], at[2]);
      this.vehicle.add(mesh);
    };
    const metal = material(theme === "economic" ? 0xb8c1b0 : 0xb4c7be);
    this.vehicle.name = theme === "economic" ? "Local reuse delivery van" : "Neighbourhood electric shuttle";
    const length = theme === "economic" ? 2.8 : 4.4;
    box([length, 1.15, 1.25], [0, 0.9, 0], metal);
    box([length * 0.85, 0.5, 1.27], [0, 1.13, 0], material(0x273b43));
    box([0.08, 0.12, 0.85], [length / 2 + 0.01, 0.62, 0], material(0xdadab5));
    this.wheels = batch("Street vehicle wheels", new THREE.CylinderGeometry(0.26, 0.26, 0.12, 10).rotateX(Math.PI / 2), material(0x242b2c), 4, this.vehicle);
    this.wheels.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 3);
    this.vehicle.visible = theme !== "environmental";
    this.root.add(this.vehicle);
    this.warning = material(0xc48d45);
    this.warning.emissive.set(0xcc732b);
    this.warning.userData.futureFade = "critical";
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), this.warning);
    beacon.name = "Degraded infrastructure warning light";
    beacon.position.set(theme === "economic" ? 6.3 : -10.5, 2.3, theme === "economic" ? -6.3 : -7.6);
    this.root.add(beacon);
    if (theme === "economic") {
      const m = material(0xa98c62);
      m.userData.futureFade = "sustainable";
      this.parcels = batch("Reusable components in circulation", cube, m, 8);
    }
    this.update(0);
  }
  setFuture(value: number) {
    this.future = value;
    this.lastTime = -Infinity;
    if (this.parcels) this.parcels.visible = value > 0.002;
  }
  setQuality(low: boolean) { this.low = low; this.lastTime = -Infinity; }
  update(time: number) {
    if (time - this.lastTime < 33) return;
    this.lastTime = time;
    const seconds = time / 1000, f = this.future;
    const count = this.low ? 6 : 12;
    for (let i = 0; i < this.people.length; i++) this.people[i].count = i < 2 ? count : count * 2;
    for (let i = 0; i < count; i++) {
      // Critical residents remain separated from inaccessible services. In the
      // positive future they connect the square and step-free service entrances.
      const phase = seconds * (0.25 + i % 3 * 0.025) + i * 1.7;
      const wave = Math.sin(phase), direction = Math.cos(phase);
      const criticalX = (this.theme === "environmental" ? (i % 4 - 1.5) * 5.5 : (i % 3 - 1) * 6) + wave * 0.8;
      const criticalZ = this.theme === "social" ? -5.2 : this.theme === "environmental" ? -6.65 : -10.5;
      const serviceRoute = this.theme === "social" && i < 4;
      const working = this.theme === "economic" && i % 4 === 0;
      const meeting = this.theme === "social" && i >= 4 && i < 8;
      const waiting = this.theme === "environmental" && i >= 8;
      const stationary = working || meeting || waiting;
      const goodX = working ? (i === 0 ? -5.6 : i === 4 ? 4.7 : -4.4) : meeting ? (i < 6 ? -3 : 3) + (i % 2 ? 0.65 : -0.65) : waiting ? -6.5 + (i - 8) * 0.65 : serviceRoute ? (i % 2 ? 5.5 : -6) : wave * 8;
      const goodZ = stationary ? -5.35 : this.theme === "environmental" ? -6.65 - i % 2 * 0.2 : serviceRoute ? -8.9 + wave * 2.5 : -8.4 - i % 3 * 0.7;
      const x = THREE.MathUtils.lerp(criticalX, goodX, f);
      const z = THREE.MathUtils.lerp(criticalZ, goodZ, f);
      const scale = i < (this.theme === "social" ? 3 : this.theme === "environmental" ? 4 : 2) ? 1 : Math.max(0.001, f);
      const yaw = stationary && f > 0.5 ? (working ? Math.PI : i % 2 ? -Math.PI / 2 : Math.PI / 2) : serviceRoute && f > 0.5 ? (direction > 0 ? 0 : Math.PI) : (direction > 0 ? Math.PI / 2 : -Math.PI / 2);
      const stride = Math.sin(seconds * 4 + i) * 0.24 * Math.abs(direction) * (stationary ? 1 - f : 1);
      for (let part = 0; part < 4; part++) {
        const pieces = part < 2 ? 1 : 2;
        for (let side = 0; side < pieces; side++) {
          const lateral = (side ? 1 : -1) * (part === 3 ? 0.2 : 0.08);
          this.dummy.position.set(x + (part < 2 ? 0 : Math.cos(yaw) * lateral), part === 0 ? 1.02 : part === 1 ? 1.5 : part === 2 ? 0.35 : 1.05, z - (part < 2 ? 0 : Math.sin(yaw) * lateral));
          const gesture = part === 3 && stationary ? f * (working ? -0.65 + Math.sin(seconds * 2 + i) * 0.2 : Math.sin(seconds + i) * 0.18) : 0;
          this.dummy.rotation.set(part < 2 ? 0 : gesture + stride * (side ? 1 : -1) * (part === 3 ? -1 : 1), yaw, 0);
          this.dummy.scale.setScalar(scale);
          this.dummy.updateMatrix();
          this.people[part].setMatrixAt(i * pieces + side, this.dummy.matrix);
        }
      }
    }
    for (const mesh of this.people) mesh.instanceMatrix.needsUpdate = true;
    // The idle economic van never implies working production in the critical
    // state. The social shuttle bypasses the closed frontage until it opens.
    const travel = ((seconds * 1.6 + 25) % 60) - 30;
    this.vehicle.position.set(this.theme === "economic" ? THREE.MathUtils.lerp(2 + Math.sin(seconds * 0.3) * 0.12, travel, f) : travel, 0, this.theme === "social" ? -11 + f * 1.7 : -9.2);
    for (let i = 0; i < 4; i++) {
      this.dummy.position.set(i < 2 ? -0.9 : 0.9, 0.28, i % 2 ? 0.64 : -0.64);
      this.dummy.rotation.set(0, 0, seconds * (this.theme === "economic" ? f : 1) * 2);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.wheels.setMatrixAt(i, this.dummy.matrix);
    }
    this.wheels.instanceMatrix.needsUpdate = true;
    this.warning.emissiveIntensity = (1 - f) * (0.25 + 0.3 * (Math.sin(seconds * 1.4) + 1));
    if (this.parcels?.visible) {
      for (let i = 0; i < 8; i++) {
        this.dummy.position.set(-6.1 + ((seconds * 0.25 + i * 0.35) % 2.2), 0.88, -6);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.set(0.22, 0.18, 0.24);
        this.dummy.updateMatrix();
        this.parcels.setMatrixAt(i, this.dummy.matrix);
      }
      this.parcels.instanceMatrix.needsUpdate = true;
    }
  }
}
