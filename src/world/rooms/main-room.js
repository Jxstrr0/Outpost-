// Main room: keeper terminal, met console, heater, bunk, table, west door, north window.

import * as THREE from 'three';
import { PALETTE, mat, box, cylinder, hitbox, makeWindowTexture } from '../assets.js';
import { ROOM } from './shell.js';

export function buildMainRoom(b) {
  const g = b.group;
  const steel = mat(PALETTE.steel);
  const steelDark = mat(PALETTE.steelDark);
  const orange = mat(PALETTE.orange);
  const olive = mat(PALETTE.olive);

  // --- Met console: freestanding desk, the player faces north to use it ---
  b.solid(box(g, 1.6, 0.78, 0.7, steelDark, -6.5, 0.39, 1.35));
  box(g, 1.62, 0.04, 0.04, orange, -6.5, 0.76, 1.71); // orange edge: interactive
  box(g, 1.4, 0.22, 0.42, steel, -6.5, 0.89, 1.2); // instrument deck
  box(g, 0.78, 0.52, 0.1, steelDark, -6.5, 1.2, 1.08); // monitor housing
  for (let i = 0; i < 5; i++) {
    cylinder(g, 0.025, 0.03, i === 2 ? orange : mat(PALETTE.steelLight), -6.95 + i * 0.22, 1.01, 1.36, 8).rotation.x = Math.PI / 2;
  }
  b.anchor('metScreen', -6.5, 1.2, 1.135);
  b.interactable('metConsole', hitbox(g, 1.7, 1.8, 0.9, -6.5, 0.9, 1.35));
  b.anchor('metconsole', -6.0, 0.79, 1.55); // note spot

  // --- Keeper terminal: desk against the south wall, screen facing north ---
  b.solid(box(g, 1.6, 0.76, 0.7, mat(PALETTE.wood), -3.2, 0.38, 4.6));
  box(g, 0.6, 0.48, 0.48, mat(0x2d3236), -3.2, 1.0, 4.68); // CRT
  box(g, 0.5, 0.04, 0.2, steelDark, -3.2, 0.78, 4.3); // keyboard
  box(g, 0.08, 0.02, 0.02, orange, -2.92, 0.81, 4.3);
  b.anchor('terminalScreen', -3.2, 1.0, 4.435);
  b.interactable('terminal', hitbox(g, 1.6, 1.4, 0.9, -3.2, 0.75, 4.55));
  // chair
  box(g, 0.45, 0.06, 0.45, olive, -3.2, 0.46, 3.85);
  box(g, 0.45, 0.5, 0.06, olive, -3.2, 0.72, 3.62);

  // --- Heater on the west wall ---
  b.solid(box(g, 0.35, 0.95, 1.4, steel, -10.82, 0.5, 2.3));
  const grille = box(g, 0.02, 0.55, 1.15, new THREE.MeshLambertMaterial({ color: 0x1a1a1a, emissive: 0xff5a14, emissiveIntensity: 1 }), -10.63, 0.52, 2.3);
  b.refs.heaterGrille = grille;
  for (let i = 0; i < 6; i++) box(g, 0.03, 0.56, 0.025, steelDark, -10.615, 0.52, 1.8 + i * 0.2);
  box(g, 0.06, 0.1, 0.1, orange, -10.62, 0.9, 2.9); // knob
  b.interactable('heater', hitbox(g, 0.6, 1.1, 1.5, -10.7, 0.55, 2.3));
  b.anchor('heater', -10.4, 0.6, 2.3);

  // --- Bunk in the south-west corner ---
  b.solid(box(g, 1.9, 0.4, 1.0, steelDark, -10.05, 0.2, 4.45));
  box(g, 1.85, 0.14, 0.95, olive, -10.05, 0.47, 4.45);
  box(g, 0.45, 0.1, 0.7, mat(0xb8b3a5), -10.7, 0.59, 4.45);
  b.interactable('bunk', hitbox(g, 1.9, 0.8, 1.0, -10.05, 0.4, 4.45));
  b.anchor('bunk', -9.6, 0.555, 4.3);

  // --- Table with a mug ---
  b.solid(box(g, 1.4, 0.06, 1.0, mat(PALETTE.wood), -3.3, 0.74, -0.9));
  for (const [dx, dz] of [[-0.62, -0.42], [0.62, -0.42], [-0.62, 0.42], [0.62, 0.42]]) {
    box(g, 0.05, 0.72, 0.05, steelDark, -3.3 + dx, 0.36, -0.9 + dz);
  }
  const mug = cylinder(g, 0.045, 0.1, mat(0xc9c2b0), -2.95, 0.82, -0.72, 10);
  mug.name = 'mug';
  b.anchor('table', -3.65, 0.775, -1.05);
  box(g, 0.45, 0.06, 0.45, olive, -3.3, 0.46, -1.75);
  box(g, 0.45, 0.5, 0.06, olive, -3.3, 0.72, -1.98);

  // --- Lockers along the north wall ---
  for (let i = 0; i < 3; i++) {
    const x = -10.65 + i * 0.55;
    b.solid(box(g, 0.52, 1.9, 0.5, mat(i === 1 ? 0x56614d : 0x4f5a48), x, 0.95, -4.72));
    box(g, 0.02, 0.15, 0.02, steelDark, x + 0.18, 1.0, -4.46);
  }

  // --- North window ---
  const win = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 0.95),
    new THREE.MeshBasicMaterial({ map: makeWindowTexture(), toneMapped: false })
  );
  win.position.set(-4.5, 1.55, ROOM.minZ + 0.01);
  g.add(win);
  const frame = steelDark;
  box(g, 1.86, 0.08, 0.1, frame, -4.5, 2.06, -4.95);
  box(g, 1.86, 0.12, 0.16, frame, -4.5, 1.04, -4.92);
  box(g, 0.08, 1.0, 0.1, frame, -5.39, 1.55, -4.95);
  box(g, 0.08, 1.0, 0.1, frame, -3.61, 1.55, -4.95);
  box(g, 0.04, 0.95, 0.05, frame, -4.5, 1.55, -4.97);
  b.anchor('window', -4.5, 1.55, -4.9);

  // --- West door (the only way out) ---
  box(g, 0.08, 2.1, 1.05, mat(0x46525a), -10.94, 1.05, -2.4);
  box(g, 0.1, 2.2, 0.08, frame, -10.93, 1.1, -2.96);
  box(g, 0.1, 2.2, 0.08, frame, -10.93, 1.1, -1.84);
  box(g, 0.1, 0.08, 1.2, frame, -10.93, 2.2, -2.4);
  box(g, 0.08, 0.06, 0.24, orange, -10.86, 1.05, -2.05); // lever handle
  box(g, 0.02, 0.12, 0.4, mat(0x2b6b3a, { emissive: 0x1d7a35, emissiveIntensity: 0.7 }), -10.88, 2.38, -2.4); // exit sign
  b.interactable('westDoor', hitbox(g, 0.4, 2.1, 1.1, -10.8, 1.05, -2.4));
  b.anchor('westDoor', -10.8, 1.2, -2.4);

  // --- Light switch by the doorway ---
  box(g, 0.03, 0.16, 0.1, mat(0xd8d4c8), -0.115, 1.3, 3.0);
  box(g, 0.03, 0.05, 0.03, orange, -0.135, 1.3, 3.0);
  b.interactable('lightSwitch', hitbox(g, 0.3, 0.4, 0.4, -0.2, 1.3, 3.0));

  // --- Ceiling fixtures and the emergency strip ---
  b.anchor('fixtureA', -7.5, 2.62, 0);
  b.anchor('fixtureB', -3.0, 2.62, 0);
  b.anchor('emergency', -5.5, 2.45, -4.6);
  b.anchor('spawn', -6.5, 0, 2.45); // at the met console, facing the north window
  b.anchor('roof', -4.5, 3.2, 0);
}
