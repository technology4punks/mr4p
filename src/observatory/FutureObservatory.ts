import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import type { Quality } from "./performance";
import { EnvironmentalDistrict } from "./EnvironmentalDistrict";
export type NarrativeObject = "energy" | "water" | "mobility";
const messages: Record<NarrativeObject, string> = {
  energy:
    "Tetti solari e riuso degli edifici: quali scelte energetiche conterebbero per te?",
  water:
    "Acqua e verde urbano: come cambierebbe una città che trattiene e riutilizza l’acqua?",
  mobility:
    "Il tram collega i quartieri. Come ti muoveresti in una città con meno traffico?",
};
export type CityBuilding = {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  layer: "near" | "middle" | "far";
};
export function cityLayout(): CityBuilding[] {
  const result: CityBuilding[] = [];
  let seed = 2050;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (const [count, zBase, layer] of [
    [18, 12, "near"],
    [32, 38, "middle"],
    [38, 72, "far"],
  ] as const) {
    for (let i = 0; i < count; i++)
      result.push({
        x: (i - count / 2) * 4.8 + (random() - 0.5) * 2,
        z: -zBase - random() * (layer === "near" ? 12 : 20),
        width: 2 + random() * 2,
        depth: 2.5 + random() * 3,
        height: 3 + random() * (layer === "far" ? 15 : 10),
        layer,
      });
  }
  return result;
}
export class FutureObservatory {
  readonly root = new THREE.Group();
  readonly city = new THREE.Group();
  readonly room = new THREE.Group();
  readonly companionBounds = new THREE.Box3(
    new THREE.Vector3(-2.5, 0, -2.5), new THREE.Vector3(2.5, 3, 2.5),
  );
  // Footprints in room-local coordinates, including furniture before it loads.
  readonly companionObstacles = [
    new THREE.Box3(new THREE.Vector3(-2.5, 0, -2.6), new THREE.Vector3(2.5, 1, -2.05)),
    new THREE.Box3(new THREE.Vector3(-2.15, 0, 1.125), new THREE.Vector3(-0.55, 0.6, 1.675)),
    new THREE.Box3(new THREE.Vector3(1.2, 0, 0.45), new THREE.Vector3(2.5, 1, 1.75)),
  ];
  readonly district = new EnvironmentalDistrict();
  readonly directional = new THREE.DirectionalLight(0xffd9ad, 2.2);
  readonly hemisphere = new THREE.HemisphereLight(0xabc8d8, 0x766956, 1.3);
  private materials = new Set<THREE.Material>();
  private textures = new Set<THREE.Texture>();
  private solids: THREE.MeshStandardMaterial[] = [];
  private leaves: THREE.InstancedMesh;
  private trunks: THREE.InstancedMesh;
  private solar: THREE.InstancedMesh;
  private facades: THREE.MeshStandardMaterial[] = [];
  private far = new THREE.Group();
  private details = new THREE.Group();
  private energyObjects = new THREE.Group();
  private sky: THREE.ShaderMaterial;
  private sun = new THREE.Mesh();
  private targets: THREE.Mesh[] = [];
  private tram: THREE.Group;
  private disposed = false;
  private loadPromise?: Promise<void>;
  private table?: THREE.Group;
  private floorMaterial: THREE.MeshStandardMaterial;
  private stoneMaterial: THREE.MeshStandardMaterial;
  private leavesMatrix: THREE.Matrix4[] = [];
  private crowns: THREE.InstancedMesh;
  private crownsMatrix: THREE.Matrix4[] = [];
  private solarMatrix: THREE.Matrix4[] = [];
  private dummy = new THREE.Object3D();
  private caster = new THREE.Raycaster();
  private profile: Quality = "high";
  private cachedState = -1;
  private cachedOpacity = -1;
  assetStatus = "procedurale";
  private hdri?: THREE.Texture;
  private environment?: THREE.WebGLRenderTarget;
  constructor() {
    this.root.name = "Future Observatory";
    this.root.visible = false;
    this.root.add(this.room, this.city, this.directional, this.hemisphere);
    this.city.add(this.district.root);
    this.district.materials.forEach((m) => {
      this.materials.add(m);
      if (m instanceof THREE.MeshStandardMaterial) this.solids.push(m);
    });
    this.root.add(this.directional.target);
    this.directional.position.set(-8, 12, -12);
    const mat = (color: number, roughness = 0.75, metalness = 0) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
      this.materials.add(m);
      this.solids.push(m);
      return m;
    };
    const plaster = mat(0xd9d4c9),
      floor = mat(0x9b7953),
      metal = mat(0x26383d, 0.28, 0.7),
      stone = mat(0xaaa697);
    this.floorMaterial = floor;
    this.stoneMaterial = stone;
    const box = (
      parent: THREE.Object3D,
      size: number[],
      at: number[],
      material: THREE.Material,
    ) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(...(size as [number, number, number])),
        material,
      );
      mesh.position.set(...(at as [number, number, number]));
      parent.add(mesh);
      return mesh;
    };
    box(this.room, [5.16, 0.12, 5.16], [0, -0.06, 0], floor);
    box(this.room, [5.16, 0.12, 5.16], [0, 3.05, 0], plaster);
    box(this.room, [0.16, 3.1, 5.16], [-2.58, 1.5, 0], plaster);
    box(this.room, [0.16, 3.1, 5.16], [2.58, 1.5, 0], plaster);
    box(this.room, [5.16, 3.1, 0.16], [0, 1.5, 2.58], plaster);
    // Actual opening, not a plane photograph. City remains in world space beyond it.
    box(this.room, [5.16, 0.7, 0.16], [0, 0.35, -2.58], stone);
    box(this.room, [5.16, 0.4, 0.16], [0, 2.85, -2.58], plaster);
    for (const x of [-2.46, 2.46])
      box(this.room, [0.18, 2, 0.25], [x, 1.65, -2.5], metal);
    for (const y of [0.74, 2.6])
      box(this.room, [4.8, 0.055, 0.2], [0, y, -2.5], metal);
    box(this.room, [0.045, 1.85, 0.07], [0, 1.66, -2.49], metal);
    box(this.room, [4.8, 0.12, 0.5], [0, 0.72, -2.34], stone);
    box(this.room, [1.6, 0.12, 0.55], [-1.35, 0.52, 1.4], floor);
    for (const x of [-1.95, -0.75])
      box(this.room, [0.08, 0.5, 0.4], [x, 0.25, 1.4], metal);
    for (const [id, x, z, color] of [
      ["energy", -1.6, -2.1, 0xe7bf65],
      ["water", 0, -2.1, 0x67cbd4],
      ["mobility", 1.6, -2.1, 0x9bca92],
    ] as const) {
      const object = box(
        this.room,
        [0.22, 0.18, 0.22],
        [x, 0.93, z],
        mat(color, 0.25, 0.5),
      );
      object.userData.narrative = id;
      this.targets.push(object);
      const pedestal = box(this.room, [0.32, 0.08, 0.32], [x, 0.8, z], metal);
      pedestal.name = id + "-pedestal";
    }
    this.sky = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { amount: { value: 0 }, opacity: { value: 0 } },
      vertexShader:
        "varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragmentShader:
        "varying vec3 vDirection; uniform float amount; uniform float opacity; void main(){float h=clamp(normalize(vDirection).y,0.0,1.0);vec3 bad=mix(vec3(0.62,0.37,0.17),vec3(0.22,0.23,0.23),pow(h,0.6));vec3 good=mix(vec3(0.87,0.93,0.91),vec3(0.14,0.43,0.73),pow(h,0.6));gl_FragColor=vec4(mix(bad,good,amount),opacity);}",
      transparent: true,
    });
    const skyMesh = new THREE.Mesh(
      new THREE.SphereGeometry(110, 24, 12),
      this.sky,
    );
    skyMesh.renderOrder = -10;
    this.root.add(skyMesh);
    this.materials.add(this.sky);
    this.sun = new THREE.Mesh(
      new THREE.SphereGeometry(3, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe7ba }),
    );
    this.sun.position.set(-35, 28, -85);
    this.root.add(this.sun);
    this.materials.add(this.sun.material as THREE.Material);
    const ground = mat(0x655f54),
      road = mat(0x3e4346),
      glass = mat(0x52666b, 0.25, 0.55);
    box(this.city, [170, 0.12, 115], [0, -0.16, -60], ground);
    box(this.city, [150, 0.015, 3.8], [0, -0.085, -10], road);
    const lane = mat(0xc7bc96);
    const marks = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.2, 0.01, 0.08),
      lane,
      55,
    );
    for (let i = 0; i < 55; i++) {
      this.dummy.position.set((i - 27) * 2.5, -0.07, -10);
      this.dummy.updateMatrix();
      marks.setMatrixAt(i, this.dummy.matrix);
    }
    marks.computeBoundingSphere();
    this.city.add(marks);
    this.city.add(this.far, this.details, this.energyObjects);
    const layout = cityLayout();
    for (const layer of ["near", "middle", "far"] as const) {
      const buildings = layout.filter((b) => b.layer === layer);
      const m = mat(layer === "far" ? 0x7a7770 : 0x999183, 0.82);
      this.facades.push(m);
      const mesh = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 1, 1),
        m,
        buildings.length,
      );
      buildings.forEach((b, i) => {
        this.dummy.position.set(b.x, b.height / 2, b.z);
        this.dummy.scale.set(b.width, b.height, b.depth);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
      });
      mesh.computeBoundingSphere();
      (layer === "far" ? this.far : this.city).add(mesh);
    }
    const nearby = layout.filter((b) => b.layer === "near");
    const windowCells = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 0.03),
      glass,
      nearby.length * 20,
    );
    let n = 0;
    nearby.forEach((b) => {
      for (let y = 0; y < 5; y++)
        for (let x = 0; x < 4; x++) {
          this.dummy.position.set(
            b.x + ((x - 1.5) * b.width) / 4,
            (b.height * (y + 0.5)) / 5,
            b.z + b.depth / 2 + 0.018,
          );
          this.dummy.scale.set(b.width / 5, b.height / 9, 1);
          this.dummy.updateMatrix();
          windowCells.setMatrixAt(n++, this.dummy.matrix);
        }
    });
    windowCells.computeBoundingSphere();
    this.details.add(windowCells);
    const panelMaterial = mat(0x15344d, 0.2, 0.6);
    this.solar = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.2, 0.05, 0.8),
      panelMaterial,
      nearby.length,
    );
    nearby.forEach((b, i) => {
      this.dummy.position.set(b.x, b.height + 0.15, b.z);
      this.dummy.rotation.x = 0.2;
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.solar.setMatrixAt(i, this.dummy.matrix);
      this.solarMatrix.push(this.dummy.matrix.clone());
    });
    this.solar.computeBoundingSphere();
    this.energyObjects.add(this.solar);
    this.dummy.rotation.set(0, 0, 0);
    const trunk = mat(0x60513d),
      foliage = mat(0x646148);
    this.facades.push(foliage);
    const park = mat(0x7c715d);
    this.facades.push(park);
    box(this.city, [55, 0.015, 1.8], [0, -0.07, -7], park);
    box(this.city, [2.1, 0.18, 1.2], [-3, 0.02, -6.2], stone);
    const water = mat(0x8c7356, 0.85);
    this.facades.push(water);
    box(this.city, [1.8, 0.025, 0.9], [-3, 0.12, -6.2], water);
    this.trunks = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.09, 0.14, 1.6, 6),
      trunk,
      30,
    );
    this.leaves = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.9, 12, 8),
      foliage,
      30,
    );
    this.leaves.name = "Street tree crowns";
    this.crowns = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.7, 10, 7),
      foliage,
      60,
    );
    this.crowns.name = "Layered tree foliage";
    for (let i = 0; i < 30; i++) {
      const x = ((i % 15) - 7) * 3.7,
        z = i < 15 ? -7 : -13;
      this.dummy.position.set(x, 0.8, z);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.trunks.setMatrixAt(i, this.dummy.matrix);
      this.dummy.position.y = 2.2 + (i % 3) * 0.12;
      this.dummy.scale.set(1 + (i % 4) * 0.06, 1.25, 0.85 + (i % 3) * 0.1);
      this.dummy.updateMatrix();
      this.leaves.setMatrixAt(i, this.dummy.matrix);
      this.leavesMatrix.push(this.dummy.matrix.clone());
      for (let j = 0; j < 2; j++) {
        this.dummy.position.set(
          x + (j ? 0.52 : -0.55),
          1.85 + (i % 3) * 0.14,
          z + (j ? 0.3 : -0.22),
        );
        this.dummy.scale.set(0.85, 1.05, 0.8);
        this.dummy.updateMatrix();
        this.crowns.setMatrixAt(i * 2 + j, this.dummy.matrix);
        this.crownsMatrix.push(this.dummy.matrix.clone());
      }
    }
    this.trunks.computeBoundingSphere();
    this.leaves.computeBoundingSphere();
    this.crowns.computeBoundingSphere();
    this.city.add(this.trunks, this.leaves, this.crowns);
    // Branches remain exposed in the critical future and are covered by new foliage.
    const branches = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.025, 0.055, 1, 5),
      trunk,
      60,
    );
    branches.name = "Bare tree branches";
    for (let i = 0; i < 60; i++) {
      const tree = Math.floor(i / 2),
        side = i % 2 ? 1 : -1;
      this.dummy.position.set(
        ((tree % 15) - 7) * 3.7 + side * 0.26,
        1.55,
        tree < 15 ? -7 : -13,
      );
      this.dummy.rotation.set(0, 0, side * 0.65);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      branches.setMatrixAt(i, this.dummy.matrix);
    }
    branches.computeBoundingSphere();
    this.city.add(branches);
    this.dummy.rotation.set(0, 0, 0);
    this.tram = new THREE.Group();
    box(this.tram, [5.5, 1.1, 1], [0, 0.65, 0], mat(0xa9cdb7, 0.35, 0.3));
    box(this.tram, [5.2, 0.5, 1.02], [0, 0.85, 0], glass);
    this.tram.position.set(0, 0, -10);
    this.energyObjects.add(this.tram);
    // Deteriorated facade bands gradually become pale efficient envelopes.
    const cracks = mat(0x4a423b);
    cracks.userData.futureFade = "critical";
    const bands = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 0.07, 0.03),
      cracks,
      nearby.length * 2,
    );
    nearby.forEach((b, i) => {
      for (let j = 0; j < 2; j++) {
        this.dummy.position.set(
          b.x,
          b.height * (0.3 + j * 0.35),
          b.z + b.depth / 2 + 0.04,
        );
        this.dummy.scale.set(b.width, 1, 1);
        this.dummy.updateMatrix();
        bands.setMatrixAt(i * 2 + j, this.dummy.matrix);
      }
    });
    bands.computeBoundingSphere();
    this.details.add(bands);
    const accent = box(
      this.room,
      [3.8, 0.025, 0.04],
      [0, 2.75, -2.44],
      mat(0xf6e3bd),
    );
    (accent.material as THREE.MeshStandardMaterial).emissive.set(0x856f42);
    this.setOpacity(0);
    this.setFuture(0);
  }
  async preload(renderer: THREE.WebGLRenderer) {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = (async () => {
      let loaded = 0;
      const loader = new THREE.TextureLoader();
      for (const [asset, material, repeat] of [
        ["wood_floor_deck", this.floorMaterial, 2],
        ["concrete_floor_02", this.stoneMaterial, 2],
      ] as const) {
        try {
          const maps = await Promise.all(
            ["diff", "normal", "rough"].map((id) =>
              loader.loadAsync(`/observatory/${asset}/${id}.jpg`),
            ),
          );
          if (this.disposed) {
            maps.forEach((t) => t.dispose());
            return;
          }
          maps.forEach((t) => {
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.repeat.set(repeat, repeat);
            t.anisotropy = Math.min(
              4,
              renderer.capabilities.getMaxAnisotropy(),
            );
            this.textures.add(t);
          });
          maps[0].colorSpace = THREE.SRGBColorSpace;
          const m = material;
          m.map = maps[0];
          m.normalMap = maps[1];
          m.roughnessMap = maps[2];
          m.normalScale.set(0.22, 0.22);
          m.color.set(0xffffff);
          m.needsUpdate = true;
          loaded++;
        } catch {
          /* PBR procedural materials remain usable offline. */
        }
      }
      try {
        const gltf = await new GLTFLoader().loadAsync(
          "/observatory/modern_coffee_table_01/table.gltf",
        );
        if (this.disposed) {
          this.disposeObject(gltf.scene);
          return;
        }
        this.table = gltf.scene;
        const bounds = new THREE.Box3().setFromObject(this.table);
        const size = bounds.getSize(new THREE.Vector3());
        this.table.scale.setScalar(0.9 / Math.max(size.x, size.z));
        this.table.position.set(1.85, -bounds.min.y * this.table.scale.x, 1.1);
        this.table.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            const ms = Array.isArray(obj.material)
              ? obj.material
              : [obj.material];
            ms.forEach((m) => {
              this.materials.add(m);
              if (m instanceof THREE.MeshStandardMaterial) {
                this.solids.push(m);
                for (const t of [
                  m.map,
                  m.normalMap,
                  m.roughnessMap,
                  m.metalnessMap,
                ])
                  if (t) this.textures.add(t);
              }
            });
          }
        });
        this.room.add(this.table);
        // Include the actual loaded footprint if it exceeds the reserved envelope.
        this.root.updateWorldMatrix(true, true);
        this.companionObstacles[2].union(new THREE.Box3().setFromObject(this.table)
          .applyMatrix4(this.root.matrixWorld.clone().invert()));
        loaded++;
      } catch {
        /* No visual or narrative dependency on external furniture. */
      }
      try {
        const hdr = await new RGBELoader().loadAsync(
          "/observatory/venice_sunset_1k.hdr",
        );
        if (this.disposed) {
          hdr.dispose();
          return;
        }
        this.hdri = hdr;
        const generator = new THREE.PMREMGenerator(renderer);
        this.environment = generator.fromEquirectangular(hdr);
        generator.dispose();
        this.solids.forEach((m) => {
          m.envMap = this.environment!.texture;
          m.envMapIntensity = 0.3;
          m.needsUpdate = true;
        });
        loaded++;
      } catch {
        /* The static sun/hemisphere lighting does not depend on HDRI. */
      }
      this.cachedOpacity = -1;
      this.setQuality(this.profile);
      this.assetStatus =
        loaded === 4
          ? "Poly Haven · PBR + glTF + HDRI"
          : `Asset ${loaded}/4 · fallback procedurale`;
    })();
    return this.loadPromise;
  }
  setOpacity(value: number) {
    if (Math.abs(value - this.cachedOpacity) < 0.002) return;
    this.cachedOpacity = value;
    this.root.visible = value > 0.002;
    this.materials.forEach((m) => {
      if (m === this.sky) return;
      const fade =
        m.userData.futureFade === "critical"
          ? 1 - Math.max(0, this.cachedState)
          : m.userData.futureFade === "sustainable"
            ? Math.max(0, this.cachedState)
            : 1;
      const opacity = value * fade * (m.userData.baseOpacity ?? 1);
      const transparent = opacity < 0.999;
      if (m.transparent !== transparent) {
        m.transparent = transparent;
        m.needsUpdate = true;
      }
      m.opacity = opacity;
      m.depthWrite = opacity > 0.98;
    });
    this.sky.uniforms.opacity.value = value;
    this.hemisphere.intensity =
      (1.05 + Math.max(0, this.cachedState) * 0.8) * value;
    this.directional.intensity =
      (1.7 + Math.max(0, this.cachedState) * 1.1) * value;
  }
  setFuture(amount: number) {
    if (Math.abs(amount - this.cachedState) < 0.001) return;
    this.cachedState = THREE.MathUtils.clamp(amount, 0, 1);
    amount = this.cachedState;
    this.district.setFuture(amount);
    this.crowns.visible = amount > 0.01;
    this.leaves.visible = amount > 0.001;
    const opacity = this.cachedOpacity;
    this.cachedOpacity = -1;
    this.setOpacity(Math.max(0, opacity));
    const bad = [0x625746, 0x706352, 0x61574c, 0x655039, 0x897044, 0x8c7356],
      good = [0xc1c5bc, 0xaabdb3, 0x7d939e, 0x467b3f, 0x617d50, 0x55858d];
    this.facades.forEach((m, i) =>
      m.color.set(bad[i]).lerp(new THREE.Color(good[i]), amount),
    );
    this.hemisphere.color.set(0x9a8d7e).lerp(new THREE.Color(0xb7d8eb), amount);
    this.hemisphere.intensity =
      (1.05 + amount * 0.8) * Math.max(0, this.cachedOpacity);
    this.directional.color
      .set(0xffc294)
      .lerp(new THREE.Color(0xfff4dd), amount);
    this.directional.intensity =
      (1.7 + amount * 1.1) * Math.max(0, this.cachedOpacity);
    this.sky.uniforms.amount.value = amount;
    this.energyObjects.visible = amount > 0.01;
    for (let i = 0; i < this.leaves.count; i++) {
      this.dummy.matrix.copy(this.leavesMatrix[i]);
      this.dummy.matrix.scale(
        new THREE.Vector3(
          0.025 + amount * 0.975,
          0.04 + amount * 0.96,
          0.025 + amount * 0.975,
        ),
      );
      this.leaves.setMatrixAt(i, this.dummy.matrix);
    }
    this.leaves.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < this.crowns.count; i++) {
      this.dummy.matrix.copy(this.crownsMatrix[i]);
      this.dummy.matrix.scale(
        new THREE.Vector3().setScalar(Math.max(0.001, amount)),
      );
      this.crowns.setMatrixAt(i, this.dummy.matrix);
    }
    this.crowns.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < this.solar.count; i++) {
      const matrix = this.solarMatrix[i]
        .clone()
        .scale(
          new THREE.Vector3(
            1,
            Math.max(0.001, amount),
            Math.max(0.001, amount),
          ),
        );
      this.solar.setMatrixAt(i, matrix);
    }
    this.solar.instanceMatrix.needsUpdate = true;
    this.tram.scale.setScalar(Math.max(0.001, amount));
  }
  update(time: number) {
    if (this.root.visible) this.district.update(time);
    if (this.energyObjects.visible)
      this.tram.position.x = Math.sin(time / 18000) * 15;
  }
  setQuality(quality: Quality) {
    this.far.visible = quality !== "low";
    this.profile = quality;
    this.district.setQuality(quality === "low");
    this.leaves.count = this.trunks.count = quality === "low" ? 15 : 30;
    this.crowns.count = quality === "low" ? 30 : 60;
    (
      this.city.getObjectByName("Bare tree branches") as THREE.InstancedMesh
    ).count = quality === "low" ? 30 : 60;
    this.details.visible = true;
    this.solids.forEach((m) => {
      m.envMapIntensity = quality === "low" ? 0 : 0.3;
      if (quality === "low") {
        m.envMap = null;
        m.normalMap = null;
        m.roughnessMap = null;
        m.needsUpdate = true;
      }
    });
  }
  narrativeRay(ray: THREE.Ray) {
    this.caster.ray.copy(ray);
    this.root.updateMatrixWorld(true);
    const hit = this.caster.intersectObjects(this.targets, false)[0];
    return hit
      ? messages[hit.object.userData.narrative as NarrativeObject]
      : undefined;
  }
  narrativePointer(x: number, y: number, camera: THREE.Camera) {
    this.caster.setFromCamera(new THREE.Vector2(x, y), camera);
    return this.narrativeRay(this.caster.ray);
  }
  get fogColor() {
    return new THREE.Color(0x997549).lerp(
      new THREE.Color(0xb5cfda),
      Math.max(0, this.cachedState),
    );
  }
  get fogDensity() {
    return 0.032 - Math.max(0, this.cachedState) * 0.0285;
  }
  private disposeObject(root: THREE.Object3D) {
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        for (const m of Array.isArray(obj.material)
          ? obj.material
          : [obj.material]) {
          if (m instanceof THREE.MeshStandardMaterial)
            for (const t of [
              m.map,
              m.normalMap,
              m.roughnessMap,
              m.metalnessMap,
            ])
              t?.dispose();
          m.dispose();
        }
      }
    });
  }
  dispose() {
    this.disposed = true;
    this.disposeObject(this.root);
    this.textures.forEach((t) => t.dispose());
    this.environment?.dispose();
    this.hdri?.dispose();
    this.root.removeFromParent();
  }
}
