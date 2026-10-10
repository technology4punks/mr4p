import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { AvatarController } from "./avatar/AvatarController";
import type { AvatarState } from "./avatar/animations";
import { RealtimeClient, type VoiceSnapshot } from "./audio/realtimeClient";
import { XRExperience, type XRDiagnostic } from "./xr/xrSession";
import type { XRAction } from "./ui/ui3d";

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
};
export class Experience {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, 0.05, 50);
  private controls: OrbitControls;
  readonly avatar = new AvatarController();
  readonly voice: RealtimeClient;
  readonly xr: XRExperience;
  private floor = new THREE.Group();
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
  private viewerPosition = new THREE.Vector3();
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
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Scena 3D orbitabile di NEO",
    );
    this.host.append(this.renderer.domElement);
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
    this.scene.add(new THREE.HemisphereLight(0xe3fff7, 0x304451, 2.8));
    const light = new THREE.DirectionalLight(0xffffff, 3);
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
    this.scene.add(this.floor, this.avatar.root);
    this.voice = new RealtimeClient(
      (snapshot) => {
        this.avatar.setState(snapshot.state);
      },
      (role, text) => {
        if (this.debug) transcript(role, text);
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
        this.voice.stop();
        this.floor.visible = true;
        this.controls.enabled = true;
        this.camera.position.set(2.4, 1.6, 3.6);
        this.controls.target.set(0, 0.8, 0);
        this.controls.update();
        this.renderer.setClearColor(0x101e27, 1);
        this.message = "Anteprima 3D. Sessione MR terminata.";
      },
    );
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
    };
  }
  private render = (time: number, frame?: XRFrame) => {
    this.floor.visible = !frame;
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const levels = this.voice.levels();
    if (frame) this.xr.update(frame);
    else this.controls.update();
    const camera = frame ? this.renderer.xr.getCamera() : this.camera;
    camera.getWorldPosition(this.viewerPosition);
    this.avatar.update(
      delta,
      levels.output,
      levels.audible,
      this.viewerPosition,
    );
    const voice = this.voice.snapshot;
    const stateLabels: Record<AvatarState, string> = {
      idle: "Pronto",
      greeting: "Ciao!",
      listening: "Ascolto",
      thinking: "Attendi",
      speaking: "Rispondo",
      positive: "Sì",
      negative: "No",
      error: "Errore",
    };
    this.xr.ui.setStatus(
      `${this.xr.diagnostic.placed ? stateLabels[this.avatar.state] : "Posiziona"} · ${voice.muted ? "Mic spento" : voice.status === "connected" ? "Voce attiva" : "Voce spenta"}\n${voice.status === "error" || voice.playbackBlocked ? voice.message : this.message}`,
    );
    this.renderer.render(this.scene, this.camera);
    this.frames++;
    if (time - this.fpsStart > 1000) {
      this.fps = Math.round((this.frames * 1000) / (time - this.fpsStart));
      this.fpsStart = time;
      this.frames = 0;
    }
    if (time - this.lastNotify > 200) {
      this.changed(this.snapshot(levels.input, levels.output));
      this.lastNotify = time;
    }
  };
  async enter() {
    try {
      await this.xr.enter();
      if (this.xr.session) {
        this.floor.visible = false;
        this.controls.enabled = false;
      }
    } catch (error) {
      this.message =
        error instanceof Error
          ? `MR non avviata: ${error.message}`
          : "MR non avviata. Verifica i permessi.";
    }
  }
  action(action: XRAction) {
    switch (action) {
      case "voice":
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
      this.camera.position.set(2.4, 1.6, 3.6);
      this.controls.target.set(0, 0.8, 0);
      this.message = "Anteprima 3D: trascina per ruotare, pizzica per zoomare.";
    }
  }
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
    this.renderer.setAnimationLoop(null);
    this.resize.disconnect();
    this.voice.dispose();
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
