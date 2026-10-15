// Generator room: generator, day tank, jerry cans on a pallet, breaker panel,
// recorder shelf, workbench, and the door to the supply room.

import { PALETTE as C } from '../assets.js';
import { hitbox } from './builder.js';
import * as P from '../props.js';

const { south: S, east: E } = P.PROP_TURN;

/** Where full jerry cans stand, on the pallet along the east wall. */
export const CAN_SLOTS = [-0.9, -0.35, 0.2, 0.75, 1.3, 1.85].map((z) => ({ x: 4.6, y: 0.095, z }));
/** Where empties get dumped, by the generator. */
export const EMPTY_CAN_SPOTS = [
  { x: 1.2, z: -1.85, ry: 0.4 },
  { x: 0.8, z: -2.2, ry: 1.2 },
  { x: 1.3, z: -1.35, ry: -0.3 },
  { x: 0.7, z: -1.5, ry: 2.0 },
  { x: 0.75, z: -1.0, ry: 0.9 },
  { x: 1.35, z: -0.8, ry: 1.6 },
];

export function buildGeneratorRoom(b) {
  const { kit: k, decals: d, group: g } = b;

  // --- Generator ---
  k.at(2.6, 0, -3.0, 0, () => {
    P.generatorSet(k);
    b.footprint(2.2, 1.35, 1.4);
  });
  d.floor('blobLong', 2.8, 1.9, 2.6, -3.0);
  // oil stain under the engine
  d.floor('blob', 0.9, 0.7, 2.3, -2.6, 0.4);
  b.anchor('generatorLamp', 2.5, 0.8, -2.35);
  b.interactable('generator', hitbox(g, 2.2, 1.4, 1.5, 2.6, 0.7, -3.0));
  b.anchor('generator', 2.6, 0.8, -3.0);

  // --- Fuel day tank on the east wall ---
  k.at(4.63, 0, -2.9, 0, () => {
    P.dayTank(k);
    b.footprint(0.6, 0.65, 1.25);
  });
  d.floor('blob', 0.9, 0.9, 4.63, -2.9);
  d.add('signFuel', 0.48, 0.24, 4.88, 1.6, -1.9, { face: '-x' });

  // --- Drums in the north-west corner ---
  k.at(0.5, 0, -4.5, 0, () => P.drum(k));
  k.at(1.12, 0, -4.55, 0, () => P.drum(k, 0x5a3a2a));
  k.at(0.48, 0, -3.85, 0, () => P.drum(k, 0x3d5a6e));
  b.block(0.15, 1.45, -4.9, -4.2, 0.9);
  b.block(0.15, 0.8, -4.2, -3.5, 0.9);
  for (const [x, z] of [[0.5, -4.5], [1.12, -4.55], [0.48, -3.85]]) d.floor('blob', 0.8, 0.8, x, z);

  // --- Breaker panel on the divider wall, generator-room side ---
  k.at(0.16, 1.45, -1.5, Math.PI / 2, () => P.breakerCabinet(k));
  b.anchor('breakerLever', 0.25, 1.55, -1.5);
  b.interactable('breaker', hitbox(g, 0.5, 0.9, 0.7, 0.3, 1.45, -1.5));
  b.anchor('breaker', 0.115, 1.0, -1.05);
  b.anchor('breakerSound', 0.3, 1.45, -1.5);
  d.add('signVoltage', 0.26, 0.21, 0.115, 2.05, -1.5, { face: '+x' });

  // --- Jerry cans on a pallet along the east wall (meshes are managed per night) ---
  k.at(4.6, 0, 0.475, 0, () => P.pallet(k, 0.6, 3.3));
  b.block(4.3, 4.9, -1.18, 2.13, 0.1);
  d.floor('blobLong', 0.9, 3.6, 4.6, 0.475);
  b.anchor('cans', 4.5, 0.3, 0.5);
  b.anchor('jerrycans', 4.5, 0.1, 2.05); // note spot, by the last can

  // --- Crates stacked by the supply door ---
  k.at(4.55, 0, 2.8, 0.1, () => {
    P.crate(k, 0.55);
    k.at(0, 0.55, 0, -0.2, () => P.cardboard(k, 0.45, 0.3, 0.4, 0, 0, 0));
    b.footprint(0.58, 0.58, 0.9);
  });
  d.floor('blob', 0.9, 0.9, 4.55, 2.8);

  // --- Recorder shelf in the north-east corner ---
  k.at(4.78, 0, -4.4, E, () => {
    P.shelf(k, 1.0, 0.36, 1.3, 3);
    k.box(0.36, 0.02, 0.26, 0x2a2e31, 0.05, 0.6, 0.0, { shade: 0 }); // the clean patch where the recorder sat
    P.cardboard(k, 0.3, 0.2, 0.28, -0.3, 1.21, 0);
    b.footprint(1.0, 0.36, 1.3);
  });
  b.interactable('recorderShelf', hitbox(g, 0.6, 1.4, 1.1, 4.7, 0.7, -4.4));

  // --- Workbench on the south wall ---
  k.at(1.8, 0, 4.58, S, () => {
    k.box(2.6, 0.06, 0.62, C.wood, 0, 0.9, 0);
    for (const x of [-1.22, 1.22]) k.box(0.06, 0.87, 0.55, C.steelDark, x, 0.435, 0);
    k.box(2.5, 0.04, 0.5, C.steelDark, 0, 0.22, 0); // lower shelf
    k.at(-0.9, 0.93, 0.12, 0, () => P.vise(k));
    k.at(0.5, 0.93, 0.0, 0.1, () => P.toolbox(k));
    k.box(0.5, 0.05, 0.25, C.steel, 0.95, 0.955, -0.05);
    k.at(-0.2, 0.24, 0.0, 0, () => P.toolbox(k, 0x3d5a6e));
    P.cardboard(k, 0.5, 0.3, 0.4, 0.7, 0.24, 0);
    // rags and a coil of wire
    k.box(0.25, 0.03, 0.2, 0x8a7a5e, -0.4, 0.945, 0.1, { ry: 0.4, shade: 0 });
    k.cyl(0.1, 0.04, 0xb06030, -0.05, 0.95, -0.1, { seg: 12 });
    k.at(0, 1.05, -0.3, 0, () => P.pegboard(k, 1.6, 0.8));
    b.footprint(2.6, 0.62, 1.0);
  });
  d.floor('blobLong', 3.0, 0.9, 1.8, 4.6);

  // --- Fire extinguisher by the doorway ---
  k.at(0.25, 0.3, 3.15, 0, () => {
    P.extinguisher(k);
    k.box(0.04, 0.2, 0.12, C.steelDark, -0.09, 0.3, 0);
  });
  d.add('signSupply', 0.6, 0.22, 4.2, 2.42, 4.88, { face: '-z' });

  // --- Ceiling fixture ---
  k.box(1.3, 0.08, 0.34, C.steelDark, 2.5, 2.75, 0, { shade: 0 });
  b.anchor('fixtureGen', 2.5, 2.62, 0);
}
