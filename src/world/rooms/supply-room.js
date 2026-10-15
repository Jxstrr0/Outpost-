// Supply room (night 2+): shelves of spares, food and tape, the heat gun, the radio set.

import { PALETTE as C } from '../assets.js';
import { hitbox } from './builder.js';
import * as P from '../props.js';

const { south: S, east: E, west: W } = P.PROP_TURN;

export function buildSupplyRoom(b) {
  const { kit: k, decals: d, group: g } = b;

  // --- East wall: spares and cells, then food ---
  k.at(4.67, 0, 6.8, E, () => {
    const y = P.shelf(k, 1.3, 0.45, 1.8, 4);
    // fuse spares: orange tins
    for (let i = 0; i < 3; i++) k.box(0.16, 0.1, 0.22, C.orange, -0.45 + i * 0.18, y(1) + 0.05, 0.02);
    k.box(0.5, 0.16, 0.3, C.steelDark, 0.3, y(1) + 0.08, 0);
    // cells and a lamp
    for (let i = 0; i < 6; i++) k.cyl(0.025, 0.1, i % 2 ? C.black : 0x3d5a6e, 0.15 + i * 0.06, y(2) + 0.05, 0.05, { seg: 6 });
    k.box(0.3, 0.2, 0.22, 0xe8e8e2, -0.35, y(2) + 0.1, 0); // first-aid box
    P.cardboard(k, 0.5, 0.3, 0.38, 0.2, y(3), 0);
    P.cardboard(k, 0.4, 0.25, 0.35, -0.35, y(0), 0, 0.1);
    k.at(0.25, y(0), 0, 0, () => P.toolbox(k, 0x3d5a6e));
  });
  d.add('labelFuses', 0.2, 0.067, 4.435, 0.62, 6.5, { face: '-x' });
  d.add('labelCells', 0.2, 0.067, 4.435, 1.17, 7.0, { face: '-x' });
  d.add('firstAid', 0.12, 0.12, 4.555, 1.3, 6.45, { face: '-x' });
  k.at(4.67, 0, 8.15, E, () => {
    const y = P.shelf(k, 1.3, 0.45, 1.8, 4);
    for (let l = 0; l < 3; l++) {
      for (let i = 0; i < 7; i++) {
        const colour = [0xa8301f, 0x3d5a6e, 0xd8b02a][(i + l) % 3];
        P.tin(k, -0.5 + i * 0.15, y(l), -0.08 + (i % 2) * 0.1, colour, 0.045, 0.11);
      }
    }
    P.cardboard(k, 0.55, 0.3, 0.4, -0.2, y(3), 0, 0.05);
    P.cardboard(k, 0.4, 0.22, 0.35, 0.35, y(3), 0, -0.1);
  });
  d.add('labelFood', 0.2, 0.067, 4.435, 0.1, 8.15, { face: '-x' });
  b.block(4.44, 4.9, 6.12, 8.83, 1.8);
  d.floor('blobLong', 0.8, 3.0, 4.65, 7.47);
  b.interactable('supplies', hitbox(g, 0.6, 1.8, 2.7, 4.62, 0.9, 7.47));

  // --- South wall: tape, the heat gun, filters ---
  k.at(2.55, 0, 8.66, S, () => {
    const y = P.shelf(k, 1.6, 0.45, 1.8, 4);
    for (let i = 0; i < 5; i++) P.tapeRoll(k, -0.6 + i * 0.13, y(1), 0.05, i % 2 ? 0x9aa0a4 : 0xb8b030);
    P.heatGun(k, 0.35, y(1), 0.02, 0.4);
    for (let i = 0; i < 4; i++) k.cyl(0.07, 0.2, 0xd8d2c0, -0.55 + i * 0.17, y(2) + 0.1, 0, { seg: 10 }); // filters
    P.cardboard(k, 0.6, 0.35, 0.4, 0.3, y(0), 0, 0.1);
    k.at(-0.4, y(0), 0, 0.2, () => P.crate(k, 0.35));
    P.cardboard(k, 0.7, 0.25, 0.4, 0, y(3), 0);
    b.footprint(1.6, 0.45, 1.8);
  });
  d.add('labelTape', 0.2, 0.067, 2.95, 0.62, 8.425, { face: '-z' });
  d.add('labelSpare', 0.2, 0.067, 2.6, 1.17, 8.425, { face: '-z' });
  d.floor('blobLong', 1.9, 0.8, 2.55, 8.6);

  // --- West wall: the radio set on a small desk ---
  k.at(1.4, 0, 7.95, W, () => {
    P.desk(k, 1.2, 0.6, C.woodDark);
    k.at(0, 0.77, -0.05, 0, () => P.radioSet(k));
    k.box(0.2, 0.01, 0.28, C.paper, 0.38, 0.775, 0.1, { ry: 0.2, shade: 0 }); // call log
    b.footprint(1.2, 0.6, 1.2);
  });
  d.floor('blobLong', 0.9, 1.5, 1.4, 7.95);
  k.at(2.1, 0, 7.7, -1.9, () => {
    P.chair(k);
    b.footprint(0.4, 0.4, 0.9);
  });
  b.interactable('radio', hitbox(g, 0.7, 0.8, 1.2, 1.4, 1.0, 7.95));
  b.anchor('radio', 1.4, 0.95, 7.95);

  // --- Ceiling fixture ---
  k.box(1.0, 0.08, 0.3, C.steelDark, 3.0, 2.75, 7.0, { shade: 0 });
  b.anchor('fixtureSupply', 3.0, 2.62, 7.0);
}
