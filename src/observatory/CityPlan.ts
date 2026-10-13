import type { CityBuilding } from "./FutureObservatory.js";

export type Parcel = { x: number; z: number; width: number; depth: number };
/** All components share this street section; no runtime path-finding or physics. */
export const cityRoutes = {
  pedestrian: [-5.5, -6.2],
  trees: -7.7,
  scooter: -9.05,
  cycle: -9.65,
  cargoCycle: -10.4,
  platform: -12,
  tram: -13.3,
  cars: [-15.1, -16.85],
  delivery: -18.6,
  cargoService: -20.1,
  rail: -33,
} as const;
export const cityParcels: Record<string, Parcel> = {
  GREEN_PARK: { x: -10, z: -25, width: 9, depth: 6 },
  BIO_POLLINATORS: { x: -3.5, z: -25, width: 2.4, depth: 5 },
  WATER_REUSE: { x: -21, z: -25, width: 7, depth: 7 },
  ENERGY_COMMUNITY: { x: 4, z: -25, width: 5, depth: 6 },
  FOOD_RECOVERY: { x: 11, z: -25, width: 7, depth: 6 },
  LOG_HUB: { x: 21, z: -25, width: 7, depth: 6 },
  FOOD_GARDENS: { x: -10, z: -41, width: 9, depth: 7 },
  WASTE_REUSE: { x: 4, z: -41, width: 5, depth: 6 },
  WASTE_RECYCLE: { x: 11, z: -41, width: 6, depth: 6 },
  HEAT_DISTRICT: { x: 21, z: -41, width: 7, depth: 6 },
  ENERGY_SOLAR_FARM: { x: 4, z: -53, width: 6, depth: 10 },
  FOOD_VERTICAL: { x: 11, z: -53, width: 6, depth: 7 },
  WASTE_ENERGY: { x: 21, z: -53, width: 7, depth: 7 },
  BUILD_NEW: { x: -20, z: -54, width: 8, depth: 6 },
};
export const backgroundTrees: readonly (readonly [number, number])[] = [
  [-29, -7.7],
  [29, -7.7],
  [-31, -25],
  [31, -25],
  [-37, -7.7],
  [37, -7.7],
  [-38, -41],
  [38, -41],
  [-43, -7.7],
  [43, -7.7],
  [-45, -25],
  [45, -25],
  [-45, -41],
  [45, -41],
];
export const boulevardTrees = [-18, -14, -10, -6, 6, 10, 14, 18];
export const corridorTrees = [
  -25.5, -28, -37, -39.5, -42, -44.5, -47, -49.5, -52, -54.5,
];
export const cityReservations: Parcel[] = [
  ...Object.values(cityParcels),
  { x: -0.8, z: -41, width: 1.2, depth: 35 }, // Corridor, offset from pollinator beds.
  { x: 0.4, z: -53, width: 1, depth: 12 }, // Solar-farm habitat border.
  { x: -9, z: -30, width: 14, depth: 1.2 }, // River before the railway.
  { x: 0, z: cityRoutes.rail, width: 160, depth: 3 },
  ...backgroundTrees.map(([x, z]) => ({ x, z, width: 2.7, depth: 2.7 })),
];
export function intersects(a: Parcel, b: Parcel, clearance = 0) {
  return (
    Math.abs(a.x - b.x) < (a.width + b.width) / 2 + clearance &&
    Math.abs(a.z - b.z) < (a.depth + b.depth) / 2 + clearance
  );
}
/** Low-rise frontage lots stay out of every authored intervention, even if all are shown. */
export function plannedCityBuildings(): CityBuilding[] {
  const near: CityBuilding[] = [];
  for (const z of [-25, -41, -53, -64])
    for (const x of [-38, -31, -25, -18, -10, 1, 9, 17, 25, 32, 39]) {
      const b: CityBuilding = {
        x,
        z,
        width: 4.4,
        depth: 5.2,
        height: 5.5 + ((near.length * 7) % 5) * 1.1,
        layer: "near",
      };
      if (!cityReservations.some((p) => intersects(b, p, 0.8))) near.push(b);
    }
  near.sort((a, b) => a.x * a.x + a.z * a.z - (b.x * b.x + b.z * b.z));
  const result = near.slice(0, 18);
  for (const [count, depth, layer] of [
    [24, 76, "middle"],
    [30, 98, "far"],
  ] as const) {
    for (let i = 0; i < count; i++)
      result.push({
        x: (i - (count - 1) / 2) * 5.8,
        z: -depth - (i % 3) * 2,
        width: 3.3 + (i % 3) * 0.3,
        depth: 3.4,
        height: 7 + ((i * 7) % 13),
        layer,
      });
  }
  return result;
}
export function interventionPosition(id: string): [number, number, number] {
  const p = cityParcels[id];
  if (p) return [p.x, 0, p.z];
  if (id === "BIO_RIVER") return [-9, 0, -30];
  if (id === "BIO_CORRIDORS") return [-0.8, 0, -41];
  if (
    [
      "GREEN_ROOFS",
      "ENERGY_ROOFTOP",
      "WATER_RAIN",
      "HEAT_REFLECT",
      "BUILD_RETROFIT",
      "BUILD_PASSIVE",
    ].includes(id)
  ) {
    const b = plannedCityBuildings()[0];
    return [b.x, b.height, b.z];
  }
  return [0, 0, cityRoutes.trees];
}
