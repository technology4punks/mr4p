// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { UI3D } from "../src/ui/ui3d";
import { XRInputLatch } from "../src/xr/input";
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
  } as unknown as ReturnType<HTMLCanvasElement["getContext"]>);
});
function rayTo(ui: UI3D, action: string) {
  const candidates: THREE.Object3D[] = [];
  ui.root.traverse((o) => {
    if (o.userData.action === action && o.parent?.visible) candidates.push(o);
  });
  const target = candidates[0].getWorldPosition(new THREE.Vector3());
  return new THREE.Ray(
    new THREE.Vector3(target.x, target.y, 0),
    new THREE.Vector3(0, 0, -1),
  );
}
describe("immersive menu interaction", () => {
  it("holds an open menu in world space, then leaves only working shortcuts when closed", () => {
    const ui = new UI3D();
    ui.root.visible = true;
    ui.setOpen(true);
    ui.followViewer(new THREE.Vector3(0, 1.6, 0), new THREE.Quaternion());
    const initial = ui.root.position.clone();
    ui.followViewer(
      new THREE.Vector3(1, 1.6, 0),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.7),
    );
    expect(ui.root.position.equals(initial)).toBe(true);
    const confirm = rayTo(ui, "confirm");
    expect(ui.hit(confirm)).toBe("confirm");
    ui.setOpen(false);
    expect(ui.hit(confirm)).toBeUndefined();
    ui.followViewer(new THREE.Vector3(1, 1.6, 0), new THREE.Quaternion());
    expect(ui.root.position.equals(initial)).toBe(false);
    expect(ui.hit(rayTo(ui, "menu"))).toBe("menu");
    ui.root.visible = false;
    expect(ui.hit(rayTo(ui, "menu"))).toBeUndefined();
    ui.dispose();
  });
  it("uses context actions and supports stick navigation without locomotion", () => {
    const ui = new UI3D();
    ui.root.visible = true;
    ui.setContext("observatory");
    ui.setOpen(true);
    ui.followViewer(new THREE.Vector3(0, 1.6, 0), new THREE.Quaternion());
    expect(ui.hit(rayTo(ui, "future"))).toBe("future");
    ui.navigate(0, 1);
    expect(ui.focusedAction).toBe("voice");
    ui.navigate(1, 0);
    expect(ui.focusedAction).toBe("talk");
    ui.pointerFocus("future");
    expect(ui.focusedAction).toBeUndefined();
    ui.setOpen(false);
    expect(ui.focusedAction).toBeUndefined();
    ui.dispose();
  });
});
describe("native and polled XR input deduplication", () => {
  it("activates once for held presses and ignores a matching polled event", () => {
    const latch = new XRInputLatch();
    expect(latch.edge("select", true, 1000)).toBe(true);
    expect(latch.edge("select", true, 1300)).toBe(false);
    latch.release("select");
    expect(latch.edge("select", true, 1301)).toBe(true);
    latch.release("select");
    expect(latch.edge("select", true, 1350)).toBe(false);
    expect(latch.edge("menu", true, 1350)).toBe(true);
    // A native release can arrive one frame before the polled button resets.
    const held = new XRInputLatch();
    expect(held.edge("select", true, 1000)).toBe(true);
    held.release("select", 4000);
    expect(held.edge("select", true, 4001)).toBe(false);
  });
  it("applies a stick dead zone and controlled repeat", () => {
    const latch = new XRInputLatch();
    expect(latch.axis(0.3, 0.1, 1000)).toBeUndefined();
    expect(latch.axis(0, 0.9, 1001)).toEqual([0, 1]);
    expect(latch.axis(0, 0.9, 1200)).toBeUndefined();
    expect(latch.axis(0, 0.9, 1400)).toEqual([0, 1]);
    expect(latch.axis(-0.9, 0, 1401)).toEqual([-1, 0]);
  });
});
