// Development-only scene inspection; never imported by the application bundle.
import * as THREE from "three";
import { FutureObservatory } from "../src/observatory/FutureObservatory";
import { deriveCity } from "../src/decision/DecisionEngine";
import { interventions } from "../src/decision/catalog";
const params = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
document.body.append(renderer.domElement);
const scene = new THREE.Scene(),
  observatory = new FutureObservatory();
scene.add(observatory.root);
observatory.setOpacity(1);
const state = deriveCity(
  params.has("all")
    ? interventions.map((o) => o.id)
    : params.has("sample")
      ? ["GREEN_TREES", "GREEN_PARK", "MOB_BIKE", "MOB_TRAM", "ENERGY_ROOFTOP"]
      : [],
);
observatory.transformations.apply(state, 0, false);
observatory.applyCityState(state);
if (params.has("low")) observatory.setQuality("low");
const map = params.has("map"),
  aspect = innerWidth / innerHeight;
const camera = map
  ? new THREE.OrthographicCamera(-48 * aspect, 48 * aspect, 48, -48, 0.1, 150)
  : new THREE.PerspectiveCamera(72, aspect, 0.05, 150);
if (map) {
  observatory.room.visible = false;
  camera.position.set(0, 110, -43);
  camera.up.set(0, 0, -1);
  camera.lookAt(0, 0, -43);
} else {
  camera.position.set(params.has("side") ? 1.2 : 0, 1.6, -1.6);
  camera.lookAt(0, 3, -28);
}
let frames = 0;
renderer.setAnimationLoop((time) => {
  observatory.update(time);
  renderer.render(scene, camera);
  frames++;
  const measurements = {
    frames,
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
  };
  document.querySelector("#info")!.textContent =
    `${map ? "Pianta" : "Finestra"} · ${params.has("all") ? "30 interventi" : params.has("sample") ? "5 interventi" : "Città critica"} · ${measurements.calls} draw · ${measurements.triangles} triangoli`;
  Object.assign(window, { layoutMeasurements: measurements });
});
