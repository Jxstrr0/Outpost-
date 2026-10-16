// Procedural surface textures, drawn on canvases once at start-up. Props, doors, walls
// and the snow multiply a neutral "grain" over their vertex colours; the floors and the
// ceiling carry their own colour. Every surface also gets a bump map, so the flashlight
// and the room lights pick out plate seams, rivets, tread and scuffs.
//
// Everything tiles: the noise is periodic and brush marks are drawn wrapped, so no seam
// shows where a texture repeats. Sizes and strengths are in CONFIG.render.surfaces.

import * as THREE from 'three';
import { CONFIG } from '../config.js';

const S = CONFIG.render.surfaces;

// ---------- drawing toolkit ----------

/** A small seeded random source (mulberry32), so the textures come out the same every load. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth value noise over a lattice of px × py cells that repeats, so it tiles. */
function lattice(px, py, seed) {
  const r = rng(seed);
  const grid = new Float32Array(px * py);
  for (let i = 0; i < grid.length; i++) grid[i] = r();
  const fade = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = fade(x - xi);
    const fy = fade(y - yi);
    const x0 = xi % px;
    const y0 = yi % py;
    const x1 = (x0 + 1) % px;
    const y1 = (y0 + 1) % py;
    const a = grid[y0 * px + x0];
    const b = grid[y0 * px + x1];
    const c = grid[y1 * px + x0];
    const d = grid[y1 * px + x1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

/**
 * Tiling fractal noise for a w × h image, values 0..1. `cx` and `cy` are the lattice cells
 * across the tile in each direction: many more cells in y than in x gives streaks along x.
 */
function fbm(w, h, cx, cy, octaves, seed) {
  const out = new Float32Array(w * h);
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const amp = 0.5 ** o;
    const px = cx << o;
    const py = cy << o;
    const n = lattice(px, py, seed + o * 101);
    const sx = px / w;
    const sy = py / h;
    for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) out[i] += amp * n(x * sx, y * sy);
    total += amp;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

/** A canvas filled pixel by pixel: `pixel(x, y, i, rgb)` writes 0..1 values into rgb. */
function paintCanvas(w, h, pixel) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  const d = img.data;
  const rgb = [0, 0, 0];
  for (let y = 0, i = 0; y < h; y++) {
    for (let x = 0; x < w; x++, i++) {
      pixel(x, y, i, rgb);
      d[i * 4] = Math.max(0, Math.min(255, Math.round(rgb[0] * 255)));
      d[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(rgb[1] * 255)));
      d[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(rgb[2] * 255)));
      d[i * 4 + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Draw a mark near (x, y) on a tiling canvas: copies that cross an edge wrap to the other side. */
function wrapped(g, w, h, x, y, margin, draw) {
  const xs = x < margin ? [0, w] : x > w - margin ? [0, -w] : [0];
  const ys = y < margin ? [0, h] : y > h - margin ? [0, -h] : [0];
  for (const dx of xs) {
    for (const dy of ys) {
      g.save();
      g.translate(dx, dy);
      draw(g);
      g.restore();
    }
  }
}

function line(g, x, y, angle, len, style, width) {
  g.strokeStyle = style;
  g.lineWidth = width;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x - Math.cos(angle) * len * 0.5, y - Math.sin(angle) * len * 0.5);
  g.lineTo(x + Math.cos(angle) * len * 0.5, y + Math.sin(angle) * len * 0.5);
  g.stroke();
}

function ellipse(g, x, y, rx, ry, rot, style) {
  g.fillStyle = style;
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  g.fill();
}

/** A raised dome in the height map, with a matching shaded disc in the colour map. */
function rivet(gc, gh, w, h, x, y, r) {
  wrapped(gh, w, h, x, y, r + 2, (g) => {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0.6)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(x - r - 1, y - r - 1, r * 2 + 2, r * 2 + 2);
  });
  wrapped(gc, w, h, x, y, r + 2, (g) => {
    ellipse(g, x, y + 0.8, r * 0.85, r * 0.85, 0, 'rgba(0,0,0,0.3)');
    ellipse(g, x - 0.4, y - 0.4, r * 0.6, r * 0.6, 0, 'rgba(255,255,255,0.2)');
  });
}

function toTexture(canvas, srgb) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = S.anisotropy;
  return tex;
}

/** Average colour of a canvas as [r, g, b] in 0..1, in the canvas's own colour space. */
function meanColor(canvas) {
  const { width: w, height: h } = canvas;
  const d = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const sum = [0, 0, 0];
  for (let i = 0; i < d.length; i += 4) {
    sum[0] += d[i];
    sum[1] += d[i + 1];
    sum[2] += d[i + 2];
  }
  const n = (d.length / 4) * 255;
  return [sum[0] / n, sum[1] / n, sum[2] / n];
}

// ---------- the surfaces ----------

/** Brushed, lightly scuffed paint: the grain under every prop and door. */
function makeGrain(size) {
  const w = size;
  const h = size;
  const mottle = fbm(w, h, 12, 12, 3, 11);
  const brush = fbm(w, h, 3, 48, 2, 23);
  const col = paintCanvas(w, h, (x, y, i, rgb) => {
    rgb[0] = rgb[1] = rgb[2] = 0.93 + (mottle[i] - 0.5) * 0.16 + (brush[i] - 0.5) * 0.08;
  });
  const hgt = paintCanvas(w, h, (x, y, i, rgb) => {
    rgb[0] = rgb[1] = rgb[2] = 0.5 + (mottle[i] - 0.5) * 0.5 + (brush[i] - 0.5) * 0.4;
  });
  const gc = col.getContext('2d');
  const gh = hgt.getContext('2d');
  const r = rng(5);
  for (let i = 0; i < 16; i++) {
    const x = r() * w;
    const y = r() * h;
    const a = r() * Math.PI;
    const len = 6 + r() * 28;
    wrapped(gc, w, h, x, y, len, (g) => line(g, x, y, a, len, i % 3 ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.22)', 1));
    wrapped(gh, w, h, x, y, len, (g) => line(g, x, y, a, len, 'rgba(0,0,0,0.4)', 1.2));
  }
  return { col, hgt };
}

/** Painted steel wall panel, one repeat from floor to ceiling: grime low down, rivet rows, chips. */
function makeWall(w, h) {
  const [tileW, tileH] = S.wallTile;
  const mottle = fbm(w, h, 6, 12, 4, 31);
  const drips = fbm(w, h, 40, 3, 2, 37);
  const metresUp = (y) => (1 - y / h) * tileH;
  const bump = (m, centre, width) => Math.exp(-((m - centre) ** 2) / (2 * width * width));
  const col = paintCanvas(w, h, (x, y, i, rgb) => {
    const m = metresUp(y);
    let l = 0.95 + (mottle[i] - 0.5) * 0.16 + (drips[i] - 0.5) * 0.08 * Math.min(1, m / 1.2);
    l *= 1 - 0.3 * Math.max(0, 1 - m / 0.35) ** 1.5; // grime kicked up along the floor
    l *= 1 - 0.07 * bump(m, 0.95, 0.18); // scuffs at hand and chair-back height
    l *= 1 - 0.06 * Math.max(0, (m - (tileH - 0.25)) / 0.25); // soot under the ceiling
    rgb[0] = rgb[1] = rgb[2] = l;
  });
  const hgt = paintCanvas(w, h, (x, y, i, rgb) => {
    rgb[0] = rgb[1] = rgb[2] = 0.5 + (mottle[i] - 0.5) * 0.3 + (drips[i] - 0.5) * 0.2;
  });
  const gc = col.getContext('2d');
  const gh = hgt.getContext('2d');
  // Rivet rows near the top and the bottom of each panel.
  const count = Math.round(tileW / 0.2);
  for (const m of [0.14, tileH - 0.14]) {
    const y = (1 - m / tileH) * h;
    for (let i = 0; i < count; i++) rivet(gc, gh, w, h, (i + 0.5) * (w / count), y, 4);
  }
  // Chipped paint, bare metal showing through.
  const r = rng(41);
  for (let i = 0; i < 5; i++) {
    const x = r() * w;
    const y = r() * h;
    const rx = 1.5 + r() * 2.5;
    const ry = 1 + r() * 2;
    const rot = r() * 3;
    wrapped(gc, w, h, x, y, 8, (g) => {
      ellipse(g, x, y, rx, ry, rot, 'rgba(40,44,48,0.4)');
      g.strokeStyle = 'rgba(255,255,255,0.2)';
      g.lineWidth = 0.8;
      g.stroke();
    });
    wrapped(gh, w, h, x, y, 8, (g) => ellipse(g, x, y, rx, ry, rot, 'rgba(0,0,0,0.5)'));
  }
  // Scuff streaks where things have been dragged along the wall.
  for (let i = 0; i < 12; i++) {
    const x = r() * w;
    const y = (1 - (0.7 + r() * 0.5) / tileH) * h;
    const len = 10 + r() * 40;
    const a = (r() - 0.5) * 0.3;
    wrapped(gc, w, h, x, y, len, (g) => line(g, x, y, a, len, `rgba(0,0,0,${0.08 + r() * 0.12})`, 1 + r() * 2));
  }
  return { col, hgt };
}

/** Speckled linoleum tiles, 0.5 m each, with grout, a worn path and scuffs. */
function makeLino(size) {
  const w = size;
  const h = size;
  const tiles = 4;
  const t = w / tiles;
  const speck = fbm(w, h, 64, 64, 2, 51);
  const mottle = fbm(w, h, 5, 5, 3, 53);
  const shades = [
    [0x3f, 0x42, 0x37],
    [0x3a, 0x3d, 0x33],
    [0x43, 0x46, 0x3a],
    [0x3c, 0x3f, 0x35],
  ];
  const col = paintCanvas(w, h, (x, y, i, rgb) => {
    const base = shades[(Math.floor(x / t) * 3 + Math.floor(y / t) * 5) % 4];
    const k = 1 + (mottle[i] - 0.5) * 0.12 + (speck[i] > 0.62 ? 0.14 : speck[i] < 0.36 ? -0.1 : 0);
    rgb[0] = (base[0] / 255) * k;
    rgb[1] = (base[1] / 255) * k;
    rgb[2] = (base[2] / 255) * k;
  });
  const hgt = paintCanvas(w, h, (x, y, i, rgb) => {
    rgb[0] = rgb[1] = rgb[2] = 0.5 + (speck[i] - 0.5) * 0.25;
  });
  const gc = col.getContext('2d');
  const gh = hgt.getContext('2d');
  // Grout between tiles.
  for (let k = 0; k < tiles; k++) {
    const p = k * t;
    gc.fillStyle = 'rgba(0,0,0,0.45)';
    gc.fillRect(p - 1, 0, 2, h);
    gc.fillRect(0, p - 1, w, 2);
    gh.fillStyle = 'rgba(0,0,0,0.6)';
    gh.fillRect(p - 1.5, 0, 3, h);
    gh.fillRect(0, p - 1.5, w, 3);
  }
  gc.fillStyle = 'rgba(0,0,0,0.45)';
  gc.fillRect(w - 1, 0, 1, h);
  gc.fillRect(0, h - 1, w, 1);
  gh.fillStyle = 'rgba(0,0,0,0.6)';
  gh.fillRect(w - 1.5, 0, 1.5, h);
  gh.fillRect(0, h - 1.5, w, 1.5);
  // A path worn lighter through the middle.
  const wear = gc.createRadialGradient(w / 2, h / 2, w * 0.05, w / 2, h / 2, w * 0.7);
  wear.addColorStop(0, 'rgba(255,255,230,0.06)');
  wear.addColorStop(1, 'rgba(0,0,0,0)');
  gc.fillStyle = wear;
  gc.fillRect(0, 0, w, h);
  // Black heel marks and a few bright scratches.
  const r = rng(57);
  for (let i = 0; i < 14; i++) {
    const x = r() * w;
    const y = r() * h;
    const a = r() * Math.PI;
    const len = 6 + r() * 18;
    wrapped(gc, w, h, x, y, len, (g) => line(g, x, y, a, len, `rgba(0,0,0,${0.15 + r() * 0.2})`, 1.5 + r() * 2));
  }
  for (let i = 0; i < 8; i++) {
    const x = r() * w;
    const y = r() * h;
    const a = r() * Math.PI;
    const len = 20 + r() * 60;
    wrapped(gc, w, h, x, y, len, (g) => line(g, x, y, a, len, 'rgba(255,255,240,0.1)', 1));
    wrapped(gh, w, h, x, y, len, (g) => line(g, x, y, a, len, 'rgba(0,0,0,0.35)', 1));
  }
  return { col, hgt };
}

/** Steel tread plate in 1 m sheets: raised diamonds, bolted corners, oil and rust. */
function makeTread(size) {
  const w = size;
  const h = size;
  const p = w / 2; // one plate
  const mottle = fbm(w, h, 10, 10, 3, 61);
  const col = paintCanvas(w, h, (x, y, i, rgb) => {
    const k = 1 + (mottle[i] - 0.5) * 0.16;
    rgb[0] = (0x33 / 255) * k;
    rgb[1] = (0x37 / 255) * k;
    rgb[2] = (0x3a / 255) * k;
  });
  const hgt = paintCanvas(w, h, (x, y, i, rgb) => {
    rgb[0] = rgb[1] = rgb[2] = 0.4 + (mottle[i] - 0.5) * 0.1;
  });
  const gc = col.getContext('2d');
  const gh = hgt.getContext('2d');
  // Diamond lugs on a staggered grid; the grid divides the tile, so it repeats cleanly.
  const sp = w / 32;
  const lug = (g, x, y, a, style) => {
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.fillStyle = style;
    g.beginPath();
    g.roundRect(-sp * 0.3, -sp * 0.09, sp * 0.6, sp * 0.18, sp * 0.08);
    g.fill();
    g.restore();
  };
  for (let row = 0; row < 32; row++) {
    for (let c = 0; c < 32; c++) {
      const x = (c + (row % 2 ? 0.5 : 0)) * sp + sp * 0.5;
      const y = row * sp + sp * 0.5;
      // Skip the seams between plates, and their bolted corners.
      if (Math.abs(((x + p / 2) % p) - p / 2) < sp * 0.5 || Math.abs(((y + p / 2) % p) - p / 2) < sp * 0.5) continue;
      const a = (row + c) % 2 ? 0.785 : -0.785;
      wrapped(gc, w, h, x, y, sp, (g) => {
        lug(g, x + 1, y + 1, a, 'rgba(0,0,0,0.5)');
        lug(g, x - 0.7, y - 0.7, a, 'rgba(255,255,255,0.22)');
        lug(g, x, y, a, 'rgba(120,128,134,0.35)');
      });
      wrapped(gh, w, h, x, y, sp, (g) => lug(g, x, y, a, 'rgba(255,255,255,0.8)'));
    }
  }
  // Plate seams with a lighter bevel, and a bolt in each corner.
  for (const q of [0, p]) {
    gc.fillStyle = 'rgba(0,0,0,0.55)';
    gc.fillRect(q - 1, 0, 2, h);
    gc.fillRect(0, q - 1, w, 2);
    gc.fillStyle = 'rgba(255,255,255,0.1)';
    gc.fillRect(q + 1, 0, 1, h);
    gc.fillRect(0, q + 1, w, 1);
    gh.fillStyle = 'rgba(0,0,0,0.7)';
    gh.fillRect(q - 1.5, 0, 3, h);
    gh.fillRect(0, q - 1.5, w, 3);
  }
  gc.fillStyle = 'rgba(0,0,0,0.55)';
  gc.fillRect(w - 1, 0, 1, h);
  gc.fillRect(0, h - 1, w, 1);
  gh.fillStyle = 'rgba(0,0,0,0.7)';
  gh.fillRect(w - 1.5, 0, 1.5, h);
  gh.fillRect(0, h - 1.5, w, 1.5);
  const inset = sp * 0.9;
  for (const px of [0, p]) {
    for (const py of [0, p]) {
      for (const [sx, sy] of [
        [inset, inset],
        [p - inset, inset],
        [inset, p - inset],
        [p - inset, p - inset],
      ]) {
        rivet(gc, gh, w, h, px + sx, py + sy, sp * 0.3);
      }
    }
  }
  // Oil and rust.
  const r = rng(67);
  for (let i = 0; i < 10; i++) {
    const x = r() * w;
    const y = r() * h;
    const rx = 10 + r() * 30;
    const ry = 6 + r() * 16;
    wrapped(gc, w, h, x, y, 40, (g) => ellipse(g, x, y, rx, ry, r() * 3, `rgba(0,0,0,${0.06 + r() * 0.12})`));
  }
  for (let i = 0; i < 6; i++) {
    const x = r() * w;
    const y = r() * h;
    wrapped(gc, w, h, x, y, 20, (g) => ellipse(g, x, y, 4 + r() * 12, 3 + r() * 8, r() * 3, 'rgba(120,62,24,0.22)'));
  }
  return { col, hgt };
}

/** Acoustic ceiling tiles on a T-bar grid, perforated, one water-stained. */
function makeCeiling(size) {
  const w = size;
  const h = size;
  const t = w / 2;
  const mottle = fbm(w, h, 24, 24, 2, 71);
  const col = paintCanvas(w, h, (x, y, i, rgb) => {
    const k = 1 + (mottle[i] - 0.5) * 0.1;
    rgb[0] = (0x4a / 255) * k;
    rgb[1] = (0x51 / 255) * k;
    rgb[2] = (0x56 / 255) * k;
  });
  const hgt = paintCanvas(w, h, (x, y, i, rgb) => {
    rgb[0] = rgb[1] = rgb[2] = 0.55 + (mottle[i] - 0.5) * 0.15;
  });
  const gc = col.getContext('2d');
  const gh = hgt.getContext('2d');
  // Perforations.
  const step = w / 32;
  for (let y = step / 2; y < h; y += step) {
    for (let x = step / 2; x < w; x += step) {
      if (x % t < 5 || x % t > t - 5 || y % t < 5 || y % t > t - 5) continue;
      ellipse(gc, x, y, 1.2, 1.2, 0, 'rgba(0,0,0,0.35)');
      ellipse(gh, x, y, 1.6, 1.6, 0, 'rgba(0,0,0,0.5)');
    }
  }
  // The grid: a light bar with a dark recess either side.
  for (const q of [0, t]) {
    gc.fillStyle = 'rgba(0,0,0,0.45)';
    gc.fillRect(q - 3, 0, 6, h);
    gc.fillRect(0, q - 3, w, 6);
    gc.fillStyle = '#5a6166';
    gc.fillRect(q - 1.5, 0, 3, h);
    gc.fillRect(0, q - 1.5, w, 3);
    gh.fillStyle = 'rgba(0,0,0,0.75)';
    gh.fillRect(q - 3, 0, 6, h);
    gh.fillRect(0, q - 3, w, 6);
  }
  gc.fillStyle = 'rgba(0,0,0,0.45)';
  gc.fillRect(w - 3, 0, 3, h);
  gc.fillRect(0, h - 3, w, 3);
  gh.fillStyle = 'rgba(0,0,0,0.75)';
  gh.fillRect(w - 3, 0, 3, h);
  gh.fillRect(0, h - 3, w, 3);
  // A water stain, ringed, on one tile.
  const cx = t * 1.55;
  const cy = t * 1.6;
  for (const [rr, a] of [
    [t * 0.3, 0.14],
    [t * 0.22, 0.12],
    [t * 0.12, 0.1],
  ]) {
    ellipse(gc, cx, cy, rr, rr * 0.7, 0.4, `rgba(70,52,30,${a})`);
    gc.strokeStyle = `rgba(60,42,22,${a + 0.12})`;
    gc.lineWidth = 1.5;
    gc.stroke();
  }
  return { col, hgt };
}

/** Wind-packed snow crust, with ripples along the wind and a sparkle of ice grains. */
function makeSnow(size) {
  const w = size;
  const h = size;
  const mottle = fbm(w, h, 8, 8, 4, 81);
  const ripples = fbm(w, h, 3, 20, 2, 83);
  const grain = (i) => {
    let k = Math.imul(i ^ 0x5bd1e995, 0x9e3779b1);
    k ^= k >>> 15;
    k = Math.imul(k, 0x85ebca77);
    return ((k ^ (k >>> 13)) >>> 0) % 89 === 0;
  };
  const col = paintCanvas(w, h, (x, y, i, rgb) => {
    rgb[0] = rgb[1] = rgb[2] = 0.92 + (mottle[i] - 0.5) * 0.16 + (ripples[i] - 0.5) * 0.1 + (grain(i) ? 0.25 : 0);
  });
  const hgt = paintCanvas(w, h, (x, y, i, rgb) => {
    rgb[0] = rgb[1] = rgb[2] = 0.5 + (mottle[i] - 0.5) * 0.5 + (ripples[i] - 0.5) * 0.4 + (grain(i) ? 0.3 : 0);
  });
  return { col, hgt };
}

// ---------- materials ----------

const registry = [];
let level = S.detail;

function applyDetail(entry) {
  const { material, map, bump, gain, base } = entry;
  material.map = level === 'off' ? null : map;
  material.bumpMap = level === 'full' ? bump : null;
  if (material.map) {
    // A grain darkens what it covers a little; the material colour scales it back to neutral.
    material.color.setRGB(gain, gain, gain);
  } else {
    // Without its map a surface shows its average colour, so "off" still looks like the room.
    material.color.setRGB(base[0], base[1], base[2], base.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace);
  }
  material.needsUpdate = true;
}

/**
 * A Lambert material carrying one surface. `grain` surfaces multiply over vertex colours and
 * are scaled so their average brightness is one; the rest carry their own colour in sRGB.
 */
function surface({ col, hgt }, { grain = false, bumpScale }) {
  const map = toTexture(col, !grain);
  const bump = toTexture(hgt, false);
  const mean = meanColor(col);
  const gain = grain ? Math.min(1.4, 1 / Math.max(0.5, (mean[0] + mean[1] + mean[2]) / 3)) : 1;
  const base = grain ? [1, 1, 1] : mean;
  base.srgb = !grain;
  const material = new THREE.MeshLambertMaterial({ vertexColors: grain, bumpScale });
  const entry = { material, map, bump, gain, base };
  registry.push(entry);
  applyDetail(entry);
  return material;
}

let built = null;

/** The shared surface materials, drawn on first use. */
export function surfaces() {
  if (built) return built;
  const size = S.size;
  const half = size / 2;
  built = {
    /** Props, doors and the small parts of the station, over vertex colours. */
    kit: surface(makeGrain(half), { grain: true, bumpScale: S.bump.prop }),
    /** Wall panels, over each room's wall colours. */
    wall: surface(makeWall(half, size), { grain: true, bumpScale: S.bump.wall }),
    /** The snow and everything out in it, over vertex colours. */
    snow: surface(makeSnow(half), { grain: true, bumpScale: S.bump.snow }),
    lino: surface(makeLino(size), { bumpScale: S.bump.floor }),
    tread: surface(makeTread(size), { bumpScale: S.bump.floor }),
    ceiling: surface(makeCeiling(half), { bumpScale: S.bump.floor }),
  };
  return built;
}

export const DETAIL_LEVELS = ['full', 'flat', 'off'];

/** Switch every surface between full relief, colour only and plain vertex colours. */
export function setSurfaceDetail(next) {
  if (!DETAIL_LEVELS.includes(next)) return level;
  level = next;
  for (const entry of registry) applyDetail(entry);
  return level;
}

export function surfaceDetail() {
  return level;
}
