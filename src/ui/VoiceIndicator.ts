import * as THREE from "three";
import { voicePresentation } from "../audio/voicePresentation";
import type { VoiceSnapshot } from "../audio/realtimeClient";
import { canvasSurface } from "./canvasSurface";

/** A status sign next to the avatar, never attached to the viewer or menu. */
export class VoiceIndicator {
  readonly root = new THREE.Group();
  private canvas = document.createElement("canvas");
  private texture: THREE.CanvasTexture;
  private meter: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private lastText = "";
  private facing = new THREE.Vector3();
  constructor() {
    this.canvas.width = 1024;
    this.canvas.height = 256;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.185),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, side: THREE.DoubleSide }));
    const track = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.006),
      new THREE.MeshBasicMaterial({ color: 0x304451 }));
    this.meter = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.006),
      new THREE.MeshBasicMaterial({ color: 0x7ae1c7 }));
    track.position.set(0, -0.064, 0.002);
    this.meter.position.set(0, -0.064, 0.003);
    this.root.add(sign, track, this.meter);
    this.root.visible = false;
  }
  update(voice: VoiceSnapshot, energy: number, avatar: THREE.Object3D, viewer: THREE.Vector3) {
    this.root.visible = avatar.visible;
    avatar.getWorldPosition(this.root.position);
    this.root.position.y += 1.92;
    // Only orientation changes with the viewer; the sign stays beside NEO.
    this.facing.set(viewer.x, this.root.position.y, viewer.z);
    this.root.lookAt(this.facing);
    const presentation = voicePresentation(voice);
    const text = presentation.label + presentation.detail;
    if (text !== this.lastText) {
      this.lastText = text;
      const ctx = this.canvas.getContext("2d")!;
      canvasSurface(ctx, 1024, 256, "rgba(13, 29, 37, 0.9)", "#52716f", 58);
      ctx.fillStyle = presentation.color;
      ctx.beginPath();
      ctx.arc(65, 87, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.textAlign = "center";
      ctx.font = "600 48px sans-serif";
      ctx.fillText(presentation.label, 545, 102, 850);
      ctx.fillStyle = "#e0eded";
      ctx.font = "30px sans-serif";
      ctx.fillText(presentation.detail, 512, 156, 910);
      this.texture.needsUpdate = true;
    }
    const listening = voice.microphone === "live";
    const width = listening ? THREE.MathUtils.clamp(energy * 8, 0.015, 1) : 0;
    this.meter.visible = listening;
    this.meter.scale.x = width;
    this.meter.position.x = -0.31 * (1 - width);
  }
  dispose() {
    this.root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        object.material.map?.dispose();
        object.material.dispose();
      }
    });
    this.root.removeFromParent();
  }
}
