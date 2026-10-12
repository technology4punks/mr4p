import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { AvatarController } from "./avatar/AvatarController";
import { CompanionFollow } from "./avatar/CompanionFollow";
import { Portal } from "./avatar/Portal";
import { sectorPositions } from "./observatory/CityTransformationEngine";
import { optionById } from "./decision/catalog";
import type { AvatarState } from "./avatar/animations";
import { RealtimeClient, type VoiceSnapshot } from "./audio/realtimeClient";
import { XRExperience, type XRDiagnostic } from "./xr/xrSession";
import type { XRAction } from "./ui/ui3d";
import {
  StoryEngine,
  type StoryResult,
  type StorySnapshot,
} from "./story/StoryEngine";
import { FutureObservatory } from "./observatory/FutureObservatory";
import { AdaptiveQuality, smoothTransition } from "./observatory/performance";
import { Ambience } from "./observatory/Ambience";
import { VoiceIndicator } from "./ui/VoiceIndicator";
import { voicePresentation } from "./audio/voicePresentation";

export type ExperienceSnapshot = {
  asset: "loading" | "loaded" | "fallback";
  clips: string[];
  message: string;
  voice: VoiceSnapshot;
  xr: XRDiagnostic;
  input: number;
  output: number;
  fps: number;
  state: AvatarState;
  story: StorySnapshot;
  immersion: number;
  transformation: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  quality: string;
  observatoryAssets: string;
  districtAssets: string;
  compositor: string;
  companion: string;
};
export class Experience {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(52, 1, 0.05, 150);
  private controls: OrbitControls;
  readonly avatar = new AvatarController();
  readonly voice: RealtimeClient;
  private voiceIndicator = new VoiceIndicator();
  readonly xr: XRExperience;
  private floor = new THREE.Group();
  private portal = new Portal();
  private portalInitialized = false;
  private gazeTarget = new THREE.Vector3();
  private saving = false;
  private saveGeneration = 0;
  private savedRecord?: { id: string; deleteToken: string };
  private sessionId = crypto.randomUUID();
  private deleteToken = crypto.randomUUID() + crypto.randomUUID();
  private previewAmbient = new THREE.HemisphereLight(0xe3fff7, 0x304451, 2.8);
  private previewSun = new THREE.DirectionalLight(0xffffff, 3);
  private clock = new THREE.Clock();
  private resize: ResizeObserver;
  private disposed = false;
  private asset: ExperienceSnapshot["asset"] = "loading";
  private clips: string[] = [];
  private message = "Caricamento avatar…";
  private lastNotify = 0;
  private frames = 0;
  private fps = 0;
  private fpsStart = 0;
  private debug = false;
  private discoveryStarted = false;
  private pausedAt: number | null = null;
  private viewerPosition = new THREE.Vector3();
  readonly story = new StoryEngine();
  readonly observatory = new FutureObservatory();
  private companion = new CompanionFollow(
    this.observatory.companionBounds,
    this.observatory.companionObstacles,
  );
  private companionViewer = new THREE.Vector3();
  private companionOrientation = new THREE.Quaternion();
  private roomOrientation = new THREE.Quaternion();
  private companionMoving = false;
  private quality = new AdaptiveQuality();
  private ambience = new Ambience();
  private ambientContext?: AudioContext;
  private ambientEnabled = false;
  private immersion = 0;
  private transformation = 0;
  private transitionStartedAt = 0;
  private transitionStart = 0;
  private needsAlignment = false;
  private visualStoryKey = "";
  private savedRealityPose = {
    position: new THREE.Vector3(),
    orientation: new THREE.Quaternion(),
  };
  private unsubscribeStory?: () => void;
  private preloadTimer?: ReturnType<typeof setTimeout>;
  private pointerStart = { x: 0, y: 0 };
  constructor(
    private host: HTMLElement,
    private changed: (snapshot: ExperienceSnapshot) => void,
    transcript: (role: string, text: string) => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Scena 3D orbitabile di NEO",
    );
    this.host.appendChild(this.renderer.domElement);
    this.renderer.domElement.addEventListener(
      "webglcontextlost",
      this.contextLost,
    );
    this.camera.position.set(2.4, 1.6, 3.6);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0.8, 0);
    this.controls.enableDamping = true;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 6;
    this.controls.maxPolarAngle = Math.PI / 2;
    this.scene.add(this.previewAmbient);
    const light = this.previewSun;
    light.position.set(2, 4, 2);
    this.scene.add(light);
    const surface = new THREE.Mesh(
      new THREE.CircleGeometry(2.3, 64),
      new THREE.MeshStandardMaterial({ color: 0x20343e, roughness: 0.9 }),
    );
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = -0.012;
    const grid = new THREE.GridHelper(4.4, 22, 0x407166, 0x2b4848);
    grid.position.y = -0.008;
    this.floor.add(surface, grid);
    this.avatar.root.visible = false;
    this.scene.add(
      this.floor,
      this.avatar.root,
      this.observatory.root,
      this.voiceIndicator.root,
      this.portal.root,
    );
    this.voice = new RealtimeClient(
      (snapshot) => {
        this.avatar.setState(snapshot.state);
        // Voice changes must reach the page even when rendering is throttled.
        if (this.xr) {
          const levels = this.voice.levels();
          this.changed(this.snapshot(levels.input, levels.output));
        }
      },
      (role, text) => {
        if (this.debug) transcript(role, text);
      },
      (name, args) => this.storyTool(name, args),
      () => {
        if (this.story.snapshot.state === "INVITATION") this.startDiscovery();
      },
    );
    this.xr = new XRExperience(
      this.renderer,
      this.scene,
      this.avatar.root,
      (msg) => {
        this.message = msg;
      },
      (action) => this.action(action),
      () => {
        // Session changes do not end the WebRTC connection.
        this.voice.setImmersive(false);
        this.voice.setInputSuspended(false);
        this.savedRealityPose.position.set(0, 0, 0);
        this.savedRealityPose.orientation.identity();
        if (this.story.snapshot.environment === "observatory") {
          this.observatory.root.position.set(0, 0, 0);
          this.observatory.root.rotation.set(0, 0, 0);
          this.avatar.root.position.set(0.75, 0, -1.0);
          this.configurePreview(true);
        } else this.configurePreview(false);
        this.message =
          "Sessione XR terminata. Anteprima 3D; la voce mantiene il proprio controllo.";
      },
    );
    this.xr.onWorldRay = (ray) => {
      const text = this.observatory.narrativeRay(ray);
      if (text) this.exploreObject(text);
    };
    this.unsubscribeStory = this.story.subscribe((snapshot) => {
      this.storyChanged(snapshot);
      // Controls must acknowledge narrative actions even when mobile rendering
      // is paused/throttled while the canvas is outside the visible viewport.
      const levels = this.voice.levels();
      this.changed(this.snapshot(levels.input, levels.output));
    });
    this.voice.synchronizeStory(this.story.snapshot);
    this.preloadTimer = setTimeout(() => {
      if (!this.disposed) void this.observatory.preload(this.renderer);
    }, 1800);
    this.renderer.domElement.addEventListener("pointerdown", this.pointerDown);
    this.renderer.domElement.addEventListener("pointerup", this.pointerUp);
    document.addEventListener("visibilitychange", this.ambientBackground);
    this.renderer.setClearColor(0x101e27, 1);
    this.resize = new ResizeObserver(this.onResize);
    this.resize.observe(host);
    this.onResize();
    this.renderer.setAnimationLoop(this.render);
    void this.avatar.load().then((result) => {
      if (this.disposed) return;
      this.asset = result.loaded ? "loaded" : "fallback";
      this.clips = result.clips;
      this.message = result.loaded
        ? "NEO è pronto. Esplora in 3D o entra in realtà mista."
        : "Modello non disponibile: avatar procedurale di riserva. Ricarica per riprovare.";
      this.avatar.setState("greeting");
    });
  }
  private contextLost = (event: Event) => {
    event.preventDefault();
    this.voice.stop();
    void this.xr.exit();
    this.message =
      "Grafica interrotta. Ricarica la pagina per ripristinare la scena.";
    this.changed(this.snapshot(0, 0));
  };
  private onResize = () => {
    if (this.renderer.xr.isPresenting) return;
    const { width, height } = this.host.getBoundingClientRect();
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };
  private snapshot(input: number, output: number): ExperienceSnapshot {
    return {
      asset: this.asset,
      clips: this.clips,
      message: this.message,
      voice: { ...this.voice.snapshot },
      xr: { ...this.xr.diagnostic },
      input,
      output,
      fps: this.fps,
      state: this.avatar.state,
      story: { ...this.story.snapshot },
      immersion: this.immersion,
      transformation: this.transformation,
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      quality: this.quality.quality,
      observatoryAssets: this.observatory.assetStatus,
      districtAssets: this.observatory.districtAssetStatus,
      compositor: this.xr.session
        ? `${this.xr.diagnostic.mode} / ${this.xr.diagnostic.blendMode} · occultamento da verificare`
        : "3D browser",
      companion: this.companionMoving
        ? "seguito laterale · collisioni virtuali"
        : this.xr.session && this.story.snapshot.environment === "reality"
          ? "sguardo 360° · posizione fissa in MR"
          : "sguardo 360°",
    };
  }
  private render = (time: number, frame?: XRFrame) => {
    this.floor.visible = !frame && this.immersion < 0.01;
    const elapsed = Math.min(this.clock.getDelta(), 1);
    const delta = Math.min(elapsed, 0.05);
    const levels = this.voice.levels();
    if (frame) this.xr.update(frame);
    else {
      this.controls.update();
      if (this.story.snapshot.environment === "observatory") {
        this.camera.position.x = THREE.MathUtils.clamp(
          this.camera.position.x,
          -1.9,
          1.9,
        );
        this.camera.position.y = THREE.MathUtils.clamp(
          this.camera.position.y,
          1.15,
          2.2,
        );
        this.camera.position.z = THREE.MathUtils.clamp(
          this.camera.position.z,
          -1.9,
          2,
        );
      }
    }
    if (this.needsAlignment && (!this.xr.session || frame))
      this.alignObservatory();
    this.updateStoryVisuals();
    this.observatory.update(this.pausedAt ?? time);
    if (
      this.story.snapshot.environment === "observatory" &&
      this.pausedAt === null
    )
      this.observatory.applyCityState(
        this.story.snapshot.decisions.city,
        this.observatory.transformations.visualChannels,
      );
    this.ambience.update(
      this.observatory.transformations.visualChannels.air,
      this.immersion,
      levels.output > 0.02 || levels.input > 0.02,
      time,
    );
    this.ambience.setCity(this.story.snapshot.decisions.city);
    const camera = frame ? this.renderer.xr.getCamera() : this.camera;
    camera.getWorldPosition(this.viewerPosition);
    this.companionMoving = false;
    if (
      frame &&
      this.xr.isViewerTracked &&
      this.immersion > 0.99 &&
      this.story.snapshot.environment === "observatory" &&
      this.story.snapshot.state !== "RETURNING_TO_MR" &&
      this.story.snapshot.state !== "PAUSED"
    ) {
      this.companionViewer.copy(this.viewerPosition);
      this.observatory.root.worldToLocal(this.companionViewer);
      camera.getWorldQuaternion(this.companionOrientation);
      this.observatory.root.getWorldQuaternion(this.roomOrientation).invert();
      this.companionOrientation.premultiply(this.roomOrientation);
      this.companionMoving = this.companion.update(
        this.avatar.root.position,
        this.companionViewer,
        this.companionOrientation,
        delta,
      );
    } else this.companion.reset();
    this.avatar.setMoving(this.companionMoving);
    let gaze = this.viewerPosition;
    if (this.story.snapshot.state === "APPLYING_INTERVENTION") {
      const id =
        this.story.decisions.snapshot.revision?.newOptionId ??
        this.story.decisions.snapshot.active.at(-1)?.optionId;
      const option = optionById.get(id ?? "");
      if (option) {
        this.gazeTarget.fromArray(sectorPositions[option.sector]);
        this.observatory.root.localToWorld(this.gazeTarget);
        gaze = this.gazeTarget;
      }
    }
    this.avatar.update(
      delta,
      levels.output,
      levels.audible,
      !frame || this.xr.isViewerTracked ? gaze : undefined,
    );
    const voice = this.voice.snapshot;
    this.xr.ui.setDecisionState(this.story.snapshot);
    this.xr.ui.setVoiceControls(
      ["connected", "connecting"].includes(voice.status),
      voice.muted,
      voice.interruptions,
      voice.activity,
    );
    const voiceInfo = voicePresentation(voice);
    const placing =
      !this.xr.diagnostic.placed &&
      this.story.snapshot.environment !== "observatory";
    this.xr.ui.setStatus(
      `${placing ? "Posizionamento · " : ""}${voiceInfo.label}\n${voice.status === "error" || voice.playbackBlocked ? voice.message : placing ? this.message : voiceInfo.detail}`,
    );
    this.voiceIndicator.update(
      voice,
      levels.input,
      this.avatar.root,
      this.viewerPosition,
    );
    this.renderer.render(this.scene, this.camera);
    this.frames++;
    if (time - this.fpsStart > 1000) {
      this.fps = Math.round((this.frames * 1000) / (time - this.fpsStart));
      this.fpsStart = time;
      this.frames = 0;
      if (this.quality.sample(this.fps, !!frame)) {
        this.observatory.setQuality(this.quality.quality);
        if (!frame)
          this.renderer.setPixelRatio(
            Math.min(devicePixelRatio, this.quality.pixelRatio),
          );
        // WebXR foveation may change in-session; framebuffer scale is set before the next session.
        if (frame)
          this.renderer.xr.setFoveation(
            this.quality.quality === "low" ? 1 : 0.7,
          );
      }
    }
    if (time - this.lastNotify > 200) {
      this.changed(this.snapshot(levels.input, levels.output));
      this.lastNotify = time;
    }
  };
  async enter(mode: XRSessionMode = "immersive-ar") {
    try {
      this.renderer.xr.setFramebufferScaleFactor(this.quality.framebufferScale);
      this.voice.setImmersive(true);
      await this.xr.enter(mode);
      if (this.xr.session) {
        this.voice.setImmersive(true);
        this.voice.setInputSuspended(
          this.xr.session.visibilityState !== "visible",
        );
        this.floor.visible = false;
        this.controls.enabled = false;
        if (this.story.snapshot.environment === "observatory") {
          this.xr.setNarrativeMode(true);
          this.needsAlignment = true;
          this.avatar.root.position.set(0.75, 0, -1.0);
          this.avatar.root.quaternion.identity();
          this.avatar.root.visible = true;
        }
        const session = this.xr.session;
        if (session.supportedFrameRates?.includes(72))
          void session.updateTargetFrameRate(72).catch(() => {});
      } else this.voice.setImmersive(false);
    } catch (error) {
      this.voice.setImmersive(!!this.xr.session);
      this.message =
        error instanceof Error
          ? `MR non avviata: ${error.message}`
          : "MR non avviata. Verifica i permessi.";
    }
  }
  action(action: XRAction) {
    if (action.startsWith("lever:")) {
      this.applyTool("select_lever", { leverId: action.slice(6) });
      return;
    }
    if (action.startsWith("revision-slot:")) {
      this.xr.ui.selectRevisionSlot(action.slice(14));
      return;
    }
    if (action === "revision-page") {
      this.xr.ui.nextRevisionPage();
      return;
    }
    if (action.startsWith("option:")) {
      this.choose(action.slice(7));
      return;
    }
    switch (action) {
      case "talk":
        if (
          ["WAITING_FOR_START", "EXPERIENCE_COMPLETED", "USER_EXIT"].includes(
            this.story.snapshot.state,
          )
        )
          break;
        if (this.voice.snapshot.status === "connected") {
          void this.voice.resumeListening();
        } else if (this.voice.snapshot.status !== "connecting")
          void this.voice.start();
        break;
      case "suspend-voice":
        this.voice.setInputSuspended(true);
        break;
      case "resume-voice":
        this.voice.setInputSuspended(false);
        break;
      case "voice-mode":
        this.voice.toggleInterruptions();
        break;
      case "ambience":
        this.toggleAmbience();
        break;
      case "prepare-vr":
        void this.prepareVR();
        break;
      case "decision":
        if (
          [
            "SHOWING_CRITICAL_FUTURE",
            "REVEALING_CONSEQUENCES",
            "OPTIONAL_FIFTH_DECISION",
          ].includes(this.story.snapshot.state)
        )
          this.applyTool("continue_decisions", {});
        this.xr.ui.showChoices(this.story.snapshot);
        break;
      case "continue":
        this.applyTool(
          this.story.snapshot.state === "FINAL_CITY_REFLECTION"
            ? "complete_reflection"
            : "continue_decisions",
          {},
        );
        break;
      case "finish":
        this.applyTool("finish_decisions", {});
        break;
      case "revision":
        if (this.applyTool("request_revision", {}).accepted)
          this.xr.ui.showChoices(this.story.snapshot);
        break;
      case "consent-yes":
        this.applyTool("set_storage_consent", { consent: true });
        break;
      case "consent-no":
        this.applyTool("set_storage_consent", { consent: false });
        break;
      case "observatory":
        this.visit();
        break;

      case "reality":
        this.returnToReality();
        break;
      case "voice":
        if (
          ["WAITING_FOR_START", "EXPERIENCE_COMPLETED", "USER_EXIT"].includes(
            this.story.snapshot.state,
          )
        )
          break;
        if (["connected", "connecting"].includes(this.voice.snapshot.status))
          this.voice.stop();
        else void this.voice.start();
        break;
      case "mute":
        this.voice.mute(
          this.xr.session?.visibilityState !== "visible" && !!this.xr.session
            ? true
            : undefined,
        );
        break;
      case "unlock":
        void this.voice.unlockAudio();
        break;
      case "confirm":
        this.xr.confirm();
        break;
      case "calibrate":
        this.xr.calibrate();
        break;
      case "lower":
        this.xr.adjustFloor(-0.05);
        break;
      case "raise":
        this.xr.adjustFloor(0.05);
        break;
      case "reset":
      case "reposition":
        void this.xr.reposition();
        break;
      case "exit":
        void this.xr.exit();
        break;
    }
  }
  preview() {
    if (this.xr.session) void this.xr.exit();
    else {
      this.configurePreview(this.story.snapshot.environment === "observatory");
      this.message = "Anteprima 3D: trascina per ruotare, pizzica per zoomare.";
    }
  }
  private configurePreview(observatory: boolean) {
    this.controls.enabled = true;
    this.controls.enablePan = !observatory;
    this.controls.minDistance = observatory ? 1.2 : 1.5;
    this.controls.maxDistance = observatory ? 4.5 : 6;
    this.controls.minAzimuthAngle = observatory ? -0.42 : -Infinity;
    this.controls.maxAzimuthAngle = observatory ? 0.42 : Infinity;
    this.controls.minPolarAngle = observatory ? 1.15 : 0;
    this.controls.maxPolarAngle = observatory ? 1.7 : Math.PI / 2;
    this.camera.fov = observatory ? 62 : 52;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(
      observatory ? 0 : 2.4,
      1.6,
      observatory ? 1.8 : 3.6,
    );
    this.controls.target.set(
      0,
      observatory ? 1.55 : 0.8,
      observatory ? -2.5 : 0,
    );
    this.controls.update();
    this.renderer.setClearColor(0x101e27, 1);
    this.onResize();
  }
  private storyTool(name: string, args: string): StoryResult {
    if (
      name === "enter_observatory" &&
      this.xr.session &&
      this.xr.diagnostic.mode === "immersive-ar" &&
      !this.xr.diagnostic.placed
    )
      return {
        accepted: false,
        reason: "Conferma prima il robot sul pavimento della stanza reale.",
        snapshot: { ...this.story.snapshot },
      };
    if (
      name === "enter_observatory" &&
      this.xr.session?.environmentBlendMode === "additive"
    )
      return {
        accepted: false,
        reason:
          "Questo compositing non può occultare il mondo reale. Usa il pulsante VR se disponibile.",
        snapshot: { ...this.story.snapshot },
      };
    return this.story.tool(name, args);
  }
  private storyChanged(snapshot: StorySnapshot) {
    this.voice.synchronizeStory(snapshot);
    this.message = snapshot.message;
    this.xr.ui.setDecisionState(snapshot);
    if (snapshot.state === "PAUSED") {
      this.pausedAt = performance.now();
      return;
    }
    if (this.pausedAt !== null) {
      const pausedDuration = performance.now() - this.pausedAt;
      this.transitionStartedAt += pausedDuration;
      this.portal.shiftTime(pausedDuration);
      this.observatory.transformations.shiftTime(pausedDuration);
      this.pausedAt = null;
    }
    const key = `${snapshot.state}:${snapshot.transitioning}`;
    if (key === this.visualStoryKey) return;
    this.visualStoryKey = key;
    if (snapshot.state === "ENTERING_OBSERVATORY") {
      this.savedRealityPose.position.copy(this.avatar.root.position);
      this.savedRealityPose.orientation.copy(this.avatar.root.quaternion);
      this.observatory.root.add(this.avatar.root);
      this.avatar.root.position.set(0.75, 0, -1);
      this.avatar.root.quaternion.identity();
      this.avatar.root.visible = true;
      this.xr.setNarrativeMode(true);
      this.needsAlignment = true;
      this.transformation = 0;
      this.observatory.applyCityState(snapshot.decisions.city);
      this.observatory.transformations.apply(
        snapshot.decisions.city,
        performance.now(),
        false,
      );
      this.transitionStartedAt = performance.now();
      this.transitionStart = this.immersion;
      if (!this.xr.session) this.configurePreview(true);
      void this.observatory.preload(this.renderer);
    }
    if (snapshot.state === "APPLYING_INTERVENTION") {
      this.transitionStartedAt = performance.now();
      this.observatory.transformations.apply(
        snapshot.decisions.city,
        performance.now(),
      );
      this.avatar.setState("positive");
    }
    if (snapshot.state === "RETURNING_TO_MR") {
      this.transitionStartedAt = performance.now();
      this.transitionStart = this.immersion;
    }
    if (snapshot.state === "SAVING_MESSAGE") void this.saveReflection();
    if (snapshot.state === "USER_EXIT") {
      this.avatar.root.visible = false;
      this.voice.stop();
      void this.xr.exit();
      this.portal.root.visible = false;
    }
    if (snapshot.state === "FAREWELL") {
      this.transitionStartedAt = performance.now();
      this.avatar.setState("greeting");
      this.voice.requestNarration(
        "Saluta brevemente. Non dire che il messaggio è salvato se saved è false.",
      );
    }
    if (snapshot.state === "EXPERIENCE_COMPLETED") {
      this.avatar.root.visible = false;
      this.voice.stop();
      void this.xr.exit();
    }
    if (
      [
        "SHOWING_CRITICAL_FUTURE",
        "REVEALING_CONSEQUENCES",
        "FINAL_CITY_REFLECTION",
        "ASKING_FINAL_QUESTION",
      ].includes(snapshot.state)
    )
      this.voice.requestNarration(
        "Nuovo stato autorevole: " +
          snapshot.message +
          " Descrivi solo trasformazioni attive. Una o due frasi, poi lascia spazio all’utente.",
      );
  }
  private alignObservatory() {
    this.needsAlignment = false;
    if (this.xr.session) {
      const pose = this.xr.viewerPose;
      this.observatory.root.position.set(
        pose.position.x,
        this.xr.diagnostic.calibrated
          ? this.xr.diagnostic.feetY
          : pose.position.y - 1.6,
        pose.position.z,
      );
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
        pose.orientation,
      );
      this.observatory.root.rotation.y = Math.atan2(-forward.x, -forward.z);
    } else {
      this.observatory.root.position.set(0, 0, 0);
      this.observatory.root.rotation.set(0, 0, 0);
    }
  }
  private updateStoryVisuals() {
    const s = this.story.snapshot;
    // Head/companion animation still clamps delta for comfort. Narrative fades
    // use monotonic wall time so a slow frame cannot stretch eight seconds.
    // Only a phase change resets the clock, never a theme change.
    const transitionTime =
      Math.max(0, performance.now() - this.transitionStartedAt) / 1000;
    if (
      s.state === "OPENING_PORTAL" &&
      (!this.xr.session || this.xr.diagnostic.placed)
    ) {
      if (!this.portalInitialized) {
        this.portalInitialized = true;
        const avatarPosition = this.avatar.root.getWorldPosition(
          new THREE.Vector3(),
        );
        const viewer = this.xr.session
          ? this.xr.viewerPose.position
          : new THREE.Vector3(0, 1.6, 2);
        const direction = avatarPosition.clone().sub(viewer);
        direction.y = 0;
        direction.normalize();
        const at = this.xr.session
          ? avatarPosition.clone().addScaledVector(direction, 0.7)
          : new THREE.Vector3(0, 0, -0.7);
        this.portal.open(at, viewer, performance.now());
        this.avatar.root.visible = true;
        this.avatar.visual.scale.setScalar(0.001);
      }
      this.portal.update(performance.now());
      if (this.portal.active) this.story.dispatch({ type: "portal_open" });
    }
    if (s.state === "AVATAR_GREETING") {
      const fraction = this.portal.update(performance.now());
      this.avatar.visual.scale.setScalar(Math.max(0.001, fraction));
      this.avatar.visual.position.z = -0.7 * (1 - fraction);
      if (!this.portal.active) {
        this.avatar.visual.scale.setScalar(1);
        this.avatar.visual.position.z = 0;
        this.story.dispatch({ type: "portal_complete" });
        if (this.voice.snapshot.status === "connected") this.startDiscovery();
      }
    }
    if (s.state === "ENTERING_OBSERVATORY") {
      this.immersion =
        this.transitionStart +
        (1 - this.transitionStart) * smoothTransition(transitionTime, 3);
      if (transitionTime >= 3) this.story.dispatch({ type: "entry_complete" });
    }
    if (s.state === "APPLYING_INTERVENTION") {
      this.transformation = smoothTransition(transitionTime, 7);
      if (transitionTime >= 7)
        this.story.dispatch({ type: "transformation_complete" });
    }
    if (s.state === "RETURNING_TO_MR") {
      this.immersion =
        this.transitionStart * (1 - smoothTransition(transitionTime, 2.5));
      if (transitionTime >= 2.5) {
        this.scene.add(this.avatar.root);
        this.avatar.root.position.copy(this.savedRealityPose.position);
        this.avatar.root.quaternion.copy(this.savedRealityPose.orientation);
        this.xr.setNarrativeMode(false);
        this.scene.fog = null;
        this.story.dispatch({ type: "return_complete" });
        if (this.xr.diagnostic.mode === "immersive-vr" && this.xr.session) {
          void this.xr.exit();
          this.message =
            "Premi Entra in realtà mista per riaprire il passthrough.";
        } else if (!this.xr.session) this.configurePreview(false);
      }
    }
    if (
      s.state === "FAREWELL" &&
      transitionTime > 4 &&
      this.voice.snapshot.activity !== "speaking" &&
      this.voice.snapshot.activity !== "processing"
    )
      this.story.dispatch({ type: "farewell_complete" });
    this.observatory.setOpacity(this.immersion);
    this.previewAmbient.intensity = 2.8 * (1 - this.immersion);
    this.previewSun.intensity = 3 * (1 - this.immersion);
    if (this.immersion > 0.99) {
      this.scene.fog ??= new THREE.FogExp2(
        this.observatory.fogColor,
        this.observatory.fogDensity,
      );
      (this.scene.fog as THREE.FogExp2).color.copy(this.observatory.fogColor);
      (this.scene.fog as THREE.FogExp2).density = this.observatory.fogDensity;
    } else this.scene.fog = null;
    if (this.xr.session) this.renderer.setClearColor(0x000000, 0);
  }
  async startExperience(useMR = true) {
    if (
      this.story.snapshot.state === "EXPERIENCE_COMPLETED" ||
      this.story.snapshot.state === "USER_EXIT"
    )
      this.restart();
    if (!this.story.dispatch({ type: "start" }).accepted) return;
    // Explicit Start is also the microphone gesture; voice is never automatic on load.
    void this.voice.start();
    if (useMR && navigator.xr) await this.enter();
    this.story.dispatch({ type: "initialized" });
  }
  applyTool(name: string, args: Record<string, unknown>) {
    const result = this.storyTool(name, JSON.stringify(args));
    if (!result.accepted) {
      this.message = result.reason;
      this.changed(
        this.snapshot(this.voice.levels().input, this.voice.levels().output),
      );
    } else
      this.voice.requestNarration(
        "Richiesta esplicita dell’utente applicata: " +
          name +
          ". Rispetta lo stato restituito e non anticipare altre scelte.",
      );
    return result;
  }
  choose(optionId: string) {
    return this.story.snapshot.state === "OPTIONAL_REVISION"
      ? this.applyTool("revise_intervention", {
          slotId: this.xr.ui.revisionSlot,
          newOptionId: optionId,
          consent: true,
        })
      : this.applyTool("choose_intervention", { optionId, confirmed: true });
  }
  visit() {
    return this.applyTool("enter_observatory", { consent: true });
  }
  returnToReality() {
    return this.applyTool("request_return_to_reality", {});
  }
  startDiscovery() {
    if (this.discoveryStarted) return;
    this.discoveryStarted = this.voice.requestNarration(
      "Presentati brevemente, chiedi il nome se non lo conosci, e invita nell’osservatorio. Attendi il consenso prima di entrare.",
    );
  }
  restart() {
    this.discoveryStarted = false;
    this.pausedAt = null;
    this.saveGeneration++;
    this.saving = false;
    this.voice.stop();
    this.story.reset();
    this.sessionId = crypto.randomUUID();
    this.deleteToken = crypto.randomUUID() + crypto.randomUUID();
    this.portalInitialized = false;
    this.portal.root.visible = false;
    this.avatar.visual.scale.setScalar(1);
    this.avatar.visual.position.z = 0;
    this.avatar.root.visible = false;
    this.scene.add(this.avatar.root);
    this.observatory.setOpacity(0);
    this.immersion = 0;
    this.visualStoryKey = "";
    this.configurePreview(false);
  }
  private async saveReflection() {
    if (this.saving || !this.story.snapshot.consent) return;
    this.saving = true;
    const s = this.story.snapshot,
      generation = this.saveGeneration,
      deleteToken = this.deleteToken;
    try {
      const response = await fetch("/api/future-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: this.sessionId,
          deleteToken: this.deleteToken,
          experienceVersion: "V4",
          sequence: s.decisions.sequence,
          active: s.decisions.active,
          revision: s.decisions.revision,
          reflection: s.reflection,
          message: s.generatedMessage,
          consent: true,
        }),
      });
      const data = (await response.json()) as { id?: unknown };
      if (!response.ok || data.id !== this.sessionId)
        throw new Error("Salvataggio non riuscito. Puoi riprovare.");
      if (generation !== this.saveGeneration) return;
      this.savedRecord = { id: data.id, deleteToken };
      this.story.dispatch({ type: "saved" });
    } catch (error) {
      if (generation === this.saveGeneration)
        this.story.dispatch({
          type: "save_failed",
          message:
            error instanceof Error ? error.message : "Backend indisponibile.",
        });
    } finally {
      if (generation === this.saveGeneration) this.saving = false;
    }
  }
  editReflection() {
    this.story.dispatch({ type: "edit_reflection" });
  }
  pauseResume() {
    this.story.dispatch({
      type: this.story.snapshot.state === "PAUSED" ? "resume" : "pause",
    });
  }
  exitExperience() {
    this.saveGeneration++;
    this.saving = false;
    this.story.dispatch({ type: "exit" });
    this.observatory.setOpacity(0);
    this.immersion = 0;
    this.avatar.root.visible = false;
  }
  downloadReceipt() {
    if (!this.savedRecord) return;
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              version: "V4",
              ...this.savedRecord,
              deleteEndpoint: `${location.origin}/api/future-sessions/${this.savedRecord.id}`,
              instructions:
                "DELETE all’endpoint con Authorization: Bearer deleteToken. Conserva questo file privatamente.",
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "future-observatory-ricevuta.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  debugEnter() {
    if (!this.debug) return;
    this.restart();
    for (const type of [
      "start",
      "initialized",
      "portal_open",
      "portal_complete",
    ] as const)
      this.story.dispatch({ type });
    this.avatar.visual.scale.setScalar(1);
    this.visit();
  }
  debugChoose(id: string) {
    if (!this.debug) return;
    const option = optionById.get(id);
    if (!option) return;
    if (
      this.story.snapshot.state === "SHOWING_CRITICAL_FUTURE" ||
      this.story.snapshot.state === "REVEALING_CONSEQUENCES" ||
      this.story.snapshot.state === "OPTIONAL_FIFTH_DECISION"
    )
      this.story.tool("continue_decisions", "{}");
    this.story.tool("select_lever", JSON.stringify({ leverId: option.lever }));
    this.choose(id);
  }
  async deleteSaved() {
    if (!this.savedRecord) return false;
    const response = await fetch(
      `/api/future-sessions/${this.savedRecord.id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${this.savedRecord.deleteToken}` },
      },
    );
    if (response.ok) this.savedRecord = undefined;
    return response.ok;
  }
  async prepareVR() {
    const supported = await navigator.xr
      ?.isSessionSupported("immersive-vr")
      .catch(() => false);
    if (!supported) {
      this.message =
        "Sessione VR non supportata. Puoi usare l’osservatorio nella modalità disponibile.";
      return;
    }
    if (this.xr.session) await this.xr.exit();
    this.message =
      "Per avviare VR premi ora Entra in VR. Il browser richiede un nuovo gesto esplicito.";
  }
  async enterVR() {
    await this.enter("immersive-vr");
    if (this.xr.session) {
      this.visit();
      this.xr.setNarrativeMode(true);
      this.needsAlignment = true;
    }
  }
  private exploreObject(text: string) {
    this.message = text;
    this.voice.requestNarration(text);
  }
  private pointerDown = (event: PointerEvent) => {
    this.pointerStart = { x: event.clientX, y: event.clientY };
  };
  private pointerUp = (event: PointerEvent) => {
    if (
      this.story.snapshot.environment !== "observatory" ||
      this.xr.session ||
      Math.hypot(
        event.clientX - this.pointerStart.x,
        event.clientY - this.pointerStart.y,
      ) > 8
    )
      return;
    const bounds = this.renderer.domElement.getBoundingClientRect();
    const text = this.observatory.narrativePointer(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      (-(event.clientY - bounds.top) / bounds.height) * 2 + 1,
      this.camera,
    );
    if (text) this.exploreObject(text);
  };
  toggleAmbience() {
    this.ambientEnabled = !this.ambientEnabled;
    if (this.ambientEnabled) {
      try {
        this.ambientContext ??= new AudioContext();
        void this.ambientContext.resume();
        this.ambience.enable(this.ambientContext);
      } catch {
        this.message = "Suoni ambiente non disponibili.";
      }
    } else this.ambience.disable();
  }
  private ambientBackground = () => {
    if (document.hidden) {
      this.ambience.dispose();
      void this.ambientContext?.close();
      this.ambientContext = undefined;
      this.ambientEnabled = false;
    }
  };
  emote(state: AvatarState) {
    this.avatar.setState(state, true);
  }
  setDebug(value: boolean) {
    this.debug = value;
  }
  setHeight(height: number) {
    this.avatar.setHeight(height);
  }
  dispose() {
    this.disposed = true;
    clearTimeout(this.preloadTimer);
    this.unsubscribeStory?.();
    this.ambience.dispose();
    void this.ambientContext?.close();
    this.renderer.domElement.removeEventListener(
      "pointerdown",
      this.pointerDown,
    );
    this.renderer.domElement.removeEventListener("pointerup", this.pointerUp);
    document.removeEventListener("visibilitychange", this.ambientBackground);
    this.scene.add(this.avatar.root);
    this.observatory.dispose();
    this.renderer.setAnimationLoop(null);
    this.resize.disconnect();
    this.voice.dispose();
    this.voiceIndicator.dispose();
    this.portal.dispose();
    this.xr.dispose();
    this.controls.dispose();
    this.avatar.dispose();
    this.renderer.domElement.removeEventListener(
      "webglcontextlost",
      this.contextLost,
    );
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        geometries.add(object.geometry);
        for (const mat of Array.isArray(object.material)
          ? object.material
          : [object.material])
          materials.add(mat);
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
