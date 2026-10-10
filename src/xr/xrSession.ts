import * as THREE from "three";
import { AnchorManager, type AnchorStatus } from "./anchors";
import {
  floorIntersection,
  isFloorPlane,
  pointInPolygon,
  polygonArea,
  proposePlacement,
  type Placement,
} from "./floorPlacement";
import type { ExtendedSession } from "./types";
import { UI3D, type XRAction } from "../ui/ui3d";

export type XRDiagnostic = {
  active: boolean;
  mode: XRSessionMode;
  blendMode: string;
  reference: string;
  planes: number;
  floor: string;
  feetY: number;
  calibrated: boolean;
  placed: boolean;
  anchor: AnchorStatus;
  tracking: string;
  hitTest: string;
  persistent: string;
  anchors: string;
};
export class XRExperience {
  readonly marker: THREE.Mesh;
  readonly ui = new UI3D();
  session?: ExtendedSession;
  private reference?: XRReferenceSpace;
  private anchors?: AnchorManager;
  private hitSource?: XRHitTestSource;
  private candidate?: Placement;
  private started = 0;
  private floorY = 0;
  private pendingConfirm = false;
  private busy = false;
  private restored = false;
  private lockedFloor?: XRPlane;
  private viewerPosition = new THREE.Vector3();
  private viewerQuaternion = new THREE.Quaternion();
  private floorOffset = 0;
  private raySelected = false;
  private narrativeMode = false;
  onWorldRay?: (ray: THREE.Ray) => void;
  diagnostic: XRDiagnostic = {
    active: false,
    mode: "immersive-ar",
    blendMode: "da verificare",
    reference: "preview",
    planes: 0,
    floor: "simulato",
    feetY: 0,
    calibrated: true,
    placed: false,
    anchor: "none",
    tracking: "preview",
    hitTest: "non attivo",
    persistent: "da verificare",
    anchors: "da verificare",
  };
  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    private avatar: THREE.Group,
    private report: (message: string) => void,
    private onAction: (action: XRAction) => void,
    private onEnd: () => void,
  ) {
    this.marker = new THREE.Mesh(
      new THREE.RingGeometry(0.19, 0.24, 32),
      new THREE.MeshBasicMaterial({ color: 0x54e4bd, side: THREE.DoubleSide }),
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.visible = false;
    scene.add(this.marker, this.ui.root);
    renderer.xr.enabled = true;
    for (let i = 0; i < 2; i++) {
      const controller = renderer.xr.getController(i);
      const ray = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(),
          new THREE.Vector3(0, 0, -3),
        ]),
        new THREE.LineBasicMaterial({ color: 0x64ffd3 }),
      );
      controller.add(ray);
      scene.add(controller);
    }
  }
  async enter(mode: XRSessionMode = "immersive-ar") {
    if (this.session || this.busy) return;
    if (!navigator.xr)
      throw new Error("WebXR non disponibile. Usa Anteprima 3D.");
    this.busy = true;
    let session: ExtendedSession | undefined;
    try {
      try {
        session = await navigator.xr.requestSession(mode, {
          optionalFeatures:
            mode === "immersive-vr"
              ? ["local-floor"]
              : ["local-floor", "plane-detection", "hit-test", "anchors"],
        });
      } catch (error) {
        if (
          !(error instanceof DOMException) ||
          !["NotSupportedError", "TypeError"].includes(error.name)
        )
          throw error;
        this.report(
          "Funzionalità opzionali non disponibili: avvio MR ridotta.",
        );
        session = await navigator.xr.requestSession(mode, {
          optionalFeatures: ["local-floor"],
        });
      }
      this.session = session;
      this.diagnostic.mode = mode;
      this.diagnostic.blendMode =
        session.environmentBlendMode ?? "non dichiarato";
      let reference: XRReferenceSpace;
      try {
        reference = await session.requestReferenceSpace("local-floor");
        this.diagnostic.reference = "local-floor";
        this.diagnostic.calibrated = true;
      } catch {
        reference = await session.requestReferenceSpace("local");
        this.diagnostic.reference = "local";
        this.diagnostic.calibrated = false;
      }
      this.reference = reference;
      this.renderer.xr.setReferenceSpaceType(
        this.diagnostic.reference as XRReferenceSpaceType,
      );
      await this.renderer.xr.setSession(session);
      this.renderer.xr.setReferenceSpace(reference);
      this.scene.background = null;
      this.renderer.setClearColor(0x000000, 0);
      this.avatar.visible = false;
      this.avatar.position.set(0, 0, 0);
      this.avatar.quaternion.identity();
      this.diagnostic.active = true;
      this.diagnostic.placed = false;
      this.diagnostic.floor = "ricerca (3 s)";
      this.diagnostic.tracking = "attesa";
      this.diagnostic.anchors = "da verificare sul frame";
      this.diagnostic.persistent = session.restorePersistentAnchor
        ? "API disponibile"
        : "non disponibile";
      this.floorY = 0;
      this.floorOffset = 0;
      this.diagnostic.feetY = 0;
      this.candidate = undefined;
      this.raySelected = false;
      this.started = performance.now();
      this.ui.root.visible = true;
      this.anchors = new AnchorManager(session, this.report);
      reference.addEventListener("reset", this.onReferenceReset);
      session.addEventListener("end", this.handleEnd, { once: true });
      session.addEventListener("select", this.select);
      session.addEventListener("visibilitychange", this.visibilityChange);
      this.report(
        this.diagnostic.calibrated
          ? "Posiziona: guarda il pavimento, scegli un punto e conferma."
          : "Calibrazione richiesta: regola la quota piedi e premi Quota corretta.",
      );
      if (mode === "immersive-ar" && session.requestHitTestSource) {
        try {
          const viewer = await session.requestReferenceSpace("viewer");
          this.hitSource = await session.requestHitTestSource({
            space: viewer,
          });
          this.diagnostic.hitTest = "attivo";
        } catch {
          this.diagnostic.hitTest = "non disponibile";
        }
      }
      this.restored =
        mode === "immersive-ar" ? await this.anchors.restore() : false;
      if (mode === "immersive-ar" && !this.restored)
        await this.anchors?.clear();
      if (this.restored) {
        this.diagnostic.placed = true;
        this.report("Anchor ripristinato: attendo tracking della posa.");
      }
    } catch (error) {
      await session?.end().catch(() => {});
      this.session = undefined;
      throw error;
    } finally {
      this.busy = false;
    }
  }
  private onReferenceReset = () => {
    if (this.narrativeMode) {
      if (!this.anchors?.anchor) {
        this.diagnostic.placed = false;
        this.candidate = undefined;
        this.pendingConfirm = false;
      }
      this.report(
        "Riferimento ricentrato: ritorno alla realtà per verificare il posizionamento.",
      );
      this.onAction("reality");
      return;
    }
    if (!this.anchors?.anchor) {
      // A local coordinate is not an anchor; after recenter ask for placement again.
      this.diagnostic.placed = false;
      this.avatar.visible = false;
      this.candidate = undefined;
      this.report("Riferimento ricentrato senza anchor — riposiziona.");
    }
  };
  private visibilityChange = () => {
    if (this.session?.visibilityState !== "visible") this.onAction("mute");
  };
  private select = (event: XRInputSourceEvent) => {
    if (!this.reference) return;
    const pose = event.frame.getPose(
      event.inputSource.targetRaySpace,
      this.reference,
    );
    if (!pose) return;
    const ray = new THREE.Ray(
      new THREE.Vector3().setFromMatrixPosition(
        new THREE.Matrix4().fromArray(pose.transform.matrix),
      ),
      new THREE.Vector3(0, 0, -1).applyQuaternion(
        new THREE.Quaternion(
          pose.transform.orientation.x,
          pose.transform.orientation.y,
          pose.transform.orientation.z,
          pose.transform.orientation.w,
        ),
      ),
    );
    const action = this.ui.hit(ray);
    if (action) {
      this.onAction(action);
      return;
    }
    if (this.narrativeMode) {
      this.onWorldRay?.(ray);
      return;
    }
    if (this.diagnostic.placed) return;
    const point = floorIntersection(
      ray.origin,
      ray.direction,
      this.floorY + this.floorOffset,
    );
    if (point) {
      this.raySelected = true;
      this.candidate = {
        position: point,
        yaw: Math.atan2(
          this.viewerPosition.x - point.x,
          this.viewerPosition.z - point.z,
        ),
      };
      this.report("Punto selezionato. Conferma la posizione.");
    }
  };
  setNarrativeMode(active: boolean) {
    this.narrativeMode = active;
    if (active) this.marker.visible = false;
    else if (this.session && !this.diagnostic.placed)
      this.avatar.visible = false;
  }
  get viewerPose() {
    return {
      position: this.viewerPosition,
      orientation: this.viewerQuaternion,
    };
  }
  confirm() {
    if (this.narrativeMode) return;
    if (this.diagnostic.placed || this.pendingConfirm || !this.candidate)
      return;
    if (!this.diagnostic.calibrated) {
      this.report(
        "Regola la quota e premi Quota corretta prima di confermare.",
      );
      return;
    }
    this.pendingConfirm = true;
  }
  calibrate() {
    this.diagnostic.calibrated = true;
    this.report("Quota confermata manualmente. Ora conferma la posizione.");
  }
  adjustFloor(amount: number) {
    if (this.diagnostic.placed) {
      this.report("Premi Riposiziona prima di regolare la quota.");
      return;
    }
    this.floorOffset = THREE.MathUtils.clamp(
      this.floorOffset + amount,
      -2.5,
      2.5,
    );
    if (this.candidate)
      this.candidate.position.y = this.floorY + this.floorOffset;
  }
  async reposition() {
    if (this.narrativeMode) {
      this.report("Torna alla realtà prima di riposizionare.");
      return;
    }
    if (this.busy) return;
    this.busy = true;
    this.pendingConfirm = false;
    try {
      await this.anchors?.clear();
      this.diagnostic.placed = false;
      this.restored = false;
      this.lockedFloor = undefined;
      this.candidate = undefined;
      this.raySelected = false;
      this.avatar.visible = false;
      this.report("Scegli una nuova posizione e conferma.");
    } finally {
      this.busy = false;
    }
  }
  async exit() {
    await this.session?.end();
  }
  update(frame: XRFrame) {
    if (!this.reference || !this.session) return;
    const viewer = frame.getViewerPose(this.reference);
    if (!viewer) {
      this.diagnostic.tracking = "degradato: ultima posa mantenuta";
      return;
    }
    const p = viewer.transform.position,
      q = viewer.transform.orientation;
    this.viewerPosition.set(p.x, p.y, p.z);
    this.viewerQuaternion.set(q.x, q.y, q.z, q.w);
    this.ui.followViewer(this.viewerPosition, this.viewerQuaternion);
    if (this.narrativeMode) {
      this.marker.visible = false;
      this.diagnostic.tracking = "osservatorio · posa stanza fissa";
      return;
    }
    this.diagnostic.anchors = frame.createAnchor
      ? "API disponibile"
      : "non disponibile";
    // Current plane-detection API places detectedPlanes on XRFrame (not XRSession).
    const planes = frame.detectedPlanes;
    this.diagnostic.planes = planes?.size ?? 0;
    this.diagnostic.tracking = "attivo";
    if (this.diagnostic.placed) {
      if (this.anchors?.anchor) {
        if (this.anchors.update(frame, this.reference, this.avatar)) {
          this.avatar.visible = true;
          this.restored = false;
        } else
          this.diagnostic.tracking =
            "anchor non tracciato: ultima posa mantenuta";
      }
      if (this.lockedFloor && planes && !planes.has(this.lockedFloor))
        this.diagnostic.tracking = "piano perso: ultima posa mantenuta";
    } else if (!this.busy) {
      if (!this.candidate) {
        if (this.diagnostic.reference === "local")
          this.floorY = this.viewerPosition.y - 1.6;
        this.candidate = proposePlacement(
          this.viewerPosition,
          this.viewerQuaternion,
          this.floorY + this.floorOffset,
        );
      }
      let best: XRPlane | undefined;
      let bestArea = 0;
      if (performance.now() - this.started >= 3000) {
        for (const plane of planes || []) {
          const pose = frame.getPose(plane.planeSpace, this.reference);
          if (!pose) continue;
          const area = polygonArea(plane.polygon);
          const semanticLabel = (plane as XRPlane & { semanticLabel?: string })
            .semanticLabel;
          if (
            !isFloorPlane(
              plane.orientation,
              pose.transform.position.y,
              area,
              this.diagnostic.reference === "local-floor",
              semanticLabel,
            )
          )
            continue;
          const inverse = new THREE.Matrix4()
            .fromArray(pose.transform.matrix)
            .invert();
          const local = this.candidate.position.clone().applyMatrix4(inverse);
          if (!pointInPolygon(local.x, local.z, plane.polygon)) continue;
          if (area > bestArea) {
            best = plane;
            bestArea = area;
            this.floorY = pose.transform.position.y;
          }
        }
        this.lockedFloor = best;
        this.diagnostic.floor = best
          ? "piano orizzontale compatibile col pavimento"
          : this.diagnostic.reference === "local-floor"
            ? "quota local-floor (verifica visiva)"
            : "quota manuale";
        if (best) this.diagnostic.calibrated = true;
      }
      // Hit tests never override a confirmed pose and cannot select elevated tables.
      if (this.hitSource && !this.lockedFloor && !this.raySelected) {
        const hit = frame
          .getHitTestResults(this.hitSource)[0]
          ?.getPose(this.reference);
        if (
          hit &&
          this.diagnostic.reference === "local-floor" &&
          Math.abs(hit.transform.position.y) <= 0.2
        ) {
          this.candidate.position.set(
            hit.transform.position.x,
            hit.transform.position.y + this.floorOffset,
            hit.transform.position.z,
          );
          this.candidate.yaw = Math.atan2(
            this.viewerPosition.x - hit.transform.position.x,
            this.viewerPosition.z - hit.transform.position.z,
          );
          this.floorY = hit.transform.position.y;
          this.diagnostic.floor = "hit-test vicino a local-floor";
        }
      }
      this.candidate.position.y = this.floorY + this.floorOffset;
      this.marker.position.copy(this.candidate.position);
      this.marker.position.y += 0.008;
      this.marker.visible = true;
    }
    if (this.pendingConfirm && this.candidate) {
      this.pendingConfirm = false;
      this.diagnostic.placed = true;
      this.avatar.position.copy(this.candidate.position);
      this.avatar.rotation.set(0, this.candidate.yaw, 0);
      this.avatar.visible = true;
      this.report("Pronto. Posizione confermata nello spazio della stanza.");
      void this.anchors?.create(
        frame,
        this.reference,
        this.candidate.position.clone(),
        this.candidate.yaw,
      );
    }
    if (this.diagnostic.placed) this.marker.visible = false;
    this.diagnostic.feetY = this.diagnostic.placed
      ? this.avatar.position.y
      : (this.candidate?.position.y ?? 0);
    this.diagnostic.anchor = this.anchors?.status ?? "none";
    if (this.restored)
      this.diagnostic.tracking = "attesa della posa ripristinata";
  }
  private handleEnd = () => {
    this.reference?.removeEventListener("reset", this.onReferenceReset);
    this.session?.removeEventListener("select", this.select);
    this.session?.removeEventListener(
      "visibilitychange",
      this.visibilityChange,
    );
    this.hitSource?.cancel();
    this.hitSource = undefined;
    this.anchors?.dispose();
    this.anchors = undefined;
    this.session = undefined;
    this.reference = undefined;
    this.pendingConfirm = false;
    this.restored = false;
    this.narrativeMode = false;
    this.ui.root.visible = false;
    this.marker.visible = false;
    this.diagnostic.active = false;
    this.diagnostic.reference = "preview";
    this.diagnostic.placed = false;
    this.avatar.visible = true;
    this.avatar.position.set(0, 0, 0);
    this.avatar.rotation.set(0, 0, 0);
    this.onEnd();
  };
  dispose() {
    void this.exit();
    this.ui.dispose();
  }
}
