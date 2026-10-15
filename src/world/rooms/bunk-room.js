// Vance's bunk room, south of the main room: sealed with tape until night 4. No light of
// its own. His bunk, his desk with the counts on the wall, his parka, and a loose wall
// panel where Hollis's tape was hidden.

import { PALETTE as C } from '../assets.js';
import { hitbox } from './builder.js';
import * as P from '../props.js';

const { east: E, west: W } = P.PROP_TURN;

export function buildBunkRoom(b) {
  const { kit: k, decals: d, group: g } = b;

  // --- Bunk along the south wall, head to the west, blanket folded square ---
  k.at(-4.85, 0, 7.4, 0, () => P.bunk(k));
  b.block(-5.85, -3.85, 6.92, 7.88, 0.8);
  b.block(-3.75, -3.15, 7.38, 7.82, 0.4);
  d.floor('blobLong', 2.6, 1.2, -4.75, 7.4);
  b.interactable('vanceBunk', hitbox(g, 1.9, 0.8, 1.0, -4.85, 0.4, 7.4));
  b.anchor('vancePillow', -5.5, 0.58, 7.4); // note spot

  // --- Desk against the east wall, with his count pinned above it ---
  k.at(-2.4, 0, 5.95, E, () => {
    P.desk(k, 1.2, 0.6);
    k.box(0.21, 0.01, 0.3, C.paper, -0.3, 0.775, 0.05, { ry: 0.15, shade: 0 });
    k.box(0.21, 0.01, 0.3, C.paper, -0.25, 0.785, 0.08, { ry: -0.2, shade: 0 });
    k.box(0.21, 0.01, 0.3, C.paper, 0.2, 0.775, 0.0, { ry: 0.05, shade: 0 });
    k.cyl(0.006, 0.14, C.black, 0.05, 0.785, 0.12, { rz: Math.PI / 2, seg: 4 }); // pencil
    b.footprint(1.2, 0.6, 1.0);
  });
  d.floor('blobLong', 1.4, 0.8, -2.4, 5.95, Math.PI / 2);
  b.interactable('vanceDesk', hitbox(g, 0.7, 1.0, 1.3, -2.4, 0.6, 5.95));
  k.at(-3.0, 0, 6.05, Math.PI / 2 - 0.3, () => {
    P.chair(k);
    b.footprint(0.4, 0.4, 0.9);
  });
  d.add('tally', 0.32, 0.4, -2.115, 1.45, 5.75, { face: '-x', roll: 0.02 });
  d.add('tally', 0.32, 0.4, -2.115, 1.47, 6.15, { face: '-x', roll: -0.04 });
  d.add('chart', 0.42, 0.28, -2.115, 1.25, 6.6, { face: '-x', roll: 0.05 });
  d.add('photo', 0.24, 0.18, -2.115, 1.1, 5.55, { face: '-x', roll: -0.1 });

  // --- Parka on the west wall, boots under it ---
  k.at(-5.86, 0, 6.5, W, () => P.parka(k));
  k.at(-5.65, 0, 6.3, 0.4, () => P.boots(k));

  // --- A loose panel in the east wall, prised off and leant beside the hole ---
  k.box(0.02, 0.6, 0.45, C.black, -2.105, 0.42, 7.45, { shade: 0 }); // the cavity
  k.at(-2.2, 0, 6.95, 0, () => k.box(0.03, 0.62, 0.47, C.wallSupply, 0, 0.3, 0, { rz: 0.18 }));
  b.anchor('vancePanel', -2.35, 0.0, 7.45); // tape spot, on the floor in front of the hole

  // --- A cold lamp, never switched on ---
  k.cyl(0.1, 0.06, C.steelDark, -4.0, 2.76, 6.5, { seg: 8 });
}
