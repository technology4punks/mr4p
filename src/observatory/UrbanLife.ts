import * as THREE from "three";

/** Authored street activity, with no camera motion or per-frame allocations. */
export class UrbanLife {
  readonly root = new THREE.Group();
  readonly materials = new Set<THREE.MeshStandardMaterial>();
  private people: THREE.InstancedMesh[] = [];
  private warning: THREE.MeshStandardMaterial;
  private dummy = new THREE.Object3D();
  private lastTime = -Infinity;
  private future = 0;
  private low = false;
  constructor(readonly theme: "environmental" = "environmental") {
    this.root.name = `${theme} street activity`;
    const material = (color: number) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness: 0.78 });
      this.materials.add(m);
      return m;
    };
    const batch = (
      name: string,
      geometry: THREE.BufferGeometry,
      m: THREE.MeshStandardMaterial,
      count: number,
      parent = this.root,
    ) => {
      const mesh = new THREE.InstancedMesh(geometry, m, count);
      mesh.name = name;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      // Routes stay inside this street envelope, including limb/vehicle extents.
      mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, -9), 35);
      parent.add(mesh);
      return mesh;
    };
    const clothing = material(0x627c86),
      skin = material(0xb28e75);
    this.people = [
      batch(
        "Walking residents · bodies",
        new THREE.CapsuleGeometry(0.15, 0.43, 2, 6),
        clothing,
        12,
      ),
      batch(
        "Walking residents · heads",
        new THREE.SphereGeometry(0.12, 8, 6),
        skin,
        12,
      ),
      batch(
        "Walking residents · legs",
        new THREE.CylinderGeometry(0.065, 0.045, 0.65, 6),
        material(0x39484b),
        24,
      ),
      batch(
        "Walking residents · arms",
        new THREE.CylinderGeometry(0.045, 0.035, 0.55, 6),
        clothing,
        24,
      ),
    ];
    // Instance colours vary residents without extra textures or draw calls.
    for (let i = 0; i < 12; i++) {
      const clothes = new THREE.Color(
        [0xb9d6ce, 0xe2c69c, 0x9bb7d2, 0xc5a7aa][i % 4],
      );
      this.people[0].setColorAt(i, clothes);
      this.people[1].setColorAt(
        i,
        new THREE.Color([0xe7c5a1, 0xb88761, 0x856349, 0xd7ad91][i % 4]),
      );
      for (let side = 0; side < 2; side++)
        this.people[3].setColorAt(i * 2 + side, clothes);
    }
    this.warning = material(0xc48d45);
    this.warning.emissive.set(0xcc732b);
    this.warning.userData.futureFade = "critical";
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 6),
      this.warning,
    );
    beacon.name = "Degraded infrastructure warning light";
    beacon.position.set(-10.5, 2.3, -7.6);
    this.root.add(beacon);
    this.update(0);
  }
  setFuture(value: number) {
    this.future = value;
    this.lastTime = -Infinity;
  }
  setQuality(low: boolean) {
    this.low = low;
    this.lastTime = -Infinity;
  }
  update(time: number) {
    if (time >= this.lastTime && time - this.lastTime < 33) return;
    this.lastTime = time;
    const seconds = time / 1000,
      f = this.future;
    const count = this.low ? 6 : 12;
    for (let i = 0; i < this.people.length; i++)
      this.people[i].count = i < 2 ? count : count * 2;
    for (let i = 0; i < count; i++) {
      // Routes and walkers remain active from the critical city onward.
      const phase = seconds * (0.25 + (i % 3) * 0.025) + i * 1.7;
      const wave = Math.sin(phase),
        direction = Math.cos(phase);
      const criticalX = ((i % 4) - 1.5) * 5.5 + wave * 0.8;
      const stationary = i >= 8;
      const goodX = stationary ? -6.5 + (i - 8) * 0.65 : wave * 8;
      const x = THREE.MathUtils.lerp(criticalX, goodX, f);
      const z = -6.65 - ((f * i) % 2) * 0.2;
      const scale = i < 4 ? 1 : Math.max(0.001, f);
      const yaw =
        stationary && f > 0.5
          ? i % 2
            ? -Math.PI / 2
            : Math.PI / 2
          : direction > 0
            ? Math.PI / 2
            : -Math.PI / 2;
      const stride =
        Math.sin(seconds * 4 + i) *
        0.24 *
        Math.abs(direction) *
        (stationary ? 1 - f : 1);
      for (let part = 0; part < 4; part++) {
        const pieces = part < 2 ? 1 : 2;
        for (let side = 0; side < pieces; side++) {
          const lateral = (side ? 1 : -1) * (part === 3 ? 0.2 : 0.08);
          this.dummy.position.set(
            x + (part < 2 ? 0 : Math.cos(yaw) * lateral),
            part === 0 ? 1.02 : part === 1 ? 1.5 : part === 2 ? 0.35 : 1.05,
            z - (part < 2 ? 0 : Math.sin(yaw) * lateral),
          );
          const gesture =
            part === 3 && stationary ? f * Math.sin(seconds + i) * 0.18 : 0;
          this.dummy.rotation.set(
            part < 2
              ? 0
              : gesture + stride * (side ? 1 : -1) * (part === 3 ? -1 : 1),
            yaw,
            0,
          );
          this.dummy.scale.setScalar(scale);
          this.dummy.updateMatrix();
          this.people[part].setMatrixAt(i * pieces + side, this.dummy.matrix);
        }
      }
    }
    for (const mesh of this.people) mesh.instanceMatrix.needsUpdate = true;
    this.warning.emissiveIntensity =
      (1 - f) * (0.25 + 0.3 * (Math.sin(seconds * 1.4) + 1));
  }
}
