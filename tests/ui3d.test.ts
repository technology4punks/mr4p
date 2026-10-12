// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { UI3D } from "../src/ui/ui3d";
import { XRInputLatch } from "../src/xr/input";
import { VoiceIndicator } from "../src/ui/VoiceIndicator";
import type { VoiceSnapshot } from "../src/audio/realtimeClient";
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(), beginPath: vi.fn(), roundRect: vi.fn(),
    fill: vi.fn(), stroke: vi.fn(), arc: vi.fn(),
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
    expect(initial.x).toBeGreaterThan(0.5);
    expect(initial.y).toBeGreaterThan(1.6);
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
    expect(ui.root.position.equals(initial)).toBe(true);
    expect(ui.hit(rayTo(ui, "menu"))).toBe("menu");
    ui.root.visible = false;
    expect(ui.hit(rayTo(ui, "menu"))).toBeUndefined();
    ui.dispose();
  });
  it("keeps closed controls fixed too, and recenters only on explicit opening or a new session", () => {
    const ui = new UI3D();
    ui.root.visible = true;
    ui.followViewer(new THREE.Vector3(0, 1.6, 0), new THREE.Quaternion());
    const initial = ui.root.position.clone(), orientation = ui.root.quaternion.clone();
    ui.followViewer(new THREE.Vector3(2, 1.7, 1), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));
    expect(ui.root.position.equals(initial)).toBe(true);
    expect(ui.root.quaternion.equals(orientation)).toBe(true);
    ui.setOpen(true);
    ui.followViewer(new THREE.Vector3(2, 1.7, 1), new THREE.Quaternion());
    expect(ui.root.position.equals(initial)).toBe(false);
    ui.setOpen(false);
    ui.resetPlacement();
    ui.followViewer(new THREE.Vector3(0, 1.6, 0), new THREE.Quaternion());
    expect(ui.root.position.equals(initial)).toBe(true);
    ui.dispose();
  });
  it("shows the listening state beside the robot without moving it with the head", () => {
    const indicator = new VoiceIndicator();
    const avatar = new THREE.Group();
    avatar.position.set(0.7, 0, -1.3);
    const voice = { activity: "ready", microphone: "live", interruptions: true } as VoiceSnapshot;
    indicator.update(voice, 0.1, avatar, new THREE.Vector3(0, 1.6, 0));
    const initial = indicator.root.position.clone();
    indicator.update(voice, 0.1, avatar, new THREE.Vector3(2, 1.7, 1));
    expect(indicator.root.position.equals(initial)).toBe(true);
    avatar.position.x += 0.5;
    indicator.update(voice, 0, avatar, new THREE.Vector3(2, 1.7, 1));
    expect(indicator.root.position.x).toBeCloseTo(initial.x + 0.5);
    avatar.visible = false;
    indicator.update(voice, 0, avatar, new THREE.Vector3());
    expect(indicator.root.visible).toBe(false);
    indicator.dispose();
  });
  it("uses context actions and supports stick navigation without locomotion", () => {
    const ui = new UI3D();
    ui.root.visible = true;
    ui.setContext("observatory");
    ui.setOpen(true);
    ui.followViewer(new THREE.Vector3(0, 1.6, 0), new THREE.Quaternion());
    expect(ui.hit(rayTo(ui, "decision"))).toBe("decision");
    ui.navigate(0, 1);
    expect(ui.focusedAction).toBe("voice");
    ui.navigate(1, 0);
    expect(ui.focusedAction).toBe("talk");
    ui.pointerFocus("decision");
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

it("offers decision choices in the open menu and compact dock", () => {
 const ui=new UI3D();ui.root.visible=true;ui.setContext("observatory");ui.setOpen(true);ui.followViewer(new THREE.Vector3(0,1.6,0),new THREE.Quaternion());
 expect(ui.hit(rayTo(ui,"decision"))).toBe("decision");ui.setOpen(false);expect(ui.hit(rayTo(ui,"decision"))).toBe("decision");ui.dispose();
});
