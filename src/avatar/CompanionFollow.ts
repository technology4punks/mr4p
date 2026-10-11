import * as THREE from "three";

/** Only for a known virtual room. Never use these bounds as real-room safety data. */
export class CompanionFollow {
  private target = new THREE.Vector3();
  private lastViewer = new THREE.Vector3();
  private forward = new THREE.Vector3();
  private candidate = new THREE.Vector3();
  private sample = new THREE.Vector3();
  private moving = false;
  readonly radius = 0.35;
  constructor(
    private bounds: THREE.Box3,
    private obstacles: readonly THREE.Box3[],
  ) {}
  reset() {
    this.moving = false;
  }
  private clear(point: THREE.Vector3) {
    const r = this.radius;
    if (point.x < this.bounds.min.x + r || point.x > this.bounds.max.x - r ||
        point.z < this.bounds.min.z + r || point.z > this.bounds.max.z - r) return false;
    return !this.obstacles.some((box) =>
      point.x >= box.min.x - r && point.x <= box.max.x + r &&
      point.z >= box.min.z - r && point.z <= box.max.z + r);
  }
  private pathClear(from: THREE.Vector3, to: THREE.Vector3, viewer: THREE.Vector3) {
    const distance = Math.hypot(to.x - from.x, to.z - from.z);
    const samples = Math.max(1, Math.ceil(distance / 0.04));
    const personalSpace = Math.min(0.65, Math.hypot(from.x - viewer.x, from.z - viewer.z));
    for (let i = 1; i <= samples; i++) {
      this.sample.lerpVectors(from, to, i / samples);
      if (!this.clear(this.sample) ||
          Math.hypot(this.sample.x - viewer.x, this.sample.z - viewer.z) < personalSpace - 1e-6)
        return false;
    }
    return true;
  }
  update(position: THREE.Vector3, viewer: THREE.Vector3, orientation: THREE.Quaternion, delta: number) {
    // A headset outside the known virtual floor is not a request to leave the room.
    if (!this.clear(viewer)) { this.reset(); return false; }
    const distance = Math.hypot(position.x - viewer.x, position.z - viewer.z);
    if (!this.moving && distance >= 0.8 && distance <= 1.7) return false;
    if (!this.moving || Math.hypot(viewer.x - this.lastViewer.x, viewer.z - this.lastViewer.z) > 0.3) {
      this.forward.set(0, 0, -1).applyQuaternion(orientation);
      this.forward.y = 0;
      if (this.forward.lengthSq() < 0.01) this.forward.set(0, 0, -1);
      this.forward.normalize();
      this.moving = false;
      // Prefer the user's right side, slightly behind; fall back to the left.
      for (const side of [1, -1]) {
        this.candidate.set(
          viewer.x - this.forward.z * side * 1.15 - this.forward.x * 0.35,
          position.y,
          viewer.z + this.forward.x * side * 1.15 - this.forward.z * 0.35,
        );
        if (this.pathClear(position, this.candidate, viewer)) {
          this.target.copy(this.candidate);
          this.lastViewer.copy(viewer);
          this.moving = true;
          break;
        }
      }
      if (!this.moving) return false; // Stop rather than teleport through an obstacle.
    }
    const remaining = position.distanceTo(this.target);
    if (remaining < 0.03) { this.reset(); return false; }
    const step = Math.min(remaining, 0.45 * THREE.MathUtils.clamp(delta, 0, 0.05));
    this.candidate.copy(position).lerp(this.target, step / remaining);
    if (!this.pathClear(position, this.candidate, viewer)) { this.reset(); return false; }
    position.copy(this.candidate);
    return true;
  }
}
