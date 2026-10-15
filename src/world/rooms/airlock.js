// Airlock: cold-weather gear, a bench, and the outer door (frozen shut until night 3).

import { PALETTE as C } from '../assets.js';
import * as P from '../props.js';

const { west: W } = P.PROP_TURN;

export function buildAirlock(b) {
  const { kit: k, decals: d } = b;

  // Bench along the west wall, with the gear hanging above it.
  k.box(0.4, 0.05, 1.4, C.wood, -1.78, 0.45, 6.0);
  for (const z of [5.4, 6.6]) k.box(0.36, 0.43, 0.05, C.steelDark, -1.78, 0.215, z);
  b.block(-1.98, -1.58, 5.3, 6.7, 0.5);
  for (const z of [5.6, 6.35]) k.at(-1.84, 0, z, W, () => P.parka(k));
  k.box(0.04, 0.05, 1.3, C.woodDark, -1.88, 1.75, 6.0); // hook rail
  k.at(-1.78, 0.475, 5.75, 0.3, () => k.box(0.22, 0.1, 0.3, C.black, 0, 0.05, 0)); // gloves
  k.at(0.55, 0, 6.6, -0.4, () => P.boots(k));
  d.floor('blobLong', 0.7, 1.7, -1.78, 6.0);

  // Outer door details on the fixed frame.
  d.floor('hazard', 1.1, 0.14, -0.5, 6.84);
  d.add('frost', 0.3, 0.3, -0.5, 1.5, 6.93, { face: '-z' });
  d.add('dial', 0.2, 0.2, 0.55, 1.55, 6.88, { face: '-z' });
  d.add('signShut', 0.42, 0.21, -1.55, 1.5, 6.88, { face: '-z' });

  // Cage lamp
  k.cyl(0.1, 0.06, C.steelDark, -0.5, 2.76, 6.0, { seg: 8 });
  for (let i = 0; i < 4; i++) k.box(0.01, 0.16, 0.01, C.steelDark, -0.5 + Math.cos(i * 1.57) * 0.08, 2.65, 6.0 + Math.sin(i * 1.57) * 0.08, { shade: 0 });
  b.anchor('fixtureAirlock', -0.5, 2.62, 6.0);
  b.anchor('airlockOuter', -0.5, 1.2, 6.9);
  b.anchor('airlockHook', -1.78, 0.476, 6.3); // on the bench, under the gear
}
