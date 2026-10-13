import { cityRoutes, plannedCityBuildings } from "./CityPlan";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import type { Quality } from "./performance";
import { CityTransformationEngine } from "./CityTransformationEngine";
import { deriveCity, type CityState } from "../decision/DecisionEngine";
import { scenario } from "../story/scenarios";
import { CityTransit } from "./CityTransit";
import { EnvironmentalDistrict } from "./EnvironmentalDistrict";
import { EnvironmentalStreetscape } from "./EnvironmentalStreetscape";
import { EnvironmentalPlanting } from "./EnvironmentalPlanting";
export type NarrativeObject = "energy" | "water" | "mobility";
export type CityBuilding = {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  layer: "near" | "middle" | "far";
};
export function cityLayout(): CityBuilding[] {
  return plannedCityBuildings();
}
export class FutureObservatory {
  readonly root = new THREE.Group();
  readonly city = new THREE.Group();
  readonly room = new THREE.Group();
  readonly companionBounds = new THREE.Box3(
    new THREE.Vector3(-2.5, 0, -2.5),
    new THREE.Vector3(2.5, 3, 2.5),
  );
  // Footprints in room-local coordinates, including furniture before it loads.
  readonly companionObstacles = [
    new THREE.Box3(
      new THREE.Vector3(-2.5, 0, -2.6),
      new THREE.Vector3(2.5, 1, -2.05),
    ),
    new THREE.Box3(
      new THREE.Vector3(-2.15, 0, 1.125),
      new THREE.Vector3(-0.55, 0.6, 1.675),
    ),
    new THREE.Box3(
      new THREE.Vector3(1.2, 0, 0.45),
      new THREE.Vector3(2.5, 1, 1.75),
    ),
  ];
  readonly district = new EnvironmentalDistrict();
  readonly planting = new EnvironmentalPlanting();
  readonly streetscape = new EnvironmentalStreetscape(cityLayout());
  private legacyTrees = new THREE.Group();
  private legacyArchitecture = new THREE.Group();
  readonly transformations = new CityTransformationEngine(cityLayout());
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
  readonly transit = new CityTransit();
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

  private cachedState = -1;
  private cachedOpacity = -1;
  private immersionOpacity = 0;
  assetStatus = "procedurale";
  private hdri?: THREE.Texture;
  private environment?: THREE.WebGLRenderTarget;
  constructor() {
    this.root.name = "Future Observatory";
    this.hemisphere.groundColor.set(0x777870);
    this.root.visible = false;
    this.root.add(this.room, this.city, this.directional, this.hemisphere);
    this.city.add(
      this.district.root,
      this.planting.root,
      this.streetscape.root,
      this.transformations.root,
      this.transit.root,
      this.legacyTrees,
      this.legacyArchitecture,
    );
    this.legacyTrees.visible = this.legacyArchitecture.visible = false;
    this.transit.setSmoothMotion(true);
    this.transit.setEnvironmentalLayout(true);
    this.district.critical.getObjectByName(
      "Rubble and abandoned infrastructure",
    )!.visible = false;
    this.district.critical.getObjectByName(
      "Collapsed roadside barriers",
    )!.visible = false;
    this.streetscape.textures.forEach((t) => this.textures.add(t));

    [
      ...this.transit.materials,
      ...this.planting.materials,
      ...this.streetscape.materials,
      ...this.district.materials,
      ...this.transformations.materials,
    ].forEach((m) => {
      this.materials.add(m);
      if (m instanceof THREE.MeshStandardMaterial) this.solids.push(m);
    });
    this.root.add(this.directional.target);
    this.directional.position.set(-8, 12, 8);
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
      uniforms: {
        amount: { value: 0 },
        opacity: { value: 0 },
        badSky: { value: new THREE.Color(0x9b8568) },
        time: { value: 0 },
      },
      vertexShader:
        "varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragmentShader:
        "varying vec3 vDirection; uniform float amount; uniform float opacity; uniform float time; uniform vec3 badSky; void main(){vec3 d=normalize(vDirection);float h=clamp(d.y,0.0,1.0);vec3 bad=mix(badSky,vec3(0.22,0.23,0.23),pow(h,0.6));vec3 good=mix(vec3(0.87,0.93,0.91),vec3(0.14,0.43,0.73),pow(h,0.6));float bands=sin(d.x*18.0+sin(d.z*13.0)+time*0.018)*sin(d.z*23.0+time*0.011);float cloud=smoothstep(0.28,0.7,bands)*smoothstep(0.08,0.3,h)*(1.0-smoothstep(0.6,0.95,h));vec3 color=mix(bad,good,amount);color=mix(color,mix(vec3(0.42,0.36,0.3),vec3(0.94,0.96,0.95),amount),cloud*0.32);gl_FragColor=vec4(color,opacity);}",
      transparent: true,
    });
    const skyMesh = new THREE.Mesh(
      new THREE.SphereGeometry(140, 24, 12),
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
    box(this.city, [150, 0.015, 6.0], [0, -0.085, -16.3], road);
    const lane = mat(0xc7bc96);
    const marks = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.2, 0.01, 0.08),
      lane,
      55,
    );
    for (let i = 0; i < 55; i++) {
      this.dummy.position.set(
        (i - 27) * 2.5,
        -0.07,
        (cityRoutes.cars[0] + cityRoutes.cars[1]) / 2,
      );
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
      (layer === "far"
        ? this.far
        : layer === "near"
          ? this.legacyArchitecture
          : this.city
      ).add(mesh);
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
    this.legacyArchitecture.add(windowCells);
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
      const column = (i % 15) - 7;
      const x = column * 3.7 + (column < 0 ? -2.8 : 2.8),
        z = i < 15 ? -7 : -16;
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
    this.legacyTrees.add(this.trunks, this.leaves, this.crowns);
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
        ((tree % 15) - 7) * 3.7 + (tree % 15 < 7 ? -2.8 : 2.8) + side * 0.26,
        1.55,
        tree < 15 ? -7 : -16,
      );
      this.dummy.rotation.set(0, 0, side * 0.65);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      branches.setMatrixAt(i, this.dummy.matrix);
    }
    branches.computeBoundingSphere();
    this.legacyTrees.add(branches);
    this.dummy.rotation.set(0, 0, 0);
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
    this.legacyArchitecture.add(bands);
    const accent = box(
      this.room,
      [3.8, 0.025, 0.04],
      [0, 2.75, -2.44],
      mat(0xf6e3bd),
    );
    (accent.material as THREE.MeshStandardMaterial).emissive.set(0x856f42);
    this.setOpacity(0);
    this.applyCityState(deriveCity([]));
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
        this.companionObstacles[2].union(
          new THREE.Box3()
            .setFromObject(this.table)
            .applyMatrix4(this.root.matrixWorld.clone().invert()),
        );
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
      this.assetStatus =
        loaded === 4
          ? "Poly Haven · PBR + glTF + HDRI"
          : `Asset ${loaded}/4 · fallback procedurale`;
    })();
    return this.loadPromise;
  }
  setOpacity(value: number) {
    this.immersionOpacity = value;
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
      m.userData.sceneOpacity = value * fade * (m.userData.baseOpacity ?? 1);
      const opacity =
        m.userData.sceneOpacity * (m.userData.interventionOpacity ?? 1);
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
  get districtAssetStatus() {
    return "30 interventi procedurali · geometrie condivise";
  }
  private appliedCityKey = "";
  applyCityState(state: CityState, channels = state.channels) {
    const key =
      state.active.join(",") +
      "|" +
      state.flags.join(",") +
      "|" +
      Object.values(channels)
        .map((v) => v.toFixed(4))
        .join(",");
    if (key === this.appliedCityKey) return;
    this.appliedCityKey = key;
    const air = channels.air;
    this.cachedState = air;
    this.sky.uniforms.amount.value = air;
    this.sky.uniforms.badSky.value.set(0x9b8568);
    this.district.setTraffic(air);
    this.district.sustainable.visible = false;
    this.planting.setFuture(0);
    this.streetscape.setCityEfficiency(channels.efficiency);
    this.transit.root.visible = state.active.includes("MOB_TRAM");
    this.transit.setFuture(state.flags.includes("R03") ? 0.75 : 0.4);
    this.energyObjects.visible = false;
    this.facades.forEach((m) =>
      m.color
        .set(0x999183)
        .lerp(new THREE.Color(0xb9c1b8), channels.efficiency),
    );
    this.directional.color.set(0xf0d4af).lerp(new THREE.Color(0xfff4dd), air);
    this.hemisphere.color.set(0x9a8d7e).lerp(new THREE.Color(0xb7d8eb), air);
    this.cachedOpacity = -1;
    this.setOpacity(this.immersionOpacity);
  }
  update(time: number) {
    if (!this.root.visible) return;
    this.sky.uniforms.time.value = time / 1000;
    if (this.district.root.visible) {
      this.district.update(time);
      this.planting.update(time);
    }
    this.transformations.update(time);
    this.transit.update(time);
  }
  setQuality(quality: Quality) {
    this.far.visible = quality !== "low";

    this.district.setQuality(quality === "low");
    this.planting.setQuality(quality === "low");
    this.streetscape.setQuality(quality === "low");

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
      ? scenario().questions[this.targets.indexOf(hit.object as THREE.Mesh)]
      : undefined;
  }
  narrativePointer(x: number, y: number, camera: THREE.Camera) {
    this.caster.setFromCamera(new THREE.Vector2(x, y), camera);
    return this.narrativeRay(this.caster.ray);
  }
  get fogColor() {
    return new THREE.Color(0x9b8568).lerp(
      new THREE.Color(0xb5cfda),
      Math.max(0, this.cachedState),
    );
  }
  get fogDensity() {
    const [bad, good] = scenario().fog;
    return THREE.MathUtils.lerp(bad, good, Math.max(0, this.cachedState));
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
    this.transit.dispose();
    this.streetscape.dispose();
    this.transformations.dispose();
    this.disposeObject(this.root);
    this.textures.forEach((t) => t.dispose());
    this.environment?.dispose();
    this.hdri?.dispose();
    this.root.removeFromParent();
  }
}
