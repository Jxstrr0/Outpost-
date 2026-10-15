// Shared palette, materials and canvas textures.
// Static props are built with the model kit (kit.js); the helpers here are for the few
// meshes that move or glow on their own (lamps, levers, jerry cans, doors).

import * as THREE from 'three';

export const PALETTE = {
  steel: 0x5d6873,
  steelDark: 0x39424a,
  steelLight: 0x8a96a0,
  steelWorn: 0x737b80,
  floor: 0x2b3034,
  wall: 0x646d73,
  wallLow: 0x3f474c,
  wallMain: 0x7b837c,
  wallMainLow: 0x4d5750,
  wallSupply: 0x6c7266,
  wallSupplyLow: 0x464b41,
  wallAirlock: 0x5b646b,
  wallAirlockLow: 0x353c42,
  trim: 0x30373c,
  seam: 0x4a5257,
  baseboard: 0x22282c,
  frame: 0x2e353a,
  pipe: 0x4a5359,
  cable: 0x1c1f22,
  ceiling: 0x3c4348,
  olive: 0x4d5236,
  oliveDark: 0x363a26,
  orange: 0xe0702a,
  yellow: 0xd8b02a,
  yellowDark: 0x9c8122,
  red: 0xa8301f,
  redDark: 0x6e2016,
  wood: 0x5e4a36,
  woodDark: 0x3f3124,
  paper: 0xd9d2c0,
  cream: 0xc9c2b0,
  black: 0x0b0d0f,
  rubber: 0x1a1c1e,
  blanket: 0x5a3a2c,
  canvas: 0x6b6450,
  white: 0xd6d8d4,
};

const cache = new Map();

/** A Lambert material, cached by colour and options. */
export function mat(color, options = {}) {
  const key = `${color}:${JSON.stringify(options)}`;
  if (!cache.has(key)) cache.set(key, new THREE.MeshLambertMaterial({ color, ...options }));
  return cache.get(key);
}

/** A box centred at (x, y, z). */
export function box(parent, w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

export function cylinder(parent, r, h, material, x, y, z, segments = 12) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, segments), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function canvasTexture(c, repeat = true) {
  const tex = new THREE.CanvasTexture(c);
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Worn tread plate for the plant rooms. */
export function makeFloorTexture(base = '#2f3438') {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.lineWidth = 2;
  for (let i = 0; i <= 256; i += 128) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, 256);
    g.moveTo(0, i);
    g.lineTo(256, i);
    g.stroke();
  }
  // Diamond tread
  g.fillStyle = 'rgba(255,255,255,0.05)';
  for (let y = 6; y < 256; y += 12) {
    for (let x = (y / 12) % 2 ? 6 : 0; x < 256; x += 12) {
      g.save();
      g.translate(x, y);
      g.rotate(((x + y) / 12) % 2 ? 0.8 : -0.8);
      g.fillRect(-3, -1, 6, 2);
      g.restore();
    }
  }
  // Scuffs and oil
  for (let i = 0; i < 18; i++) {
    g.fillStyle = `rgba(0,0,0,${0.05 + (i % 4) * 0.03})`;
    g.beginPath();
    g.ellipse((i * 71) % 256, (i * 113) % 256, 10 + (i % 5) * 6, 5 + (i % 3) * 4, i, 0, Math.PI * 2);
    g.fill();
  }
  return canvasTexture(c);
}

/** Speckled linoleum tiles for the main room. */
export function makeLinoleumTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const tiles = ['#3f4237', '#3a3d33', '#43463a', '#3c3f35'];
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 2; x++) {
      g.fillStyle = tiles[(x + y * 2) % 4];
      g.fillRect(x * 128, y * 128, 128, 128);
    }
  }
  for (let i = 0; i < 1400; i++) {
    const v = (i * 7919) % 255;
    g.fillStyle = v % 3 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,240,0.06)';
    g.fillRect((i * 37) % 256, (i * 91 + (i >> 3)) % 256, 1 + (v % 2), 1);
  }
  g.strokeStyle = 'rgba(0,0,0,0.4)';
  g.lineWidth = 1.5;
  g.strokeRect(0.75, 0.75, 127, 127);
  g.strokeRect(128.75, 128.75, 127, 127);
  g.strokeRect(128.75, 0.75, 127, 127);
  g.strokeRect(0.75, 128.75, 127, 127);
  // A worn path in the middle
  const wear = g.createRadialGradient(128, 128, 10, 128, 128, 180);
  wear.addColorStop(0, 'rgba(255,255,230,0.05)');
  wear.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = wear;
  g.fillRect(0, 0, 256, 256);
  return canvasTexture(c);
}

/** Acoustic ceiling tiles. */
export function makeCeilingTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#4a5156';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect((i * 53) % 128, (i * 29 + (i >> 2)) % 128, 1, 1);
  }
  g.fillStyle = '#2a3034';
  g.fillRect(0, 0, 128, 3);
  g.fillRect(0, 0, 3, 128);
  // A water stain on one tile in four.
  g.fillStyle = 'rgba(70,52,30,0.25)';
  g.beginPath();
  g.ellipse(84, 90, 18, 12, 0.4, 0, Math.PI * 2);
  g.fill();
  return canvasTexture(c);
}

/** Soft dark blob for contact shadows under furniture. */
export function makeBlobTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 4, 32, 32, 31);
  grad.addColorStop(0, 'rgba(0,0,0,0.75)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.35)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return canvasTexture(c, false);
}

/** The view through the north window: moonlit snow and a far mast light. */
export function makeWindowTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 144;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 144);
  sky.addColorStop(0, '#0b1626');
  sky.addColorStop(0.55, '#1d3048');
  sky.addColorStop(0.62, '#7d93a8');
  sky.addColorStop(1, '#a9bccb');
  g.fillStyle = sky;
  g.fillRect(0, 0, 256, 144);
  g.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 40; i++) g.fillRect((i * 97) % 256, (i * 37) % 70, 1, 1);
  // drifts
  g.fillStyle = 'rgba(220,235,245,0.35)';
  g.beginPath();
  g.moveTo(0, 100);
  g.quadraticCurveTo(70, 82, 140, 96);
  g.quadraticCurveTo(200, 106, 256, 90);
  g.lineTo(256, 144);
  g.lineTo(0, 144);
  g.fill();
  // the north mast, far off
  g.fillStyle = '#25313d';
  g.fillRect(170, 54, 2, 36);
  g.fillStyle = '#ff6040';
  g.fillRect(169, 52, 4, 3);
  // frost creeping in from the corners
  const frost = g.createRadialGradient(128, 72, 50, 128, 72, 150);
  frost.addColorStop(0, 'rgba(255,255,255,0)');
  frost.addColorStop(1, 'rgba(225,238,248,0.5)');
  g.fillStyle = frost;
  g.fillRect(0, 0, 256, 144);
  return canvasTexture(c, false);
}

/** A label or poster drawn on canvas: lines of text on a coloured card. */
export function makeSignTexture(lines, { w = 256, h = 128, bg = '#d8d2c0', ink = '#1d1f20', size = 26 } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = ink;
  g.font = `bold ${size}px monospace`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  lines.forEach((line, i) => g.fillText(line, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.25));
  return canvasTexture(c, false);
}
