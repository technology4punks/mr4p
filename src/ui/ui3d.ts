import * as THREE from "three";
import type { VoiceActivity } from "../audio/voicePresentation";
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
  constructor() {
    this.canvas.width = 1024;
    this.canvas.height = 160;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    const status = new THREE.Mesh(
      new THREE.PlaneGeometry(1.04, 0.16),
      new THREE.MeshBasicMaterial({
        map: this.texture,
        depthTest: false,
        depthWrite: false,
      }),
    );
    status.position.set(0, 0.29, 0.002);
    status.renderOrder = 101;
    const backing = new THREE.Mesh(
      new THREE.PlaneGeometry(1.12, 0.98),
      new THREE.MeshBasicMaterial({
        color: 0x10232b,
        depthTest: false,
        depthWrite: false,
      }),
    );
    backing.position.set(0, -0.11, -0.008);
    backing.renderOrder = 100;
    this.panel.add(backing, status);
    // Closed controls use a fixed offset in the menu's world pose so they do
    // not cover NEO's face after the large panel closes.
    this.shortcuts.position.set(0.63, -0.4, 0);
    this.root.add(this.panel, this.shortcuts);
    this.makeButton(this.shortcuts, "menu", "Menu · A / X", 0, 0.02, 0.28);
    this.makeButton(
      this.shortcuts,
      "talk",
      "Avvia voce",
      0,
      -0.09,
      0.28,
    );
    this.rebuild();
    this.root.visible = false;
  }
  private makeButton(
    parent: THREE.Group,
    action: XRAction,
    label: string,
    x: number,
    y: number,
    width = 0.5,
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 112;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, 0.095),
      new THREE.MeshBasicMaterial({
        map: texture,
        depthTest: false,
        depthWrite: false,
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
    ctx.fillStyle = selected ? "#276956" : "#193641";
    ctx.fillRect(0, 0, 640, 112);
    ctx.strokeStyle = selected ? "#a3ffe0" : "#50767c";
    ctx.lineWidth = selected ? 7 : 3;
    ctx.strokeRect(4, 4, 632, 104);
    ctx.fillStyle = "#ffffff";
    ctx.font = "34px sans-serif";
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
            [
              this.context === "reality" ? "theme" : "placement-menu",
              this.context === "reality" ? "Tema: Ambiente" : "Posizionamento",
            ],
            ["unlock", "Riattiva audio"],
            ...(this.context === "reality"
              ? [["placement-menu", "Posizionamento"] as [XRAction, string]]
              : []),
            ["exit", "Esci da XR"],
            ["menu", "Chiudi menu"],
          ];
    actions.forEach(([action, label], i) =>
      this.makeButton(
        this.panel,
        action,
        label,
        i % 2 ? 0.27 : -0.27,
        0.13 - Math.floor(i / 2) * 0.11,
      ),
    );
    this.focus = -1;
    this.keyboardFocus = false;
    this.updateTargets();
  }
  setTheme(title: string) {
    const button = this.buttons.find((b) => b.mesh.userData.action === "theme");
    if (button && button.label !== `Tema: ${title}`) {
      button.label = `Tema: ${title}`;
      this.draw(button, false);
    }
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
    ctx.fillStyle = "#10232b";
    ctx.fillRect(0, 0, 1024, 160);
    ctx.fillStyle = "#ffffff";
    ctx.font = "30px sans-serif";
    ctx.textAlign = "center";
    text
      .split("\n")
      .slice(0, 2)
      .forEach((line, i) =>
        ctx.fillText(line.slice(0, 70), 512, 49 + i * 43, 970),
      );
    ctx.font = "25px sans-serif";
    ctx.fillStyle = "#a6cdc1";
    ctx.fillText(
      "Punta + grilletto / pinch · stick per scegliere · A/X chiude",
      512,
      137,
      980,
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
    this.root.position
      .copy(position)
      .addScaledVector(this.forward, 1.3);
    this.root.position.y -= 0.08;
    this.root.rotation.set(0, Math.atan2(-this.forward.x, -this.forward.z), 0);
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
