import * as THREE from "three";
import type { ExtendedSession, PersistentAnchor } from "./types";
export const ANCHOR_KEY = "neo-persistent-anchor-v1";
export type AnchorStatus =
  | "unavailable"
  | "session"
  | "persistent"
  | "failed"
  | "restoring"
  | "creating"
  | "none";
export class AnchorManager {
  anchor?: PersistentAnchor;
  status: AnchorStatus = "none";
  private handle?: string;
  private generation = 0;
  private pendingDelete?: string;
  private storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  private persistenceAllowed = true;
  private poseMatrix = new THREE.Matrix4();
  private avatarScale = new THREE.Vector3();
  constructor(
    private session: ExtendedSession,
    private report: (message: string) => void,
    storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  ) {
    try {
      this.storage = storage ?? localStorage;
    } catch {
      this.persistenceAllowed = false;
      this.report("Storage non disponibile: persistenza disattivata.");
    }
  }

  async restore(): Promise<boolean> {
    let handle: string | null;
    try {
      handle = this.storage?.getItem(ANCHOR_KEY) ?? null;
    } catch {
      this.persistenceAllowed = false;
      this.report("Storage non disponibile: persistenza disattivata.");
      return false;
    }
    if (!handle) return false;
    this.handle = handle;
    if (!this.session.restorePersistentAnchor) {
      this.status = "unavailable";
      this.report("Ripristino non supportato — riposiziona.");
      return false;
    }
    const generation = this.generation;
    this.status = "restoring";
    try {
      const anchor = await this.session.restorePersistentAnchor(handle);
      if (generation !== this.generation) {
        anchor.delete();
        return false;
      }
      this.anchor = anchor;
      this.status = "persistent";
      return true;
    } catch {
      this.status = "failed";
      this.report("Posizione non recuperata — riposiziona.");
      return false;
    }
  }
  async clear(): Promise<boolean> {
    this.generation++;
    this.anchor?.delete();
    this.anchor = undefined;
    const handle = this.handle || this.pendingDelete;
    this.handle = undefined;
    try {
      this.storage?.removeItem(ANCHOR_KEY);
    } catch {
      this.report("Impossibile cancellare lo storage locale.");
    }
    this.status = "none";
    if (handle) {
      if (!this.session.deletePersistentAnchor) {
        this.pendingDelete = handle;
        this.report(
          "Eliminazione sul dispositivo non disponibile; nessun nuovo anchor persistente sarà creato.",
        );
        return false;
      }
      try {
        await this.session.deletePersistentAnchor(handle);
        this.pendingDelete = undefined;
      } catch {
        this.pendingDelete = handle;
        this.report("Reset dispositivo non riuscito. Riprova Reset posizione.");
        return false;
      }
    }
    return true;
  }
  async create(
    frame: XRFrame,
    space: XRReferenceSpace,
    position: THREE.Vector3,
    yaw: number,
  ) {
    const generation = this.generation;
    if (!frame.createAnchor) {
      this.status = "unavailable";
      this.report(
        "Anchor non disponibili: posizione fissa nel riferimento della sessione.",
      );
      return;
    }
    this.status = "creating";
    try {
      const quaternion = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        yaw,
      );
      // Invoke on the active XRFrame before the first await.
      const anchor = (await frame.createAnchor(
        new XRRigidTransform(
          { x: position.x, y: position.y, z: position.z },
          quaternion,
        ),
        space,
      )) as PersistentAnchor;
      if (generation !== this.generation) {
        anchor.delete();
        return;
      }
      this.anchor = anchor;
      this.status = "session";
      if (
        anchor.requestPersistentHandle &&
        this.storage &&
        this.persistenceAllowed &&
        !this.pendingDelete
      ) {
        try {
          const handle = await anchor.requestPersistentHandle();
          if (generation !== this.generation) {
            await this.session.deletePersistentAnchor?.(handle);
            return;
          }
          this.handle = handle;
          try {
            this.storage.setItem(ANCHOR_KEY, handle);
            this.status = "persistent";
          } catch {
            this.persistenceAllowed = false;
            this.handle = undefined;
            if (this.session.deletePersistentAnchor) {
              try {
                await this.session.deletePersistentAnchor(handle);
              } catch {
                this.pendingDelete = handle;
              }
            } else this.pendingDelete = handle;
            this.report(
              "Storage non disponibile: anchor di sessione mantenuto.",
            );
          }
        } catch {
          this.report(
            "Anchor di sessione attivo; salvataggio persistente non riuscito.",
          );
        }
      }
    } catch {
      if (generation === this.generation) {
        this.status = "failed";
        this.report("Creazione anchor fallita: ultima posa mantenuta.");
      }
    }
  }
  update(frame: XRFrame, space: XRReferenceSpace, root: THREE.Group): boolean {
    if (!this.anchor) return false;
    const pose = frame.getPose(this.anchor.anchorSpace, space);
    if (!pose) return false;
    this.poseMatrix.fromArray(pose.transform.matrix);
    this.avatarScale.copy(root.scale);
    this.poseMatrix.decompose(root.position, root.quaternion, root.scale);
    root.scale.copy(this.avatarScale);
    return true;
  }
  dispose() {
    this.generation++;
    this.anchor?.delete();
    this.anchor = undefined;
  }
}
