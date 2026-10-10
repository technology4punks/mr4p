import * as THREE from "three";
export type Placement = { position: THREE.Vector3; yaw: number };
export function proposePlacement(
  viewerPosition: THREE.Vector3,
  viewerOrientation: THREE.Quaternion,
  floorY: number,
  distance = 1.75,
): Placement {
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
    viewerOrientation,
  );
  forward.y = 0;
  if (forward.lengthSq() < 0.01) forward.set(0, 0, -1);
  forward.normalize();
  const position = viewerPosition.clone().addScaledVector(forward, distance);
  position.y = floorY;
  return {
    position,
    yaw: Math.atan2(
      viewerPosition.x - position.x,
      viewerPosition.z - position.z,
    ),
  };
}
export function polygonArea(polygon: readonly DOMPointReadOnly[]): number {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i],
      b = polygon[(i + 1) % polygon.length];
    area += a.x * b.z - b.x * a.z;
  }
  return Math.abs(area) / 2;
}
export function pointInPolygon(
  x: number,
  z: number,
  polygon: readonly DOMPointReadOnly[],
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a.z > z !== b.z > z &&
      x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x
    )
      inside = !inside;
  }
  return inside;
}
export function isFloorPlane(
  orientation: string | null,
  y: number,
  area: number,
  floorReference: boolean,
  semanticLabel?: string,
): boolean {
  return (
    orientation === "horizontal" &&
    area >= 0.5 &&
    (floorReference ? Math.abs(y) <= 0.2 : semanticLabel === "floor")
  );
}
export function floorIntersection(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  floorY: number,
): THREE.Vector3 | undefined {
  if (direction.y >= -0.05) return;
  const distance = (floorY - origin.y) / direction.y;
  if (distance < 0 || distance > 6) return;
  return origin.clone().addScaledVector(direction, distance);
}
