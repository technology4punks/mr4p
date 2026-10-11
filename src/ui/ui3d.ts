import * as THREE from "three";
import type { VoiceActivity } from "../audio/voicePresentation";
import { canvasSurface, glass } from "./canvasSurface";
export type XRAction =
  | "confirm"
  | "reposition"
  | "lower"
  | "raise"
  | "voice"
  | "mute"
  | "unlock"
  | "reset"
  | "exit"
  | "calibrate"
  | "observatory"
  | "future"
  | "reality"
  | "prepare-vr"
  | "menu"
  | "placement-menu"
  | "talk"
  | "voice-mode"
  | "suspend-voice"
  | "resume-voice"
  | "ambience"
  | "theme";
type Context = "placement" | "reality" | "observatory";
type Button = {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  canvas: HTMLCanvasElement;
  label: string;
};

export class UI3D {
  readonly root = new THREE.Group();
  private panel = new THREE.Group();
  private shortcuts = new THREE.Group();
  private buttons: Button[] = [];
  private targets: Button[] = [];
  private canvas = document.createElement("canvas");
  private texture: THREE.CanvasTexture;
  private lastText = "";
  private context: Context = "placement";
  private open = false;
  private align = true;
  private focus = -1;
  private keyboardFocus = false;
  private caster = new THREE.Raycaster();
  private forward = new THREE.Vector3(0, 0, -1);
  private right = new THREE.Vector3();
  private theme = "Ambiente";
  private future: "critical" | "sustainable" = "critical";
  constructor() {
    this.canvas.width = 1024;
    this.canvas.height = 160;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    const status = new THREE.Mesh(
      new THREE.PlaneGeometry(0.67, 0.11),
      new THREE.MeshBasicMaterial({
        map: this.texture,
        depthTest: false,
        depthWrite: false,
        transparent: true,
      }),
    );
    status.position.set(0, 0.225, 0.002);
    status.renderOrder = 101;
    const backingCanvas = document.createElement("canvas");
    backingCanvas.width = 768;
    backingCanvas.height = 720;
    const ctx = backingCanvas.getContext("2d")!;
    canvasSurface(ctx, 768, 720, glass.panel, glass.border, 64);
    ctx.font = "600 25px sans-serif";
    ctx.fillStyle = "#a5d6cc";
    ctx.textAlign = "center";
    ctx.fillText("NEO  ·  OSSERVATORIO", 384, 48);
    ctx.font = "22px sans-serif";
    ctx.fillStyle = "#93aeb6";
    ctx.fillText("Punta + pinch / grilletto · stick + A", 384, 686);
    const backingTexture = new THREE.CanvasTexture(backingCanvas);
    backingTexture.colorSpace = THREE.SRGBColorSpace;
    const backing = new THREE.Mesh(
      new THREE.PlaneGeometry(0.74, 0.7),
      new THREE.MeshBasicMaterial({
        map: backingTexture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }),
    );
    backing.position.set(0, -0.015, -0.008);
    backing.renderOrder = 100;
    this.panel.add(backing, status);
    // The small dock shares the panel's upper-right world anchor.
    this.shortcuts.position.set(0, 0, 0);
    this.root.add(this.panel, this.shortcuts);
    this.makeButton(this.shortcuts, "menu", "Menu · A / X", 0, 0.07, 0.32);
    this.makeButton(
      this.shortcuts,
      "talk",
      "Avvia voce",
      0,
      -0.014,
      0.32,
    );
    this.makeButton(this.shortcuts, "theme", "Ambiente →", 0, -0.098, 0.32);
    this.rebuild();
    this.root.visible = false;
  }
  private makeButton(
    parent: THREE.Group,
    action: XRAction,
    label: string,
    x: number,
    y: number,
    width = 0.31,
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 112;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, 0.07),
      new THREE.MeshBasicMaterial({
        map: texture,
        depthTest: false,
        depthWrite: false,
        transparent: true,
      }),
    );
    mesh.position.set(x, y, 0.004);
    mesh.userData.action = action;
    mesh.renderOrder = 102;
    parent.add(mesh);
    const button = { mesh, canvas, label };
    this.buttons.push(button);
    this.draw(button, false);
  }
  private draw(button: Button, selected: boolean) {
    const ctx = button.canvas.getContext("2d")!;
    canvasSurface(ctx, 640, 112, selected ? glass.selected : glass.button, selected ? glass.accent : glass.border, 42);
    ctx.fillStyle = selected ? "#e5fff6" : "#d7e6e8";
    ctx.font = "500 37px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(button.label, 320, 69, 606);
    button.mesh.material.map!.needsUpdate = true;
  }
  private rebuild() {
    for (const button of this.buttons.filter(
      (b) => b.mesh.parent === this.panel,
    )) {
      button.mesh.removeFromParent();
      button.mesh.geometry.dispose();
      button.mesh.material.map?.dispose();
      button.mesh.material.dispose();
    }
    this.buttons = this.buttons.filter((b) => b.mesh.parent === this.shortcuts);
    const actions: [XRAction, string][] =
      this.context === "placement"
        ? [
            ["confirm", "Conferma posizione"],
            ["reposition", "Nuovo punto"],
            ["lower", "Quota −5 cm"],
            ["raise", "Quota +5 cm"],
            ["calibrate", "Quota corretta"],
            ["voice", "Avvia / stop voce"],
            ["exit", "Esci da XR"],
            ["menu", "Chiudi menu"],
          ]
        : [
            ["voice", "Avvia / stop voce"],
            ["talk", "Riprendi ascolto"],
            ["mute", "Mic on / off"],
            ["voice-mode", "Interruzioni on / off"],
            [
              this.context === "observatory" ? "future" : "observatory",
              this.context === "observatory"
                ? "Futuro sostenibile"
                : "Visita il 2050",
            ],
            [
              this.context === "observatory" ? "reality" : "prepare-vr",
              this.context === "observatory"
                ? "Torna alla realtà"
                : "Prepara VR",
            ],
            ["ambience", "Suoni on / off"],
            ["theme", `${this.theme} →`],
            ["unlock", "Riattiva audio"],
            ["placement-menu", "Posizionamento"],
            ["exit", "Esci da XR"],
            ["menu", "Chiudi menu"],
          ];
    actions.forEach(([action, label], i) =>
      this.makeButton(
        this.panel,
        action,
        label,
        i % 2 ? 0.166 : -0.166,
        0.15 - Math.floor(i / 2) * 0.084,
      ),
    );
    this.focus = -1;
    this.keyboardFocus = false;
    this.updateTargets();
    this.setTheme(this.theme);
    this.setFuture(this.future);
  }
  setTheme(title: string) {
    this.theme = title;
    for (const button of this.buttons.filter((b) => b.mesh.userData.action === "theme")) {
      if (button.label === `${title} →`) continue;
      button.label = `${title} →`;
      this.draw(button, this.targets[this.focus] === button);
    }
  }
  setFuture(future: "critical" | "sustainable") {
    this.future = future;
    const button = this.buttons.find((b) => b.mesh.userData.action === "future");
    const label = future === "critical" ? "Futuro sostenibile" : "Futuro critico";
    if (button && button.label !== label) { button.label = label; this.draw(button, this.targets[this.focus] === button); }
  }
  setContext(context: Context) {
    if (context === this.context) return;
    this.context = context;
    this.rebuild();
  }
  setOpen(open: boolean) {
    if (open && !this.open) this.align = true;
    this.open = open;
    this.focus = -1;
    this.keyboardFocus = false;
    this.updateTargets();
    this.buttons.forEach((button) => this.draw(button, false));
  }
  toggle() {
    this.setOpen(!this.open);
  }
  get isOpen() {
    return this.open;
  }
  get focusedAction(): XRAction | undefined {
    return this.keyboardFocus
      ? this.targets[this.focus]?.mesh.userData.action
      : undefined;
  }
  private updateTargets() {
    this.panel.visible = this.open;
    this.shortcuts.visible = !this.open;
    this.targets = this.buttons.filter(
      (b) => b.mesh.parent === (this.open ? this.panel : this.shortcuts),
    );
  }
  navigate(horizontal: number, vertical: number) {
    if (!this.open) this.setOpen(true);
    const step = vertical ? (vertical > 0 ? 2 : -2) : horizontal > 0 ? 1 : -1;
    const index =
      this.focus < 0
        ? 0
        : (this.focus + step + this.targets.length) % this.targets.length;
    this.highlight(this.targets[index].mesh.userData.action);
    this.keyboardFocus = true;
  }
  highlight(action?: XRAction) {
    const next = this.targets.findIndex(
      (b) => b.mesh.userData.action === action,
    );
    if (next === this.focus) return;
    this.focus = next;
    this.keyboardFocus = false;
    this.targets.forEach((b, i) => this.draw(b, i === next));
  }
  pointerFocus(action?: XRAction) {
    this.keyboardFocus = false;
    this.highlight(action);
  }
  setStatus(text: string) {
    if (text === this.lastText) return;
    this.lastText = text;
    const ctx = this.canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 1024, 160);
    ctx.fillStyle = "#e6f3ef";
    ctx.font = "500 35px sans-serif";
    ctx.textAlign = "center";
    text
      .split("\n")
      .slice(0, 2)
      .forEach((line, i) =>
        ctx.fillText(line.slice(0, 70), 512, 56 + i * 55, 970),
      );
    this.texture.needsUpdate = true;
  }
  setVoiceControls(connected: boolean, muted: boolean, interruptions: boolean, activity: VoiceActivity = "off") {
    for (const button of this.buttons) {
      const action = button.mesh.userData.action;
      const label =
        action === "voice"
          ? connected
            ? "Termina voce"
            : "Avvia voce"
          : action === "talk"
            ? !connected ? "Avvia voce" : activity === "speaking" || activity === "processing" ? "Interrompi NEO" : "Riprendi ascolto"
          : action === "mute"
            ? muted
              ? "Riattiva microfono"
              : "Spegni microfono"
            : action === "voice-mode"
              ? "Interruzioni: " + (interruptions ? "Filtro voce" : "Protette")
              : button.label;
      if (label !== button.label) {
        button.label = label;
        this.draw(button, this.targets[this.focus] === button);
      }
    }
  }
  followViewer(position: THREE.Vector3, orientation: THREE.Quaternion) {
    // Both the panel and closed shortcuts stay in world space. Only an
    // explicit menu opening or a new XR reference can request repositioning.
    if (!this.align) return;
    this.forward.set(0, 0, -1).applyQuaternion(orientation);
    this.forward.y = 0;
    if (this.forward.lengthSq() < 0.001) this.forward.set(0, 0, -1);
    this.forward.normalize();
    this.right.set(-this.forward.z, 0, this.forward.x);
    this.root.position
      .copy(position)
      .addScaledVector(this.forward, 1.65)
      .addScaledVector(this.right, 0.8);
    this.root.position.y += 0.32;
    this.root.lookAt(position);
    this.align = false;
    this.root.updateMatrixWorld(true);
  }
  resetPlacement() {
    this.align = true;
  }
  intersection(ray: THREE.Ray) {
    if (!this.root.visible) return;
    this.root.updateMatrixWorld(true);
    this.caster.ray.copy(ray);
    const hit = this.caster.intersectObjects(
      this.targets.map((b) => b.mesh),
      false,
    )[0];
    return hit
      ? {
          action: hit.object.userData.action as XRAction,
          distance: hit.distance,
        }
      : undefined;
  }
  hit(ray: THREE.Ray) {
    return this.intersection(ray)?.action;
  }
  dispose() {
    this.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.MeshBasicMaterial).map?.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
    this.root.removeFromParent();
  }
}
