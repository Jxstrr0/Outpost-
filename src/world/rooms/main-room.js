// Main room: keeper terminal, met console, heater, bunk, table, kitchenette,
// lockers, west door and north window.

import * as THREE from 'three';
import { PALETTE as C, makeWindowTexture } from '../assets.js';
import { hitbox } from './builder.js';
import * as P from '../props.js';

const { north: N, south: S } = P.PROP_TURN;

export function buildMainRoom(b) {
  const { kit: k, decals: d, group: g } = b;

  // --- Met console: freestanding desk, the player faces north to use it ---
  k.at(-6.5, 0, 1.35, 0, () => {
    k.box(1.6, 0.05, 0.7, C.steel, 0, 0.765, 0);
    k.box(1.56, 0.72, 0.62, C.steelDark, 0, 0.37, -0.02);
    for (const x of [-0.5, 0, 0.5]) k.box(0.42, 0.5, 0.02, C.steel, x, 0.42, 0.3); // front panels
    k.box(1.62, 0.04, 0.04, C.orange, 0, 0.74, 0.36, { shade: 0 }); // orange edge: interactive
    k.box(1.4, 0.22, 0.42, C.steel, 0, 0.9, -0.15); // instrument deck
    k.box(0.78, 0.52, 0.1, C.steelDark, 0, 1.2, -0.27); // monitor housing
    k.box(0.84, 0.04, 0.16, C.steelDark, 0, 1.47, -0.27);
    for (let i = 0; i < 5; i++) k.cyl(0.025, 0.03, i === 2 ? C.orange : C.steelLight, -0.45 + i * 0.22, 0.92, 0.075, { rx: Math.PI / 2, seg: 8 });
    // barograph drum and pen on the left of the deck
    k.box(0.32, 0.04, 0.24, C.woodDark, -0.55, 1.03, -0.12);
    k.cyl(0.07, 0.16, C.paper, -0.6, 1.11, -0.12, { seg: 12 });
    k.box(0.12, 0.02, 0.01, C.black, -0.47, 1.12, -0.05, { shade: 0 });
    // anemometer readout on the right
    k.box(0.26, 0.2, 0.12, C.black, 0.56, 1.11, -0.14);
    k.box(0.2, 0.08, 0.01, 0x3a2a10, 0.56, 1.14, -0.075, { shade: 0 });
    P.keyboard(k, -0.15, 0.79, 0.15, C.steelDark);
    // binder and handbook
    P.book(k, -0.6, 0.79, 0.2, 0.24, 0.05, 0.28, 0x2a4a6a);
    P.book(k, -0.62, 0.84, 0.21, 0.22, 0.04, 0.26, 0x6a2a24);
    // microphone on a goose-neck
    k.cyl(0.04, 0.02, C.black, 0.7, 0.8, 0.16, { seg: 8 });
    k.cyl(0.008, 0.28, C.steelDark, 0.7, 0.94, 0.14, { seg: 4, rx: -0.3 });
    k.cyl(0.02, 0.07, C.black, 0.7, 1.08, 0.1, { seg: 6, rx: 1.2 });
    b.footprint(1.62, 0.72, 1.5);
  });
  d.floor('blobLong', 2.0, 1.1, -6.5, 1.35);
  b.anchor('metScreen', -6.5, 1.2, 1.135);
  b.interactable('metConsole', hitbox(g, 1.7, 1.8, 0.9, -6.5, 0.9, 1.35));
  b.anchor('metconsole', -6.0, 0.795, 1.55); // note spot
  k.at(-7.55, 0, 2.05, 0.5, () => {
    P.chair(k);
    b.footprint(0.4, 0.4, 0.9);
  });

  // --- Keeper terminal: desk against the south wall, screen facing north ---
  k.at(-3.2, 0, 4.6, S, () => {
    P.desk(k, 1.6, 0.7);
    k.at(0, 0.77, -0.035, 0, () => P.crt(k));
    P.keyboard(k, 0, 0.77, 0.3);
    // desk lamp
    k.cyl(0.07, 0.02, C.black, 0.6, 0.78, -0.1, { seg: 8 });
    k.cyl(0.01, 0.35, C.steelDark, 0.6, 0.95, -0.1, { seg: 4, rz: 0.3 });
    k.cyl(0.07, 0.1, C.olive, 0.54, 1.12, -0.04, { seg: 8, r2: 0.03, rx: 0.8 });
    // printouts and a mug
    k.box(0.21, 0.01, 0.3, C.paper, -0.55, 0.775, 0.1, { ry: 0.2, shade: 0 });
    k.box(0.21, 0.01, 0.3, C.paper, -0.5, 0.785, 0.12, { ry: -0.1, shade: 0 });
    P.mug(k, 0.42, 0.77, 0.2, 0x6a2a24);
    b.footprint(1.62, 0.72, 1.4);
  });
  d.floor('blobLong', 2.0, 1.0, -3.2, 4.55);
  b.anchor('terminalScreen', -3.2, 1.0, 4.425);
  b.interactable('terminal', hitbox(g, 1.6, 1.4, 0.9, -3.2, 0.75, 4.55));
  k.at(-3.2, 0, 3.8, 0.15, () => {
    P.chair(k);
    b.footprint(0.4, 0.4, 0.9);
  });
  d.add('photo', 0.24, 0.18, -2.45, 1.32, 4.88, { face: '-z', roll: 0.04 });
  d.add('calendar', 0.32, 0.4, -4.55, 1.45, 4.88, { face: '-z' });

  // --- Heater on the west wall ---
  k.at(-10.83, 0, 2.3, 0, () => {
    P.heaterBody(k);
    for (let i = 0; i < 6; i++) k.box(0.03, 0.56, 0.025, C.steelDark, 0.215, 0.52, -0.5 + i * 0.2);
    k.box(0.06, 0.1, 0.1, C.orange, 0.18, 0.9, 0.6); // knob
  });
  b.block(-11, -10.65, 1.58, 3.02, 1.1);
  const grille = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.55, 1.15),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a, emissive: 0xff5a14, emissiveIntensity: 1 })
  );
  grille.position.set(-10.655, 0.52, 2.3);
  g.add(grille);
  b.refs.heaterGrille = grille;
  b.interactable('heater', hitbox(g, 0.6, 1.1, 1.5, -10.7, 0.55, 2.3));
  b.anchor('heater', -10.4, 0.6, 2.3);

  // --- Bunk in the south-west corner ---
  k.at(-10.03, 0, 4.45, 0, () => P.bunk(k));
  b.block(-11, -9.06, 3.97, 4.95, 0.8);
  b.block(-8.95, -8.35, 4.43, 4.87, 0.4);
  d.floor('blobLong', 2.4, 1.2, -9.9, 4.45);
  b.interactable('bunk', hitbox(g, 1.9, 0.8, 1.0, -10.05, 0.4, 4.45));
  b.anchor('bunk', -9.6, 0.53, 4.3);
  // a shelf of paperbacks above the bunk
  k.box(1.2, 0.03, 0.22, C.wood, -10.2, 1.45, 4.79);
  const spines = [0x6a2a24, 0x2a4a6a, 0x4d5236, 0x8a6a44, 0x3a3a3a, 0x6e5a2a, 0x2a5a4a];
  for (let i = 0; i < 11; i++) P.book(k, -10.7 + i * 0.075, 1.465, 4.8, 0.06, 0.18 + (i % 3) * 0.03, 0.15, spines[i % spines.length]);

  // --- Table with a mug, under a rug ---
  k.box(3.2, 0.012, 2.4, 0x4a3b2c, -3.3, 0.006, -0.9, { shade: 0 });
  k.box(2.9, 0.014, 2.1, 0x5a4734, -3.3, 0.007, -0.9, { shade: 0 });
  k.at(-3.3, 0, -0.9, 0, () => {
    P.table(k, 1.4, 1.0);
    b.footprint(1.4, 1.0, 0.8);
  });
  d.floor('blobLong', 1.8, 1.3, -3.3, -0.9, 0, 0.016);
  P.mug(k, -2.95, 0.77, -0.72);
  k.box(0.1, 0.02, 0.1, C.steelLight, -2.75, 0.78, -1.15); // ashtray
  k.box(0.07, 0.025, 0.09, 0xd8d0c0, -3.0, 0.785, -1.2, { ry: 0.5 }); // cards
  P.book(k, -3.75, 0.77, -0.6, 0.15, 0.03, 0.22, 0x2a4a6a);
  b.anchor('table', -3.65, 0.775, -1.05);
  k.at(-3.3, 0, -1.75, 0, () => {
    P.chair(k);
    b.footprint(0.4, 0.4, 0.9);
  });
  k.at(-2.35, 0, -0.6, -Math.PI / 2 - 0.2, () => {
    P.chair(k);
    b.footprint(0.4, 0.4, 0.9);
  });

  // --- Lockers along the north wall ---
  for (let i = 0; i < 3; i++) k.at(-10.65 + i * 0.55, 0, -4.72, N, () => P.locker(k, i === 1 ? 0x56614d : 0x4f5a48));
  b.block(-10.91, -9.29, -4.97, -4.47, 1.9);
  d.floor('blobLong', 1.9, 0.8, -10.1, -4.6);
  d.add('roster', 0.3, 0.38, -8.75, 1.5, -4.88);

  // --- Kitchenette in the north-east corner ---
  k.at(-1.5, 0, -4.7, N, () => {
    k.box(2.2, 0.86, 0.58, 0x55605a, 0, 0.43, 0);
    k.box(2.24, 0.05, 0.62, C.steelLight, 0, 0.885, 0);
    for (let i = 0; i < 4; i++) {
      k.box(0.52, 0.7, 0.02, 0x606b64, -0.81 + i * 0.54, 0.43, 0.3);
      k.box(0.1, 0.02, 0.02, C.steelDark, -0.81 + i * 0.54, 0.72, 0.315, { shade: 0 });
    }
    k.box(0.48, 0.04, 0.38, C.steelDark, 0.6, 0.89, 0); // sink
    k.cyl(0.015, 0.25, C.steelLight, 0.6, 1.02, -0.22, { seg: 6 });
    k.box(0.36, 0.06, 0.3, C.black, -0.55, 0.94, 0); // hot plate
    k.cyl(0.08, 0.012, 0x3a1a10, -0.55, 0.975, 0, { seg: 10, shade: 0 });
    P.kettle(k, -0.55, 0.98, 0);
    P.tin(k, -0.05, 0.91, -0.15, 0xa8301f);
    P.tin(k, 0.05, 0.91, -0.12, 0x3d5a6e);
    P.tin(k, 0.0, 0.91, -0.02, 0xd8b02a);
    // wall cabinet
    k.box(2.0, 0.6, 0.34, 0x606b64, 0, 1.88, -0.12);
    for (let i = 0; i < 3; i++) k.box(0.64, 0.54, 0.02, 0x6a756e, -0.66 + i * 0.66, 1.88, 0.06);
    P.mug(k, -0.9, 0.91, 0.12, 0x2a4a6a);
    b.footprint(2.24, 0.62, 2.2);
  });
  d.floor('blobLong', 2.6, 0.9, -1.5, -4.6);

  // --- North window, clock, corkboard ---
  const win = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 0.95),
    new THREE.MeshBasicMaterial({ map: makeWindowTexture(), toneMapped: false })
  );
  win.position.set(-4.5, 1.55, -4.875);
  g.add(win);
  k.at(-4.5, 0, -4.9, N, () => {
    k.box(1.86, 0.08, 0.1, C.frame, 0, 2.06, 0);
    k.box(1.96, 0.06, 0.24, C.frame, 0, 1.02, 0.05);
    k.box(0.08, 1.0, 0.1, C.frame, -0.89, 1.55, 0);
    k.box(0.08, 1.0, 0.1, C.frame, 0.89, 1.55, 0);
    k.box(0.04, 0.95, 0.05, C.frame, 0, 1.55, 0.02);
    k.box(0.4, 0.02, 0.15, C.paper, 0.6, 1.06, 0.05, { ry: 0.3, shade: 0 }); // notebook on the sill
  });
  b.anchor('window', -4.5, 1.55, -4.9);
  d.add('signStation', 1.2, 0.3, -4.5, 2.36, -4.88);
  k.at(-6.6, 2.1, -4.9, 0, () => P.clockRim(k));
  d.add('dial', 0.3, 0.3, -6.6, 2.1, -4.87);
  k.box(1.16, 0.76, 0.03, C.woodDark, -7.8, 1.55, -4.89);
  d.add('cork', 1.08, 0.68, -7.8, 1.55, -4.872);
  d.add('chart', 0.42, 0.28, -5.75, 1.45, -4.88, { roll: -0.03 });

  // --- Bookcase on the south wall ---
  k.at(-7.4, 0, 4.68, S, () => {
    const levelY = P.shelf(k, 1.2, 0.4, 1.3, 3);
    for (let l = 0; l < 2; l++) {
      for (let i = 0; i < 12; i++) {
        if ((i + l) % 7 === 3) continue;
        P.book(k, -0.52 + i * 0.085, levelY(l), 0.0, 0.07, 0.22 + ((i * 3 + l) % 4) * 0.025, 0.24, spines[(i + l * 2) % spines.length]);
      }
    }
    P.cardboard(k, 0.4, 0.22, 0.3, 0.3, levelY(2), 0, 0.1);
    b.footprint(1.2, 0.4, 1.3);
  });
  d.floor('blobLong', 1.5, 0.7, -7.4, 4.65);

  // --- West door (the only way out of the main room) ---
  k.at(-10.94, 0, -1.875, Math.PI / 2, () => P.doorLeaf(k, 1.05, 2.1, 0x46525a, { heavy: true }));
  k.box(0.12, 2.24, 0.08, C.frame, -10.92, 1.12, -2.98);
  k.box(0.12, 2.24, 0.08, C.frame, -10.92, 1.12, -1.82);
  k.box(0.12, 0.08, 1.24, C.frame, -10.92, 2.22, -2.4);
  k.box(0.02, 2.0, 0.04, 0xb8c4cc, -10.86, 1.05, -2.94, { shade: 0 }); // frost on the seal
  b.interactable('westDoor', hitbox(g, 0.4, 2.1, 1.1, -10.8, 1.05, -2.4));
  b.anchor('westDoor', -10.8, 1.2, -2.4);
  const exit = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.12, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x2b6b3a, emissive: 0x1d7a35, emissiveIntensity: 0.7 })
  );
  exit.position.set(-10.88, 2.4, -2.4);
  g.add(exit);
  d.add('signShut', 0.42, 0.21, -10.88, 1.25, -1.5, { face: '+x' });
  d.add('map', 0.96, 0.72, -10.88, 1.6, 0.25, { face: '+x' });
  // coat hooks with a scarf
  k.box(0.04, 0.06, 0.6, C.woodDark, -10.88, 1.7, -0.95);
  k.box(0.06, 0.6, 0.18, 0x6a2a24, -10.84, 1.4, -0.9);

  // --- Light switch by the doorway, and the generator room sign ---
  k.box(0.03, 0.16, 0.1, 0xd8d4c8, -0.115, 1.3, 3.0);
  k.box(0.03, 0.05, 0.03, C.orange, -0.135, 1.3, 3.0, { shade: 0 });
  b.interactable('lightSwitch', hitbox(g, 0.3, 0.4, 0.4, -0.2, 1.3, 3.0));
  d.add('signGenerator', 0.72, 0.27, -0.115, 2.45, 2.0, { face: '-x' });
  d.add('signAirlock', 0.6, 0.22, -0.9, 2.42, 4.88, { face: '-z' });

  // --- Ceiling fixtures and the emergency strip ---
  for (const x of [-7.5, -3.0]) {
    k.box(1.3, 0.08, 0.34, C.steelDark, x, 2.75, 0, { shade: 0 });
    for (const dx of [-0.5, 0.5]) k.box(0.02, 0.05, 0.02, C.steelDark, x + dx, 2.78, 0, { shade: 0 });
  }
  k.box(3.1, 0.05, 0.1, C.steelDark, -5.5, 2.48, -4.62, { shade: 0 });
  b.anchor('fixtureA', -7.5, 2.62, 0);
  b.anchor('fixtureB', -3.0, 2.62, 0);
  b.anchor('emergency', -5.5, 2.45, -4.6);
  b.anchor('spawn', -6.5, 0, 2.45); // at the met console, facing the north window
  b.anchor('roof', -4.5, 3.2, 0);
}
