import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/** Two authored districts; shared geometry survives the eight-second change. */
export class CivicDistrict {
  readonly root = new THREE.Group();
  readonly critical = new THREE.Group();
  readonly sustainable = new THREE.Group();
  readonly materials = new Set<THREE.MeshStandardMaterial>();
  private facade: THREE.MeshStandardMaterial;
  private detail = new THREE.Group();
  private future = 0;
  private disposed = false;
  private dummy = new THREE.Object3D();
  private shells = new THREE.Group();
  private labels: THREE.Mesh[] = [];
  assetCount = 0;
  constructor(readonly theme: "economic" | "social") {
    this.root.name = `${theme} district`;
    this.root.add(this.shells, this.critical, this.sustainable);
    this.critical.name = `${theme} exclusion and waste`;
    this.sustainable.name = `${theme} regeneration`;
    this.sustainable.add(this.detail);
    const material = (color: number, fade?: "critical" | "sustainable") => {
      const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
      if (fade) m.userData.futureFade = fade;
      this.materials.add(m);
      return m;
    };
    const box = new THREE.BoxGeometry(1, 1, 1);
    const batch = (
      parent: THREE.Group,
      name: string,
      m: THREE.MeshStandardMaterial,
      poses: number[][],
      geometry: THREE.BufferGeometry = box,
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
    this.facade = material(0x68675f);
    batch(this.shells, "Reusable neighbourhood buildings", this.facade, [
      [-6, 2, -15, 6, 4, 5],
      [5.5, 2.5, -16, 7, 5, 5],
    ]);
    batch(this.root, "Paved public square", material(0xa39d8e), [
      [0, -0.05, -6.1, 27, 0.08, 3.6],
    ]);
    const rust = material(0x55443c, "critical"),
      dark = material(0x3f4445, "critical"),
      green = material(0x66836b, "sustainable"),
      clean = material(0xd4d0bd, "sustainable");
    if (theme === "economic") {
      batch(
        this.critical,
        "Boarded shops",
        rust,
        [-9, -6, -3, 3, 6, 9].map((x) => [x, 1.2, -12.35, 1.9, 2.25, 0.09]),
      );
      batch(
        this.critical,
        "Discarded unsorted materials",
        dark,
        Array.from({ length: 32 }, (_, i) => [
          -6 + (i % 8) * 0.55,
          0.15 + Math.floor(i / 8) * 0.24,
          -6.3 - (i % 3) * 0.4,
          0.5,
          0.24,
          0.48,
          i * 0.7,
        ]),
      );
      batch(this.critical, "Idle loading machinery", rust, [
        [5, 0.65, -6.3, 2.4, 1.3, 1.1],
        [6.3, 1.5, -6.3, 0.18, 3, 0.2],
      ]);
      batch(
        this.sustainable,
        "Open repair workshop entrances",
        green,
        [-9, -6, -3, 3, 6, 9].map((x) => [x, 1.3, -12.3, 1.7, 2.4, 0.1]),
      );
      batch(this.sustainable, "Repair benches and reused timber", clean, [
        [-5, 0.72, -6, 2.5, 0.15, 0.9],
        [-5.9, 0.34, -6, 0.14, 0.68, 0.7],
        [-4.1, 0.34, -6, 0.14, 0.68, 0.7],
        [5, 0.72, -6, 2.5, 0.15, 0.9],
      ]);
      batch(
        this.sustainable,
        "Sorted reusable resources",
        green,
        Array.from({ length: 12 }, (_, i) => [
          -7 + (i % 4) * 0.7,
          0.18 + Math.floor(i / 4) * 0.35,
          -7,
          0.6,
          0.32,
          0.6,
        ]),
      );
      batch(
        this.sustainable,
        "Shared energy solar roof",
        material(0x31536c, "sustainable"),
        [
          [-6, 4.2, -15, 5.7, 0.1, 4.5],
          [5.5, 5.2, -16, 6.6, 0.1, 4.5],
        ],
      );
      batch(this.detail, "Cargo cycles for local production", clean, [
        [1.5, 0.5, -6.8, 1.6, 0.45, 0.65],
        [1, 0.2, -6.8, 0.3, 0.4, 0.7],
        [2, 0.2, -6.8, 0.3, 0.4, 0.7],
      ]);
      this.sign("OFFICINA · RIUSO", -6, 3.3, -12.2);
      this.sign("PRODUZIONE LOCALE", 5.5, 3.3, -13.2);
    } else {
      batch(
        this.critical,
        "Closed gates dividing access to services",
        dark,
        Array.from({ length: 44 }, (_, i) => [
          -11 + i * 0.5,
          1.25,
          -7.6,
          0.055,
          2.5,
          0.07,
        ]),
      );
      batch(this.critical, "Fence rails", rust, [
        [0, 0.5, -7.6, 22, 0.07, 0.1],
        [0, 2.15, -7.6, 22, 0.07, 0.1],
      ]);
      batch(this.critical, "Inaccessible service steps", rust, [
        [5.5, 0.15, -12.6, 2.6, 0.3, 1],
        [5.5, 0.4, -13, 2.6, 0.5, 0.7],
      ]);
      batch(this.critical, "Isolated empty waiting places", dark, [
        [-4, 0.5, -5.7, 1.5, 0.12, 0.4],
      ]);
      batch(this.sustainable, "Step-free service access", clean, [
        [5.5, 0.12, -12, 2.6, 0.22, 3, 0, -0.05],
        [-6, 0.12, -12, 2.6, 0.22, 3],
      ]);
      batch(
        this.sustainable,
        "Accessible tactile paths",
        material(0xd9bd69, "sustainable"),
        [
          [0, 0.012, -6.5, 22, 0.015, 0.3],
          [-6, 0.012, -9, 0.3, 0.015, 5],
          [5.5, 0.012, -9, 0.3, 0.015, 5],
        ],
      );
      batch(this.sustainable, "Shared meeting tables", clean, [
        [-3, 0.75, -6, 1.7, 0.12, 1],
        [3, 0.75, -6, 1.7, 0.12, 1],
        [-3, 0.35, -6, 0.2, 0.7, 0.2],
        [3, 0.35, -6, 0.2, 0.7, 0.2],
      ]);
      batch(this.sustainable, "Open community gardens", green, [
        [-8, 0.32, -5.7, 2.5, 0.65, 1],
        [8, 0.32, -5.7, 2.5, 0.65, 1],
      ]);
      batch(
        this.detail,
        "Wheelchair wheels",
        material(0x3f4445, "sustainable"),
        [
          [1, 0.3, -6, 0.6, 0.6, 0.12],
          [1, 0.3, -6.55, 0.6, 0.6, 0.12],
        ],
        new THREE.CylinderGeometry(0.5, 0.5, 1, 12).rotateX(Math.PI / 2),
      );
      const chair = material(0x456d85, "sustainable");
      batch(this.detail, "Wheelchair seat and back", chair, [
        [1, 0.52, -6.25, 0.45, 0.1, 0.45],
        [0.78, 0.72, -6.25, 0.1, 0.5, 0.45],
      ]);
      this.sign("BIBLIOTECA · INCONTRO", -6, 3.3, -12.2);
      this.sign("SALUTE DI QUARTIERE", 5.5, 3.3, -13.2);
    }
    const bodies = material(0x748699, "sustainable");
    batch(
      this.detail,
      "People sharing the square",
      bodies,
      [-4.7, -3.8, 2.5, 3.5, 6.2, -7.2].map((x, i) => [
        x,
        0.85,
        -5.6 - (i % 2) * 0.5,
        0.27,
        1,
        0.23,
      ]),
      new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
    );
    batch(
      this.detail,
      "People heads",
      material(0xae8e72, "sustainable"),
      [-4.7, -3.8, 2.5, 3.5, 6.2, -7.2].map((x, i) => [
        x,
        1.48,
        -5.6 - (i % 2) * 0.5,
        0.24,
        0.24,
        0.24,
      ]),
      new THREE.SphereGeometry(0.5, 8, 6),
    );
    this.setFuture(0);
  }
  private sign(text: string, x: number, y: number, z: number) {
    if (typeof document === "undefined") return;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#dedacb";
    ctx.fillRect(0, 0, 1024, 128);
    ctx.fillStyle = "#283e43";
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, 512, 82);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.MeshStandardMaterial({ map, roughness: 0.9 });
    this.materials.add(m);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.625), m);
    mesh.position.set(x, y, z);
    mesh.name = text;
    this.root.add(mesh);
    this.labels.push(mesh);
  }
  async preload() {
    const assets =
      this.theme === "economic"
        ? [
            {
              path: "industrial/building-h.glb",
              width: 6,
              positions: [[-6, 0, -15]],
              replace: true,
            },
            {
              path: "industrial/solar-panel-flat.glb",
              width: 1.6,
              positions: [
                [-6, 4.45, -15],
                [-4, 4.45, -15],
              ],
              replace: false,
            },
          ]
        : [
            {
              path: "commercial/building-e.glb",
              width: 7,
              positions: [
                [-6, 0, -15],
                [5.5, 0, -16],
              ],
              replace: true,
            },
            {
              path: "furniture/bench.glb",
              width: 1.6,
              positions: [
                [-8, 0, -5.2],
                [8, 0, -5.2],
              ],
              replace: false,
            },
          ];
    for (const asset of assets) {
      try {
        const gltf = await new GLTFLoader().loadAsync(
          `/scenarios/kenney/${asset.path}`,
        );
        if (this.disposed) {
          this.release(gltf.scene);
          continue;
        }
        gltf.scene.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(gltf.scene),
          center = bounds.getCenter(new THREE.Vector3());
        const size = bounds.getSize(new THREE.Vector3());
        const scale = asset.width / size.x;
        // Pack units differ: keep street furniture human-sized and the factory
        // roof flush with the authored solar canopy instead of floating below it.
        const furniture = asset.path === "furniture/bench.glb";
        const scaleY = furniture
          ? scale / 2
          : asset.path === "industrial/building-h.glb"
            ? 4 / size.y
            : scale;
        const scaleZ = furniture ? scale / 2 : scale;
        const normalize = new THREE.Matrix4()
          .makeScale(scale, scaleY, scaleZ)
          .multiply(
            new THREE.Matrix4().makeTranslation(
              -center.x,
              -bounds.min.y,
              -center.z,
            ),
          );
        const group = asset.replace ? this.root : this.sustainable;
        gltf.scene.traverse((obj) => {
          if (!(obj instanceof THREE.Mesh)) return;
          const original = (
            Array.isArray(obj.material) ? obj.material[0] : obj.material
          ) as THREE.MeshStandardMaterial;
          const m = new THREE.MeshStandardMaterial({
            color: original.color,
            map: original.map,
            roughness: 0.8,
          });
          if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
          if (!asset.replace) m.userData.futureFade = "sustainable";
          this.materials.add(m);
          const mesh = new THREE.InstancedMesh(
            obj.geometry,
            m,
            asset.positions.length,
          );
          mesh.name = `Kenney ${asset.path}`;
          asset.positions.forEach((p, i) => {
            // Building entrances face -Z in the source: rotate to face the window.
            const pose = new THREE.Matrix4().makeTranslation(p[0], p[1], p[2]);
            if (asset.replace)
              pose.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
            mesh.setMatrixAt(
              i,
              pose.multiply(normalize).multiply(obj.matrixWorld),
            );
          });
          mesh.computeBoundingSphere();
          group.add(mesh);
          original.dispose();
        });
        // Keep the second economic shell until a second workshop is authored.
        if (asset.replace) {
          const shells = this.shells.children[0] as THREE.InstancedMesh;
          if (this.theme === "social") this.shells.visible = false;
          else {
            this.dummy.position.set(5.5, 2.5, -16);
            this.dummy.scale.set(7, 5, 5);
            this.dummy.rotation.set(0, 0, 0);
            this.dummy.updateMatrix();
            shells.setMatrixAt(0, this.dummy.matrix);
            shells.count = 1;
            shells.instanceMatrix.needsUpdate = true;
          }
        }
        this.assetCount++;
      } catch {
        /* Local procedural structures remain fully usable offline. */
      }
    }
  }
  setFuture(value: number) {
    this.future = THREE.MathUtils.clamp(value, 0, 1);
    this.critical.visible = this.future < 0.999;
    this.sustainable.visible = this.future > 0.002;
    this.facade.color
      .set(0x68675f)
      .lerp(new THREE.Color(0xb9c3b5), this.future);
    this.labels.forEach((label) =>
      (label.material as THREE.MeshStandardMaterial).color.setScalar(
        0.4 + this.future * 0.6,
      ),
    );
  }
  setQuality(low: boolean) {
    this.detail.visible = !low;
  }
  update() {
    /* Static districts preserve budget for speech and head tracking. */
  }
  private release(root: THREE.Object3D) {
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        for (const m of Array.isArray(obj.material)
          ? obj.material
          : [obj.material]) {
          m.map?.dispose();
          m.dispose();
        }
      }
    });
  }
  dispose() {
    this.disposed = true;
  }
}
