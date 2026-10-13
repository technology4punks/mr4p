import * as THREE from "three";
import { cityRoutes } from "./CityPlan.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/** Shared, authored transport corridor. Six batches serve every theme/future. */
export class CityTransit {
  readonly root = new THREE.Group();
  readonly materials = new Set<THREE.MeshStandardMaterial>();
  private moving: THREE.InstancedMesh[] = [];
  private shell: THREE.MeshStandardMaterial;
  private dummy = new THREE.Object3D();
  private future = 0;
  private lastTime = -Infinity;
  private smoothMotion = false;
  private tramDistance = 0;
  private trainDistance = 0;
  private environmentalLayout = false;
  private infrastructure: THREE.InstancedMesh;
  private infrastructurePoses: number[][];
  private safety: THREE.InstancedMesh;
  private safetyPoses: number[][];
  private carriageBox: THREE.BufferGeometry;
  private roundedCarriage?: THREE.BufferGeometry;
  constructor() {
    this.root.name = "Tram and regional rail corridor";
    const material = (color: number, roughness = 0.65, metalness = 0.25) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
      this.materials.add(m);
      return m;
    };
    const cube = new THREE.BoxGeometry(1, 1, 1);
    this.carriageBox = cube;
    const batch = (
      name: string,
      geometry: THREE.BufferGeometry,
      m: THREE.MeshStandardMaterial,
      count: number,
      dynamic = false,
    ) => {
      const mesh = new THREE.InstancedMesh(geometry, m, count);
      mesh.name = name;
      mesh.boundingSphere = new THREE.Sphere(
        new THREE.Vector3(0, 2.5, -10.5),
        84,
      );
      if (dynamic) mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.root.add(mesh);
      return mesh;
    };
    const infrastructure = batch(
      "Rail tracks, viaduct and tram stop",
      cube,
      material(0x75817c),
      16,
    );
    this.infrastructure = infrastructure;
    const poses = [
      [0, 2.45, -12.5, 110, 0.18, 1.7],
      ...[-43, -25, -12, 12, 25, 43].map((x) => [
        x,
        1.2,
        -12.5,
        0.32,
        2.4,
        0.5,
      ]),
      ...[-12.96, -12.04].map((z) => [0, 2.57, z, 110, 0.055, 0.07]),
      ...[-8.83, -7.97].map((z) => [0, 0.025, z, 110, 0.035, 0.055]),
      [-4.9, 0.08, -7.25, 5.6, 0.14, 0.8],
      [-4.9, 2.05, -7.25, 5.6, 0.1, 1],
      ...[-7.3, -2.5].map((x) => [x, 1.05, -7.6, 0.065, 2.1, 0.065]),
      [-4.9, 0.52, -7.45, 2.5, 0.12, 0.3],
    ];
    this.infrastructurePoses = poses;
    poses.forEach((p, i) => this.pose(infrastructure, i, p));
    const safety = batch(
      "Platform edging and tram stop marker",
      cube,
      material(0xd6bd72),
      3,
    );
    this.safety = safety;
    this.safetyPoses = [
      [-4.9, 0.16, -7.65, 5.6, 0.02, 0.12],
      [-2.5, 1.55, -7.23, 0.35, 0.35, 0.04],
      [-2.5, 1.98, -7.23, 0.2, 0.04, 0.05],
    ];
    this.safetyPoses.forEach((p, i) => this.pose(safety, i, p));
    this.shell = material(0x807867, 0.8, 0.3);
    const glass = material(0x233e48, 0.25, 0.45);
    const doors = material(0xc6c8ba, 0.4, 0.45);
    this.moving = [
      batch("Moving tram and train carriages", cube, this.shell, 9, true),
      batch("Transit panoramic glazing", cube, glass, 9, true),
      batch("Transit doors and headlights", cube, doors, 36, true),
      batch(
        "Transit wheelsets",
        new THREE.CylinderGeometry(0.22, 0.22, 1, 8).rotateX(Math.PI / 2),
        material(0x293335),
        36,
        true,
      ),
    ];
    this.update(0);
  }
  private pose(mesh: THREE.InstancedMesh, i: number, p: number[]) {
    this.transform(mesh, i, p[0], p[1], p[2], p[3], p[4], p[5]);
  }
  private transform(
    mesh: THREE.InstancedMesh,
    i: number,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
  ) {
    this.dummy.position.set(x, y, z);
    this.dummy.scale.set(sx, sy, sz);
    this.dummy.rotation.set(0, 0, 0);
    this.dummy.updateMatrix();
    mesh.setMatrixAt(i, this.dummy.matrix);
  }
  setFuture(amount: number) {
    this.future = amount;
    this.shell.color.set(0x807867).lerp(new THREE.Color(0xb5d9cd), amount);
    this.shell.roughness = 0.8 - amount * 0.45;
  }
  /** Environmental traffic follows each rendered frame; other themes retain 30 Hz. */
  setSmoothMotion(enabled: boolean) {
    this.smoothMotion = enabled;
  }
  /** Move the environmental rail corridor behind the avenue to open the skyline. */
  setEnvironmentalLayout(enabled: boolean) {
    if (this.environmentalLayout === enabled) return;
    this.environmentalLayout = enabled;
    this.infrastructurePoses.forEach((original, i) => {
      const p = [...original];
      if (enabled)
        p[2] +=
          i < 9
            ? cityRoutes.rail + 12.5
            : i < 11
              ? cityRoutes.tram + 8.4
              : cityRoutes.platform + 7.25;
      this.pose(this.infrastructure, i, p);
    });
    this.safetyPoses.forEach((original, i) => {
      const p = [...original];
      if (enabled) p[2] += cityRoutes.platform + 7.25;
      this.pose(this.safety, i, p);
    });
    this.infrastructure.instanceMatrix.needsUpdate = true;
    this.safety.instanceMatrix.needsUpdate = true;
    if (enabled && !this.roundedCarriage)
      this.roundedCarriage = new RoundedBoxGeometry(1, 1, 1, 1, 0.07);
    this.moving[0].geometry = enabled
      ? this.roundedCarriage!
      : this.carriageBox;
    this.root.children.forEach((object) => {
      if (object instanceof THREE.InstancedMesh && object.boundingSphere) {
        object.boundingSphere.center.z = enabled ? -23 : -10.5;
        object.boundingSphere.radius = enabled ? 100 : 84;
      }
    });
    this.updateVehicles();
  }
  update(time: number) {
    if (
      time >= this.lastTime &&
      time - this.lastTime < (this.smoothMotion ? 0 : 33)
    )
      return;
    // Integrate velocity instead of multiplying the entire session time by a
    // changing speed. Future transformations must not teleport or reverse trains.
    // A resumed tab advances at most 100 ms, without catching up offscreen time.
    const delta = Number.isFinite(this.lastTime)
      ? THREE.MathUtils.clamp((time - this.lastTime) / 1000, 0, 0.1)
      : 0;
    this.lastTime = time;
    this.tramDistance =
      (this.tramDistance + delta * (0.55 + this.future * 1.7)) % 110;
    this.trainDistance =
      (this.trainDistance + delta * (1.5 + this.future * 2.5)) % 110;
    this.updateVehicles();
  }
  private updateVehicles() {
    // Two evenly spaced trams travel along the ground track, opposing the train.
    // The train always crosses the clear foreground
    // viaduct; wrap points are outside the window's room-scale view envelope.
    for (let i = 0; i < 9; i++) {
      const train = i >= 4,
        run = train ? 2 : Math.floor(i / 2);
      const carriage = train ? i - 4 : i % 2;
      const direction = train ? -1 : 1;
      const distance = train ? this.trainDistance : this.tramDistance;
      const lead = ((distance + (run === 1 ? 0 : 55)) % 110) - 55;
      const x = direction * lead - direction * carriage * (train ? 5.25 : 3.65);
      const y = train ? 2.65 : 0.14,
        z = train
          ? this.environmentalLayout
            ? cityRoutes.rail
            : -12.5
          : this.environmentalLayout
            ? cityRoutes.tram
            : -8.4;
      const length = train ? 5 : 3.45,
        width = train ? 1.45 : 1.05;
      this.transform(this.moving[0], i, x, y + 0.8, z, length, 1.3, width);
      this.transform(
        this.moving[1],
        i,
        x,
        y + 1.03,
        z,
        length * 0.93,
        0.52,
        width + 0.02,
      );
      for (let j = 0; j < 4; j++) {
        if (j < 2)
          this.transform(
            this.moving[2],
            i * 4 + j,
            x,
            y + 0.7,
            z + (j % 2 ? 1 : -1) * (width / 2 + 0.02),
            0.42,
            1.05,
            0.025,
          );
        else
          this.transform(
            this.moving[2],
            i * 4 + j,
            x + direction * (length / 2 + 0.01),
            y + 0.5,
            z + (j % 2 ? 0.3 : -0.3),
            0.025,
            0.1,
            0.12,
          );
        this.transform(
          this.moving[3],
          i * 4 + j,
          x + (j < 2 ? -1 : 1) * length * 0.33,
          y + 0.1,
          z + (j % 2 ? 1 : -1) * width * 0.38,
          1,
          1,
          0.14,
        );
      }
    }
    this.moving.forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
    });
  }
  dispose() {
    // The owning scene disposes active meshes. Also release the alternate shell
    // when a different theme is active at teardown.
    this.roundedCarriage?.dispose();
    this.roundedCarriage = undefined;
  }
}
