import { EventDispatcher, MOUSE, Quaternion, Spherical, TOUCH, Vector2, Vector3 } from './three.module.js';

class OrbitControls extends EventDispatcher {
  constructor(object, domElement) {
    super();
    this.object = object;
    this.domElement = domElement;
    this.enabled = true;
    this.target = new Vector3();
    this.minDistance = 0;
    this.maxDistance = Infinity;
    this.enableDamping = false;
    this.dampingFactor = 0.05;
    this.zoomSpeed = 1.0;
    this.rotateSpeed = 1.0;
    this.panSpeed = 1.0;
    this.autoRotate = false;
    this.autoRotateSpeed = 2.0;
    this.minPolarAngle = 0;
    this.maxPolarAngle = Math.PI;
    this.minAzimuthAngle = -Infinity;
    this.maxAzimuthAngle = Infinity;
    this.enableZoom = true;
    this.enablePan = true;
    this.enableRotate = true;
    this.enableKeys = true;
    this.scale = 1;
    this.panOffset = new Vector3();
    this.spherical = new Spherical();
    this.sphericalDelta = new Spherical();
    this.zoomChanged = false;
    this.lastPosition = new Vector3();
    this.update();
  }
  update() {
    const offset = new Vector3();
    offset.copy(this.object.position).sub(this.target);
    this.spherical.setFromVector3(offset);
    this.spherical.theta += this.sphericalDelta.theta;
    this.spherical.phi += this.sphericalDelta.phi;
    this.spherical.makeSafe();
    this.spherical.radius *= this.scale;
    this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));
    const sinPhiRadius = Math.sin(this.spherical.phi) * this.spherical.radius;
    this.object.position.set(
      sinPhiRadius * Math.sin(this.spherical.theta),
      Math.cos(this.spherical.phi) * this.spherical.radius,
      sinPhiRadius * Math.cos(this.spherical.theta)
    );
    this.object.lookAt(this.target);
    if (this.enableDamping) {
      this.sphericalDelta.theta *= 1 - this.dampingFactor;
      this.sphericalDelta.phi *= 1 - this.dampingFactor;
    } else {
      this.sphericalDelta.set(0, 0, 0);
    }
    this.scale = 1;
    if (this.lastPosition.distanceToSquared(this.object.position) > 1e-10) {
      this.lastPosition.copy(this.object.position);
      this.dispatchEvent({ type: 'change' });
    }
  }
}

export { OrbitControls };
