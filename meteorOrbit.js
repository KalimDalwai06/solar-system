// meteorOrbit.js
import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';

let meteorMesh;
let orbitLine;
let orbitPoints = [];
let t = 0;

export function addMeteoriteOrbit(scene) {
  // --- Pseudo-orbit parameters ---
  const a = 27.5; // semi-major axis (scene units, ~1.1 AU if Earth is 25)
  const e = 0.3; // eccentricity (0 = circle)
  const i = THREE.MathUtils.degToRad(5); // inclination in radians
  const segments = 256;

  // Calculate semi-minor axis
  const b = a * Math.sqrt(1 - e * e);

  // --- Create orbit points (ellipse) ---
  orbitPoints = [];
  for (let j = 0; j <= segments; j++) {
    const theta = (j / segments) * Math.PI * 2;
    let x = a * (Math.cos(theta) - e); // shift ellipse center to focus (sun)
    let z = b * Math.sin(theta);

    // Apply inclination (rotate around X-axis)
    const point = new THREE.Vector3(x, 0, z);
    point.applyAxisAngle(new THREE.Vector3(1, 0, 0), i);
    orbitPoints.push(point);
  }

  // --- Draw orbit line ---
  const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
  const orbitMaterial = new THREE.LineBasicMaterial({
    color: 0xff6600,
    transparent: true,
    opacity: 0.6,
  });
  orbitLine = new THREE.LineLoop(orbitGeometry, orbitMaterial);
  scene.add(orbitLine);

  // --- Create meteorite mesh ---
  meteorMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xff6600 })
  );
  meteorMesh.position.copy(orbitPoints[0]);
  scene.add(meteorMesh);

  console.log("✅ Pseudo-orbit for meteorite added.");
}

export function updateMeteoriteOrbit(delta) {
  if (!meteorMesh || orbitPoints.length === 0) return;

  // Adjust speed (controls orbital period visually)
  const speed = 0.02;
  t += delta * speed;

  const index = Math.floor((t % 1) * orbitPoints.length);
  meteorMesh.position.copy(orbitPoints[index]);
}
