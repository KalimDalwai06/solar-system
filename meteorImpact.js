// meteorImpact.js
import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';

let meteorMesh;
let curve;
let progress = 0;
let hasImpacted = false;

/**
 * Add a meteorite and its impact path toward Earth
 * @param {THREE.Scene} scene - Your Three.js scene
 * @param {THREE.Mesh} earthMesh - The Earth mesh (to aim for)
 */
export function addMeteorImpact(scene, earthMesh) {
  // 1️⃣ Create meteorite mesh
  meteorMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xaa2200 })
  );
  scene.add(meteorMesh);

  // 2️⃣ Define a curved path from deep space to Earth
  const start = new THREE.Vector3(-100, 40, -100); // far away
  const mid = new THREE.Vector3(0, 10, 0);         // near the Sun or close pass
  const end = new THREE.Vector3();                 // Earth center
  earthMesh.getWorldPosition(end);

  curve = new THREE.QuadraticBezierCurve3(start, mid, end);

  // Start meteor at beginning of path
  meteorMesh.position.copy(start);

  console.log("☄️ Meteorite impact simulation initialized.");
}

/**
 * Update meteorite movement — call this in animate()
 * @param {number} delta - Time delta from main clock
 * @param {THREE.Mesh} earthMesh - Reference to Earth mesh
 */
export function updateMeteorImpact(delta, earthMesh) {
  if (!meteorMesh || hasImpacted) return;

  // Control speed (adjust this to make impact faster/slower)
  progress += delta * 0.05;

  if (progress >= 1) {
    progress = 1;
    hasImpacted = true;

    // Optional: simulate impact flash or remove meteor
    meteorMesh.material.emissive.set(0xffaa00);
    meteorMesh.scale.set(2, 2, 2);
    console.log("💥 Meteorite has impacted Earth!");
  }

  // Update meteorite position along the curve
  const pos = curve.getPoint(progress);
  meteorMesh.position.copy(pos);
}
