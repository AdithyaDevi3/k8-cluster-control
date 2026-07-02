export class EventDispatcher {
  constructor() {
    this._listeners = {};
  }
  addEventListener(type, listener) {
    if (this._listeners[type] === undefined) this._listeners[type] = [];
    if (this._listeners[type].indexOf(listener) === -1) this._listeners[type].push(listener);
  }
  removeEventListener(type, listener) {
    const listeners = this._listeners[type];
    if (listeners !== undefined) {
      const index = listeners.indexOf(listener);
      if (index !== -1) listeners.splice(index, 1);
    }
  }
  dispatchEvent(event) {
    const listeners = this._listeners[event.type];
    if (listeners !== undefined) {
      event.target = this;
      const array = listeners.slice(0);
      for (let i = 0, l = array.length; i < l; i++) array[i].call(this, event);
    }
  }
}

export class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
}

export class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }
  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }
  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  distanceToSquared(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return dx * dx + dy * dy + dz * dz;
  }
}

export class Quaternion {}

export class Spherical {
  constructor(radius = 1, phi = 0, theta = 0) {
    this.radius = radius;
    this.phi = phi;
    this.theta = theta;
  }
  setFromVector3(vec3) {
    this.radius = Math.sqrt(vec3.x * vec3.x + vec3.y * vec3.y + vec3.z * vec3.z);
    if (this.radius === 0) {
      this.theta = 0;
      this.phi = 0;
    } else {
      this.theta = Math.atan2(vec3.x, vec3.z);
      this.phi = Math.acos(Math.max(-1, Math.min(1, vec3.y / this.radius)));
    }
    return this;
  }
  makeSafe() {
    const EPS = 0.000001;
    this.phi = Math.max(EPS, Math.min(Math.PI - EPS, this.phi));
    return this;
  }
}

export class Mesh {}

export class MeshStandardMaterial {
  constructor() {}
}

export class SphereGeometry {}

export class IcosahedronGeometry {}

export class RingGeometry {}

export class MeshBasicMaterial {}

export class Raycaster {
  setFromCamera() {}
  intersectObjects() { return []; }
}

export class PerspectiveCamera {
  constructor() {
    this.position = new Vector3();
    this.aspect = 1;
  }
  lookAt() {}
  updateProjectionMatrix() {}
}

export class Scene {
  constructor() {
    this.children = [];
    this.fog = null;
  }
  add(object) { this.children.push(object); }
}

export class WebGLRenderer {
  constructor() { this.domElement = document.createElement('canvas'); }
  setSize() {}
  setPixelRatio() {}
  render() {}
}

export class AmbientLight {}
export class PointLight {}
export class Group {
  constructor() { this.children = []; this.position = new Vector3(); }
  add(...objs) { this.children.push(...objs); }
  clear() { this.children.length = 0; }
}

export class SpriteMaterial {}
export class Sprite {
  constructor() { this.scale = new Vector3(); }
}

export class CanvasTexture {
  constructor() {}
}
