import * as THREE from "three";
/** World-space floor portal; opening/closing is local, never parented to camera. */
export class Portal {
  readonly root = new THREE.Group();
  private ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.055, 8, 48),
    new THREE.MeshBasicMaterial({
      color: 0x80dacb,
      transparent: true,
      opacity: 0.8,
    }),
  );
  private veil = new THREE.Mesh(
    new THREE.CircleGeometry(0.81, 40),
    new THREE.MeshBasicMaterial({
      color: 0x284d58,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  private start = 0;
  active = false;
  constructor() {
    this.root.name = "World-locked arrival portal";
    this.ring.position.y = this.veil.position.y = 0.88;
    this.root.add(this.ring, this.veil);
    this.root.visible = false;
  }
  open(position: THREE.Vector3, viewer: THREE.Vector3, time: number) {
    this.root.position.copy(position);
    this.root.lookAt(new THREE.Vector3(viewer.x, position.y, viewer.z));
    this.start = time;
    this.active = true;
    this.root.visible = true;
  }
  update(time: number) {
    if (!this.active) return 1;
    const elapsed = (time - this.start) / 1000;
    const amount =
      elapsed < 1 ? elapsed : elapsed > 4 ? Math.max(0, 5 - elapsed) : 1;
    this.root.scale.set(Math.max(0.001, amount), 1, Math.max(0.001, amount));
    this.ring.rotation.z = elapsed * 0.12;
    this.veil.material.opacity = 0.6 * amount;
    if (elapsed >= 5) {
      this.active = false;
      this.root.visible = false;
    }
    return Math.min(1, Math.max(0, (elapsed - 1) / 2));
  }
  shiftTime(delta: number) {
    this.start += delta;
  }
  dispose() {
    this.ring.geometry.dispose();
    this.veil.geometry.dispose();
    this.ring.material.dispose();
    this.veil.material.dispose();
    this.root.removeFromParent();
  }
}
