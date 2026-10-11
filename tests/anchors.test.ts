import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { ANCHOR_KEY, AnchorManager } from "../src/xr/anchors";
import type { ExtendedSession, PersistentAnchor } from "../src/xr/types";
function storage(initial?: string) {
  const data = new Map<string, string>(initial ? [[ANCHOR_KEY, initial]] : []);
  return {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      data.delete(key);
    }),
  };
}
const anchor = (persistent = true) =>
  ({
    delete: vi.fn(),
    anchorSpace: {},
    ...(persistent
      ? { requestPersistentHandle: vi.fn().mockResolvedValue("device-handle") }
      : {}),
  }) as unknown as PersistentAnchor;
const session = (options = {}) => options as ExtendedSession;
const space = {} as XRReferenceSpace;
const rigid = class {
  constructor(
    public position: unknown,
    public orientation: unknown,
  ) {}
};
describe("anchor lifecycle", () => {
  it("does not pretend a saved string is a pose without restore support", async () => {
    const report = vi.fn();
    const manager = new AnchorManager(session(), report, storage("saved"));
    expect(await manager.restore()).toBe(false);
    expect(manager.anchor).toBeUndefined();
    expect(report).toHaveBeenCalledWith(expect.stringContaining("riposiziona"));
  });
  it("restores device anchor and applies pose while preserving avatar scale", async () => {
    const restored = anchor();
    const manager = new AnchorManager(
      session({ restorePersistentAnchor: vi.fn().mockResolvedValue(restored) }),
      vi.fn(),
      storage("saved"),
    );
    expect(await manager.restore()).toBe(true);
    const root = new THREE.Group();
    root.scale.setScalar(1.1);
    const matrix = new THREE.Matrix4().makeTranslation(2, 0.12, -3);
    expect(
      manager.update(
        {
          getPose: () => ({ transform: { matrix: matrix.elements } }),
        } as unknown as XRFrame,
        space,
        root,
      ),
    ).toBe(true);
    expect(root.position.toArray()).toEqual([2, 0.12, -3]);
    expect(root.scale.x).toBe(1.1);
    expect(
      manager.update(
        { getPose: () => null } as unknown as XRFrame,
        space,
        root,
      ),
    ).toBe(false);
    expect(root.position.toArray()).toEqual([2, 0.12, -3]);
  });
  it("failed restore reports recoverable placement without inventing an anchor", async () => {
    const report = vi.fn();
    const manager = new AnchorManager(
      session({
        restorePersistentAnchor: vi.fn().mockRejectedValue(new Error()),
      }),
      report,
      storage("saved"),
    );
    expect(await manager.restore()).toBe(false);
    expect(manager.status).toBe("failed");
    expect(report).toHaveBeenCalledWith(
      "Posizione non recuperata — riposiziona.",
    );
  });
  it("creates on active frame, saves persistent handle and resets local/device state", async () => {
    vi.stubGlobal("XRRigidTransform", rigid);
    const created = anchor();
    const store = storage();
    const deletePersistentAnchor = vi.fn().mockResolvedValue(undefined);
    const manager = new AnchorManager(
      session({ deletePersistentAnchor }),
      vi.fn(),
      store,
    );
    const createAnchor = vi.fn().mockResolvedValue(created);
    await manager.create(
      { createAnchor } as unknown as XRFrame,
      space,
      new THREE.Vector3(1, 0, -2),
      0.4,
    );
    expect(createAnchor).toHaveBeenCalledWith(
      expect.objectContaining({ position: { x: 1, y: 0, z: -2 } }),
      space,
    );
    expect(manager.status).toBe("persistent");
    expect(store.setItem).toHaveBeenCalledWith(ANCHOR_KEY, "device-handle");
    expect(await manager.clear()).toBe(true);
    expect(deletePersistentAnchor).toHaveBeenCalledWith("device-handle");
    expect(store.getItem(ANCHOR_KEY)).toBeNull();
    expect(created.delete).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it("keeps a session anchor when persistence is unsupported and distinguishes missing API", async () => {
    vi.stubGlobal("XRRigidTransform", rigid);
    const manager = new AnchorManager(session(), vi.fn(), storage());
    await manager.create(
      {
        createAnchor: vi.fn().mockResolvedValue(anchor(false)),
      } as unknown as XRFrame,
      space,
      new THREE.Vector3(),
      0,
    );
    expect(manager.status).toBe("session");
    await manager.clear();
    await manager.create({} as XRFrame, space, new THREE.Vector3(), 0);
    expect(manager.status).toBe("unavailable");
    vi.unstubAllGlobals();
  });
  it("discards async restore when reset happens before it resolves", async () => {
    let resolve!: (a: PersistentAnchor) => void;
    const restored = anchor();
    const manager = new AnchorManager(
      session({
        restorePersistentAnchor: () =>
          new Promise<PersistentAnchor>((r) => {
            resolve = r;
          }),
        deletePersistentAnchor: vi.fn().mockResolvedValue(undefined),
      }),
      vi.fn(),
      storage("saved"),
    );
    const restoring = manager.restore();
    await manager.clear();
    resolve(restored);
    expect(await restoring).toBe(false);
    expect(manager.anchor).toBeUndefined();
    expect(restored.delete).toHaveBeenCalled();
  });
  it("does not accumulate persistent anchors after failed device deletion", async () => {
    vi.stubGlobal("XRRigidTransform", rigid);
    const created = anchor();
    const manager = new AnchorManager(
      session({
        restorePersistentAnchor: vi.fn().mockResolvedValue(anchor()),
        deletePersistentAnchor: vi.fn().mockRejectedValue(new Error()),
      }),
      vi.fn(),
      storage("saved"),
    );
    await manager.restore();
    expect(await manager.clear()).toBe(false);
    await manager.create(
      {
        createAnchor: vi.fn().mockResolvedValue(created),
      } as unknown as XRFrame,
      space,
      new THREE.Vector3(),
      0,
    );
    expect(created.requestPersistentHandle).not.toHaveBeenCalled();
    expect(manager.status).toBe("session");
    vi.unstubAllGlobals();
  });
  it("disables persistence when storage is blocked", async () => {
    vi.stubGlobal("XRRigidTransform", rigid);
    const created = anchor();
    const blocked = {
      getItem: vi.fn(() => {
        throw new Error("blocked");
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const manager = new AnchorManager(session(), vi.fn(), blocked);
    expect(await manager.restore()).toBe(false);
    await manager.create(
      {
        createAnchor: vi.fn().mockResolvedValue(created),
      } as unknown as XRFrame,
      space,
      new THREE.Vector3(),
      0,
    );
    expect(created.requestPersistentHandle).not.toHaveBeenCalled();
    expect(manager.status).toBe("session");
    vi.unstubAllGlobals();
  });
  it("removes device handle when storage quota prevents saving", async () => {
    vi.stubGlobal("XRRigidTransform", rigid);
    const created = anchor();
    const store = storage();
    store.setItem.mockImplementation(() => {
      throw new Error("quota");
    });
    const deletePersistentAnchor = vi.fn().mockResolvedValue(undefined);
    const manager = new AnchorManager(
      session({ deletePersistentAnchor }),
      vi.fn(),
      store,
    );
    await manager.create(
      {
        createAnchor: vi.fn().mockResolvedValue(created),
      } as unknown as XRFrame,
      space,
      new THREE.Vector3(),
      0,
    );
    expect(deletePersistentAnchor).toHaveBeenCalledWith("device-handle");
    expect(manager.status).toBe("session");
    vi.unstubAllGlobals();
  });
});
