import * as THREE from "three";

type PlantMaterial = THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;

// Paired near/far positions keep the view, tram stop and traffic corridors open.
// The first eight form a complete composition at the reduced quality level.
const TREE_POSITIONS = [
  [-9, -7], [4.8, -7], [-4, -17], [4, -17],
  [-15, -7], [15, -7], [-19, -17], [19, -17],
  [-11, -17], [11, -17], [-21, -7], [21, -7],
  [-26, -17], [26, -17],
] as const;
const CLUSTERS_PER_TREE = 4;
const BRANCHES_PER_TREE = CLUSTERS_PER_TREE + 1;
const REED_COUNT = 104;
const up = new THREE.Vector3(0, 1, 0);

/** Environmental vegetation: three draws, no textures or per-frame matrix uploads. */
export class EnvironmentalPlanting {
  readonly root = new THREE.Group();
  readonly materials = new Set<PlantMaterial>();
  private readonly branches: THREE.InstancedMesh;
  private readonly crowns: THREE.InstancedMesh;
  private readonly reeds: THREE.InstancedMesh;
  private readonly bark = new THREE.MeshStandardMaterial({ color: 0x72634e, roughness: 0.98 });
  private readonly foliage = new THREE.MeshStandardMaterial({ color: 0x638452, roughness: 0.92 });
  private readonly grass = new THREE.MeshStandardMaterial({ color: 0xa08a5d, roughness: 0.97, side: THREE.DoubleSide });
  private readonly windTime = { value: 0 };
  private readonly growth = { value: 0 };
  private readonly dryBark = new THREE.Color(0x72634e);
  private readonly livingBark = new THREE.Color(0x655e4d);
  private readonly dryGrass = new THREE.Color(0xa08a5d);
  private readonly livingGrass = new THREE.Color(0x6a8244);

  constructor() {
    this.root.name = "Environmental living planting";
    this.materials.add(this.bark).add(this.foliage).add(this.grass);
    this.addWind(this.foliage, true);
    this.addWind(this.grass, false);

    const crownGeometry = new THREE.SphereGeometry(1, 10, 6);
    const vertices = crownGeometry.getAttribute("position");
    // A gently lobed silhouette reads as a broadleaf crown rather than a sphere.
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
      const angle = Math.atan2(z, x);
      const radius = 1 + Math.sin(angle * 3 + y * 3.1) * 0.115 * (1 - y * y)
        + Math.cos(angle * 5 - y * 2.3) * 0.065 * (1 - y * y);
      vertices.setXYZ(i, x * radius, y * (1 + x * 0.13), z * radius);
    }
    crownGeometry.computeVertexNormals();
    this.branches = this.batch("Environmental branching trees", new THREE.CylinderGeometry(0.48, 1, 1, 5), this.bark, TREE_POSITIONS.length * BRANCHES_PER_TREE);
    this.crowns = this.batch("Environmental broadleaf crowns", crownGeometry, this.foliage, TREE_POSITIONS.length * CLUSTERS_PER_TREE);
    this.reeds = this.batch("Environmental rain-garden reeds", reedGeometry(), this.grass, REED_COUNT);

    const pose = new THREE.Object3D();
    const start = new THREE.Vector3(), end = new THREE.Vector3(), direction = new THREE.Vector3();
    const tint = new THREE.Color();
    TREE_POSITIONS.forEach(([x, z], tree) => {
      const stature = 0.91 + ((tree * 7) % 9) * 0.035;
      const trunkHeight = 1.75 * stature;
      const trunkWidth = 0.105 + (tree % 3) * 0.012;
      pose.position.set(x, trunkHeight / 2, z);
      pose.rotation.set(0, tree * 1.37, 0.025 * Math.sin(tree));
      pose.scale.set(trunkWidth, trunkHeight, trunkWidth);
      pose.updateMatrix();
      this.branches.setMatrixAt(tree * BRANCHES_PER_TREE, pose.matrix);
      tint.setScalar(0.77 + (tree % 4) * 0.065);
      this.branches.setColorAt(tree * BRANCHES_PER_TREE, tint);

      for (let cluster = 0; cluster < CLUSTERS_PER_TREE; cluster++) {
        const angle = tree * 2.4 + cluster * 2.39996;
        const top = cluster === CLUSTERS_PER_TREE - 1;
        const spread = top ? 0.17 : 0.52 + (cluster % 2) * 0.12;
        const canopyY = (top ? 2.8 : 2.08 + cluster * 0.13) * stature;
        const canopyX = x + Math.cos(angle) * spread;
        const canopyZ = z + Math.sin(angle) * spread * 0.42;
        start.set(x, trunkHeight * (0.6 + cluster * 0.045), z);
        end.set(canopyX, canopyY - 0.07, canopyZ);
        direction.subVectors(end, start);
        pose.position.copy(start).add(end).multiplyScalar(0.5);
        pose.quaternion.setFromUnitVectors(up, direction.clone().normalize());
        pose.scale.set(0.058 - cluster * 0.006, direction.length(), 0.058 - cluster * 0.006);
        pose.updateMatrix();
        const branchIndex = tree * BRANCHES_PER_TREE + cluster + 1;
        this.branches.setMatrixAt(branchIndex, pose.matrix);
        this.branches.setColorAt(branchIndex, tint);

        pose.position.copy(end).setY(canopyY);
        pose.rotation.set(0.08 * Math.sin(tree + cluster), angle, 0.16 * Math.cos(cluster));
        const width = (0.6 + ((tree + cluster) % 3) * 0.09) * stature;
        pose.scale.set(width, (top ? 0.69 : 0.65) * stature, width * 0.64);
        pose.updateMatrix();
        const leafIndex = tree * CLUSTERS_PER_TREE + cluster;
        this.crowns.setMatrixAt(leafIndex, pose.matrix);
        tint.setHSL(0.19 + ((tree + cluster) % 5) * 0.012, 0.18 + (cluster % 3) * 0.06, 0.57 + (cluster % 3) * 0.065);
        this.crowns.setColorAt(leafIndex, tint);
        tint.setScalar(0.77 + (tree % 4) * 0.065);
      }
    });

    for (let i = 0; i < REED_COUNT; i++) {
      // Interleaving samples keeps the whole frontage planted at half density.
      const slot = (i * 57) % REED_COUNT;
      const x = -26.5 + slot * 53 / (REED_COUNT - 1);
      const rearBank = i % 2 === 1;
      pose.position.set(x, 0.004, (rearBank ? -6.95 : -4.55) + Math.sin(i * 2.39) * (rearBank ? 0.01 : 0.1));
      pose.rotation.set(0, i * 2.39996, 0);
      const height = (rearBank ? 0.42 : 0.28) + ((i * 13) % 9) * 0.039;
      pose.scale.set(0.72 + (i % 4) * 0.14, height, 0.72 + (i % 3) * 0.12);
      pose.updateMatrix();
      this.reeds.setMatrixAt(i, pose.matrix);
      tint.setRGB(0.77 + (i % 5) * 0.04, 0.84 + (i % 4) * 0.04, 0.72 + (i % 3) * 0.08);
      this.reeds.setColorAt(i, tint);
    }
    for (const mesh of [this.branches, this.crowns, this.reeds]) {
      mesh.computeBoundingSphere();
      // Shader displacement is under 8 cm, including maximum instance scaling.
      mesh.boundingSphere!.radius += 0.1;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor!.needsUpdate = true;
    }
    this.setFuture(0);
  }

  private batch(name: string, geometry: THREE.BufferGeometry, material: PlantMaterial, count: number) {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.name = name;
    this.root.add(mesh);
    return mesh;
  }

  private addWind(material: THREE.MeshStandardMaterial, crown: boolean) {
    material.onBeforeCompile = shader => {
      shader.uniforms.plantWindTime = this.windTime;
      shader.uniforms.plantGrowth = this.growth;
      shader.vertexShader = `uniform float plantWindTime;\nuniform float plantGrowth;\n${shader.vertexShader}`;
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `
        #include <begin_vertex>
        float plantPhase = instanceMatrix[3].x * 0.67 + instanceMatrix[3].z * 0.43;
        ${crown ? "transformed *= max(0.001, plantGrowth);" : "transformed.y *= mix(0.66, 1.0, plantGrowth);"}
        float tipWeight = ${crown ? "clamp(position.y * 0.5 + 0.5, 0.0, 1.0)" : "max(position.y, 0.0)"};
        transformed.x += sin(plantWindTime * 1.1 + plantPhase + position.y * 1.7) * 0.035 * tipWeight;
        transformed.z += cos(plantWindTime * 0.83 + plantPhase) * 0.018 * tipWeight;
      `);
    };
    material.customProgramCacheKey = () => `environmental-planting-${crown ? "crown" : "reed"}-v1`;
  }

  setFuture(amount: number) {
    const progress = THREE.MathUtils.clamp(amount, 0, 1);
    this.growth.value = progress * progress * (3 - 2 * progress);
    this.crowns.visible = progress > 0.002;
    this.bark.color.copy(this.dryBark).lerp(this.livingBark, progress);
    this.grass.color.copy(this.dryGrass).lerp(this.livingGrass, progress);
  }

  update(timeMs: number) {
    this.windTime.value = Math.max(0, timeMs) / 1000;
  }

  setQuality(low: boolean) {
    const trees = low ? 8 : TREE_POSITIONS.length;
    this.branches.count = trees * BRANCHES_PER_TREE;
    this.crowns.count = trees * CLUSTERS_PER_TREE;
    this.reeds.count = low ? REED_COUNT / 2 : REED_COUNT;
  }
}

/** Three curved, pointed blades; nine triangles per tuft, solid silhouettes. */
function reedGeometry() {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let blade = 0; blade < 3; blade++) {
    const angle = blade * Math.PI * 2 / 3;
    const cosine = Math.cos(angle), sine = Math.sin(angle);
    const offset = positions.length / 3;
    const height = 0.77 + blade * 0.115;
    for (const [x, y, z] of [
      [-0.038, 0, 0], [0.038, 0, 0],
      [-0.03, height * 0.57, 0.075], [0.03, height * 0.57, 0.075],
      [0, height, 0.2],
    ]) positions.push(x * cosine + z * sine, y, -x * sine + z * cosine);
    indices.push(offset, offset + 1, offset + 2, offset + 1, offset + 3, offset + 2, offset + 2, offset + 3, offset + 4);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
