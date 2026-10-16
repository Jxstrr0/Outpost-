// The building shell: floors, ceiling and walls for every room.
// North is -z. Main room x -11..0, generator room x 0..5 (both z -5..5),
// supply room x 1..5 z 5..9, airlock x -2..1 z 5..7, Vance's bunk room x -6..-2 z 5..8.
// The loop: main → generator → supply → airlock → main.

import * as THREE from 'three';
import { CONFIG } from '../../config.js';
import { PALETTE } from '../assets.js';
import { surfaces } from '../textures.js';

const TILE = CONFIG.render.surfaces.floorTile;

export const ROOM = {
  height: 2.8,
  wall: 0.2,
  minX: -11,
  maxX: 5,
  minZ: -5,
  maxZ: 9,
  dividerX: 0,
  doorway: { minZ: 1.4, maxZ: 2.6, top: 2.15 },
};

/** Door openings, shared with the door builder. `axis` is the wall's run direction. */
export const DOORWAYS = {
  airlockInner: { axis: 'x', fixed: 5, from: -1.45, to: -0.35, top: 2.1, hinge: 'from', swing: -1 },
  supply: { axis: 'x', fixed: 5, from: 3.7, to: 4.7, top: 2.1, hinge: 'to', swing: 1 },
  airlockSide: { axis: 'z', fixed: 1, from: 5.5, to: 6.5, top: 2.1, hinge: 'to', swing: 1 },
  airlockOuter: { axis: 'x', fixed: 7, from: -1.0, to: 0.0, top: 2.1, hinge: 'from', swing: 1 },
  bunkRoom: { axis: 'x', fixed: 5, from: -5.85, to: -4.85, top: 2.1, hinge: 'from', swing: 1 },
  west: { axis: 'z', fixed: -11, from: -2.95, to: -1.85, top: 2.1, hinge: 'from', swing: -1 },
};

/** Room surface colours: [wall, lower band]. */
const SKIN = {
  main: [PALETTE.wallMain, PALETTE.wallMainLow],
  gen: [PALETTE.wall, PALETTE.wallLow],
  supply: [PALETTE.wallSupply, PALETTE.wallSupplyLow],
  airlock: [PALETTE.wallAirlock, PALETTE.wallAirlockLow],
  bunk: [PALETTE.wallSupply, PALETTE.wallMainLow],
};

const dw = (id) => ({ from: DOORWAYS[id].from, to: DOORWAYS[id].to, top: DOORWAYS[id].top });

// [axis, fixed, from, to, roomOnNegativeSide, roomOnPositiveSide, openings]
// axis 'x': the wall runs along x at z = fixed. axis 'z': runs along z at x = fixed.
const WALLS = [
  ['x', -5, -11, 0, null, 'main'],
  ['x', -5, 0, 5, null, 'gen'],
  ['x', 5, -11, -6, 'main', null],
  ['x', 5, -6, -2, 'main', 'bunk', [dw('bunkRoom')]],
  ['x', 8, -6, -2, 'bunk', null],
  ['z', -6, 5, 8, null, 'bunk'],
  ['x', 5, -2, 0, 'main', 'airlock', [dw('airlockInner')]],
  ['x', 5, 0, 1, 'gen', 'airlock'],
  ['x', 5, 1, 5, 'gen', 'supply', [dw('supply')]],
  ['x', 7, -2, 1, 'airlock', null, [dw('airlockOuter')]],
  ['x', 9, 1, 5, 'supply', null],
  ['z', -11, -5, 5, null, 'main', [dw('west')]],
  ['z', 0, -5, 5, 'main', 'gen', [{ from: 1.4, to: 2.6, top: 2.15 }]],
  ['z', 5, -5, 5, 'gen', null],
  ['z', 5, 5, 9, 'supply', null],
  ['z', -2, 5, 7, 'bunk', 'airlock'],
  ['z', -2, 7, 8, 'bunk', null],
  ['z', 1, 5, 7, 'airlock', 'supply', [dw('airlockSide')]],
  ['z', 1, 7, 9, null, 'supply'],
];

/**
 * Draw one straight wall with its openings. Each wall is two half-thickness skins so the
 * rooms on either side can be painted differently.
 */
function buildWall(b, [axis, fixed, from, to, negRoom, posRoom, openings = []]) {
  const kit = b.wallKit;
  const { height: H, wall: T } = ROOM;
  const along = axis === 'x';
  // Place a box given its extent along the wall, its offset across it, and its size.
  const put = (a0, a1, y, h, across, thick, hex) => {
    const len = a1 - a0;
    const mid = (a0 + a1) / 2;
    if (along) kit.box(len, h, thick, hex, mid, y, fixed + across);
    else kit.box(thick, h, len, hex, fixed + across, y, mid);
  };

  // Solid spans between openings, extended at the ends so corners close.
  const cuts = [...openings].sort((p, q) => p.from - q.from);
  const spans = [];
  let cursor = from - T / 2;
  for (const o of cuts) {
    spans.push([cursor, o.from]);
    cursor = o.to;
  }
  spans.push([cursor, to + T / 2]);

  const sides = [
    [negRoom, -T / 4, -1],
    [posRoom, T / 4, 1],
  ];
  const bandH = 0.9;

  for (const [a0, a1] of spans) {
    if (a1 - a0 < 0.01) continue;
    for (const [room, across, sign] of sides) {
      const [wallHex, lowHex] = SKIN[room] || SKIN.gen;
      put(a0, a1, H / 2, H, across, T / 2, wallHex);
      if (!room) continue;
      put(a0, a1, bandH / 2, bandH, across + sign * 0.006, T / 2, lowHex);
      put(a0, a1, bandH + 0.025, 0.05, across + sign * 0.015, T / 2, PALETTE.trim);
      put(a0, a1, 0.05, 0.1, across + sign * 0.012, T / 2, PALETTE.baseboard);
      // Prefab panel seams.
      for (let s = Math.ceil(a0 / 1.25) * 1.25; s < a1 - 0.1; s += 1.25) {
        if (s - a0 < 0.1) continue;
        put(s - 0.02, s + 0.02, H / 2, H, across + sign * 0.008, T / 2, PALETTE.seam);
      }
      put(a0, a1, H - 0.04, 0.08, across + sign * 0.01, T / 2, PALETTE.trim); // crown
    }
    if (along) b.block(a0, a1, fixed - T / 2, fixed + T / 2, H);
    else b.block(fixed - T / 2, fixed + T / 2, a0, a1, H);
  }

  // Lintels and frames over each opening.
  for (const o of cuts) {
    for (const [room, across] of sides) {
      const [wallHex] = SKIN[room] || SKIN.gen;
      put(o.from, o.to, (H + o.top) / 2, H - o.top, across, T / 2, wallHex);
    }
    put(o.from - 0.05, o.from, o.top / 2, o.top, 0, T + 0.07, PALETTE.frame);
    put(o.to, o.to + 0.05, o.top / 2, o.top, 0, T + 0.07, PALETTE.frame);
    put(o.from - 0.05, o.to + 0.05, o.top + 0.04, 0.08, 0, T + 0.07, PALETTE.frame);
    put(o.from, o.to, 0.012, 0.024, 0, T, PALETTE.steelDark); // threshold plate
    // A short wall over the opening also stops interaction rays.
    const occ = along
      ? b.block(o.from, o.to, fixed - T / 2, fixed + T / 2, H - o.top, o.top)
      : b.block(fixed - T / 2, fixed + T / 2, o.from, o.to, H - o.top, o.top);
    occ.collider.off = true; // you can walk under a lintel
  }
}

/**
 * A flat surface at height y, facing up (floors) or down (the ceiling). Its UVs are world
 * metres over the tile size, so the pattern lines up from room to room.
 */
function flatPlane(group, material, minX, maxX, minZ, maxZ, y = 0, down = false) {
  const geometry = new THREE.PlaneGeometry(maxX - minX, maxZ - minZ);
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const p = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  // Rotated about x, the plane's local y runs along world z (one way or the other).
  for (let i = 0; i < p.count; i++) uv.setXY(i, (cx + p.getX(i)) / TILE, (cz + (down ? 1 : -1) * p.getY(i)) / TILE);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = down ? Math.PI / 2 : -Math.PI / 2;
  mesh.position.set(cx, y, cz);
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export function buildShell(b) {
  const { group } = b;
  const H = ROOM.height;

  // Floors: linoleum in the living space, tread plate in the plant rooms.
  const { lino, tread, ceiling } = surfaces();
  flatPlane(group, lino, -11, 0, -5, 5);
  flatPlane(group, tread, 0, 5, -5, 9);
  flatPlane(group, tread, -2, 0, 5, 7);
  flatPlane(group, lino, -6, -2, 5, 8);
  flatPlane(group, ceiling, -11, 5, -5, 9, H, true);

  for (const w of WALLS) buildWall(b, w);

  // Services along the ceiling: two pipes and a cable tray, for industrial texture.
  const { kit } = b;
  for (const z of [-4.62, -4.48]) kit.cyl(0.045, 16, PALETTE.pipe, -3, H - 0.16, z, { rz: Math.PI / 2, seg: 8, shade: 0 });
  for (let x = -10.5; x < 5; x += 1.5) kit.box(0.04, 0.14, 0.3, PALETTE.steelDark, x, H - 0.1, -4.55, { shade: 0 });
  kit.box(10.6, 0.04, 0.3, PALETTE.steelDark, -5.5, H - 0.28, 4.62, { shade: 0 }); // cable tray, main room
  kit.box(10.6, 0.06, 0.2, PALETTE.cable, -5.5, H - 0.24, 4.62, { shade: 0 });
  kit.cyl(0.06, 13.8, PALETTE.pipe, 4.75, H - 0.2, 2, { rx: Math.PI / 2, seg: 8, shade: 0 }); // generator room run
}
