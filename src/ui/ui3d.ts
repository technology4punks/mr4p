import * as THREE from "three";
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
  | "prepare-vr";
const buttons: [XRAction, string][] = [
  ["confirm", "Conferma"],
  ["reposition", "Riposiziona"],
  ["lower", "Quota −5 cm"],
  ["raise", "Quota +5 cm"],
  ["calibrate", "Quota corretta"],
  ["voice", "Avvia / stop voce"],
  ["mute", "Mute microfono"],
  ["unlock", "Riattiva audio"],
  ["reset", "Reset anchor"],
  ["exit", "Esci da XR"],
  ["observatory", "Visita il 2050"],
  ["future", "Futuro alternativo"],
  ["reality", "Torna alla realtà"],
  ["prepare-vr", "Prepara VR"],
];
export class UI3D {
  readonly root = new THREE.Group();
  private meshes: THREE.Mesh[] = [];
  private canvas = document.createElement("canvas");
  private texture: THREE.CanvasTexture;
  private lastText = "";
  constructor() {
    this.canvas.width = 1024;
    this.canvas.height = 128;
    this.texture = new THREE.CanvasTexture(this.canvas);
    const status = new THREE.Mesh(
      new THREE.PlaneGeometry(0.86, 0.12),
      new THREE.MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        depthTest: false,
      }),
    );
    status.position.y = 0.08;
    status.renderOrder = 10;
    this.root.add(status);
    buttons.forEach(([action, label], index) => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 96;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#182e3b";
      ctx.fillRect(0, 0, 512, 96);
      ctx.strokeStyle = "#5dccb6";
      ctx.strokeRect(2, 2, 508, 92);
      ctx.fillStyle = "#ffffff";
      ctx.font = "30px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label, 256, 58);
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.41, 0.075),
        new THREE.MeshBasicMaterial({
          map: new THREE.CanvasTexture(canvas),
          depthTest: false,
          transparent: true,
        }),
      );
      mesh.position.set(
        index % 2 === 0 ? -0.22 : 0.22,
        -0.04 - Math.floor(index / 2) * 0.09,
        0,
      );
      mesh.userData.action = action;
      mesh.renderOrder = 10;
      this.root.add(mesh);
      this.meshes.push(mesh);
    });
    this.root.visible = false;
  }
  setStatus(text: string) {
    if (text === this.lastText) return;
    this.lastText = text;
    const ctx = this.canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 1024, 128);
    ctx.fillStyle = "#142734";
    ctx.fillRect(0, 0, 1024, 128);
    ctx.fillStyle = "#ffffff";
    ctx.font = "32px sans-serif";
    ctx.textAlign = "center";
    const lines = text.split("\n");
    lines
      .slice(0, 2)
      .forEach((line, i) => ctx.fillText(line.slice(0, 64), 512, 48 + i * 46));
    this.texture.needsUpdate = true;
  }
  followViewer(position: THREE.Vector3, orientation: THREE.Quaternion) {
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(orientation);
    direction.y = 0;
    direction.normalize();
    this.root.position.copy(position).addScaledVector(direction, 1.1);
    this.root.position.y -= 0.28;
    this.root.rotation.set(0, Math.atan2(-direction.x, -direction.z), 0);
    this.root.updateMatrixWorld(true);
  }
  hit(ray: THREE.Ray): XRAction | undefined {
    const caster = new THREE.Raycaster();
    caster.ray.copy(ray);
    return caster.intersectObjects(this.meshes, false)[0]?.object.userData
      .action;
  }
  dispose() {
    this.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.MeshBasicMaterial).map?.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
  }
}
