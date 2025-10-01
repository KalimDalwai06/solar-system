import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { addMeteorImpact, updateMeteorImpact } from './meteorImpact.js';

const canvas = document.getElementById('solar');
const scene = new THREE.Scene();

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

// 🌌 Background
renderer.setClearColor(0x000010);
scene.fog = new THREE.FogExp2(0x110022, 0.0003);

// ---------- Camera ----------
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 30, 100);
camera.lookAt(0, 0, 0);

// ---------- Controls ----------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 15;
controls.maxDistance = 300;

// ---------- CSS2D Renderer (for labels) ----------
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

// ---------- Starfield ----------
function createStarfield() {
  const starsGeometry = new THREE.BufferGeometry();
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.7,
    sizeAttenuation: true
  });

  const starsVertices = [];
  for (let i = 0; i < 10000; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const y = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;
    starsVertices.push(x, y, z);
  }

  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
  const starField = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(starField);
}
createStarfield();

// ---------- Sun ----------
const loader = new THREE.TextureLoader();
const sunTexture = loader.load('/textures/sun.jpg');
sunTexture.colorSpace = THREE.SRGBColorSpace;

const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(5, 64, 64),
  new THREE.MeshBasicMaterial({ map: sunTexture })
);
scene.add(sunMesh);

// ☀️ Corona
const coronaGeometry = new THREE.SphereGeometry(5.3, 64, 64);
const coronaMaterial = new THREE.MeshBasicMaterial({
  color: 0xffcc66,
  transparent: true,
  opacity: 0.12,
  blending: THREE.AdditiveBlending,
  side: THREE.BackSide,
});
const sunCorona = new THREE.Mesh(coronaGeometry, coronaMaterial);
sunMesh.add(sunCorona);

// 🌞 Sun Label
const sunLabelDiv = document.createElement('div');
sunLabelDiv.className = 'label';
sunLabelDiv.textContent = 'Sun';
sunLabelDiv.style.color = '#ffffff';
sunLabelDiv.style.fontSize = '16px';
sunLabelDiv.style.fontWeight = 'regular';
sunLabelDiv.style.textShadow = '0 0 6px rgba(255, 200, 0, 0.8)';
const sunLabel = new CSS2DObject(sunLabelDiv);
sunLabel.position.set(0, 7, 0);
sunMesh.add(sunLabel);

// ---------- Atmosphere Shader ----------
function createAtmosphere(radius, color, intensity = 1.0) {
  const atmosphereGeometry = new THREE.SphereGeometry(radius * 1.015, 64, 64);
  const atmosphereMaterial = new THREE.ShaderMaterial({
    uniforms: { 
      glowColor: { value: new THREE.Color(color) },
      intensity: { value: intensity }
    },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      uniform vec3 glowColor;
      uniform float intensity;
      void main() {
        float glow = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
        gl_FragColor = vec4(glowColor, 1.0) * glow * intensity;
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });
  return new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
}

// ---------- Planet Data ----------
const planetsData = [
  {
    name: 'Earth',
    size: 1.3,
    distance: 25,
    texture: '/textures/earth.jpg',
    axialTilt: 23.44,
    inclination: 0.0,
    orbitalPeriod: 1.0,
    rotationPeriod: 1.0,
    orbitDirection: 1,
    orbitColor: 0x4488ff,
  },
];

const pivots = [];
let earthMesh = null;

// ---------- Create Planets ----------
planetsData.forEach((planet) => {
  const pivot = new THREE.Object3D();
  pivot.rotation.x = THREE.MathUtils.degToRad(planet.inclination);
  scene.add(pivot);

  const texture = loader.load(planet.texture, (tex) => (tex.colorSpace = THREE.SRGBColorSpace));
  const material = new THREE.MeshBasicMaterial({ map: texture });

  const geometry = new THREE.SphereGeometry(planet.size, 64, 64);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.z = THREE.MathUtils.degToRad(planet.axialTilt);

  const earthAtmosphere = createAtmosphere(planet.size, 0x4488ff, 1.2);
  mesh.add(earthAtmosphere);
  earthMesh = mesh;

  mesh.position.set(planet.distance, 0, 0);
  pivot.add(mesh);

  // Orbit Line
  const orbitGeometry = new THREE.BufferGeometry();
  const orbitPoints = [];
  const segments = 128;
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    orbitPoints.push(new THREE.Vector3(
      Math.cos(angle) * planet.distance,
      0,
      Math.sin(angle) * planet.distance
    ));
  }
  orbitGeometry.setFromPoints(orbitPoints);
  const orbitMaterial = new THREE.LineBasicMaterial({ 
    color: planet.orbitColor, 
    transparent: true, 
    opacity: 0.4 
  });
  const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
  pivot.add(orbitLine);

  pivots.push({ pivot, data: planet, angle: Math.random() * Math.PI * 2, mesh });
});

// ---------- Earth Label + Leader Line ----------
const earthLabelDiv = document.createElement('div');
earthLabelDiv.className = 'label';
earthLabelDiv.textContent = 'Earth';
earthLabelDiv.style.color = '#ffffff';
earthLabelDiv.style.fontSize = '16px';
earthLabelDiv.style.fontWeight = 'regular';
earthLabelDiv.style.textShadow = '0 0 6px rgba(100, 200, 255, 0.8)';

const earthLabel = new CSS2DObject(earthLabelDiv);
scene.add(earthLabel);

//--------Add Meteor---------------
addMeteorImpact(scene, earthMesh);


// ---------- Animation ----------
const clock = new THREE.Clock();
const timeScale = 1;

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  // Sun rotation
  sunMesh.rotation.y += (delta * timeScale) * (2 * Math.PI / 25);

  // Corona shimmer
  const time = Date.now() * 0.001;
  sunCorona.material.opacity = 0.10 + Math.sin(time * 2.0) * 0.02;
  const scalePulse = 1.0 + Math.sin(time * 1.5) * 0.008;
  sunCorona.scale.set(scalePulse, scalePulse, scalePulse);

  // Planet orbits and rotations
  pivots.forEach(({ data, mesh }, index) => {
    const orbitSpeed = (2 * Math.PI / data.orbitalPeriod) * data.orbitDirection;
    pivots[index].angle += (delta * timeScale * orbitSpeed) / 365.25;

    const x = data.distance * Math.cos(pivots[index].angle);
    const z = data.distance * Math.sin(pivots[index].angle);
    mesh.position.set(x, 0, z);

    const rotationSpeed = (2 * Math.PI) / data.rotationPeriod;
    mesh.rotation.y += (delta * timeScale * rotationSpeed);
  });

  // --- Update Earth label and line positions ---
  if (earthMesh) {
    const earthWorldPos = new THREE.Vector3();
    earthMesh.getWorldPosition(earthWorldPos);

    // Label slightly above Earth
    const labelOffset = new THREE.Vector3(0, 3, 0);
    const labelPos = earthWorldPos.clone().add(labelOffset);
    earthLabel.position.copy(labelPos);
  }

  // 🌠 Update meteorite orbit
  updateMeteorImpact(delta, earthMesh);

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

animate();

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});
