// Low-poly props, built into the model kit in a local frame: floor at y = 0, front
// facing +z. Rooms place them with kit.at(x, 0, z, turn, () => props.x(kit)).

import { PALETTE as C } from './assets.js';

const HALF = Math.PI / 2;

export function chair(k, color = C.olive) {
  for (const [x, z] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) k.cyl(0.018, 0.44, C.steelDark, x, 0.22, z, { seg: 6 });
  k.box(0.46, 0.06, 0.46, color, 0, 0.47, 0);
  k.box(0.44, 0.04, 0.44, C.steelDark, 0, 0.43, 0, { shade: 0 });
  k.cyl(0.016, 0.42, C.steelDark, -0.19, 0.7, -0.21, { seg: 6 });
  k.cyl(0.016, 0.42, C.steelDark, 0.19, 0.7, -0.21, { seg: 6 });
  k.box(0.46, 0.3, 0.05, color, 0, 0.78, -0.22);
}

export function table(k, w = 1.4, d = 1.0, top = C.wood) {
  k.box(w, 0.05, d, top, 0, 0.745, 0);
  k.box(w - 0.06, 0.08, d - 0.06, C.woodDark, 0, 0.68, 0, { shade: 0 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(0.05, 0.7, 0.05, C.steelDark, sx * (w / 2 - 0.07), 0.35, sz * (d / 2 - 0.07));
}

export function mug(k, x, y, z, color = C.cream) {
  k.cyl(0.042, 0.095, color, x, y + 0.0475, z, { seg: 8 });
  k.box(0.02, 0.05, 0.012, color, x + 0.05, y + 0.05, z);
}

export function book(k, x, y, z, w, h, d, color) {
  k.box(w, h, d, color, x, y + h / 2, z);
  k.box(w * 0.98, h * 0.94, d + 0.004, C.paper, x + w * 0.01, y + h / 2, z, { shade: 0 });
}

/** A metal locker, 0.52 wide. */
export function locker(k, color = 0x4f5a48) {
  k.box(0.52, 1.9, 0.5, color, 0, 0.95, 0);
  k.box(0.46, 1.78, 0.02, color, 0, 0.98, 0.255);
  for (let i = 0; i < 4; i++) k.box(0.28, 0.018, 0.012, C.steelDark, 0, 1.7 - i * 0.05, 0.268, { shade: 0 });
  for (let i = 0; i < 4; i++) k.box(0.28, 0.018, 0.012, C.steelDark, 0, 0.35 - i * 0.05, 0.268, { shade: 0 });
  k.box(0.03, 0.16, 0.03, C.steelLight, 0.18, 1.0, 0.275);
  k.box(0.1, 0.06, 0.006, C.paper, 0, 1.55, 0.268, { shade: 0 }); // name card
}

/** Steel shelving unit, w wide, d deep, `levels` shelves. */
export function shelf(k, w = 1.2, d = 0.45, h = 1.8, levels = 4) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(0.035, h, 0.035, C.steelWorn, sx * (w / 2 - 0.02), h / 2, sz * (d / 2 - 0.02));
  for (let i = 0; i < levels; i++) {
    const y = 0.12 + (i * (h - 0.2)) / (levels - 1);
    k.box(w, 0.025, d, C.steel, 0, y, 0);
    k.box(w, 0.04, 0.02, C.steelDark, 0, y - 0.01, d / 2 - 0.01, { shade: 0 });
  }
  return (i) => 0.12 + (i * (h - 0.2)) / (levels - 1) + 0.0125;
}

export function cardboard(k, w, h, d, x, y, z, ry = 0) {
  k.box(w, h, d, 0x8c7350, x, y + h / 2, z, { ry });
  k.box(w + 0.004, 0.05, d * 0.3, 0xa89878, x, y + h - 0.04, z, { ry, shade: 0 }); // tape strip
}

export function crate(k, s = 0.55) {
  k.box(s, s, s, C.wood, 0, s / 2, 0);
  for (const y of [0.06, s - 0.06]) {
    k.box(s + 0.02, 0.07, s + 0.02, C.woodDark, 0, y, 0, { shade: 0 });
  }
  k.box(s + 0.022, s * 0.9, 0.07, C.woodDark, 0, s / 2, 0, { rz: 0.78, shade: 0 });
}

export function drum(k, color = 0x3d5a6e) {
  k.cyl(0.29, 0.88, color, 0, 0.44, 0, { seg: 14 });
  for (const y of [0.04, 0.3, 0.58, 0.85]) k.cyl(0.3, 0.035, C.steelDark, 0, y, 0, { seg: 14, shade: 0 });
  k.cyl(0.04, 0.02, C.steelLight, 0.14, 0.89, 0.05, { seg: 6 });
}

export function toolbox(k, color = C.red) {
  k.box(0.46, 0.18, 0.2, color, 0, 0.09, 0);
  k.box(0.44, 0.04, 0.19, C.redDark, 0, 0.2, 0);
  k.box(0.24, 0.025, 0.03, C.steelDark, 0, 0.245, 0);
  k.box(0.04, 0.03, 0.01, C.steelLight, 0, 0.16, 0.105, { shade: 0 });
}

export function extinguisher(k) {
  k.cyl(0.075, 0.48, C.red, 0, 0.24, 0, { seg: 10 });
  k.cyl(0.05, 0.08, C.redDark, 0, 0.52, 0, { seg: 8, r2: 0.035 });
  k.box(0.1, 0.03, 0.03, C.black, 0.02, 0.57, 0);
  k.cyl(0.012, 0.3, C.black, 0.08, 0.38, 0, { seg: 5, rz: 0.2 });
}

/** A bunk bed with a thin mattress and blanket. Long axis along x. */
export function bunk(k) {
  k.box(1.95, 0.06, 0.95, C.steelDark, 0, 0.32, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(0.05, 0.32, 0.05, C.steelDark, sx * 0.94, 0.16, sz * 0.44);
  k.box(0.05, 0.75, 0.95, C.steelDark, -0.96, 0.38, 0); // head rail
  k.box(0.05, 0.5, 0.95, C.steelDark, 0.96, 0.25, 0);
  k.box(1.86, 0.12, 0.88, C.olive, 0, 0.41, 0);
  k.box(1.25, 0.06, 0.9, C.blanket, 0.28, 0.49, 0.005);
  k.box(1.2, 0.08, 0.06, C.blanket, 0.3, 0.42, 0.45, { shade: 0 }); // blanket edge hanging over
  k.box(0.42, 0.1, 0.62, C.white, -0.68, 0.52, 0);
  // footlocker
  k.box(0.6, 0.36, 0.42, C.oliveDark, 1.4, 0.18, 0.2);
  k.box(0.62, 0.03, 0.44, C.steelDark, 1.4, 0.36, 0.2, { shade: 0 });
}

/** A radiator-style electric heater, long axis along z, facing +x. */
export function heaterBody(k) {
  k.box(0.32, 0.95, 1.4, C.steel, 0, 0.55, 0);
  k.box(0.34, 0.06, 1.44, C.steelDark, 0, 1.04, 0);
  k.box(0.3, 0.08, 1.36, C.steelDark, 0, 0.06, 0);
  for (const z of [-0.62, 0.62]) k.box(0.06, 0.12, 0.08, C.steelDark, 0, 0.06, z);
  k.box(0.02, 0.1, 0.2, C.paper, 0.17, 0.92, -0.45, { shade: 0 }); // rating plate
  k.cyl(0.03, 0.4, C.cable, 0.05, 0.2, 0.75, { seg: 6, rx: HALF }); // cable to the wall
}

/** A desk with a drawer pedestal. */
export function desk(k, w = 1.6, d = 0.7, top = C.wood) {
  k.box(w, 0.05, d, top, 0, 0.745, 0);
  k.box(0.42, 0.7, d - 0.06, C.steelDark, w / 2 - 0.25, 0.36, 0);
  for (let i = 0; i < 3; i++) {
    k.box(0.38, 0.2, 0.02, C.steel, w / 2 - 0.25, 0.58 - i * 0.22, d / 2 - 0.02);
    k.box(0.1, 0.02, 0.02, C.steelLight, w / 2 - 0.25, 0.6 - i * 0.22, d / 2, { shade: 0 });
  }
  k.box(0.05, 0.7, d - 0.06, C.steelDark, -w / 2 + 0.05, 0.36, 0);
  k.box(w - 0.1, 0.3, 0.02, C.steelDark, 0, 0.55, -d / 2 + 0.04);
}

/** A boxy CRT monitor, screen facing +z. The screen itself is a canvas mesh. */
export function crt(k, color = 0x2d3236) {
  k.box(0.56, 0.44, 0.34, color, 0, 0.22, 0.02);
  k.box(0.42, 0.34, 0.24, color, 0, 0.21, -0.24, { r2: 0.8 });
  k.box(0.5, 0.36, 0.02, 0x1b1e20, 0, 0.23, 0.195);
  k.box(0.26, 0.04, 0.2, color, 0, 0.0, 0.02);
  k.box(0.04, 0.03, 0.01, 0x7fe08a, 0.22, 0.04, 0.195, { shade: 0, flat: true });
}

export function keyboard(k, x, y, z, color = C.steelDark) {
  k.box(0.46, 0.03, 0.17, color, x, y + 0.015, z, { rx: 0.06 });
  for (let r = 0; r < 4; r++) k.box(0.4, 0.012, 0.025, 0x23282c, x, y + 0.035 + r * 0.002, z - 0.06 + r * 0.038, { shade: 0 });
}

export function kettle(k, x, y, z) {
  k.cyl(0.08, 0.16, C.steelLight, x, y + 0.08, z, { seg: 10, r2: 0.06 });
  k.cyl(0.03, 0.03, C.black, x, y + 0.175, z, { seg: 6 });
  k.box(0.02, 0.12, 0.1, C.black, x, y + 0.12, z - 0.09);
  k.cyl(0.012, 0.08, C.steelLight, x, y + 0.1, z + 0.1, { seg: 5, rx: 0.9 });
}

export function tin(k, x, y, z, color = 0xa8301f, r = 0.04, h = 0.1) {
  k.cyl(r, h, C.steelLight, x, y + h / 2, z, { seg: 8 });
  k.cyl(r + 0.002, h * 0.6, color, x, y + h / 2, z, { seg: 8, shade: 0 });
}

/** A wall clock face is a decal; this is the rim. */
export function clockRim(k) {
  k.cyl(0.16, 0.05, C.black, 0, 0, 0, { seg: 16, rx: HALF });
}

export function pegboard(k, w = 1.4, h = 0.8) {
  k.box(w, h, 0.02, 0x8a7a5e, 0, h / 2, 0);
  // tools hung on it
  k.box(0.04, 0.26, 0.02, C.steelLight, -w / 2 + 0.2, h / 2 + 0.02, 0.02); // wrench
  k.box(0.1, 0.03, 0.02, C.steelLight, -w / 2 + 0.2, h / 2 + 0.16, 0.02);
  k.box(0.03, 0.22, 0.02, C.red, -w / 2 + 0.4, h / 2, 0.02); // screwdriver
  k.box(0.02, 0.1, 0.02, C.steelLight, -w / 2 + 0.4, h / 2 - 0.15, 0.02);
  k.box(0.14, 0.04, 0.03, C.black, -w / 2 + 0.65, h / 2 + 0.12, 0.02); // hammer
  k.box(0.035, 0.28, 0.025, C.wood, -w / 2 + 0.65, h / 2 - 0.02, 0.02);
  k.box(0.2, 0.14, 0.04, C.orange, w / 2 - 0.35, h / 2 + 0.05, 0.03); // tape measure / gauge
  k.cyl(0.06, 0.03, C.black, w / 2 - 0.35, h / 2 + 0.05, 0.05, { seg: 8, rx: HALF });
  k.box(0.02, 0.3, 0.02, C.steelDark, w / 2 - 0.12, h / 2, 0.02);
}

export function vise(k) {
  k.box(0.16, 0.06, 0.12, C.steelDark, 0, 0.03, 0);
  k.box(0.1, 0.1, 0.06, 0x3d5a6e, 0, 0.11, -0.03);
  k.box(0.1, 0.1, 0.05, 0x3d5a6e, 0, 0.11, 0.05);
  k.cyl(0.01, 0.2, C.steelLight, 0, 0.1, 0.12, { seg: 5, rz: HALF });
}

/** The generator set: skid, engine, alternator, radiator, control box. Long axis x. */
export function generatorSet(k) {
  // skid
  k.box(2.2, 0.12, 1.3, C.steelDark, 0, 0.06, 0);
  for (const z of [-0.6, 0.6]) k.box(2.2, 0.16, 0.08, C.black, 0, 0.08, z, { shade: 0 });
  // engine block
  k.box(1.1, 0.75, 0.85, C.yellow, -0.3, 0.52, 0);
  k.box(1.0, 0.18, 0.7, C.yellowDark, -0.3, 0.98, 0);
  for (let i = 0; i < 4; i++) k.box(0.12, 0.1, 0.5, C.steelDark, -0.7 + i * 0.26, 1.12, 0);
  k.box(0.9, 0.06, 0.06, C.steelLight, -0.3, 0.9, 0.44, { shade: 0 }); // rail
  // alternator drum
  k.cyl(0.36, 0.7, C.yellow, 0.6, 0.52, 0, { seg: 14, rz: HALF });
  for (const x of [0.28, 0.92]) k.cyl(0.38, 0.05, C.steelDark, x, 0.52, 0, { seg: 14, rz: HALF, shade: 0 });
  // radiator end
  k.box(0.2, 0.86, 0.9, C.steelDark, -0.97, 0.55, 0);
  for (let i = 0; i < 7; i++) k.box(0.02, 0.7, 0.8, C.black, -1.08, 0.55, -0.36 + i * 0.12 - 0.0, { shade: 0, rx: 0, ry: 0 });
  // exhaust stack and muffler
  k.cyl(0.11, 0.5, C.steelWorn, 0.0, 1.32, -0.25, { seg: 10, rz: HALF });
  k.cyl(0.06, 1.5, C.steelWorn, 0.3, 2.05, -0.25, { seg: 8 });
  // control box on a stand at the front
  k.box(0.08, 0.5, 0.06, C.steelDark, -0.25, 0.37, 0.58);
  k.box(0.72, 0.42, 0.14, C.orange, -0.25, 0.86, 0.56);
  k.box(0.6, 0.3, 0.02, 0x2a2e31, -0.25, 0.86, 0.635);
  k.box(0.24, 0.1, 0.012, 0x15181a, -0.36, 0.93, 0.648, { shade: 0 });
  k.cyl(0.03, 0.03, C.steelLight, -0.06, 0.8, 0.65, { seg: 8, rx: HALF });
  // fuel hose to the day tank
  k.cyl(0.02, 1.05, C.rubber, 0.95, 0.24, -0.38, { seg: 6, rz: HALF });
}

/** Wall fuel day-tank, long axis along z. */
export function dayTank(k) {
  k.box(0.55, 1.1, 0.6, C.redDark, 0, 0.62, 0);
  k.box(0.6, 0.06, 0.65, C.steelDark, 0, 1.2, 0);
  k.box(0.6, 0.08, 0.65, C.steelDark, 0, 0.04, 0);
  k.cyl(0.05, 0.08, C.steelLight, 0.05, 1.27, 0.1, { seg: 8 });
  k.box(0.02, 0.6, 0.06, C.cream, -0.28, 0.65, 0.12, { shade: 0 }); // sight glass
}

/** Breaker panel cabinet, facing +z. */
export function breakerCabinet(k) {
  k.box(0.6, 0.8, 0.12, 0x6d7479, 0, 0, 0);
  k.box(0.52, 0.68, 0.02, 0x2a2e31, 0, 0, 0.07);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) k.box(0.05, 0.1, 0.03, c === 2 && r === 1 ? C.orange : C.cream, -0.2 + c * 0.1, 0.2 - r * 0.17, 0.085, { shade: 0 });
  k.cyl(0.03, 1.0, C.steelDark, 0.2, 0.9, -0.02, { seg: 6 }); // conduit up
}

/** Pallet the jerry cans stand on. */
export function pallet(k, w, d) {
  for (const x of [-w / 2 + 0.05, 0, w / 2 - 0.05]) k.box(0.1, 0.07, d, C.woodDark, x, 0.035, 0);
  for (let i = 0; i < 5; i++) k.box(w, 0.025, d / 5 - 0.03, C.wood, 0, 0.0825, -d / 2 + d / 10 + (i * d) / 5);
}

/** The radio set on a small desk, facing +z. Comes alive in M6. */
export function radioSet(k) {
  k.box(0.62, 0.3, 0.34, 0x4a4f3e, 0, 0.15, 0);
  k.box(0.56, 0.22, 0.02, 0x23271d, 0, 0.16, 0.17);
  for (let i = 0; i < 3; i++) k.cyl(0.03, 0.04, C.black, -0.18 + i * 0.14, 0.1, 0.19, { seg: 8, rx: HALF });
  k.box(0.2, 0.06, 0.012, 0xf2b54a, 0.14, 0.22, 0.182, { shade: 0, flat: true });
  k.cyl(0.006, 0.5, C.steelLight, 0.26, 0.55, -0.1, { seg: 4 });
  // handset
  k.box(0.06, 0.04, 0.22, C.black, -0.42, 0.04, 0.05);
  k.cyl(0.006, 0.4, C.cable, -0.3, 0.06, -0.05, { seg: 4, rz: 1.2 });
}

/** Heat gun, lying on its side. */
export function heatGun(k, x, y, z, ry = 0) {
  k.at(x, y, z, ry, () => {
    k.box(0.08, 0.08, 0.26, C.orange, 0, 0.04, 0);
    k.cyl(0.035, 0.12, C.black, 0, 0.04, 0.18, { seg: 8, rx: HALF });
    k.box(0.06, 0.14, 0.06, C.black, 0, -0.0, -0.08, { rx: 0.4 });
  });
}

export function tapeRoll(k, x, y, z, color = 0x9aa0a4) {
  k.cyl(0.055, 0.05, color, x, y + 0.025, z, { seg: 10 });
  k.cyl(0.03, 0.052, C.woodDark, x, y + 0.025, z, { seg: 8, shade: 0 });
}

/** The parka hanging on a hook, facing +z. */
export function parka(k) {
  k.box(0.04, 0.04, 0.12, C.steelDark, 0, 1.75, -0.04);
  k.box(0.46, 0.85, 0.2, C.orange, 0, 1.28, 0.06, { r2: 0.9 });
  k.box(0.5, 0.18, 0.22, 0x8a8a7a, 0, 1.68, 0.06); // fur hood
  for (const sx of [-1, 1]) k.box(0.12, 0.72, 0.16, C.orange, sx * 0.28, 1.3, 0.06);
  k.box(0.02, 0.72, 0.01, C.steelDark, 0, 1.26, 0.165, { shade: 0 }); // zip
  k.box(0.48, 0.05, 0.21, 0x9a9a9a, 0, 1.0, 0.065, { shade: 0 }); // reflective band
}

export function boots(k) {
  for (const x of [-0.08, 0.08]) {
    k.box(0.12, 0.28, 0.14, C.black, x, 0.14, -0.04);
    k.box(0.12, 0.1, 0.3, C.black, x, 0.05, 0.03);
  }
}

/** Hinged-door leaf, hinge at local x = 0, extending along +x, facing ±z. */
export function doorLeaf(k, w, h, color, { porthole = false, heavy = false } = {}) {
  const t = heavy ? 0.1 : 0.06;
  k.box(w, h, t, color, w / 2, h / 2, 0);
  k.box(w - 0.12, h - 0.16, t + 0.012, color, w / 2, h / 2, 0, { shade: 0.3 });
  for (const s of [-1, 1]) k.box(0.06, 0.1, 0.04, C.orange, w - 0.12, 1.02, s * (t / 2 + 0.02)); // handles
  if (heavy) {
    for (const y of [0.35, h - 0.35]) for (const s of [-1, 1]) k.box(0.18, 0.06, 0.03, C.steelDark, 0.1, y, s * (t / 2 + 0.01));
    for (const s of [-1, 1]) k.box(0.05, 0.4, 0.05, C.orange, w - 0.12, 1.1, s * (t / 2 + 0.03));
  }
  if (porthole) for (const s of [-1, 1]) k.cyl(0.16, 0.02, C.steelDark, w / 2, 1.5, s * (t / 2 + 0.005), { seg: 14, rx: HALF });
}

export const PROP_TURN = { north: 0, south: Math.PI, west: HALF, east: -HALF };
