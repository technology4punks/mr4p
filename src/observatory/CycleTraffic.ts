import * as THREE from "three";

const frame = [
  [0, 0.5, 0.72, 0.05, 0], [0, 0.52, 0.65, 0.05, -0.65],
  [-0.26, 0.53, 0.48, 0.05, 0.7], [0.36, 0.56, 0.5, 0.05, -0.45],
  [-0.2, 0.74, 0.25, 0.06, 0], [0.48, 0.87, 0.09, 0.04, 0],
  [0.44, 0.7, 0.035, 0.4, 0.16],
];
/** Three riders on the protected lane, rendered in four reusable batches. */
export class CycleTraffic {
  readonly root = new THREE.Group();
  readonly materials = new Set<THREE.MeshStandardMaterial>();
  private meshes: THREE.InstancedMesh[];
  private dummy = new THREE.Object3D();
  private lastTime = -Infinity;
  private distance = 0;
  constructor() {
    this.root.name = "Protected cycle lane riders";
    const batch = (name: string, geometry: THREE.BufferGeometry, color: number, count: number) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
      m.userData.futureFade = "sustainable";
      this.materials.add(m);
      const mesh = new THREE.InstancedMesh(geometry, m, count);
      mesh.name = name;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, -6.1), 42);
      this.root.add(mesh);
      return mesh;
    };
    this.meshes = [
      batch("Bicycle frames", new THREE.BoxGeometry(1, 1, 1), 0x8aaea8, 21),
      batch("Bicycle wheels", new THREE.TorusGeometry(0.31, 0.03, 4, 12), 0x283334, 6),
      batch("Cyclists bodies and limbs", new THREE.CapsuleGeometry(0.1, 0.3, 2, 6), 0xb9a27d, 15),
      batch("Cyclists helmets", new THREE.SphereGeometry(0.12, 8, 6), 0xd0ded4, 3),
    ];
    this.update(0);
  }
  private pose(mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, tilt = 0) {
    this.dummy.position.set(x, y, z);
    this.dummy.scale.set(sx, sy, sz);
    this.dummy.rotation.set(0, 0, tilt);
    this.dummy.updateMatrix();
    mesh.setMatrixAt(i, this.dummy.matrix);
  }
  update(time: number) {
    const delta = Number.isFinite(this.lastTime) ? THREE.MathUtils.clamp((time - this.lastTime) / 1000, 0, .1) : 0;
    this.distance = (this.distance + delta * 1.9) % 76;
    this.lastTime = time;
    const seconds = time / 1000;
    for (let i = 0; i < 3; i++) {
      const x = ((this.distance + i * 22 + 34) % 76) - 38;
      const z = -6.1;
      frame.forEach((p, j) => this.pose(this.meshes[0], i * 7 + j, x + p[0], p[1], z, p[2], p[3], j === 5 ? 0.3 : 0.045, p[4]));
      for (let j = 0; j < 2; j++) this.pose(this.meshes[1], i * 2 + j, x + (j ? 0.48 : -0.48), 0.34, z, 1, 1, 1, seconds * 6);
      this.pose(this.meshes[2], i * 5, x - 0.03, 1.11, z, 1.3, 1, 1.3, -0.35);
      this.pose(this.meshes[3], i, x + 0.06, 1.49, z, 1.1, 1, 1);
      for (let j = 0; j < 2; j++) {
        const pedal = Math.sin(seconds * 5 + j * Math.PI) * 0.14;
        this.pose(this.meshes[2], i * 5 + 1 + j, x - 0.16 + pedal, 0.63, z + (j ? 0.09 : -0.09), 0.55, 0.85, 0.55, -0.5 + pedal);
        this.pose(this.meshes[2], i * 5 + 3 + j, x + 0.26, 1.03, z + (j ? 0.13 : -0.13), 0.42, 0.75, 0.42, 0.8);
      }
    }
    this.meshes.forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; });
  }
}
