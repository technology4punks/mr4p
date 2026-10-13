import {
  cityRoutes,
  cityParcels,
  boulevardTrees,
  corridorTrees,
  interventionPosition,
} from "./CityPlan.js";
import * as THREE from "three";
import { interventions, type Sector } from "../decision/catalog.js";
import { deriveCity, type CityState } from "../decision/DecisionEngine.js";
import { smoothTransition } from "./performance.js";
import { CycleTraffic } from "./CycleTraffic.js";
import type { CityBuilding } from "./FutureObservatory.js";
export const sectorPositions: Record<Sector, [number, number, number]> = {
  residential: [-7, 0, -24],
  mobility: [0, 0, -9],
  river: [-5, 0, -16],
  productive: [7, 0, -23],
  roofs: [0, 8, -27],
  periphery: [8, 0, -36],
};
/** Thirty authored, reusable layers on ONE city. No scene generation or network calls. */
export class CityTransformationEngine {
  readonly root = new THREE.Group();
  readonly layers = new Map<string, THREE.Group>();
  readonly materials = new Set<THREE.MeshStandardMaterial>();
  readonly cyclists = new CycleTraffic();
  state: CityState = deriveCity([]);
  private amounts = new Map<string, number>();
  private starts = new Map<string, number>();
  private startedAt = 0;
  private duration = 0;
  private cube = new THREE.BoxGeometry(1, 1, 1);
  private cylinder = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
  private crown = new THREE.IcosahedronGeometry(1, 1);
  private movers: {
    mesh: THREE.Object3D;
    id: string;
    index: number;
    type: string;
  }[] = [];
  private green: THREE.MeshStandardMaterial;
  private parkDry: THREE.MeshStandardMaterial;
  readonly relationLayers = new Map<string, THREE.Group>();
  private relationAmounts = new Map<string, number>();
  private relationStarts = new Map<string, number>();
  private channelStarts: CityState["channels"] = deriveCity([]).channels;
  readonly visualChannels: CityState["channels"] = {
    ...deriveCity([]).channels,
  };
  private fades = new Map<THREE.Group, THREE.MeshStandardMaterial[]>();
  private targetMark: THREE.Mesh;
  private markTime = 0;
  constructor(layout: CityBuilding[]) {
    this.root.name = "Cumulative environmental interventions";
    const mat = (color: number, metalness = 0) => {
      const m = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.72,
        metalness,
      });
      this.materials.add(m);
      return m;
    };
    const stone = mat(0xbbbcb2),
      dark = mat(0x314a50),
      wood = mat(0x9b7956),
      solar = mat(0x285777, 0.4),
      glass = mat(0x638c99, 0.3),
      water = mat(0x4c8e96),
      white = mat(0xe3e4d4);
    this.green = mat(0x70875b);
    this.parkDry = mat(0x70875b);
    const box = (
      g: THREE.Group,
      at: number[],
      scale: number[],
      m: THREE.MeshStandardMaterial,
      geo: THREE.BufferGeometry = this.cube,
    ) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(at[0], at[1], at[2]);
      mesh.scale.set(scale[0], scale[1], scale[2]);
      g.add(mesh);
      return mesh;
    };
    const tree = (g: THREE.Group, x: number, z: number, radius = 0.9) => {
      box(g, [x, 1, z], [0.16, 2, 0.16], wood, this.cylinder);
      box(g, [x, 2.6, z], [radius, 1.3, radius], this.green, this.crown);
    };
    const sign = (
      g: THREE.Group,
      text: string,
      x: number,
      y: number,
      z: number,
    ) => {
      if (typeof document === "undefined") return;
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 128;
      const c = canvas.getContext("2d");
      if (!c) return;
      c.fillStyle = "#243c42";
      c.fillRect(0, 0, 512, 128);
      c.fillStyle = "#eaf2e9";
      c.font = "500 35px sans-serif";
      c.textAlign = "center";
      c.fillText(text, 256, 78, 490);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const material = mat(0xffffff);
      material.map = texture;
      const plate = box(g, [x, y, z], [2.8, 0.7, 0.05], material);
      plate.userData.sign = text;
    };
    const building = (
      g: THREE.Group,
      label: string,
      x = 0,
      z = 0,
      height = 2.4,
    ) => {
      box(g, [x, height / 2, z], [3, height, 2.2], stone);
      box(g, [x, height * 0.65, z + 1.12], [2.5, 0.9, 0.07], glass);
      sign(g, label, x, height + 0.3, z + 1.2);
    };
    const vehicle = (
      g: THREE.Group,
      id: string,
      index: number,
      type: string,
    ) => {
      const v = new THREE.Group();
      box(
        v,
        [0, 0.55, 0],
        [type === "van" ? 2 : 1.2, type === "van" ? 0.95 : 0.35, 0.7],
        type === "van" ? white : wood,
      );
      box(v, [0, 0.25, 0], [0.8, 0.1, 0.5], dark);
      for (const x of [-0.4, 0.4])
        for (const z of [-0.35, 0.35])
          box(v, [x, 0.2, z], [0.24, 0.24, 0.14], dark, this.cylinder);
      if (type === "cargo") box(v, [0.2, 0.8, 0], [0.7, 0.5, 0.5], wood);
      if (type === "scooter") {
        v.scale.set(0.5, 1, 0.6);
        box(v, [0.5, 0.95, 0], [0.08, 1.3, 0.08], dark);
      }
      g.add(v);
      this.movers.push({ mesh: v, id, index, type });
    };
    const roofs = layout.filter((b) => b.layer === "near").slice(0, 5);
    for (const option of interventions) {
      const g = new THREE.Group();
      g.name = option.id;
      g.userData.intervention = option.id;
      g.userData.sector = option.sector;
      this.root.add(g);
      this.layers.set(option.id, g);
      this.amounts.set(option.id, 0);
      g.visible = false;
      const id = option.id;
      const parcel = cityParcels[id];
      if (parcel) {
        g.position.set(parcel.x, 0, parcel.z);
        g.userData.parcel = { ...parcel };
        // Each facility has its own lot; the existing street is never rebuilt over it.
        box(
          g,
          [0, -0.035, 0],
          [parcel.width - 0.15, 0.025, parcel.depth - 0.15],
          stone,
        );
      }
      if (id === "MOB_BIKE") {
        box(g, [0, -0.03, -9.8], [90, 0.025, 2.1], mat(0x4d877d));
        for (let i = 0; i < 24; i++)
          box(g, [-43 + i * 3.7, 0.08, -10.95], [0.1, 0.16, 0.1], white);
        g.add(this.cyclists.root);
        this.cyclists.materials.forEach((m) => this.materials.add(m));
      }
      // CityTransit owns the tracks, platform and shelter: never duplicate them.
      if (id === "MOB_TRAM") g.userData.infrastructureOwner = "CityTransit";
      if (id === "MOB_SCOOTER") {
        box(g, [20, 0.05, -21.4], [2, 0.1, 0.6], stone);
        for (let i = 0; i < 4; i++) vehicle(g, id, i, "scooter");
        sign(g, "Mobilità condivisa", 20, 1.1, -21);
      }
      if (id === "GREEN_TREES")
        for (const x of boulevardTrees) tree(g, x, cityRoutes.trees);
      if (id === "GREEN_PARK") {
        box(g, [0, 0.01, 0], [8.7, 0.05, 5.7], this.green);
        for (const z of [-2, 2])
          for (const x of [-3.1, -1.05, 1.05, 3.1]) tree(g, x, z, 0.75);
        box(g, [0, 0.047, 0], [8.3, 0.02, 0.7], stone);
        for (const x of [-2, 2])
          box(g, [x, 0.45, 0.85], [1.2, 0.12, 0.45], wood);
        sign(g, "Parco di quartiere", 0, 0.75, 2.8);
        g.traverse((o) => {
          if (
            o instanceof THREE.Mesh &&
            o.material === this.green &&
            o.position.x < 0
          )
            o.material = this.parkDry;
        });
      }
      if (
        [
          "GREEN_ROOFS",
          "ENERGY_ROOFTOP",
          "HEAT_REFLECT",
          "WATER_RAIN",
        ].includes(id)
      )
        for (const b of roofs) {
          if (id === "HEAT_REFLECT")
            box(
              g,
              [b.x, b.height + 0.161, b.z],
              [b.width - 0.4, 0.02, b.depth - 0.4],
              white,
            );
          if (id === "GREEN_ROOFS")
            box(
              g,
              [b.x - 1, b.height + 0.25, b.z - 0.9],
              [1.5, 0.12, 2],
              this.green,
            );
          if (id === "ENERGY_ROOFTOP")
            box(
              g,
              [b.x + 1.05, b.height + 0.25, b.z - 0.9],
              [1.4, 0.1, 1.8],
              solar,
            );
          if (id === "WATER_RAIN")
            box(
              g,
              [b.x + 1.05, b.height + 0.52, b.z + 1.4],
              [0.8, 0.6, 0.8],
              water,
              this.cylinder,
            );
        }
      if (id === "ENERGY_SOLAR_FARM") {
        for (let row = 0; row < 4; row++)
          for (let col = 0; col < 3; col++) {
            const x = (col - 1) * 1.9,
              z = (row - 1.5) * 2.25;
            box(g, [x, 0.35, z], [0.09, 0.7, 0.09], dark);
            box(g, [x, 0.77, z], [1.55, 0.12, 1.8], solar).rotation.x = -0.2;
          }
        sign(g, "Campo fotovoltaico", 0, 0.6, 4.7);
      }
      if (id === "ENERGY_COMMUNITY") {
        for (const x of [-1.5, 0, 1.5]) {
          box(g, [x, 0.65, 0], [0.8, 1.3, 0.75], white);
          box(g, [x, 1.35, 0], [1, 0.07, 1], solar);
        }
        sign(g, "Energia condivisa", 0, 1.8, 1.8);
      }
      if (id === "BUILD_NEW") {
        building(g, "Nuovi edifici efficienti", 0, 0, 4.2);
        for (const x of [-2.6, 2.6])
          box(g, [x, 0.18, 0], [0.55, 0.3, 2], this.green);
      }
      if (id === "BUILD_RETROFIT" || id === "BUILD_PASSIVE")
        for (const b of roofs.slice(0, 3)) {
          for (let k = 0; k < 4; k++)
            box(
              g,
              [
                b.x,
                b.height * (0.25 + k * 0.16),
                b.z + b.depth / 2 + (id === "BUILD_PASSIVE" ? 0.55 : 0.13),
              ],
              [
                b.width * 0.9,
                id === "BUILD_PASSIVE" ? 0.08 : 0.4,
                id === "BUILD_PASSIVE" ? 0.55 : 0.13,
              ],
              id === "BUILD_PASSIVE" ? wood : white,
            );
        }
      if (id === "WATER_LEAKS") {
        for (const x of [-14, -7, 0])
          box(g, [x, -0.065, -19.35], [0.6, 0.025, 0.5], water);
        sign(g, "Rete idrica riparata", -17, 0.8, -21);
      }
      if (id === "WATER_REUSE") {
        building(g, "Acqua trattata", -1.4, 0, 1.6);
        for (const z of [-1.3, 1.3])
          box(g, [1.6, 0.7, z], [1.1, 1.4, 1.1], water, this.cylinder);
      }
      if (id === "HEAT_SHADE")
        for (const x of [-22, 22]) {
          box(g, [x, 2.1, cityRoutes.trees], [3.4, 0.12, 1], white);
          for (const dx of [-1.5, 1.5])
            box(g, [x + dx, 1, cityRoutes.trees], [0.08, 2, 0.08], dark);
        }
      if (id === "HEAT_DISTRICT") {
        building(g, "Raffrescamento", 0, -0.5, 1.8);
        for (const x of [-0.8, 0, 0.8])
          box(g, [x, 2, -0.5], [0.6, 0.35, 0.6], dark, this.cylinder);
      }
      if (id === "WASTE_REUSE") {
        building(g, "Riparazione e riuso", 0, -0.4);
        for (const x of [-1, 0, 1])
          box(g, [x, 0.3, 1.5], [0.4, 0.5, 0.45], wood);
      }
      if (id === "WASTE_RECYCLE") {
        building(g, "Recupero materiali", 0, -0.4, 2.6);
        for (let i = 0; i < 4; i++)
          box(
            g,
            [-1.5 + i, 0.5, 1.7],
            [0.65, 1, 0.65],
            mat([0x668f91, 0xc3ad6d, 0x9392aa, 0x8b9c68][i]),
          );
      }
      if (id === "WASTE_ENERGY") {
        building(g, "Trattamento del residuo", 0, 0, 3);
        box(g, [2, 2.5, -1], [0.4, 5, 0.4], stone, this.cylinder);
        sign(g, "Emissioni da controllare", 2, 1.3, 1.6);
      }
      if (id === "LOG_CARGO")
        for (let i = 0; i < 4; i++) vehicle(g, id, i, "cargo");
      if (id === "LOG_EV") {
        for (let i = 0; i < 3; i++) vehicle(g, id, i, "van");
        for (const x of [17.5, 19, 20.5])
          box(g, [x, 0.75, -21.4], [0.25, 1.5, 0.25], water);
      }
      if (id === "LOG_HUB") {
        building(g, "Microhub di quartiere", 0, -0.3, 1.8);
        box(g, [0, 0.01, 2], [5, 0.025, 1.2], mat(0x99a493));
      }
      if (id === "BIO_RIVER") {
        box(g, [-9, -0.01, -30], [14, 0.08, 0.8], water);
        for (let i = 0; i < 7; i++)
          box(
            g,
            [-15 + i * 2, 0.2, -30.75],
            [0.6, 0.4, 0.5],
            this.green,
            this.crown,
          );
      }
      if (id === "BIO_CORRIDORS") {
        for (const z of corridorTrees) tree(g, -0.8, z, 0.65);
        for (const [z, depth] of [
          [-26.5, 5],
          [-46, 23],
        ])
          box(g, [-0.8, 0.005, z], [1.2, 0.04, depth], this.green);
      }
      if (id === "BIO_POLLINATORS")
        for (let row = 0; row < 4; row++)
          for (let col = 0; col < 3; col++) {
            const x = (col - 1) * 0.65,
              z = (row - 1.5) * 1.05;
            box(g, [x, 0.12, z], [0.5, 0.2, 0.7], this.green);
            box(
              g,
              [x, 0.3, z],
              [0.15, 0.16, 0.15],
              mat((row + col) % 2 ? 0xcfbe7a : 0xa995b1),
              this.crown,
            );
          }
      if (id === "FOOD_GARDENS") {
        for (const z of [-1.6, 1.6])
          for (const x of [-2.4, 0, 2.4]) {
            box(g, [x, 0.16, z], [1.5, 0.3, 2], wood);
            box(g, [x, 0.4, z], [1.2, 0.3, 1.7], this.green);
          }
        sign(g, "Orti condivisi", 0, 0.8, 3.2);
      }
      if (id === "FOOD_VERTICAL") {
        building(g, "Serra indoor", 0, -0.6, 5);
        for (let i = 0; i < 5; i++)
          box(g, [0, 1 + i * 0.8, 0.55], [2.7, 0.15, 0.05], this.green);
      }
      if (id === "FOOD_RECOVERY") {
        building(g, "Recupero eccedenze", 0, -0.4, 1.7);
        for (const x of [-2, 0, 2]) {
          box(g, [x, 1.6, 1.7], [1.4, 0.1, 1.2], white);
          box(g, [x, 0.4, 1.7], [1.1, 0.8, 0.6], wood);
        }
      }
    }
    // Authored relation overlays, also recomputed on revision. Small pipe/cable
    // routes and restored details make the narrative's dependencies observable.
    const relation = (id: string) => {
      const g = new THREE.Group();
      g.name = id;
      g.visible = false;
      this.root.add(g);
      this.relationLayers.set(id, g);
      this.relationAmounts.set(id, 0);
      return g;
    };
    for (const id of ["R01", "R03", "R06", "R08", "R09", "R10", "R11"]) {
      const g = relation(id);
      if (id === "R01")
        for (let i = 0; i < 5; i++)
          box(g, [-17 + i * 0.55, 0.08, -25], [0.48, 0.06, 0.08], water);
      if (id === "R03") {
        box(g, [0, 3.1, cityRoutes.tram], [85, 0.025, 0.025], dark);
        // Offset poles from tram vehicles and platform, shared cable on top.
        for (const x of [-24, 0, 24])
          box(g, [x, 1.55, cityRoutes.tram - 0.95], [0.065, 3.1, 0.065], dark);
        sign(
          g,
          "Rete · contributo rinnovabile",
          24,
          2.5,
          cityRoutes.tram - 0.95,
        );
      }
      if (id === "R06")
        for (let i = 0; i < 4; i++)
          box(
            g,
            [-5 + i * 0.9, 0.16, -29],
            [0.65, 0.3, 0.55],
            this.green,
            this.crown,
          );
      if (id === "R08") {
        box(g, [0.45, 0.005, -53], [0.65, 0.04, 10], this.green);
        for (const z of [-48.5, -51, -53.5, -56]) tree(g, 0.45, z, 0.4);
      }
      if (id === "R09" || id === "R10") {
        const end = id === "R09" ? -51 : -39;
        for (let z = -27; z >= end; z -= 1.4)
          box(g, [15.5, 0.035, z], [0.09, 0.04, 1.1], solar);
        const p = cityParcels[id === "R09" ? "FOOD_VERTICAL" : "HEAT_DISTRICT"];
        sign(
          g,
          id === "R09"
            ? "Serra · domanda elettrica"
            : "Raffrescamento · domanda elettrica",
          p.x,
          1,
          p.z + 2.9,
        );
      }
      if (id === "R11") {
        const p = cityParcels.BUILD_NEW;
        box(g, [p.x, 1.05, p.z + 1.24], [2.7, 0.3, 0.12], wood);
        sign(g, "Materiali recuperati · idoneità", p.x, 0.6, p.z + 2.7);
      }
    }
    for (const g of [
      ...this.layers.values(),
      ...this.relationLayers.values(),
    ]) {
      // Existing facades/roofs and overhead infrastructure stay at their real
      // elevation throughout the reveal; scaling world Y would pass through them.
      if (
        [
          "GREEN_ROOFS",
          "ENERGY_ROOFTOP",
          "WATER_RAIN",
          "HEAT_REFLECT",
          "BUILD_RETROFIT",
          "BUILD_PASSIVE",
          "R03",
        ].includes(g.name)
      ) {
        const clones = new Map<
          THREE.MeshStandardMaterial,
          THREE.MeshStandardMaterial
        >();
        g.traverse((object) => {
          if (
            !(object instanceof THREE.Mesh) ||
            !(object.material instanceof THREE.MeshStandardMaterial)
          )
            return;
          const original = object.material;
          let clone = clones.get(original);
          if (!clone) {
            clone = original.clone();
            clones.set(original, clone);
            this.materials.add(clone);
          }
          object.material = clone;
        });
        this.fades.set(g, [...clones.values()]);
      }
      const batches = new Map<string, THREE.Mesh[]>();
      for (const child of g.children) {
        if (
          !(child instanceof THREE.Mesh) ||
          child instanceof THREE.InstancedMesh ||
          Array.isArray(child.material)
        )
          continue;
        const key = child.geometry.uuid + child.material.uuid;
        const entries = batches.get(key) ?? [];
        entries.push(child);
        batches.set(key, entries);
      }
      for (const entries of batches.values()) {
        if (entries.length < 3) continue;
        const batch = new THREE.InstancedMesh(
          entries[0].geometry,
          entries[0].material,
          entries.length,
        );
        batch.name = g.name + " shared instances";
        entries.forEach((mesh, index) => {
          mesh.updateMatrix();
          batch.setMatrixAt(index, mesh.matrix);
          g.remove(mesh);
        });
        batch.computeBoundingSphere();
        g.add(batch);
      }
    }
    this.targetMark = new THREE.Mesh(
      new THREE.RingGeometry(1.4, 1.65, 32).rotateX(-Math.PI / 2),
      mat(0xd5bb7e),
    );
    this.targetMark.visible = false;
    this.root.add(this.targetMark);
  }
  apply(state: CityState, time: number, animate = true) {
    this.state = structuredClone(state);
    this.starts = new Map(this.amounts);
    this.relationStarts = new Map(this.relationAmounts);
    this.channelStarts = { ...this.visualChannels };
    this.startedAt = time;
    this.duration = animate ? 7000 : 0;
    this.markTime = time;
    const id = state.active.find((id) => (this.amounts.get(id) ?? 0) < 0.9);
    if (id) {
      this.targetMark.position.fromArray(interventionPosition(id));
      this.targetMark.position.y += 0.15;
    }
    this.update(time);
  }
  update(time: number) {
    const t = this.duration
      ? smoothTransition((time - this.startedAt) / 1000, this.duration / 1000)
      : 1;
    for (const [id, g] of this.layers) {
      const target = this.state.active.includes(id) ? 1 : 0,
        amount = THREE.MathUtils.lerp(this.starts.get(id) ?? 0, target, t);
      this.amounts.set(id, amount);
      this.reveal(g, amount);
    }
    for (const channel of Object.keys(
      this.visualChannels,
    ) as (keyof CityState["channels"])[])
      this.visualChannels[channel] = THREE.MathUtils.lerp(
        this.channelStarts[channel],
        this.state.channels[channel],
        t,
      );
    for (const [id, g] of this.relationLayers) {
      const amount = THREE.MathUtils.lerp(
        this.relationStarts.get(id) ?? 0,
        this.state.flags.includes(id) ? 1 : 0,
        t,
      );
      this.relationAmounts.set(id, amount);
      this.reveal(g, amount);
    }
    this.green.color.lerp(
      new THREE.Color(this.state.flags.includes("R01") ? 0x638458 : 0x70875b),
      t,
    );
    this.parkDry.color.lerp(
      new THREE.Color(this.state.flags.includes("R02") ? 0x9b9870 : 0x638458),
      t,
    );
    // Habitat uses reserved strips; never move a planted corridor across houses.
    for (const mover of this.movers) {
      const seconds = time / 1000;
      const cargo = mover.type === "cargo",
        hub = cargo && this.state.flags.includes("R12"),
        bike = cargo && this.state.flags.includes("R05");
      mover.mesh.position.set(
        ((seconds * (cargo ? 1.8 : 2.1) + mover.index * 8) % 28) - 14,
        0,
        mover.type === "van"
          ? cityRoutes.delivery
          : mover.type === "scooter"
            ? cityRoutes.scooter
            : bike
              ? cityRoutes.cargoCycle
              : cityRoutes.cargoService,
      );
      if (hub)
        mover.mesh.position.x = 27 - ((seconds * 1.5 + mover.index * 3) % 14);
    }
    if (this.layers.get("MOB_BIKE")!.visible) this.cyclists.update(time);
    this.targetMark.visible =
      time - this.markTime < 2200 && this.state.active.length > 0;
    this.targetMark.scale.setScalar(
      0.6 + 0.08 * Math.sin((time - this.markTime) / 350),
    );
  }
  private reveal(g: THREE.Group, amount: number) {
    g.visible = amount > 0.002;
    const fading = this.fades.get(g);
    g.scale.y = fading ? 1 : Math.max(0.001, amount);
    fading?.forEach((material) => {
      material.userData.interventionOpacity = amount;
      material.opacity = amount * (material.userData.sceneOpacity ?? 1);
      const transparent = material.opacity < 0.999;
      if (material.transparent !== transparent) {
        material.transparent = transparent;
        material.needsUpdate = true;
      }
      material.depthWrite = material.opacity > 0.98;
    });
  }
  shiftTime(delta: number) {
    this.startedAt += delta;
    this.markTime += delta;
  }
  get progress() {
    return this.duration
      ? Math.min(1, (performance.now() - this.startedAt) / this.duration)
      : 1;
  }
  get visibleInterventions() {
    return [...this.layers].filter(([, g]) => g.visible).map(([id]) => id);
  }
  dispose() {
    const textures = new Set<THREE.Texture>();
    this.materials.forEach((m) => {
      if (m.map) textures.add(m.map);
      m.dispose();
    });
    textures.forEach((t) => t.dispose());
    const geometry = new Set<THREE.BufferGeometry>();
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh) geometry.add(o.geometry);
    });
    geometry.forEach((g) => g.dispose());
    this.root.removeFromParent();
  }
}
