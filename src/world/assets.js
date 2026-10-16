// Shared palette, materials and one-off canvas textures (the window, the crack, signs).
// Static props are built with the model kit (kit.js); the helpers here are for the few
// meshes that move or glow on their own (lamps, levers, jerry cans, doors). Tiling
// surface textures live in textures.js.

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
/** A crack across glass: white branching lines on transparent, drawn once. */
export function makeCrackTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 144;
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(235, 245, 255, 0.85)';
  g.lineCap = 'round';
  const branch = (x, y, angle, length, width) => {
    if (length < 6 || width < 0.4) return;
    let px = x;
    let py = y;
    const steps = 5;
    g.lineWidth = width;
    g.beginPath();
    g.moveTo(px, py);
    for (let i = 0; i < steps; i++) {
      angle += Math.sin(px * 0.37 + py * 0.11) * 0.35;
      px += (Math.cos(angle) * length) / steps;
      py += (Math.sin(angle) * length) / steps;
      g.lineTo(px, py);
    }
    g.stroke();
    branch(px, py, angle - 0.6, length * 0.6, width * 0.7);
    branch(px, py, angle + 0.5, length * 0.55, width * 0.65);
  };
  // The impact point low on the right pane, cracks running out across both panes.
  for (const a of [0, 0.9, 2.1, 3.3, 4.4, 5.4]) branch(178, 98, a, 60, 1.8);
  g.fillStyle = 'rgba(235, 245, 255, 0.5)';
  g.beginPath();
  g.arc(178, 98, 5, 0, Math.PI * 2);
  g.fill();
  return canvasTexture(c, false);
}

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
