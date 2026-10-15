// First-person movement and look, with simple circle-vs-box collision.

import { CONFIG } from '../config.js';

const P = CONFIG.player;

/** The shared input state both control schemes write into. */
export function createInputState() {
  return {
    moveX: 0, // strafe, -1..1
    moveY: 0, // forward, -1..1
    lookX: 0, // accumulated radians this frame
    lookY: 0,
    useDown: false,
    usePressed: false, // true for one frame when Use goes down
    torchPressed: false, // true for one frame when the flashlight key or button is pressed
    consumeFrame() {
      this.lookX = 0;
      this.lookY = 0;
      this.usePressed = false;
      this.torchPressed = false;
    },
    reset() {
      this.moveX = this.moveY = this.lookX = this.lookY = 0;
      this.useDown = this.usePressed = this.torchPressed = false;
    },
  };
}

export function createPlayer(camera) {
  camera.rotation.order = 'YXZ';
  const player = {
    x: 0,
    z: 0,
    yaw: 0,
    pitch: 0,
    bob: 0,

    spawn(anchor, yaw = 0, pitch = -0.2) {
      this.x = anchor.x;
      this.z = anchor.z;
      this.yaw = yaw;
      this.pitch = pitch;
      this.bob = 0;
      this.apply();
    },

    /** `speedScale` slows the walk (deep snow, a gust in your face). */
    update(dt, input, colliders, settings, speedScale = 1) {
      const invert = settings.invertY ? -1 : 1;
      this.yaw -= input.lookX;
      this.pitch -= input.lookY * invert;
      this.pitch = Math.max(-P.pitchLimit, Math.min(P.pitchLimit, this.pitch));

      let mx = input.moveX;
      let my = input.moveY;
      const len = Math.hypot(mx, my);
      if (len > 1) {
        mx /= len;
        my /= len;
      }
      const sin = Math.sin(this.yaw);
      const cos = Math.cos(this.yaw);
      const vx = (-sin * my + cos * mx) * P.walkSpeed * speedScale;
      const vz = (-cos * my - sin * mx) * P.walkSpeed * speedScale;

      this.x += vx * dt;
      this.resolve(colliders);
      this.z += vz * dt;
      this.resolve(colliders);

      // Reduced flicker also means reduced motion: no head bob.
      const speed = settings.reducedFlicker ? 0 : Math.hypot(vx, vz);
      this.bob += speed * dt * 2.4;
      this.apply(speed);
    },

    resolve(colliders) {
      const r = P.radius;
      for (let pass = 0; pass < 2; pass++) {
        for (const c of colliders) {
          if (c.off) continue;
          const cx = Math.max(c.minX, Math.min(this.x, c.maxX));
          const cz = Math.max(c.minZ, Math.min(this.z, c.maxZ));
          const dx = this.x - cx;
          const dz = this.z - cz;
          const d2 = dx * dx + dz * dz;
          if (d2 >= r * r) continue;
          if (d2 > 1e-8) {
            const d = Math.sqrt(d2);
            this.x = cx + (dx / d) * r;
            this.z = cz + (dz / d) * r;
          } else {
            // Centre inside the box: push out along the shallowest axis.
            const left = this.x - c.minX;
            const right = c.maxX - this.x;
            const top = this.z - c.minZ;
            const bottom = c.maxZ - this.z;
            const m = Math.min(left, right, top, bottom);
            if (m === left) this.x = c.minX - r;
            else if (m === right) this.x = c.maxX + r;
            else if (m === top) this.z = c.minZ - r;
            else this.z = c.maxZ + r;
          }
        }
      }
    },

    apply(speed = 0) {
      const bobY = speed > 0.1 ? Math.sin(this.bob * 2) * 0.025 : 0;
      camera.position.set(this.x, P.eyeHeight + bobY, this.z);
      camera.rotation.set(this.pitch, this.yaw, 0);
    },
  };
  return player;
}
