// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  FutureObservatory,
  cityLayout,
} from "../src/observatory/FutureObservatory";
import {
  cityParcels,
  cityReservations,
  intersects,
} from "../src/observatory/CityPlan";
import { deriveCity } from "../src/decision/DecisionEngine";
import { interventions } from "../src/decision/catalog";

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    fillRect: vi.fn(),
    fillText: vi.fn(),
  } as unknown as ReturnType<HTMLCanvasElement["getContext"]>);
});

/** Individual rendered instances, including rotation and their ancestors. */
function boxes(root: THREE.Object3D) {
  const result: { name: string; box: THREE.Box3 }[] = [];
  root.updateWorldMatrix(true, true);
  root.traverseVisible((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.computeBoundingBox();
    const count = object instanceof THREE.InstancedMesh ? object.count : 1;
    for (let i = 0; i < count; i++) {
      const matrix = new THREE.Matrix4();
      if (object instanceof THREE.InstancedMesh) object.getMatrixAt(i, matrix);
      matrix.premultiply(object.matrixWorld);
      result.push({
        name: object.name || object.parent!.name,
        box: object.geometry.boundingBox!.clone().applyMatrix4(matrix),
      });
    }
  });
  return result;
}
const all = interventions.map((option) => option.id);

describe("authored city clearance", () => {
  it("reserves independent facility lots and keeps base buildings clear of every intervention and rail corridor", () => {
    const parcels = Object.entries(cityParcels);
    for (let i = 0; i < parcels.length; i++)
      for (let j = i + 1; j < parcels.length; j++)
        expect(
          intersects(parcels[i][1], parcels[j][1], 0.2),
          `${parcels[i][0]} / ${parcels[j][0]}`,
        ).toBe(false);
    for (const b of cityLayout().filter((b) => b.layer === "near"))
      for (const p of cityReservations)
        expect(
          intersects(
            { ...b, width: b.width + 0.2, depth: b.depth + 0.8 },
            p,
            0.15,
          ),
          `building ${b.x},${b.z}`,
        ).toBe(false);
  });

  it("contains actual facility meshes and signs within their assigned plots with all thirty interventions", () => {
    const scene = new FutureObservatory();
    try {
      scene.setOpacity(1);
      scene.transformations.apply(deriveCity(all), 0, false);
      for (const [id, p] of Object.entries(cityParcels))
        for (const { box } of boxes(scene.transformations.layers.get(id)!)) {
          expect(box.min.x, `${id} west`).toBeGreaterThanOrEqual(
            p.x - p.width / 2 - 0.001,
          );
          expect(box.max.x, `${id} east`).toBeLessThanOrEqual(
            p.x + p.width / 2 + 0.001,
          );
          expect(box.min.z, `${id} rear`).toBeGreaterThanOrEqual(
            p.z - p.depth / 2 - 0.001,
          );
          expect(box.max.z, `${id} front`).toBeLessThanOrEqual(
            p.z + p.depth / 2 + 0.001,
          );
        }
    } finally {
      scene.dispose();
    }
  });

  it("keeps residents clear of trees, facilities, street furniture and each other across transitions, removal and quality changes", () => {
    const scene = new FutureObservatory();
    try {
      scene.setOpacity(1);
      for (const low of [false, true]) {
        scene.setQuality(low ? "low" : "high");
        for (const active of [
          all,
          ["GREEN_TREES", "HEAT_SHADE", "GREEN_PARK", "MOB_TRAM"],
          [],
        ]) {
          const state = deriveCity(active);
          scene.transformations.apply(state, 0, true);
          for (let frame = 0; frame <= 240; frame++) {
            const time = frame * 100;
            scene.applyCityState(state, scene.transformations.visualChannels);
            scene.update(time);
            if (frame % 12 !== 0) continue;
            const residents = boxes(scene.district.activity.root).filter((p) =>
              p.name.startsWith("Walking residents"),
            );
            const obstacles = boxes(scene.city).filter(
              (p) =>
                !/^Walking residents|Street vehicles|Vehicle|Industrial smoke/.test(
                  p.name,
                ) &&
                p.box.max.y > 0.3 &&
                p.box.min.z > -8.5,
            );
            for (const person of residents)
              for (const obstacle of obstacles)
                if (person.box.intersectsBox(obstacle.box))
                  expect.fail(
                    `${time} ${person.name} through ${obstacle.name}`,
                  );
            const bodies = residents.filter((p) => p.name.endsWith("bodies"));
            expect(bodies.length).toBe(low ? 6 : 12);
            for (let i = 0; i < bodies.length; i++)
              for (let j = i + 1; j < bodies.length; j++)
                if (bodies[i].box.intersectsBox(bodies[j].box))
                  expect.fail(`residents ${i}/${j}`);
          }
        }
      }
    } finally {
      scene.dispose();
    }
  });

  it("separates roof planting, photovoltaics and water storage on the same existing buildings", () => {
    const scene = new FutureObservatory();
    try {
      scene.transformations.apply(deriveCity(all), 0, false);
      const ids = [
        "GREEN_ROOFS",
        "ENERGY_ROOFTOP",
        "WATER_RAIN",
        "HEAT_REFLECT",
      ];
      for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++)
          for (const a of boxes(scene.transformations.layers.get(ids[i])!))
            for (const b of boxes(scene.transformations.layers.get(ids[j])!))
              expect(a.box.intersectsBox(b.box), `${ids[i]} / ${ids[j]}`).toBe(
                false,
              );
    } finally {
      scene.dispose();
    }
  });

  it("keeps vehicle and rider envelopes clear of static props and other traffic in the busiest combination", () => {
    const scene = new FutureObservatory();
    try {
      scene.setOpacity(1);
      const state = deriveCity(all);
      scene.transformations.apply(state, 0, false);
      scene.applyCityState(state);
      const movingRoots: THREE.Object3D[] = [
        scene.district.activity.root,
        scene.transformations.cyclists.root,
      ];
      const fleet: THREE.Object3D[] = [];
      for (const id of ["LOG_CARGO", "LOG_EV", "MOB_SCOOTER"]) {
        const vehicles = scene.transformations.layers
          .get(id)!
          .children.filter((o) => o instanceof THREE.Group);
        fleet.push(...vehicles);
        movingRoots.push(...vehicles);
      }
      const car = scene.district.root.getObjectByName("Street vehicles")!;
      const tram = scene.transit.root.getObjectByName(
        "Moving tram and train carriages",
      )!;
      movingRoots.push(car, tram);
      const obstacles: { name: string; box: THREE.Box3 }[] = [];
      scene.city.updateWorldMatrix(true, true);
      scene.city.traverseVisible((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        for (
          let ancestor: THREE.Object3D | null = o;
          ancestor;
          ancestor = ancestor.parent
        )
          if (movingRoots.includes(ancestor)) return;
        if (/Street vehicles|Vehicle|Industrial smoke|Transit/.test(o.name))
          return;
        obstacles.push(...boxes(o).filter((p) => p.box.max.y > 0.25));
      });
      for (let frame = 0; frame <= 720; frame++) {
        scene.update(frame * 100);
        if (frame % 24 !== 0) continue;
        const dynamic = [
          ...boxes(car),
          ...boxes(tram),
          ...fleet.flatMap((o) => [
            { name: o.parent!.name, box: new THREE.Box3().setFromObject(o) },
          ]),
        ];
        const riders = boxes(scene.transformations.cyclists.root).filter(
          (o) => o.name === "Cyclists bodies and limbs",
        );
        dynamic.push(...riders.filter((_, i) => i % 5 === 0));
        expect(dynamic.length).toBe(38);
        for (const a of dynamic)
          for (const b of obstacles)
            if (a.box.intersectsBox(b.box))
              expect.fail(`${frame} ${a.name} through ${b.name}`);
        for (let i = 0; i < dynamic.length; i++)
          for (let j = i + 1; j < dynamic.length; j++)
            if (dynamic[i].box.intersectsBox(dynamic[j].box))
              expect.fail(
                `${frame} traffic ${dynamic[i].name}/${dynamic[j].name}`,
              );
      }
    } finally {
      scene.dispose();
    }
  }, 20000);

  it("reveals rooftop and overhead additions at their final elevation, with independent scene and intervention fades", () => {
    const scene = new FutureObservatory();
    try {
      scene.setOpacity(1);
      scene.transformations.apply(deriveCity(all), 0, false);
      const fixed = [
        "GREEN_ROOFS",
        "ENERGY_ROOFTOP",
        "WATER_RAIN",
        "HEAT_REFLECT",
        "BUILD_RETROFIT",
        "BUILD_PASSIVE",
      ];
      const final = fixed.map((id) =>
        boxes(scene.transformations.layers.get(id)!).map((p) => p.box),
      );
      scene.transformations.apply(deriveCity([]), 0, false);
      scene.transformations.apply(deriveCity(all), 1000, true);
      for (const time of [1500, 4500, 7500]) {
        scene.update(time);
        fixed.forEach((id, i) => {
          const group = scene.transformations.layers.get(id)!;
          expect(boxes(group).map((p) => p.box)).toEqual(final[i]);
          group.traverse((o) => {
            if (!(o instanceof THREE.Mesh)) return;
            const material = o.material as THREE.MeshStandardMaterial;
            expect(material.opacity).toBeGreaterThan(0);
            expect(material.opacity).toBeLessThan(1);
          });
        });
        const tram = boxes(
          scene.transit.root.getObjectByName(
            "Moving tram and train carriages",
          )!,
        );
        for (const cable of boxes(
          scene.transformations.relationLayers.get("R03")!,
        ))
          for (const carriage of tram)
            if (cable.box.intersectsBox(carriage.box))
              expect.fail("Growing overhead wire through a tram");
      }
      scene.setOpacity(0.5);
      scene.transformations.update(4500);
      const group = scene.transformations.layers.get("GREEN_ROOFS")!;
      group.traverse((o) => {
        if (o instanceof THREE.Mesh)
          expect((o.material as THREE.Material).opacity).toBeCloseTo(0.25);
      });
    } finally {
      scene.dispose();
    }
  });

  it("keeps the sky inside the application camera far plane for room-scale viewpoints", () => {
    const scene = new FutureObservatory();
    try {
      const sky = scene.root.children.find(
        (o) =>
          o instanceof THREE.Mesh && o.material instanceof THREE.ShaderMaterial,
      ) as THREE.Mesh;
      sky.geometry.computeBoundingSphere();
      expect(
        sky.geometry.boundingSphere!.radius +
          new THREE.Vector3(2.5, 2, 2.5).length(),
      ).toBeLessThan(150);
      expect(
        Math.max(
          ...cityLayout().map((b) =>
            new THREE.Vector3(b.x, b.height, b.z).length(),
          ),
        ),
      ).toBeLessThan(sky.geometry.boundingSphere!.radius);
    } finally {
      scene.dispose();
    }
  });

  it("continues walking while appearance changes without lateral drift or resetting travel", () => {
    const scene = new FutureObservatory();
    try {
      scene.setOpacity(1);
      const bodies = scene.district.activity.root.getObjectByName(
        "Walking residents · bodies",
      ) as THREE.InstancedMesh;
      const matrix = new THREE.Matrix4();
      bodies.getMatrixAt(0, matrix);
      let previous = matrix.elements[12];
      const z = matrix.elements[14];
      for (let frame = 1; frame <= 120; frame++) {
        scene.district.activity.setFuture(frame / 120);
        scene.district.activity.update(frame * 40);
        bodies.getMatrixAt(0, matrix);
        expect(matrix.elements[12] - previous).toBeGreaterThan(0);
        expect(matrix.elements[12] - previous).toBeLessThan(0.04);
        expect(matrix.elements[14]).toBe(z);
        previous = matrix.elements[12];
      }
    } finally {
      scene.dispose();
    }
  });
});
