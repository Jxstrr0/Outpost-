// The yard outside (night 3 on): snow, the station's outer cladding, the fence, the tether
// line out to the north mast, the fuel shed, falling snow, footprints and whiteout fog.
// Reads game state each frame; never writes it.

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { createKit } from './kit.js';
import { PALETTE as C } from './assets.js';
import { surfaces } from './textures.js';
import { YARD } from './layout.js';
import * as P from './props.js';

const X = CONFIG.exterior;
const R = CONFIG.render;
const TILE = R.surfaces.snowTile;

const SNOW = 0xb9c6d3;
const CLAD = 0x5a6570;
const CLAD_DARK = 0x2d343a;
const ROPE = 0xd8b02a;

/** Jerry can spots on the fuel shed floor, against its east wall. */
export const SHED_CAN_SLOTS = [-3.2, -2.45, -1.7].map((z) => ({ x: 10.55, y: 0.095, z }));

/**
 * The exterior lights itself with the moon, the sky and the flashlight only. The station's
 * point lights cast no shadows, so without this they would shine through the walls onto
 * the snow outside.
 */
function noPointLights(material) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_begin>',
      THREE.ShaderChunk.lights_fragment_begin.replace('#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )', '#if 0')
    );
  };
  material.customProgramCacheKey = () => 'no-point-lights';
  return material;
}

/** The snow crust texture over everything in the yard; drawn on first use. */
const exteriorMaterial = () => noPointLights(surfaces().snow);

/** Rolling snow over the whole yard, flat where the station stands. */
function makeGround() {
  const w = YARD.maxX - YARD.minX + 30;
  const d = YARD.maxZ - YARD.minZ + 30;
  const geo = new THREE.PlaneGeometry(w, d, 38, 50);
  geo.rotateX(-Math.PI / 2);
  geo.translate((YARD.minX + YARD.maxX) / 2, 0, (YARD.minZ + YARD.maxZ) / 2);
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const base = new THREE.Color(SNOW);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const nearStation = x > -12.5 && x < 6.5 && z > -6.5 && z < 10.5;
    const wave = Math.sin(x * 0.37 + z * 0.11) * 0.18 + Math.sin(z * 0.29 - x * 0.07) * 0.14;
    p.setY(i, nearStation ? -0.03 : -0.03 + Math.max(0, wave + 0.1));
    const k = 0.9 + (Math.sin(x * 1.7) * Math.cos(z * 1.3)) * 0.05 + Math.max(0, wave) * 0.25;
    colors[i * 3] = base.r * k;
    colors[i * 3 + 1] = base.g * k;
    colors[i * 3 + 2] = base.b * k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  // UVs in world metres, so the crust matches the cladding and the drifts built in the kit.
  const uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / TILE, p.getZ(i) / TILE);
  const mesh = new THREE.Mesh(geo, exteriorMaterial());
  mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  mesh.name = 'ground';
  return mesh;
}

/**
 * One run of outer cladding: corrugated panels, a dark kick plate, a fascia with snow on
 * top, and a drift along the foot. `axis` 'x' runs along x at z = fixed, facing `out`.
 */
function claddingRun(k, axis, fixed, from, to, out, openings = []) {
  const H = 3.0;
  const T = 0.08;
  const off = out * 0.14;
  const along = axis === 'x';
  const put = (a0, a1, y, h, across, thick, hex, o) => {
    const len = a1 - a0;
    if (len <= 0.001) return;
    const mid = (a0 + a1) / 2;
    if (along) k.box(len, h, thick, hex, mid, y, fixed + across, o);
    else k.box(thick, h, len, hex, fixed + across, y, mid, o);
  };
  // Panels, with gaps cut for openings (doors).
  let cursor = from;
  for (const o of openings) {
    put(cursor, o.from, H / 2, H, off, T, CLAD);
    put(o.from, o.to, (o.top + H) / 2, H - o.top, off, T, CLAD); // lintel
    cursor = o.to;
  }
  put(cursor, to, H / 2, H, off, T, CLAD);
  // Ribs every half metre, skipping openings.
  for (let a = from + 0.25; a < to - 0.1; a += 0.5) {
    if (openings.some((o) => a > o.from - 0.05 && a < o.to + 0.05)) continue;
    put(a - 0.025, a + 0.025, H / 2, H, off + out * 0.05, 0.04, 0x66717c, { shade: 0.35 });
  }
  // Kick plate, fascia and its snow cap.
  let c2 = from;
  for (const o of openings) {
    put(c2, o.from, 0.18, 0.36, off + out * 0.03, 0.06, CLAD_DARK);
    c2 = o.to;
  }
  put(c2, to, 0.18, 0.36, off + out * 0.03, 0.06, CLAD_DARK);
  put(from - 0.2, to + 0.2, H + 0.12, 0.26, off + out * 0.1, 0.34, CLAD_DARK);
  put(from - 0.2, to + 0.2, H + 0.28, 0.07, off + out * 0.1, 0.38, 0xd3dde6, { shade: 0 });
  // A snow drift banked against the wall, between openings.
  let c3 = from;
  const drift = (a0, a1) => {
    if (a1 - a0 < 0.6) return;
    const mid = (a0 + a1) / 2;
    const len = a1 - a0 - 0.2;
    if (along) k.box(len, 0.5, 0.9, SNOW, mid, 0.02, fixed + out * 0.45, { rx: out * 0.55, shade: 0.12 });
    else k.box(0.9, 0.5, len, SNOW, fixed + out * 0.45, 0.02, mid, { rz: -out * 0.55, shade: 0.12 });
  };
  for (const o of openings) {
    drift(c3, o.from - 0.4);
    c3 = o.to + 0.4;
  }
  drift(c3, to);
}

/** The station seen from outside. Matches the walls in rooms/shell.js. */
function buildCladding(k) {
  claddingRun(k, 'x', -5, -11.14, 5.14, -1); // north
  claddingRun(k, 'z', 5, -5.14, 9.14, 1); // east
  claddingRun(k, 'x', 9, 0.86, 5.14, 1); // supply, south
  claddingRun(k, 'z', 1, 7.0, 9.14, -1); // supply, west
  claddingRun(k, 'x', 7, -2.14, 0.86, 1, [{ from: -1.05, to: 0.05, top: 2.15 }]); // airlock, south
  claddingRun(k, 'z', -2, 7.0, 8.14, 1); // Vance's room, the corner east of it
  claddingRun(k, 'x', 8, -6.14, -1.86, 1); // Vance's room, south
  claddingRun(k, 'z', -6, 5.0, 8.14, -1); // Vance's room, west
  claddingRun(k, 'x', 5, -11.14, -6.14, 1); // main room, south
  claddingRun(k, 'z', -11, -5.14, 5.14, -1, [{ from: -3.0, to: -1.8, top: 2.15 }]); // west, with the west door

  // The west door's frame from outside, with ice on its head.
  k.box(0.2, 2.3, 0.12, CLAD_DARK, -11.2, 1.15, -3.06);
  k.box(0.2, 2.3, 0.12, CLAD_DARK, -11.2, 1.15, -1.74);
  k.box(0.2, 0.14, 1.44, CLAD_DARK, -11.2, 2.22, -2.4);
  k.box(0.12, 0.1, 1.2, 0xdfe8ef, -11.28, 2.12, -2.4, { shade: 0 }); // ice on the head
  // North window frame from outside.
  k.box(2.05, 0.12, 0.16, CLAD_DARK, -4.5, 2.12, -5.26);
  k.box(2.05, 0.12, 0.16, CLAD_DARK, -4.5, 0.98, -5.26);
  k.box(0.12, 1.2, 0.16, CLAD_DARK, -5.52, 1.55, -5.26);
  k.box(0.12, 1.2, 0.16, CLAD_DARK, -3.48, 1.55, -5.26);
  k.box(2.0, 0.08, 0.3, 0xd3dde6, -4.5, 1.0, -5.32, { shade: 0 }); // snow on the sill
  // Outer airlock door frame and a hazard stripe.
  k.box(0.12, 2.3, 0.2, CLAD_DARK, -1.1, 1.15, 7.2);
  k.box(0.12, 2.3, 0.2, CLAD_DARK, 0.1, 1.15, 7.2);
  k.box(1.32, 0.14, 0.2, CLAD_DARK, -0.5, 2.22, 7.2);
  // Generator exhaust stack on the east wall.
  k.cyl(0.11, 2.2, 0x3b3f42, 5.5, 2.6, -2.2, { seg: 8 });
  k.box(0.5, 0.12, 0.12, 0x3b3f42, 5.3, 1.6, -2.2);
}

function buildFence(k, b) {
  const { minX, maxX, minZ, maxZ } = YARD;
  const run = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.ceil(len / 3);
    const ry = Math.atan2(-(bz - az), bx - ax);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      k.box(0.09, 1.5, 0.09, 0x2b3035, ax + (bx - ax) * t, 0.75, az + (bz - az) * t);
    }
    k.at((ax + bx) / 2, 0, (az + bz) / 2, ry, () => {
      for (const y of [0.45, 0.9, 1.35]) k.box(len, 0.025, 0.025, 0x4a5258, 0, y, 0, { shade: 0 });
    });
  };
  run(minX, minZ, maxX, minZ);
  run(maxX, minZ, maxX, maxZ);
  run(maxX, maxZ, minX, maxZ);
  run(minX, maxZ, minX, minZ);
  const t = 0.3;
  b.colliders.push({ minX, maxX, minZ: minZ - t, maxZ: minZ, off: false });
  b.colliders.push({ minX, maxX, minZ: maxZ, maxZ: maxZ + t, off: false });
  b.colliders.push({ minX: minX - t, maxX: minX, minZ, maxZ, off: false });
  b.colliders.push({ minX: maxX, maxX: maxX + t, minZ, maxZ, off: false });
}

/** Posts and a rope at waist height from the airlock to the mast, with orange tags. */
function buildTether(k, tags) {
  const pts = YARD.tether;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1];
    const [bx, bz] = pts[i];
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / 4));
    const ry = Math.atan2(-(bz - az), bx - ax);
    for (let j = i === 1 ? 0 : 1; j <= n; j++) {
      const x = ax + ((bx - ax) * j) / n;
      const z = az + ((bz - az) * j) / n;
      k.box(0.07, 1.15, 0.07, 0x2b3035, x, 0.575, z);
      tags.box(0.09, 0.12, 0.09, C.orange, x, 1.02, z, { shade: 0, flat: true });
    }
    // The rope sags a little between the ends of each run.
    k.at((ax + bx) / 2, 0, (az + bz) / 2, ry, () => k.box(len, 0.03, 0.03, ROPE, 0, 0.98, 0, { shade: 0 }));
  }
}

/** The north mast: a lattice tower with its instruments, the antenna and a red beacon. */
function buildMast(k, b) {
  const { x, z } = YARD.mast;
  const H = 9;
  const r = 0.45;
  const legs = [0, 1, 2].map((i) => [x + Math.cos(i * 2.094 + 0.5) * r, z + Math.sin(i * 2.094 + 0.5) * r]);
  for (const [lx, lz] of legs) k.cyl(0.04, H, 0x6d757b, lx, H / 2, lz, { seg: 6 });
  for (let y = 0.8; y < H; y += 1.2) {
    for (let i = 0; i < 3; i++) {
      const [ax, az] = legs[i];
      const [bx, bz] = legs[(i + 1) % 3];
      const len = Math.hypot(bx - ax, bz - az);
      k.at((ax + bx) / 2, 0, (az + bz) / 2, Math.atan2(-(bz - az), bx - ax), () =>
        k.box(len, 0.03, 0.03, 0x6d757b, 0, y, 0, { shade: 0 })
      );
    }
  }
  k.box(1.2, 0.3, 1.2, 0x3a4046, x, 0.15, z); // concrete footing
  // Instrument box facing the station (south), at chest height.
  k.box(0.55, 0.65, 0.3, 0xc9c2b0, x, 1.35, z + 0.62);
  k.box(0.6, 0.05, 0.36, 0x8a96a0, x, 1.7, z + 0.62); // hood
  k.box(0.32, 0.18, 0.02, 0x1b2420, x, 1.42, z + 0.78, { shade: 0 }); // readout window
  k.box(0.06, 0.06, 0.04, C.red, x + 0.18, 1.2, z + 0.78, { shade: 0 });
  k.box(0.05, 1.0, 0.05, 0x6d757b, x, 0.6, z + 0.55);
  // Anemometer and vane on top.
  k.cyl(0.03, 0.6, 0x6d757b, x, H + 0.3, z, { seg: 6 });
  for (let i = 0; i < 3; i++) {
    const a = i * 2.094;
    k.box(0.4, 0.02, 0.02, 0x8a96a0, x + Math.cos(a) * 0.2, H + 0.55, z + Math.sin(a) * 0.2, { ry: -a });
    k.sphere(0.06, 0xc9c2b0, x + Math.cos(a) * 0.4, H + 0.55, z + Math.sin(a) * 0.4, { seg: 6, rings: 4 });
  }
  // The antenna arm, where ice builds.
  k.box(2.0, 0.05, 0.05, 0x8a96a0, x, 6.2, z);
  for (const s of [-1, 1]) k.box(0.04, 0.8, 0.04, 0x8a96a0, x + s * 0.95, 6.2, z);
  b.anchor('mast', x, 1.4, z + 0.62);
  b.anchor('mastBox', x - 0.1, 1.73, z + 0.62); // note spot, on the instrument box hood
  b.anchor('mastTop', x, H, z);
  b.anchor('antenna', x, 6.2, z);
  b.block(x - 0.7, x + 0.7, z - 0.7, z + 0.55, 3);
  b.hit('mast', 1.2, 1.6, 0.5, x, 1.3, z + 0.7);
}

/** A three-sided fuel shed east of the generator room, open to the west. */
function buildShed(k, b) {
  const { minX, maxX, minZ, maxZ } = YARD.shed;
  const H = 2.4;
  const T = 0.12;
  const wall = (x0, x1, z0, z1) => b.solidBox(x1 - x0, H, z1 - z0, 0x4d5236, (x0 + x1) / 2, H / 2, (z0 + z1) / 2);
  wall(minX, maxX, minZ - T, minZ); // north
  wall(minX, maxX, maxZ, maxZ + T); // south
  wall(maxX, maxX + T, minZ - T, maxZ + T); // east
  k.box(maxX - minX + 0.6, 0.14, maxZ - minZ + 0.6, 0x363a26, (minX + maxX) / 2, H + 0.07, (minZ + maxZ) / 2);
  k.box(maxX - minX + 0.6, 0.12, maxZ - minZ + 0.6, 0xd3dde6, (minX + maxX) / 2, H + 0.2, (minZ + maxZ) / 2, { shade: 0 });
  k.box(maxX - minX, 0.04, maxZ - minZ, 0x3a3d33, (minX + maxX) / 2, 0.0, (minZ + maxZ) / 2); // plank floor
  // Drums and a pallet.
  k.at(8.6, 0, -3.4, 0, () => P.drum(k, 0x5e4a36));
  k.at(9.3, 0, -3.5, 0.4, () => P.drum(k, 0x3d5a6e));
  b.block(8.25, 9.65, -3.85, -3.05, 1.0);
  k.at(10.4, 0, -2.45, 0, () => P.pallet(k, 0.9, 2.3));
  k.box(0.04, 0.3, 0.6, C.paper, 11.0, 1.6, -0.9, { shade: 0 }); // a stock list, nailed up
  b.anchor('shed', 9.5, 1.2, -2);
  b.anchor('shedWall', 10.975, 1.3, -1.45); // note spot, pinned to the back wall
}

/** Falling snow in a box that follows the player. Only drawn outside. */
function makeSnow() {
  const n = X.snowFlakes;
  const s = X.snowBox;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * s;
    pos[i * 3 + 1] = Math.random() * X.snowHeight;
    pos[i * 3 + 2] = (Math.random() - 0.5) * s;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  // A soft round flake instead of a square point.
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.7)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  const map = new THREE.CanvasTexture(c);
  // No fog: in a whiteout the snow is the one thing you can still see.
  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xe6eef6,
      size: X.snowFlakeSize,
      map,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      fog: false,
    })
  );
  points.frustumCulled = false;
  points.visible = false;
  return points;
}

/** A ring of footprint decals, stamped as the player walks through the snow. */
function makePrints(count, w, l, color, opacity) {
  const geo = new THREE.PlaneGeometry(w, l);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.InstancedMesh(
    geo,
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }),
    count
  );
  mesh.count = 0;
  mesh.frustumCulled = false;
  return mesh;
}

/**
 * @param {ReturnType<import('./rooms/builder.js').createBuilder>} b
 * @param {THREE.Scene} scene
 */
export function buildExterior(b, scene) {
  const k = createKit({ tile: [TILE, TILE] });
  const tags = createKit();
  buildCladding(k);
  buildFence(k, b);
  buildTether(k, tags);
  buildMast(k, b);
  buildShed(k, b);
  const yard = k.bake(exteriorMaterial());
  yard.name = 'yard';
  b.group.add(yard);
  b.meshes.push(yard);
  const tagMesh = tags.bake(new THREE.MeshBasicMaterial({ vertexColors: true }));
  b.group.add(tagMesh);
  b.group.add(makeGround());

  // The window glows from outside when the main room is lit.
  const windowGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.0), new THREE.MeshBasicMaterial({ color: 0x0b0e12 }));
  windowGlow.position.set(-4.5, 1.55, -5.2);
  windowGlow.rotation.y = Math.PI;
  b.group.add(windowGlow);
  const doorLamp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.14), new THREE.MeshBasicMaterial({ color: 0x101010 }));
  doorLamp.position.set(-0.5, 2.45, 7.28);
  b.group.add(doorLamp);

  // Ice on the antenna, shown while it's iced.
  const ice = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.22, 0.22),
    noPointLights(new THREE.MeshLambertMaterial({ color: 0xdcecf8, emissive: 0x223040 }))
  );
  ice.position.copy(b.anchors.antenna);
  ice.visible = false;
  b.group.add(ice);

  // The beacon on top of the mast: the one thing you can always see out there.
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xff3020, fog: false, toneMapped: false })
  );
  beacon.position.copy(b.anchors.mastTop).add(new THREE.Vector3(0, 0.75, 0));
  b.group.add(beacon);
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,90,60,0.9)');
    grad.addColorStop(0.3, 'rgba(255,50,30,0.35)');
    grad.addColorStop(1, 'rgba(255,40,20,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTex, fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  halo.scale.setScalar(2.4);
  halo.position.copy(beacon.position);
  b.group.add(halo);

  const snow = makeSnow();
  scene.add(snow);
  const prints = makePrints(X.footprintCount, 0.13, 0.3, 0x6f7c8a, 0.5);
  const others = makePrints(90, 0.1, 0.34, 0x4a5462, 0.6);
  b.group.add(prints, others);
  const trail = []; // where the player's prints are, oldest first
  let lastPrint = null;
  let printSide = 1;
  let printIndex = 0;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const v = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);

  const stamp = (mesh, index, x, z, heading) => {
    q.setFromAxisAngle(up, heading);
    v.set(x, 0.015, z);
    m.compose(v, q, one);
    mesh.setMatrixAt(index, m);
    mesh.instanceMatrix.needsUpdate = true;
  };

  const fog = scene.fog;
  const indoor = { color: new THREE.Color(R.fogColor), near: R.fogNear, far: R.fogFar };
  const outdoor = new THREE.Color(X.fogColor);
  let outsideMix = 0;
  let gustMix = 0;

  return {
    /** Fresh snow every night. */
    reset() {
      trail.length = 0;
      prints.count = 0;
      others.count = 0;
      lastPrint = null;
      printIndex = 0;
    },

    /** Night 3's scripted moment: a second set of prints, beside yours, going on past the mast. */
    addSecondSet() {
      let n = 0;
      for (let i = 0; i < trail.length && n < others.instanceMatrix.count - 12; i += 2) {
        const p = trail[i];
        const side = 0.55;
        stamp(others, n++, p.x + Math.cos(p.h) * side, p.z - Math.sin(p.h) * side, p.h);
      }
      // From the mast, they keep going north, out past the fence.
      const { x, z } = YARD.mast;
      for (let i = 0; i < 12 && n < others.instanceMatrix.count; i++) {
        stamp(others, n++, x + 0.9 + (i % 2) * 0.22, z - 1.2 - i * 0.8, 0);
      }
      others.count = n;
      return n;
    },

    update(state, dt, t, camera) {
      const outside = state.room === 'outside';
      const p = camera.position;

      // Fog: the station's dark interior haze, or the whiteout outside.
      outsideMix += ((outside ? 1 : 0) - outsideMix) * Math.min(1, dt * X.fogBlendPerSecond);
      gustMix += ((state.gust?.active ? 1 : 0) - gustMix) * Math.min(1, dt * X.fogBlendPerSecond);
      const farOut = X.fogFar + (X.gustFogFar - X.fogFar) * gustMix;
      fog.color.copy(indoor.color).lerp(outdoor, outsideMix);
      fog.near = indoor.near + (X.fogNear - indoor.near) * outsideMix;
      fog.far = indoor.far + (farOut - indoor.far) * outsideMix;
      if (scene.background?.isColor) scene.background.copy(fog.color);

      // Snow falls around the player while they're out in it.
      snow.visible = outside;
      if (outside) {
        // Flakes live in the world and wrap around the player, so walking moves through them.
        const pos = snow.geometry.attributes.position;
        const half = X.snowBox / 2;
        const wind = X.snowWind + (X.gustSnowWind - X.snowWind) * gustMix;
        for (let i = 0; i < pos.count; i++) {
          let x = pos.getX(i) + wind * dt;
          let y = pos.getY(i) - (X.snowFall + (i % 7) * 0.08) * dt;
          let z = pos.getZ(i) + Math.sin(t * 0.7 + i) * 0.3 * dt;
          if (y < 0) y += X.snowHeight;
          if (x - p.x > half) x -= X.snowBox;
          if (x - p.x < -half) x += X.snowBox;
          if (z - p.z > half) z -= X.snowBox;
          if (z - p.z < -half) z += X.snowBox;
          pos.setXYZ(i, x, y, z);
        }
        pos.needsUpdate = true;
        snow.material.opacity = 0.85 + 0.15 * gustMix;
      }

      // Footprints.
      if (outside) {
        if (!lastPrint) lastPrint = { x: p.x, z: p.z };
        const dx = p.x - lastPrint.x;
        const dz = p.z - lastPrint.z;
        const d = Math.hypot(dx, dz);
        if (d >= X.footprintEvery) {
          const h = Math.atan2(-dx, -dz);
          printSide = -printSide;
          const sx = Math.cos(h) * 0.12 * printSide;
          const sz = -Math.sin(h) * 0.12 * printSide;
          const at = { x: p.x + sx, z: p.z + sz, h };
          trail.push(at);
          if (trail.length > X.footprintCount) trail.shift();
          stamp(prints, printIndex % X.footprintCount, at.x, at.z, h);
          printIndex++;
          prints.count = Math.min(X.footprintCount, printIndex);
          lastPrint = { x: p.x, z: p.z };
        }
      } else {
        lastPrint = null;
      }

      // Lit window from outside, the lamp over the outer door, ice, beacon.
      windowGlow.material.color.setHex(state.lightsLit ? 0x8a7650 : 0x0b0e12);
      doorLamp.material.color.setHex(state.power > 0 ? 0xffc070 : 0x101010);
      ice.visible = !!state.antennaIced;
      const on = Math.floor(t / X.beaconBlinkSeconds) % 2 === 0;
      beacon.visible = on;
      halo.visible = on;
    },
  };
}
