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
import { XRInputLatch } from "./input";

type InputState = {
  latch: XRInputLatch;
  root: THREE.Group;
  line: THREE.Line;
  cursor: THREE.Mesh;
  ray: THREE.Ray;
  pinching: boolean;
};

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
  private checkRestoredPlacement = false;
  private autoPlacement = true;
  private lockedFloor?: XRPlane;
  private viewerPosition = new THREE.Vector3();
  private viewerQuaternion = new THREE.Quaternion();
  private viewerTracked = false;
  private floorOffset = 0;
  private raySelected = false;
  private narrativeMode = false;
  private inputs = new Map<XRInputSource, InputState>();
  private navigationRay?: THREE.Ray;
  private navigationSource?: XRInputSource;
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
              ? ["local-floor", "hand-tracking"]
              : [
                  "local-floor",
                  "plane-detection",
                  "hit-test",
                  "anchors",
                  "hand-tracking",
                ],
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
      this.autoPlacement = true;
      this.checkRestoredPlacement = false;
      this.raySelected = false;
      this.started = performance.now();
      this.ui.root.visible = true;
      this.ui.setContext("placement");
      this.ui.setOpen(!this.diagnostic.calibrated);
      this.anchors = new AnchorManager(session, this.report);
      reference.addEventListener("reset", this.onReferenceReset);
      session.addEventListener("end", this.handleEnd, { once: true });
      session.addEventListener("selectstart", this.selectStart);
      session.addEventListener("selectend", this.selectEnd);
      session.addEventListener("squeezestart", this.squeezeStart);
      session.addEventListener("squeezeend", this.squeezeEnd);
      session.addEventListener("visibilitychange", this.visibilityChange);
      this.report(
        this.diagnostic.calibrated
          ? "Attendo il pavimento: NEO apparirà automaticamente a 1,3 metri."
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
        this.checkRestoredPlacement = true;
        this.diagnostic.placed = true;
        this.ui.setContext("reality");
        this.ui.setOpen(false);
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
    this.autoPlacement = false;
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
      this.ui.setContext("placement");
      this.ui.setOpen(true);
      this.report("Riferimento ricentrato senza anchor — riposiziona.");
    }
  };
  private visibilityChange = () => {
    if (this.session?.visibilityState !== "visible") this.onAction("mute");
  };
  private input(source: XRInputSource): InputState {
    const existing = this.inputs.get(source);
    if (existing) return existing;
    const root = new THREE.Group();
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(0, 0, -1),
      ]),
      new THREE.LineBasicMaterial({
        color: 0x84eac9,
        depthTest: false,
        depthWrite: false,
      }),
    );
    const cursor = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 8, 6),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        depthTest: false,
        depthWrite: false,
      }),
    );
    line.renderOrder = cursor.renderOrder = 110;
    root.add(line, cursor);
    this.scene.add(root);
    const state = {
      latch: new XRInputLatch(),
      root,
      line,
      cursor,
      ray: new THREE.Ray(),
      pinching: false,
    };
    this.inputs.set(source, state);
    return state;
  }
  private inputRay(source: XRInputSource, frame: XRFrame) {
    if (!this.reference) return;
    const state = this.input(source);
    const pose = frame.getPose(source.targetRaySpace, this.reference);
    state.root.visible = !!pose;
    if (!pose) {
      state.latch.release("select");
      state.pinching = false;
      return;
    }
    const p = pose.transform.position,
      q = pose.transform.orientation;
    state.root.position.set(p.x, p.y, p.z);
    state.root.quaternion.set(q.x, q.y, q.z, q.w);
    state.ray.origin.copy(state.root.position);
    state.ray.direction.set(0, 0, -1).applyQuaternion(state.root.quaternion);
    return state;
  }
  private selectStart = (event: XRInputSourceEvent) => {
    const state = this.inputRay(event.inputSource, event.frame);
    if (state?.latch.edge("select", true, performance.now()))
      this.activate(state.ray);
  };
  private selectEnd = (event: XRInputSourceEvent) => {
    this.inputs.get(event.inputSource)?.latch.release("select", performance.now());
  };
  private squeezeStart = (event: XRInputSourceEvent) => {
    if (
      this.input(event.inputSource).latch.edge("menu", true, performance.now())
    )
      this.ui.toggle();
  };
  private squeezeEnd = (event: XRInputSourceEvent) => {
    this.inputs.get(event.inputSource)?.latch.release("menu", performance.now());
  };
  private activate(ray: THREE.Ray) {
    const action = this.ui.focusedAction ?? this.ui.hit(ray);
    if (action === "menu") {
      this.ui.toggle();
      return;
    }
    if (action === "placement-menu") {
      if (this.narrativeMode) {
        this.report("Torna alla realtà prima di riposizionare.");
        return;
      }
      this.ui.setContext("placement");
      this.ui.setOpen(true);
      return;
    }
    if (action) {
      this.onAction(action);
      if (
        ![
          "confirm",
          "lower",
          "raise",
          "calibrate",
          "reposition",
          "reset",
        ].includes(action)
      )
        this.ui.setOpen(false);
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
      this.autoPlacement = false;
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
  }
  private updateInputs(frame: XRFrame) {
    let hovered: XRAction | undefined;
    const now = performance.now();
    const sources = this.session?.inputSources ?? [];
    for (const [source, state] of this.inputs)
      if (!Array.from(sources).includes(source)) {
        this.disposeInput(state);
        this.inputs.delete(source);
      }
    for (const source of sources) {
      const state = this.inputRay(source, frame);
      if (!state) continue;
      const hit = this.ui.intersection(state.ray);
      if (
        source === this.navigationSource &&
        this.navigationRay &&
        this.ui.focusedAction &&
        (state.ray.origin.distanceToSquared(this.navigationRay.origin) >
          0.0025 ||
          state.ray.direction.dot(this.navigationRay.direction) < 0.995)
      ) {
        this.ui.pointerFocus(hit?.action);
        this.navigationRay = undefined;
      }
      const length = hit?.distance ?? 3;
      state.line.scale.z = length;
      state.cursor.position.z = -length;
      (state.line.material as THREE.LineBasicMaterial).color.set(
        hit ? 0xaaffd9 : 0x709497,
      );
      state.cursor.visible = !!hit;
      if (hit) hovered = hit.action;
      const pad = source.gamepad;
      if (pad) {
        const menu = !!(
          pad.buttons[1]?.pressed ||
          pad.buttons[3]?.pressed ||
          pad.buttons[4]?.pressed
        );
        if (state.latch.edge("menu", menu, now)) this.ui.toggle();
        const offset = pad.axes.length >= 4 ? 2 : 0;
        if (this.ui.isOpen) {
          const direction = state.latch.axis(
            pad.axes[offset] ?? 0,
            pad.axes[offset + 1] ?? 0,
            now,
          );
          if (direction) {
            this.ui.navigate(...direction);
            this.navigationRay = state.ray.clone();
            this.navigationSource = source;
          }
        }
        if (state.latch.edge("select", !!pad.buttons[0]?.pressed, now))
          this.activate(state.ray);
      } else if (source.hand && frame.getJointPose) {
        const thumb = source.hand.get("thumb-tip"),
          index = source.hand.get("index-finger-tip");
        const a = thumb && frame.getJointPose(thumb, this.reference!),
          b = index && frame.getJointPose(index, this.reference!);
        if (a && b) {
          const p = a.transform.position,
            q = b.transform.position;
          const distance = Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
          state.pinching = distance < (state.pinching ? 0.04 : 0.022);
          if (state.latch.edge("select", state.pinching, now))
            this.activate(state.ray);
        } else {
          state.pinching = false;
          state.latch.release("select");
        }
      }
    }
    if (!this.ui.focusedAction) this.ui.highlight(hovered);
  }
  private disposeInput(state: InputState) {
    state.root.removeFromParent();
    for (const object of [state.line, state.cursor]) {
      object.geometry.dispose();
      (object.material as THREE.Material).dispose();
    }
  }
  setNarrativeMode(active: boolean) {
    this.narrativeMode = active;
    this.ui.setContext(
      active ? "observatory" : this.diagnostic.placed ? "reality" : "placement",
    );
    this.ui.setOpen(!active && !this.diagnostic.placed);
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
  get isViewerTracked() {
    return this.viewerTracked && this.session?.visibilityState === "visible";
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
    this.autoPlacement = false;
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
    this.autoPlacement = false;
    this.floorOffset = THREE.MathUtils.clamp(
      this.floorOffset + amount,
      -2.5,
      2.5,
    );
    if (this.candidate)
      this.candidate.position.y = this.floorY + this.floorOffset;
  }
  async reposition(automatic = false) {
    if (this.narrativeMode) {
      this.report("Torna alla realtà prima di riposizionare.");
      return;
    }
    if (this.busy) return;
    this.busy = true;
    this.pendingConfirm = false;
    const session = this.session;
    try {
      await this.anchors?.clear();
      if (!session || this.session !== session) return;
      this.diagnostic.placed = false;
      this.restored = false;
      this.checkRestoredPlacement = false;
      this.autoPlacement = automatic;
      if (automatic) this.started = performance.now();
      this.lockedFloor = undefined;
      this.candidate = undefined;
      this.raySelected = false;
      this.avatar.visible = false;
      this.ui.setContext("placement");
      this.ui.setOpen(!automatic);
      this.report(automatic
        ? "Riposiziono NEO automaticamente davanti a te, a 1,3 metri."
        : "Scegli una nuova posizione e conferma.");
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
    this.viewerTracked = !!viewer;
    if (!viewer) {
      this.diagnostic.tracking = "degradato: ultima posa mantenuta";
      return;
    }
    const p = viewer.transform.position,
      q = viewer.transform.orientation;
    this.viewerPosition.set(p.x, p.y, p.z);
    this.viewerQuaternion.set(q.x, q.y, q.z, q.w);
    this.ui.followViewer(this.viewerPosition, this.viewerQuaternion);
    this.updateInputs(frame);
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
          if (this.checkRestoredPlacement && !this.busy) {
            this.checkRestoredPlacement = false;
            const expected = proposePlacement(this.viewerPosition, this.viewerQuaternion, this.avatar.position.y);
            const distance = Math.hypot(
              this.avatar.position.x - expected.position.x,
              this.avatar.position.z - expected.position.z,
            );
            if (distance > 0.2) {
              this.avatar.visible = false;
              void this.reposition(true);
              return;
            }
          }
          this.avatar.visible = true;
          this.restored = false;
        } else
          this.diagnostic.tracking =
            "anchor non tracciato: ultima posa mantenuta";
      }
      if (this.lockedFloor && planes && !planes.has(this.lockedFloor))
        this.diagnostic.tracking = "piano perso: ultima posa mantenuta";
    } else if (!this.busy) {
      if (!this.candidate || this.autoPlacement) {
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
      if (this.hitSource && !this.lockedFloor && !this.raySelected && !this.autoPlacement) {
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
      if (this.autoPlacement && this.diagnostic.calibrated && performance.now() - this.started >= 3000) {
        // Avoid detected table/wall footprints. This is not a complete real-room map.
        const point = this.candidate.position;
        const blocked = [...(planes ?? [])].some((plane) => {
          if (plane === this.lockedFloor) return false;
          const pose = frame.getPose(plane.planeSpace, this.reference!);
          if (!pose) return false;
          const matrix = new THREE.Matrix4().fromArray(pose.transform.matrix);
          const bounds = new THREE.Box3().setFromPoints(plane.polygon.map((p) =>
            new THREE.Vector3(p.x, p.y, p.z).applyMatrix4(matrix)));
          if (bounds.max.y < point.y + 0.15 || bounds.min.y > point.y + 2.1) return false;
          return point.x >= bounds.min.x - 0.35 && point.x <= bounds.max.x + 0.35 &&
            point.z >= bounds.min.z - 0.35 && point.z <= bounds.max.z + 0.35;
        });
        if (blocked) {
          this.autoPlacement = false;
          this.ui.setOpen(true);
          this.report("Superficie rilevata davanti a te: scegli un punto libero e conferma.");
        } else this.pendingConfirm = true;
      }
    }
    if (this.pendingConfirm && this.candidate) {
      this.pendingConfirm = false;
      this.diagnostic.placed = true;
      this.avatar.position.copy(this.candidate.position);
      this.avatar.rotation.set(0, this.candidate.yaw, 0);
      this.avatar.visible = true;
      this.ui.setContext("reality");
      this.ui.setOpen(false);
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
    this.session?.removeEventListener("selectstart", this.selectStart);
    this.session?.removeEventListener("selectend", this.selectEnd);
    this.session?.removeEventListener("squeezestart", this.squeezeStart);
    this.session?.removeEventListener("squeezeend", this.squeezeEnd);
    this.session?.removeEventListener(
      "visibilitychange",
      this.visibilityChange,
    );
    this.hitSource?.cancel();
    this.hitSource = undefined;
    this.anchors?.dispose();
    this.anchors = undefined;
    this.session = undefined;
    this.viewerTracked = false;
    this.reference = undefined;
    this.pendingConfirm = false;
    this.restored = false;
    this.narrativeMode = false;
    this.ui.root.visible = false;
    for (const state of this.inputs.values()) this.disposeInput(state);
    this.inputs.clear();
    this.navigationRay = undefined;
    this.navigationSource = undefined;
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
