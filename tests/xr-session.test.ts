// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
vi.mock("../src/ui/ui3d", () => ({
  UI3D: class {
    root = new THREE.Group();
    followViewer = vi.fn();
    hit = vi.fn();
    dispose = vi.fn();
  },
}));
import { XRExperience } from "../src/xr/xrSession";
class Session extends EventTarget {
  visibilityState = "visible";
  reference = new EventTarget();
  localFloor = true;
  requestReferenceSpace = vi.fn(async (type: string) => {
    if (type === "local-floor" && !this.localFloor)
      throw new DOMException("Not supported", "NotSupportedError");
    return this.reference as XRReferenceSpace;
  });
  end = vi.fn(async () => {
    this.dispatchEvent(new Event("end"));
  });
}
const polygon = [
  { x: -4, z: -4 },
  { x: 4, z: -4 },
  { x: 4, z: 4 },
  { x: -4, z: 4 },
] as DOMPointReadOnly[];
const plane = () =>
  ({ orientation: "horizontal", polygon, planeSpace: {} }) as XRPlane;
function frame(planes: Map<XRPlane, number> = new Map(), x = 0) {
  return {
    detectedPlanes: new Set(planes.keys()),
    getViewerPose: () => ({
      transform: {
        position: { x, y: 1.6, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
    }),
    getPose: (space: XRSpace) => {
      const selected = [...planes].find(([p]) => p.planeSpace === space);
      const y = selected?.[1] ?? 0;
      return {
        transform: {
          position: { x: 0, y, z: 0 },
          matrix: new THREE.Matrix4().makeTranslation(0, y, 0).elements,
        },
      };
    },
  } as unknown as XRFrame;
}
let xr: XRExperience, session: Session, root: THREE.Group, now: number;
let report = vi.fn<(message: string) => void>();
beforeEach(() => {
  localStorage.clear();
  now = 1000;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  session = new Session();
  root = new THREE.Group();
  report = vi.fn();
  Object.defineProperty(navigator, "xr", {
    configurable: true,
    value: { requestSession: vi.fn().mockResolvedValue(session) },
  });
  const renderer = {
    xr: {
      getController: () => new THREE.Group(),
      setReferenceSpaceType: vi.fn(),
      setSession: vi.fn().mockResolvedValue(undefined),
      setReferenceSpace: vi.fn(),
    },
    setClearColor: vi.fn(),
  } as unknown as THREE.WebGLRenderer;
  xr = new XRExperience(
    renderer,
    new THREE.Scene(),
    root,
    report,
    vi.fn(),
    vi.fn(),
  );
});
afterEach(() => {
  xr.dispose();
});
describe("MR orchestration (mocked XR runtime)", () => {
  it("requests a distinct immersive VR session only on explicit enter", async () => {
    expect(navigator.xr!.requestSession).not.toHaveBeenCalled();
    await xr.enter("immersive-vr");
    expect(navigator.xr!.requestSession).toHaveBeenCalledWith(
      "immersive-vr",
      expect.objectContaining({ optionalFeatures: ["local-floor"] }),
    );
    expect(xr.diagnostic.mode).toBe("immersive-vr");
    localStorage.setItem("neo-persistent-anchor-v1", "mr-handle");
    await xr.exit();
    await xr.enter("immersive-vr");
    expect(localStorage.getItem("neo-persistent-anchor-v1")).toBe("mr-handle");
  });
  it("keeps narrative avatar coordinates separate from placement and physical head motion", async () => {
    await xr.enter();
    xr.update(frame());
    xr.confirm();
    xr.update(frame());
    xr.setNarrativeMode(true);
    root.position.set(1.25, 0, -0.65);
    xr.update(frame(new Map(), 1));
    expect(root.position.toArray()).toEqual([1.25, 0, -0.65]);
    expect(xr.viewerPose.position.x).toBe(1);
    xr.confirm();
    await xr.reposition();
    expect(root.position.toArray()).toEqual([1.25, 0, -0.65]);
    expect(root.visible).toBe(true);
  });
  it("requests immersive AR and optional features then uses local-floor", async () => {
    await xr.enter();
    expect(navigator.xr!.requestSession).toHaveBeenCalledWith(
      "immersive-ar",
      expect.objectContaining({
        optionalFeatures: expect.arrayContaining([
          "plane-detection",
          "anchors",
          "hit-test",
        ]),
      }),
    );
    expect(xr.diagnostic.reference).toBe("local-floor");
    expect(xr.diagnostic.calibrated).toBe(true);
  });
  it("waits three seconds, reads frame planes and rejects the table", async () => {
    const floor = plane(),
      table = plane();
    const planes = new Map([
      [floor, 0.04],
      [table, 0.8],
    ]);
    await xr.enter();
    xr.update(frame(planes));
    expect(xr.diagnostic.floor).toContain("ricerca");
    now = 4001;
    xr.update(frame(planes));
    expect(xr.diagnostic.planes).toBe(2);
    expect(xr.diagnostic.feetY).toBe(0.04);
    expect(xr.diagnostic.floor).toContain("piano orizzontale");
    xr.confirm();
    xr.update(frame(planes));
    expect(root.position.y).toBe(0.04);
    expect(root.visible).toBe(true);
  });
  it("confirmed avatar remains in the world on head movement and plane loss", async () => {
    const floor = plane();
    await xr.enter();
    now = 4001;
    xr.update(frame(new Map([[floor, 0]])));
    xr.confirm();
    xr.update(frame(new Map([[floor, 0]])));
    const placement = root.position.clone();
    xr.update(frame(new Map(), 2.5));
    expect(root.position.equals(placement)).toBe(true);
    expect(root.parent).toBeNull();
    expect(xr.diagnostic.tracking).toContain("piano perso");
  });
  it("requires explicit height calibration in local reference fallback", async () => {
    session.localFloor = false;
    await xr.enter();
    xr.update(frame());
    xr.confirm();
    expect(xr.diagnostic.placed).toBe(false);
    xr.adjustFloor(-0.1);
    xr.calibrate();
    xr.confirm();
    xr.update(frame());
    expect(xr.diagnostic.placed).toBe(true);
    expect(root.position.y).toBeCloseTo(-0.1);
  });
  it("recenter without anchor returns to placement rather than pretending world-lock", async () => {
    await xr.enter();
    xr.update(frame());
    xr.confirm();
    xr.update(frame());
    session.reference.dispatchEvent(new Event("reset"));
    expect(xr.diagnostic.placed).toBe(false);
    expect(root.visible).toBe(false);
    expect(report).toHaveBeenCalledWith(expect.stringContaining("ricentrato"));
  });
  it("retries rejected optional features, but does not retry denied user permissions", async () => {
    vi.mocked(navigator.xr!.requestSession).mockRejectedValueOnce(
      new DOMException("Feature unavailable", "NotSupportedError"),
    );
    await xr.enter();
    expect(navigator.xr!.requestSession).toHaveBeenCalledTimes(2);
    await xr.exit();
    vi.mocked(navigator.xr!.requestSession)
      .mockClear()
      .mockRejectedValueOnce(new DOMException("Denied", "NotAllowedError"));
    await expect(xr.enter()).rejects.toThrow("Denied");
    expect(navigator.xr!.requestSession).toHaveBeenCalledTimes(1);
  });
  it("deletes a saved handle after failed restore before accepting a replacement", async () => {
    localStorage.setItem("neo-persistent-anchor-v1", "old-handle");
    const deletePersistentAnchor = vi.fn().mockResolvedValue(undefined);
    Object.assign(session, {
      restorePersistentAnchor: vi.fn().mockRejectedValue(new Error("lost")),
      deletePersistentAnchor,
    });
    await xr.enter();
    expect(deletePersistentAnchor).toHaveBeenCalledWith("old-handle");
    expect(localStorage.getItem("neo-persistent-anchor-v1")).toBeNull();
    expect(report).toHaveBeenCalledWith(
      "Posizione non recuperata — riposiziona.",
    );
  });
});

describe("narrative reference reset", () => {
  it("requires fresh MR placement after an unanchored recenter in the observatory", async () => {
    await xr.enter();
    xr.update(frame());
    xr.confirm();
    xr.update(frame());
    xr.setNarrativeMode(true);
    root.position.set(0.75, 0, -1);
    session.reference.dispatchEvent(new Event("reset"));
    expect(xr.diagnostic.placed).toBe(false);
    expect(root.visible).toBe(true);
    xr.setNarrativeMode(false);
    expect(root.visible).toBe(false);
    xr.update(frame());
    expect(xr.diagnostic.placed).toBe(false);
  });
});
