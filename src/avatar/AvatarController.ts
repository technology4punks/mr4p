import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  stateClips,
  oneShotStates,
  afterAnimation,
  type AvatarState,
} from "./animations";
import { speechEnvelope } from "../audio/audioLevel";
import { turnToward } from "./facing";

export function normalizeModel(model: THREE.Object3D, height: number) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const scale = height / Math.max(size.y, 0.001);
  model.scale.multiplyScalar(scale);
  model.updateMatrixWorld(true);
  const scaled = new THREE.Box3().setFromObject(model);
  const center = scaled.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(center.x, scaled.min.y, center.z));
}

export class AvatarController {
  readonly root = new THREE.Group();
  // Spatial anchors own root; the visual child can turn without moving the feet.
  readonly visual = new THREE.Group();
  private mixer?: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private action?: THREE.AnimationAction;
  private model?: THREE.Object3D;
  private mouth?: THREE.Mesh;
  private envelope = 0;
  private base: AvatarState = "idle";
  state: AvatarState = "idle";
  private faces: THREE.Mesh[] = [];
  private fallback = false;
  private gestureTime = 0;
  private head?: THREE.Object3D;
  private headOffset = new THREE.Quaternion();
  private headYaw = 0;
  private headPitch = 0;
  private pitchOffset = new THREE.Quaternion();
  private headPosition = new THREE.Vector3();
  private direction = new THREE.Vector3();
  private parentQuaternion = new THREE.Quaternion();
  private tempQuaternion = new THREE.Quaternion();
  private speechGestureTime = 0;
  private gestureIndex = 0;
  private moving = false;
  constructor() {
    this.root.add(this.visual);
  }
  async load(height = 1.6): Promise<{ loaded: boolean; clips: string[] }> {
    try {
      const gltf = await new GLTFLoader().loadAsync(
        "/models/RobotExpressive.glb",
      );
      const required = ["Idle", "Wave", "Yes", "No", "ThumbsUp"];
      const clips = gltf.animations.map((c) => c.name);
      if (!required.every((name) => clips.includes(name)))
        throw new Error("Missing clips");
      this.model = gltf.scene;
      normalizeModel(this.model, height);
      this.visual.add(this.model);
      this.mixer = new THREE.AnimationMixer(this.model);
      gltf.animations.forEach((clip) =>
        this.actions.set(clip.name, this.mixer!.clipAction(clip)),
      );
      this.mixer.addEventListener("finished", (event) => {
        if (event.action !== this.action) return;
        this.setState(afterAnimation(this.state, this.base), true);
      });
      this.model.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.morphTargetDictionary)
          this.faces.push(obj);
      });
      // RobotExpressive has no phonetic mouth blendshape. Attach a proxy to its head.
      const head = (this.head = this.model.getObjectByName("Head"));
      this.addMouth(head || this.visual, !!head);
      this.setState("idle", true);
      return { loaded: true, clips };
    } catch {
      this.fallback = true;
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.2, 0.65, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x8adbc8 }),
      );
      body.position.y = 0.7;
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.35, 0.32),
        new THREE.MeshStandardMaterial({ color: 0xd4ece8 }),
      );
      head.position.y = 1.425;
      this.visual.add(body, head);
      for (const x of [-0.13, 0.13]) {
        const leg = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.3, 0.2),
          new THREE.MeshStandardMaterial({ color: 0x8adbc8 }),
        );
        leg.position.set(x, 0.15, 0);
        this.visual.add(leg);
      }
      this.addMouth(this.visual, false);
      return { loaded: false, clips: [] };
    }
  }
  private addMouth(parent: THREE.Object3D, headUnits: boolean) {
    parent.updateWorldMatrix(true, true);
    const box = headUnits
      ? new THREE.Box3().setFromObject(parent, true)
      : undefined;
    const size =
      box?.getSize(new THREE.Vector3()) ?? new THREE.Vector3(0.4, 0.35, 0.32);
    const center =
      box?.getCenter(new THREE.Vector3()) ?? new THREE.Vector3(0, 1.425, 0);
    this.mouth = new THREE.Mesh(
      new THREE.BoxGeometry(size.x * 0.32, size.y * 0.065, size.z * 0.04),
      new THREE.MeshBasicMaterial({ color: 0x27dfbf }),
    );
    this.mouth.position.set(
      center.x,
      center.y - size.y * 0.16,
      (box?.max.z ?? 0.16) + size.z * 0.025,
    );
    this.mouth.updateMatrix();
    // Convert the initial world transform to head-local coordinates, preserving
    // physical size even when the imported skeleton uses scaled/rotated joints.
    const local = parent.matrixWorld
      .clone()
      .invert()
      .multiply(this.mouth.matrix);
    local.decompose(
      this.mouth.position,
      this.mouth.quaternion,
      this.mouth.scale,
    );
    parent.add(this.mouth);
    this.mouth.userData.baseScaleY = this.mouth.scale.y;
  }

  setHeight(height: number) {
    this.root.scale.setScalar(THREE.MathUtils.clamp(height, 1, 2.1) / 1.6);
  }
  setMoving(moving: boolean) {
    if (this.moving === moving) return;
    this.moving = moving;
    if (!oneShotStates.has(this.state)) this.setState(this.state, true);
  }
  setState(state: AvatarState, force = false) {
    if (!oneShotStates.has(state)) this.base = state;
    if (this.state === state && !force) return;
    this.state = state;
    this.gestureTime = 0;
    const clip = this.moving && !oneShotStates.has(state) ? "Walking" : stateClips[state];
    const next = this.actions.get(clip) ?? this.actions.get(stateClips[state]);
    if (!next || (next === this.action && !oneShotStates.has(state))) return;
    next
      .reset()
      .setLoop(
        oneShotStates.has(state) ? THREE.LoopOnce : THREE.LoopRepeat,
        oneShotStates.has(state) ? 1 : Infinity,
      );
    next.clampWhenFinished = oneShotStates.has(state);
    next.enabled = true;
    next.setEffectiveWeight(1);
    next.play();
    if (this.action && this.action !== next)
      this.action.crossFadeTo(next, 0.2, false);
    this.action = next;
  }
  private speechGesture() {
    const next = this.actions.get(
      this.gestureIndex++ % 2 === 0 ? "Yes" : "ThumbsUp",
    );
    if (!next || !this.action) return;
    next.reset().setLoop(THREE.LoopOnce, 1);
    next.clampWhenFinished = true;
    next.play();
    this.action.crossFadeTo(next, 0.2, false);
    this.action = next;
  }
  update(
    delta: number,
    energy: number,
    audible: boolean,
    viewer?: THREE.Vector3,
  ) {
    if (viewer && this.root.visible) {
      this.direction.copy(viewer);
      this.root.worldToLocal(this.direction);
      if (Math.hypot(this.direction.x, this.direction.z) > 0.15)
        this.visual.rotation.y = turnToward(
          this.visual.rotation.y,
          Math.atan2(this.direction.x, this.direction.z),
          delta,
        );
    }
    if (this.head)
      this.head.quaternion.premultiply(
        this.tempQuaternion.copy(this.headOffset).invert(),
      );
    this.mixer?.update(delta);
    if (this.head && viewer) {
      this.head.getWorldPosition(this.headPosition);
      this.direction
        .copy(viewer)
        .sub(this.headPosition)
        .applyQuaternion(
          this.visual.getWorldQuaternion(this.tempQuaternion).invert(),
        );
      const desired = THREE.MathUtils.clamp(
        Math.atan2(this.direction.x, this.direction.z),
        -0.35,
        0.35,
      );
      const desiredPitch = THREE.MathUtils.clamp(
        -Math.atan2(this.direction.y, Math.hypot(this.direction.x, this.direction.z)), -0.25, 0.25,
      );
      this.headYaw = THREE.MathUtils.lerp(
        this.headYaw,
        desired,
        1 - Math.exp(-delta * 3),
      );
      this.headPitch = THREE.MathUtils.lerp(this.headPitch, desiredPitch, 1 - Math.exp(-delta * 3));
      this.head.parent!.getWorldQuaternion(this.parentQuaternion);
      this.direction
        .set(0, 1, 0)
        .applyQuaternion(this.parentQuaternion.invert());
      this.headOffset.setFromAxisAngle(this.direction, this.headYaw);
      this.direction.set(1, 0, 0)
        .applyQuaternion(this.visual.getWorldQuaternion(this.tempQuaternion))
        .applyQuaternion(this.parentQuaternion);
      this.pitchOffset.setFromAxisAngle(this.direction, this.headPitch);
      this.headOffset.multiply(this.pitchOffset);
      this.head.quaternion.premultiply(this.headOffset);
    } else this.headOffset.identity();
    if (this.state === "speaking" && audible && energy > 0.008) {
      this.speechGestureTime += delta;
      if (this.speechGestureTime > 7) {
        this.speechGestureTime = 0;
        this.speechGesture();
      }
    } else if (this.state !== "speaking") this.speechGestureTime = 0;
    this.envelope = speechEnvelope(this.envelope, energy, delta, audible);
    if (this.mouth)
      this.mouth.scale.y =
        this.mouth.userData.baseScaleY * (1 + this.envelope * 5);
    if (this.fallback) {
      this.gestureTime += delta;
      if (oneShotStates.has(this.state) && this.gestureTime > 1.2)
        this.setState(this.base);
      const gesture = oneShotStates.has(this.state);
      this.visual.rotation.z = gesture
        ? Math.sin(performance.now() / 180) * 0.08
        : 0;
    }
    for (const face of this.faces) {
      const index = face.morphTargetDictionary?.Sad;
      if (index !== undefined && face.morphTargetInfluences) {
        const current = face.morphTargetInfluences[index];
        face.morphTargetInfluences[index] = THREE.MathUtils.lerp(
          current,
          this.state === "error" ? 0.65 : 0,
          1 - Math.exp(-delta * 5),
        );
      }
    }
  }
  dispose() {
    this.mixer?.stopAllAction();
    if (this.model) this.mixer?.uncacheRoot(this.model);
  }
}
