// Low-poly model kit. Props are built from simple parts with vertex colours, then baked
// into one merged mesh per room, so the whole station draws in a handful of calls.
// Each part's UVs are laid out in world metres, so one tiling grain texture (textures.js)
// runs across every surface without stretching or seams between parts.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CONFIG } from '../config.js';
import { surfaces } from './textures.js';

const K = CONFIG.render.kit;
const S = CONFIG.render.surfaces;

const color = new THREE.Color();
const euler = new THREE.Euler();
const quat = new THREE.Quaternion();
const pos = new THREE.Vector3();
const one = new THREE.Vector3(1, 1, 1);

/**
 * Paint a geometry with one colour, darkening it toward the bottom of the part so props
 * read as sitting in the room (a cheap stand-in for ambient occlusion).
 */
function paint(geometry, hex, shade, jitter) {
  const p = geometry.attributes.position;
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const span = Math.max(1e-6, max.y - min.y);
  color.setHex(hex);
  const out = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) - min.y) / span;
    const k = (1 - shade + shade * t) * jitter;
    out[i * 3] = color.r * k;
    out[i * 3 + 1] = color.g * k;
    out[i * 3 + 2] = color.b * k;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(out, 3));
}

/**
 * Lay a geometry's UVs out in metres along whichever world axis each face points at
 * (floors and tops in x/z, walls in x/y or z/y), divided by the tile size.
 */
function worldUvs(geometry, [tileW, tileH]) {
  const p = geometry.attributes.position;
  const n = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i));
    const ny = Math.abs(n.getY(i));
    const nz = Math.abs(n.getZ(i));
    if (ny >= nx && ny >= nz) uv.setXY(i, p.getX(i) / tileW, p.getZ(i) / tileW);
    else if (nx >= nz) uv.setXY(i, p.getZ(i) / tileW, p.getY(i) / tileH);
    else uv.setXY(i, p.getX(i) / tileW, p.getY(i) / tileH);
  }
}

/** Wrap a round part's own UVs in metres: around its girth and along its height. */
function roundUvs(geometry, around, along, [tileW, tileH]) {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * around) / tileW, (uv.getY(i) * along) / tileH);
}

/** @param {{ tile?: [number, number] }} options - metres per texture repeat, across and up */
export function createKit({ tile = [S.propTile, S.propTile] } = {}) {
  const parts = [];
  const stack = [new THREE.Matrix4()];
  let seed = 1;

  const top = () => stack[stack.length - 1];
  // A small, repeatable brightness wobble per part, so repeated props don't look stamped.
  const jitter = () => {
    seed = (seed * 16807) % 2147483647;
    return 1 - K.colorJitter + ((seed % 1000) / 1000) * K.colorJitter * 2;
  };

  function add(geometry, hex, x, y, z, o = {}) {
    paint(geometry, hex, o.shade ?? K.shade, o.flat ? 1 : jitter());
    if (o.round) roundUvs(geometry, o.round[0], o.round[1], tile);
    euler.set(o.rx || 0, o.ry || 0, o.rz || 0);
    quat.setFromEuler(euler);
    pos.set(x, y, z);
    const m = new THREE.Matrix4().compose(pos, quat, one).premultiply(top());
    geometry.applyMatrix4(m);
    if (!o.round) worldUvs(geometry, tile);
    parts.push(geometry);
    return geometry;
  }

  const kit = {
    /** A box centred at (x, y, z) in the current frame. */
    box(w, h, d, hex, x, y, z, o) {
      return add(new THREE.BoxGeometry(w, h, d), hex, x, y, z, o);
    },
    /** A cylinder standing on y, centred at (x, y, z). `o.r2` tapers the top. */
    cyl(r, h, hex, x, y, z, o = {}) {
      const geometry = new THREE.CylinderGeometry(o.r2 ?? r, r, h, o.seg ?? 10, 1, false);
      return add(geometry, hex, x, y, z, { ...o, round: [2 * Math.PI * r, h] });
    },
    sphere(r, hex, x, y, z, o = {}) {
      const geometry = new THREE.SphereGeometry(r, o.seg ?? 8, o.rings ?? 6);
      return add(geometry, hex, x, y, z, { shade: 0.1, ...o, round: [2 * Math.PI * r, Math.PI * r] });
    },
    /** Build inside a moved and turned frame: `kit.at(x, y, z, ry, () => { ... })`. */
    at(x, y, z, ry, fn) {
      euler.set(0, ry, 0);
      quat.setFromEuler(euler);
      pos.set(x, y, z);
      stack.push(top().clone().multiply(new THREE.Matrix4().compose(pos, quat, one)));
      try {
        fn();
      } finally {
        stack.pop();
      }
    },
    /** Map a local point in the current frame to world space. */
    toWorld(x, y, z) {
      return new THREE.Vector3(x, y, z).applyMatrix4(top());
    },
    get count() {
      return parts.length;
    },
    /** Merge everything added so far into one mesh, textured with the prop grain unless told otherwise. */
    bake(material = surfaces().kit) {
      if (!parts.length) return null;
      const merged = mergeGeometries(parts, false);
      for (const p of parts) p.dispose();
      parts.length = 0;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      return mesh;
    },
  };
  return kit;
}
