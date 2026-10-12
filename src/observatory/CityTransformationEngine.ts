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
    const tree = (g: THREE.Group, x: number, z: number) => {
      box(g, [x, 1, z], [0.16, 2, 0.16], wood, this.cylinder);
      box(g, [x, 2.6, z], [0.9, 1.3, 0.9], this.green, this.crown);
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
    const roofs = layout
      .filter((b) => Math.abs(b.x) < 9 && b.layer === "near")
      .slice(0, 5);
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
      if (id === "MOB_BIKE") {
        box(g, [0, 0.03, -7.8], [30, 0.035, 0.9], mat(0x4d877d));
        for (let i = 0; i < 12; i++)
          box(g, [-14 + i * 2.4, 0.1, -7.3], [0.12, 0.2, 0.12], white);
        g.add(this.cyclists.root);
        this.cyclists.materials.forEach((m) => this.materials.add(m));
      }
      if (id === "MOB_TRAM") {
        for (const z of [-8.9, -9.6])
          box(g, [0, 0.06, z], [35, 0.05, 0.06], dark);
        for (const x of [-6, 6]) {
          box(g, [x, 1.7, -6.9], [3, 0.08, 1.2], solar);
          for (const dx of [-1.3, 1.3])
            box(g, [x + dx, 0.85, -6.9], [0.08, 1.7, 0.08], dark);
          sign(g, "Tram", x, 1.4, -6.7);
        }
      }
      if (id === "MOB_SCOOTER") {
        box(g, [5, 0.08, -7], [2, 0.15, 0.8], stone);
        for (let i = 0; i < 4; i++) vehicle(g, id, i, "scooter");
        sign(g, "Mobilità condivisa", 5, 1.5, -7);
      }
      if (id === "GREEN_TREES")
        for (let i = 0; i < 10; i++) tree(g, -13 + i * 2.7, -6.8);
      if (id === "GREEN_PARK") {
        box(g, [-4, 0.04, -16], [7, 0.12, 4.8], this.green);
        for (let i = 0; i < 8; i++)
          tree(g, -7 + (i % 4) * 1.8, -14.5 - Math.floor(i / 4) * 2);
        box(g, [-4, 0.16, -16], [5, 0.04, 0.5], stone);
        for (const x of [-5, -3])
          box(g, [x, 0.5, -14.8], [1.2, 0.12, 0.45], wood);
        sign(g, "Parco di quartiere", -3.5, 1.2, -13.6);
      }
      if (id === "GREEN_PARK") {
        g.traverse((o) => {
          if (
            o instanceof THREE.Mesh &&
            o.material === this.green &&
            o.position.x < -4
          )
            o.material = this.parkDry;
        });
      }
      if (
        id === "GREEN_ROOFS" ||
        id === "ENERGY_ROOFTOP" ||
        id === "HEAT_REFLECT" ||
        id === "WATER_RAIN"
      )
        for (const b of roofs) {
          const x =
            b.x +
            (id === "GREEN_ROOFS" ? -0.6 : id === "ENERGY_ROOFTOP" ? 0.65 : 0);
          const m =
            id === "GREEN_ROOFS"
              ? this.green
              : id === "ENERGY_ROOFTOP"
                ? solar
                : id === "HEAT_REFLECT"
                  ? white
                  : water;
          box(
            g,
            [x, b.height + 0.18, b.z],
            [
              id === "WATER_RAIN" ? 0.8 : 1.1,
              id === "WATER_RAIN" ? 0.6 : 0.18,
              b.depth * 0.55,
            ],
            m,
            id === "WATER_RAIN" ? this.cylinder : this.cube,
          );
        }
      if (id === "ENERGY_SOLAR_FARM")
        for (let i = 0; i < 24; i++) {
          const mesh = box(
            g,
            [4 + (i % 6) * 1.4, 0.8, -33 - Math.floor(i / 6) * 1.9],
            [1.1, 0.12, 1.4],
            solar,
          );
          mesh.rotation.x = -0.25;
        }
      if (id === "ENERGY_COMMUNITY") {
        for (const x of [-6, 0, 6]) {
          box(g, [x, 0.75, -23], [1.2, 1.5, 1], white);
          box(g, [x, 1.6, -23], [1.4, 0.1, 1.2], solar);
        }
        for (let i = 0; i < 12; i++)
          box(g, [-6 + i, 0.12, -22], [0.35, 0.025, 0.05], mat(0x8bb19c));
        sign(g, "Energia condivisa e accumulo", 0, 2, -22.5);
      }
      if (
        id === "BUILD_RETROFIT" ||
        id === "BUILD_PASSIVE" ||
        id === "BUILD_NEW"
      )
        for (const b of roofs.slice(0, 3)) {
          if (id === "BUILD_NEW") {
            box(
              g,
              [b.x, b.height / 2, b.z],
              [b.width + 0.15, b.height + 0.3, b.depth + 0.15],
              white,
            );
            box(
              g,
              [b.x, b.height * 0.5, b.z + b.depth / 2 + 0.1],
              [b.width * 0.8, b.height * 0.6, 0.08],
              glass,
            );
          } else
            for (let k = 0; k < 4; k++) {
              box(
                g,
                [b.x, b.height * (0.25 + k * 0.16), b.z + b.depth / 2 + 0.16],
                [
                  b.width * 0.9,
                  id === "BUILD_PASSIVE" ? 0.08 : 0.4,
                  id === "BUILD_PASSIVE" ? 0.65 : 0.13,
                ],
                id === "BUILD_PASSIVE" ? wood : white,
              );
            }
        }
      if (id === "WATER_LEAKS") {
        for (let i = 0; i < 4; i++)
          box(g, [-3 + i * 1.1, 0.15, -12], [0.8, 0.28, 0.6], water);
        sign(g, "Rete idrica riparata", -1, 1, -12);
      }
      if (id === "WATER_REUSE") {
        building(g, "Acqua trattata", -8, -20, 1.6);
        for (const x of [-9, -7])
          box(g, [x, 0.8, -18.5], [1.1, 1.4, 1.1], water, this.cylinder);
        for (let i = 0; i < 6; i++)
          box(g, [-8 + i * 0.7, 0.1, -16], [0.55, 0.08, 0.08], water);
      }
      if (id === "HEAT_SHADE")
        for (const x of [-10, -2, 7]) {
          box(g, [x, 2.1, -6.7], [3.5, 0.15, 1.7], white);
          for (const dx of [-1.5, 1.5])
            box(g, [x + dx, 1, -6.7], [0.08, 2, 0.08], dark);
        }
      if (id === "HEAT_DISTRICT") {
        building(g, "Raffrescamento", 8, -27, 1.8);
        for (let i = 0; i < 3; i++)
          box(g, [6.8 + i, 2, -27], [0.6, 0.35, 0.6], dark, this.cylinder);
        for (let i = 0; i < 6; i++)
          box(g, [5 + i * 0.8, 0.13, -25], [0.5, 0.04, 0.08], water);
      }
      if (id === "WASTE_REUSE") {
        building(g, "Riparazione e riuso", 4, -20);
        for (let i = 0; i < 5; i++)
          box(g, [3 + i * 0.45, 0.55, -18.7], [0.35, 0.35, 0.5], wood);
      }
      if (id === "WASTE_RECYCLE") {
        building(g, "Recupero materiali", 10, -26);
        for (let i = 0; i < 4; i++)
          box(
            g,
            [8.6 + i, 0.5, -24.5],
            [0.7, 1, 0.7],
            mat([0x668f91, 0xc3ad6d, 0x9392aa, 0x8b9c68][i]),
          );
      }
      if (id === "WASTE_ENERGY") {
        building(g, "Trattamento del residuo", 11, -32, 3);
        box(g, [12, 3.2, -32], [0.4, 4, 0.4], stone, this.cylinder);
        sign(g, "Emissioni da controllare", 10, 2, -30.5);
      }
      if (id === "LOG_CARGO")
        for (let i = 0; i < 4; i++) vehicle(g, id, i, "cargo");
      if (id === "LOG_EV") {
        for (let i = 0; i < 3; i++) vehicle(g, id, i, "van");
        for (let i = 0; i < 3; i++)
          box(g, [9 + i * 0.8, 1, -19], [0.25, 1.5, 0.25], water);
      }
      if (id === "LOG_HUB") {
        building(g, "Microhub di quartiere", 7, -17, 1.8);
        box(g, [7, 0.05, -14.8], [4, 0.04, 1.8], mat(0x99a493));
      }
      if (id === "BIO_RIVER") {
        box(g, [-5, 0.08, -13], [12, 0.12, 1.2], water);
        for (let i = 0; i < 8; i++)
          box(
            g,
            [-10 + i * 1.5, 0.28, -13.9],
            [0.7, 0.5, 0.6],
            this.green,
            this.crown,
          );
      }
      if (id === "BIO_CORRIDORS") {
        for (let i = 0; i < 10; i++) tree(g, -7 + i * 0.75, -18 - i * 0.7);
        box(g, [-3, 0.05, -21], [1.3, 0.1, 8], this.green);
      }
      if (id === "BIO_POLLINATORS")
        for (let i = 0; i < 25; i++) {
          const x = -2 + (i % 5) * 0.55,
            z = -14 - Math.floor(i / 5) * 0.6;
          box(g, [x, 0.14, z], [0.45, 0.2, 0.4], this.green);
          box(
            g,
            [x, 0.33, z],
            [0.15, 0.16, 0.15],
            mat(i % 2 ? 0xcfbe7a : 0xa995b1),
            this.crown,
          );
        }
      if (id === "FOOD_GARDENS") {
        for (let i = 0; i < 10; i++) {
          box(
            g,
            [-9 + (i % 5) * 0.8, 0.17, -28 - Math.floor(i / 5) * 1.3],
            [0.65, 0.3, 1],
            wood,
          );
          box(
            g,
            [-9 + (i % 5) * 0.8, 0.4, -28 - Math.floor(i / 5) * 1.3],
            [0.4, 0.3, 0.8],
            this.green,
          );
        }
        sign(g, "Orti condivisi", -7, 1.2, -26);
      }
      if (id === "FOOD_VERTICAL") {
        building(g, "Serra indoor", 7, -31, 6);
        for (let i = 0; i < 6; i++)
          box(g, [7, 1 + i * 0.8, -29.83], [2.7, 0.15, 0.06], this.green);
        glass.emissive.set(0x19382c);
        glass.emissiveIntensity = 0.12;
      }
      if (id === "FOOD_RECOVERY") {
        building(g, "Recupero eccedenze", 2, -18, 1.7);
        for (let i = 0; i < 4; i++) {
          box(g, [-0.2 + i * 1.1, 1.5, -16], [0.9, 0.15, 1], white);
          box(g, [-0.2 + i * 1.1, 0.6, -16], [0.9, 0.8, 0.6], wood);
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
        for (let i = 0; i < 8; i++)
          box(g, [-8 + i * 0.6, 0.12, -17], [0.5, 0.08, 0.1], water);
      if (id === "R03") {
        box(g, [0, 3.1, -9.3], [28, 0.025, 0.025], dark);
        for (const x of [-12, 0, 12])
          box(g, [x, 1.6, -9.3], [0.08, 3.2, 0.08], dark);
        sign(g, "Contributo rinnovabile · rete", 6, 2.4, -9.3);
      }
      if (id === "R06")
        for (let i = 0; i < 6; i++)
          box(
            g,
            [-5 + i * 0.6, 0.18, -18.6],
            [0.9, 0.3, 0.8],
            this.green,
            this.crown,
          );
      if (id === "R08") {
        // The farm occupies x=4..12, z=-33..-40. A visible habitat strip
        // runs along its western edge rather than cutting through the panels.
        box(g, [2.5, 0.06, -33], [1.05, 0.12, 14], this.green);
        box(g, [0.5, 0.06, -26.5], [4.5, 0.12, 1], this.green);
        for (let i = 0; i < 7; i++) tree(g, 2.4, -27 - i * 2);
      }
      if (id === "R09") {
        for (let i = 0; i < 6; i++)
          box(g, [6.5, 0.13, -24 - i], [0.12, 0.06, 0.8], solar);
        sign(g, "Serra · domanda elettrica", 7, 1.5, -29.7);
      }
      if (id === "R10") {
        for (let i = 0; i < 5; i++)
          box(g, [8, 0.14, -22 - i], [0.1, 0.07, 0.7], solar);
        sign(g, "Raffrescamento · domanda elettrica", 8, 1, -25.6);
      }
      if (id === "R11") {
        for (const b of roofs.slice(0, 3))
          box(
            g,
            [b.x, b.height * 0.25, b.z + b.depth / 2 + 0.25],
            [b.width * 0.9, 0.35, 0.2],
            wood,
          );
        sign(g, "Materiali recuperati · idoneità da verificare", 3, 1.5, -21);
      }
    }
    for (const g of [
      ...this.layers.values(),
      ...this.relationLayers.values(),
    ]) {
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
      this.targetMark.position.fromArray(
        sectorPositions[interventions.find((o) => o.id === id)!.sector],
      );
      this.targetMark.position.y = 0.15;
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
      g.visible = amount > 0.002;
      g.scale.y = Math.max(0.001, amount);
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
      g.visible = amount > 0.002;
      g.scale.y = Math.max(0.001, amount);
    }
    this.green.color.lerp(
      new THREE.Color(this.state.flags.includes("R01") ? 0x638458 : 0x70875b),
      t,
    );
    this.parkDry.color.lerp(
      new THREE.Color(this.state.flags.includes("R02") ? 0x9b9870 : 0x638458),
      t,
    );
    const corridor = this.layers.get("BIO_CORRIDORS")!;
    corridor.position.x = this.state.flags.includes("R08") ? -1.8 : 0;
    for (const mover of this.movers) {
      const seconds = time / 1000;
      const cargo = mover.type === "cargo",
        hub = cargo && this.state.flags.includes("R12"),
        bike = cargo && this.state.flags.includes("R05");
      mover.mesh.position.set(
        ((seconds * (cargo ? 1.8 : 2.1) + mover.index * 8) % 28) - 14,
        0,
        bike ? -7.8 : hub ? -14.7 : mover.type === "van" ? -10.9 : -7,
      );
      if (hub)
        mover.mesh.position.x = 7 - ((seconds * 1.5 + mover.index * 3) % 15);
    }
    if (this.layers.get("MOB_BIKE")!.visible) this.cyclists.update(time);
    this.targetMark.visible =
      time - this.markTime < 2200 && this.state.active.length > 0;
    this.targetMark.scale.setScalar(1 + (time - this.markTime) / 1500);
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
