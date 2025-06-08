import { setupHandsTracking, getHandData } from './hands.js';

let scene, renderer, cameraL, cameraR, cube;
const container = document.getElementById('container');

function initThree() {
  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // Due camere per la stereoscopia
  const aspect = window.innerWidth / 2 / window.innerHeight;
  cameraL = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
  cameraR = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
  cameraL.position.z = cameraR.position.z = 3;

  // Cubo rosso
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  cube = new THREE.Mesh(geometry, material);
  scene.add(cube);
}

function render() {
  renderer.setScissorTest(true);

  // Occhio sinistro
  renderer.setViewport(0, 0, window.innerWidth / 2, window.innerHeight);
  renderer.setScissor(0, 0, window.innerWidth / 2, window.innerHeight);
  renderer.render(scene, cameraL);

  // Occhio destro
  renderer.setViewport(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
  renderer.setScissor(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
  renderer.render(scene, cameraR);

  renderer.setScissorTest(false);
}

function animate() {
  requestAnimationFrame(animate);

  // Ruota il cubo se viene rilevata una mano
  const hand = getHandData();
  if (hand) {
    cube.rotation.y += 0.01;
  }

  render();
}

async function start() {
  initThree();
  await setupHandsTracking();
  animate();
}

start(); 