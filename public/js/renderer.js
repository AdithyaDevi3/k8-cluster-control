import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const CLUSTER_COLORS = {
  ready: 0x38bdf8,
  pending: 0xfbbf24,
  degraded: 0xef4444
};

function createGalaxyRenderer(container, onObjectSelected) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = false;
  controls.minDistance = 10;
  controls.maxDistance = 220;
  controls.target.set(0, 0, 0);

  camera.position.set(0, 25, 80);

  scene.fog = new THREE.FogExp2(0x02060f, 0.0025);

  const ambient = new THREE.AmbientLight(0xffffff, 0.38);
  scene.add(ambient);

  const pointLight = new THREE.PointLight(0x7dd3fc, 1.8, 240);
  pointLight.position.set(120, 80, 120);
  scene.add(pointLight);

  const clustersGroup = new THREE.Group();
  scene.add(clustersGroup);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const clusterIndex = new Map();
  let activeCluster = null;
  let clusterChangeCallbacks = [];
  let objectActionCallbacks = [];

  function createDodecagonRing() {
    const radius = 28;
    const geometry = new THREE.RingGeometry(radius - 0.3, radius + 0.3, 96);
    const material = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.18, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = -Math.PI / 2;
    return ring;
  }

  function buildClusterSystem(cluster, index, total) {
    const group = new THREE.Group();
    const angle = (index / total) * Math.PI * 2;
    const distance = 32;
    group.position.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);

    const orbGeometry = new THREE.IcosahedronGeometry(5, 1);
    const orbMaterial = new THREE.MeshStandardMaterial({
      color: CLUSTER_COLORS[cluster.status] || 0x38bdf8,
      metalness: 0.35,
      roughness: 0.45,
      emissive: 0x0d4f6f,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.94
    });
    const orb = new THREE.Mesh(orbGeometry, orbMaterial);
    orb.userData = { type: 'cluster', cluster };

    const label = createTextSprite(cluster.name);
    label.position.set(0, 7, 0);

    group.add(orb, label);
    const ring = createDodecagonRing();
    group.add(ring);

    clusterIndex.set(cluster.id, group);
    clustersGroup.add(group);

    return group;
  }

  function createTextSprite(text) {
    const fontSize = 36;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    context.font = `${fontSize}px Inter, sans-serif`;
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.fillText(text, canvas.width / 2, canvas.height / 2 + fontSize / 3);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.9 });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(16, 4, 1);
    return sprite;
  }

  function createClusterObjectNode(clusterId, object) {
    const geometry = new THREE.SphereGeometry(1.3, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: object.type === 'Pod' ? 0xfccb0d : 0x7c3aed,
      emissive: 0x1f2937,
      roughness: 0.25,
      metalness: 0.2
    });
    const node = new THREE.Mesh(geometry, material);
    const x = object.x * 15;
    const z = object.y * 15;
    node.position.set(x, 2 + Math.random() * 5, z);
    node.userData = { type: 'object', clusterId, object };
    return node;
  }

  function renderClusters(clusters) {
    clustersGroup.clear();
    clusters.forEach((cluster, index) => buildClusterSystem(cluster, index, clusters.length));
    activeCluster = clusters[0] || null;
    clusterChangeCallbacks.forEach((fn) => fn(activeCluster));
  }

  function clearClusterObjects() {
    clustersGroup.children = clustersGroup.children.filter((child) => child.userData?.type !== 'clusterObjectsGroup');
  }

  function renderClusterObjects(clusterId, objects) {
    clearClusterObjects();
    const clusterGroup = clusterIndex.get(clusterId);
    if (!clusterGroup) return;

    const objectGroup = new THREE.Group();
    objectGroup.userData = { type: 'clusterObjectsGroup', clusterId };
    objectGroup.position.copy(clusterGroup.position);
    objectGroup.position.y = 0;

    objects.forEach((object) => {
      const node = createClusterObjectNode(clusterId, object);
      objectGroup.add(node);
    });

    clustersGroup.add(objectGroup);
  }

  function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  function getIntersects(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(scene.children, true).filter((match) => match.object.userData?.type);
  }

  function handlePointerDown(event) {
    const hits = getIntersects(event);
    if (!hits.length) return;
    const hit = hits[0].object;
    const { type } = hit.userData;

    if (type === 'cluster') {
      activeCluster = hit.userData.cluster;
      clusterChangeCallbacks.forEach((fn) => fn(activeCluster));
      return;
    }

    if (type === 'object') {
      const object = hit.userData.object;
      const clusterId = hit.userData.clusterId;
      const clusterGroup = clusterIndex.get(clusterId);
      const cluster = clusterGroup?.children.find((child) => child.userData?.type === 'cluster')?.userData?.cluster || { id: clusterId, name: clusterId };
      onObjectSelected(cluster, object);
      objectActionCallbacks.forEach((fn) => fn(cluster, object));
    }
  }

  renderer.domElement.addEventListener('pointerdown', handlePointerDown);
  window.addEventListener('resize', onWindowResize);
  animate();

  return {
    renderClusters,
    renderClusterObjects,
    activeCluster,
    onClusterChange(fn) {
      clusterChangeCallbacks.push(fn);
    },
    onObjectAction(fn) {
      objectActionCallbacks.push(fn);
    },
    selectCluster(clusterId) {
      const cluster = clustersGroup.children
        .map((group) => group.children.find((child) => child.userData?.type === 'cluster'))
        .find((child) => child?.userData?.cluster?.id === clusterId)?.userData?.cluster;
      if (cluster) {
        activeCluster = cluster;
        clusterChangeCallbacks.forEach((fn) => fn(activeCluster));
      }
    }
  };
}

export { createGalaxyRenderer };
