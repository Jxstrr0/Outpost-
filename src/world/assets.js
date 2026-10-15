// Shared materials and small mesh helpers. Placeholder primitives until milestone M4
// swaps in low-poly .glb models (loaded from public/models via import.meta.env.BASE_URL).

import * as THREE from 'three';

export const PALETTE = {
  steel: 0x5d6873,
  steelDark: 0x39424a,
  steelLight: 0x8a96a0,
  floor: 0x2b3034,
  floorMain: 0x3a3d34,
  wall: 0x6f7a80,
  wallLow: 0x4c565c,
  ceiling: 0x3c4348,
  olive: 0x4d5236,
  oliveDark: 0x363a26,
  orange: 0xe0702a,
  yellow: 0xd8b02a,
  red: 0xa8301f,
  wood: 0x5e4a36,
  paper: 0xd9d2c0,
  black: 0x0b0d0f,
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

/** An invisible box used only for interaction raycasts. */
const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
export function hitbox(parent, w, h, d, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hitMaterial);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

/** A floor texture drawn on a canvas: worn tread plate. */
export function makeFloorTexture(base = '#2f3438') {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.lineWidth = 2;
  for (let i = 0; i <= 256; i += 64) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, 256);
    g.moveTo(0, i);
    g.lineTo(256, i);
    g.stroke();
  }
  g.fillStyle = 'rgba(255,255,255,0.04)';
  for (let y = 8; y < 256; y += 16) {
    for (let x = (y / 16) % 2 ? 8 : 0; x < 256; x += 16) g.fillRect(x, y, 6, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
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
  // the north mast, far off
  g.fillStyle = '#25313d';
  g.fillRect(170, 54, 2, 36);
  g.fillStyle = '#ff6040';
  g.fillRect(169, 52, 4, 3);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
