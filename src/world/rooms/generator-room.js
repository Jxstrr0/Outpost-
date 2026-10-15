// Generator room: generator, jerry cans, breaker panel, recorder shelf.

import { PALETTE, mat, box, cylinder, hitbox } from '../assets.js';

export const CAN_SLOTS = [0.15, 0.7, 1.25, 1.8, 2.35, 2.9].map((z) => ({ x: 4.6, z }));
export const EMPTY_CAN_SPOTS = [
  { x: 1.15, z: -1.85, ry: 0.4 },
  { x: 0.75, z: -2.35, ry: 1.2 },
  { x: 1.25, z: -1.35, ry: -0.3 },
  { x: 0.7, z: -1.5, ry: 2.0 },
  { x: 0.75, z: -3.0, ry: 0.9 },
  { x: 1.3, z: -0.9, ry: 1.6 },
];

export function buildGeneratorRoom(b) {
  const g = b.group;
  const steel = mat(PALETTE.steel);
  const steelDark = mat(PALETTE.steelDark);
  const orange = mat(PALETTE.orange);

  // --- Generator ---
  box(g, 2.2, 0.15, 1.4, steelDark, 2.6, 0.075, -3.0);
  b.solid(box(g, 1.8, 0.95, 1.1, mat(PALETTE.yellow), 2.6, 0.62, -3.0));
  box(g, 1.6, 0.2, 0.9, mat(0x9c8122), 2.6, 1.19, -3.0);
  cylinder(g, 0.07, 1.5, steelDark, 3.25, 2.0, -3.35, 8);
  box(g, 0.7, 0.4, 0.06, orange, 2.35, 0.86, -2.43); // control panel
  box(g, 0.3, 0.12, 0.02, mat(0x222222), 2.35, 0.92, -2.395);
  b.anchor('generatorLamp', 2.75, 0.95, -2.39);
  b.interactable('generator', hitbox(g, 2.2, 1.4, 1.5, 2.6, 0.7, -3.0));
  b.anchor('generator', 2.6, 0.8, -3.0);

  // Fuel line from generator to wall tank
  b.solid(box(g, 0.7, 1.2, 0.5, mat(0x7b2a1d), 4.6, 0.6, -2.9));
  cylinder(g, 0.025, 1.0, steelDark, 3.9, 0.35, -2.9, 6).rotation.z = Math.PI / 2;

  // --- Breaker panel on the divider wall, generator-room side ---
  box(g, 0.1, 0.75, 0.55, mat(0x6d7479), 0.15, 1.45, -1.5);
  box(g, 0.02, 0.6, 0.45, mat(0x2a2e31), 0.205, 1.45, -1.5);
  b.anchor('breakerLever', 0.23, 1.55, -1.5);
  b.interactable('breaker', hitbox(g, 0.5, 0.9, 0.7, 0.3, 1.45, -1.5));
  b.anchor('breaker', 0.115, 1.0, -1.05);
  b.anchor('breakerSound', 0.3, 1.45, -1.5);

  // --- Jerry can slots along the east wall (meshes are managed per night) ---
  b.anchor('cans', 4.5, 0.3, 1.5);
  // crate the first note hides under
  b.solid(box(g, 0.5, 0.5, 0.5, mat(PALETTE.wood), 4.6, 0.25, 3.65));
  b.anchor('jerrycans', 4.5, 0.505, 3.6);

  // --- Recorder shelf ---
  b.solid(box(g, 0.35, 1.3, 1.0, steelDark, 4.8, 0.65, -4.4));
  for (const y of [0.45, 0.9, 1.3]) box(g, 0.36, 0.03, 1.0, steel, 4.78, y, -4.4);
  b.interactable('recorderShelf', hitbox(g, 0.6, 1.4, 1.1, 4.7, 0.7, -4.4));

  // --- Workbench ---
  b.solid(box(g, 3.0, 0.08, 0.6, mat(PALETTE.wood), 2.5, 0.88, 4.65));
  for (const x of [1.1, 3.9]) box(g, 0.06, 0.86, 0.5, steelDark, x, 0.43, 4.65);
  box(g, 0.35, 0.15, 0.2, mat(PALETTE.red), 1.8, 0.99, 4.6);
  box(g, 0.5, 0.05, 0.25, steel, 3.2, 0.94, 4.55);

  // --- Supply room door (east wall) ---
  box(g, 0.08, 2.05, 1.0, mat(0x46525a), 4.94, 1.03, -1.3);
  box(g, 0.08, 0.06, 0.2, orange, 4.88, 1.0, -1.0);
  b.interactable('supplyDoor', hitbox(g, 0.4, 2.05, 1.05, 4.8, 1.03, -1.3));

  b.anchor('fixtureGen', 2.5, 2.62, 0);
}
