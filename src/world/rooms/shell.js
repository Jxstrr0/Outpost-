// The building shell: floor, ceiling and walls for the main and generator rooms.
// Main room x -11..0, generator room x 0..5, both z -5..5. North is -z.

import * as THREE from 'three';
import { PALETTE, mat, box, makeFloorTexture } from '../assets.js';

export const ROOM = {
  height: 2.8,
  wall: 0.2,
  minX: -11,
  maxX: 5,
  minZ: -5,
  maxZ: 5,
  dividerX: 0,
  doorway: { minZ: 1.4, maxZ: 2.6, top: 2.15 },
};

export function buildShell(b) {
  const { height: H, wall: T } = ROOM;
  const g = b.group;

  const floorTex = makeFloorTexture('#33373a');
  floorTex.repeat.set(8, 5);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), new THREE.MeshLambertMaterial({ map: floorTex }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(-3, 0, 0);
  g.add(floor);

  // A worn rug under the main-room table, so the main room reads warmer than the plant room.
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.4), mat(0x4a3b2c));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(-3.3, 0.005, -0.9);
  g.add(rug);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), mat(PALETTE.ceiling));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(-3, H, 0);
  g.add(ceiling);

  const wallMat = mat(PALETTE.wall);
  const lowMat = mat(PALETTE.wallLow);

  // Outer walls, each with a darker lower band.
  const walls = [
    // [w, d, x, z]
    [16 + 2 * T, T, -3, ROOM.minZ - T / 2], // north
    [16 + 2 * T, T, -3, ROOM.maxZ + T / 2], // south
    [T, 10, ROOM.minX - T / 2, 0], // west
    [T, 10, ROOM.maxX + T / 2, 0], // east
  ];
  for (const [w, d, x, z] of walls) {
    b.solid(box(g, w, H, d, wallMat, x, H / 2, z));
    const inset = 0.01;
    const bw = w > d ? w : w + inset * 2;
    const bd = d > w ? d : d + inset * 2;
    box(g, bw, 0.9, bd, lowMat, x, 0.45, z);
  }

  // Divider wall with a doorway between the rooms.
  const { minZ: dz0, maxZ: dz1, top } = ROOM.doorway;
  b.solid(box(g, T, H, dz0 - ROOM.minZ, wallMat, 0, H / 2, (ROOM.minZ + dz0) / 2));
  b.solid(box(g, T, H, ROOM.maxZ - dz1, wallMat, 0, H / 2, (dz1 + ROOM.maxZ) / 2));
  box(g, T, H - top, dz1 - dz0, wallMat, 0, (H + top) / 2, (dz0 + dz1) / 2);
  box(g, T + 0.02, 0.9, dz0 - ROOM.minZ, lowMat, 0, 0.45, (ROOM.minZ + dz0) / 2);
  box(g, T + 0.02, 0.9, ROOM.maxZ - dz1, lowMat, 0, 0.45, (dz1 + ROOM.maxZ) / 2);
  // Door frame trim
  const trim = mat(PALETTE.steelDark);
  box(g, T + 0.06, 0.08, dz1 - dz0 + 0.16, trim, 0, top + 0.04, (dz0 + dz1) / 2);
  box(g, T + 0.06, top, 0.08, trim, 0, top / 2, dz0 - 0.04);
  box(g, T + 0.06, top, 0.08, trim, 0, top / 2, dz1 + 0.04);

  // Exposed pipes along the ceiling, for a bit of industrial texture.
  const pipe = mat(PALETTE.steelDark);
  for (const z of [-4.6, 4.6]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 16, 8), pipe);
    p.rotation.z = Math.PI / 2;
    p.position.set(-3, H - 0.18, z);
    g.add(p);
  }
}
