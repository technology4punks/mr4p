import * as THREE from "three";

// Shortest arc, bounded turn speed, and no snap after a suspended XR frame.
export function turnToward(current: number, target: number, delta: number) {
  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  const dt = THREE.MathUtils.clamp(delta, 0, 0.05);
  const step = THREE.MathUtils.clamp(
    difference * (1 - Math.exp(-dt * 5)),
    -dt * 2.1,
    dt * 2.1,
  );
  return Math.atan2(Math.sin(current + step), Math.cos(current + step));
}
