// Console screens drawn live on canvas textures, with scanlines.

import * as THREE from 'three';
import { formatClock } from '../core/clock.js';
import { openReading, nextUpcomingReading } from '../systems/duties.js';

const W = 512;
const H = 320;

function createScreen(parent, width, height, position, rotationY) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.copy(position);
  mesh.rotation.y = rotationY;
  parent.add(mesh);
  return { canvas, g, texture, material, mesh };
}

function scanlines(g) {
  g.fillStyle = 'rgba(0,0,0,0.22)';
  for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 2);
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
}

function clear(g, bg) {
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
}

function noPower(s, bg, ink) {
  clear(s.g, bg);
  s.g.fillStyle = ink;
  s.g.font = 'bold 28px monospace';
  s.g.fillText('NO MAIN POWER', 24, H / 2);
  scanlines(s.g);
  s.texture.needsUpdate = true;
}

/** Snow on the screen: the antenna is iced and nothing comes through. */
function staticNoise(s, ink) {
  const g = s.g;
  clear(g, '#050403');
  g.fillStyle = ink;
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    g.globalAlpha = 0.25 + Math.random() * 0.6;
    g.fillRect(x, y, 2 + Math.random() * 3, 2);
  }
  g.globalAlpha = 1;
  g.font = 'bold 24px monospace';
  g.fillText('NO SIGNAL: NORTH MAST', 24, H / 2);
  scanlines(g);
  s.texture.needsUpdate = true;
}

/** Amber met console. */
export function createMetScreen(parent, position, rotationY) {
  const s = createScreen(parent, 0.62, 0.39, position, rotationY);
  s.draw = (state, t) => {
    const g = s.g;
    if (!state.consolesPowered) {
      noPower(s, '#020201', '#f2b54a');
      return;
    }
    if (state.antennaIced) {
      staticNoise(s, '#f2b54a');
      return;
    }
    clear(g, '#140c02');
    g.fillStyle = '#f2b54a';
    g.font = 'bold 26px monospace';
    g.fillText('KESTREL-4  MET', 24, 44);
    g.font = '24px monospace';
    g.fillText(formatClock(state.minute), W - 110, 44);
    g.fillRect(24, 58, W - 48, 2);

    const open = openReading(state);
    const shown = open || [...state.readings].reverse().find((r) => r.values);
    g.font = '22px monospace';
    if (shown?.values) {
      const v = shown.values;
      const diff = v.pressureNorth - v.pressureSouth;
      g.fillText(`P NORTH  ${v.pressureNorth.toFixed(1)} hPa`, 24, 100);
      g.fillText(`P SOUTH  ${v.pressureSouth.toFixed(1)} hPa`, 24, 132);
      g.fillStyle = Math.abs(diff) > 3 ? '#ffe3a0' : '#f2b54a';
      g.fillText(`N - S    ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}`, 24, 164);
      g.fillStyle = '#f2b54a';
      g.fillText(`OUT ${v.outsideTemp.toFixed(1)}C  WIND ${v.windKmh} ${v.windDir}`, 24, 196);
    } else {
      g.fillText('AWAITING FIRST READING', 24, 120);
    }

    g.font = 'bold 24px monospace';
    if (open) {
      if (Math.floor(t * 2) % 2 === 0) g.fillText(`READING DUE - LOG BY ${formatClock(open.closes)}`, 24, 260);
    } else {
      const next = nextUpcomingReading(state);
      g.fillText(next ? `NEXT READING ${formatClock(next.due)}` : 'NO MORE READINGS TONIGHT', 24, 260);
    }
    const logged = state.readings.filter((r) => r.status === 'logged').length;
    g.font = '20px monospace';
    g.fillText(`LOGGED ${logged}/${state.readings.length}`, 24, 294);
    scanlines(g);
    s.texture.needsUpdate = true;
  };
  return s;
}

/** Green keeper terminal. */
export function createTerminalScreen(parent, position, rotationY, getLogTitle) {
  const s = createScreen(parent, 0.46, 0.33, position, rotationY);
  s.draw = (state, t) => {
    const g = s.g;
    if (!state.consolesPowered) {
      noPower(s, '#010201', '#7fe08a');
      return;
    }
    clear(g, '#021006');
    g.fillStyle = '#7fe08a';
    g.font = 'bold 26px monospace';
    g.fillText('KEEPER LOG', 24, 44);
    g.font = '20px monospace';
    g.fillText('POLAR MET SERVICE / K-4', 24, 74);
    g.fillRect(24, 88, W - 48, 2);
    const total = state.logsRecovered.length + state.logQueue.length;
    g.font = '24px monospace';
    g.fillText(`RECOVERED  ${state.logsRecovered.length}/${total}`, 24, 130);
    let y = 172;
    g.font = '20px monospace';
    for (const id of state.logsRecovered.slice(-3)) {
      g.fillText(`> ${getLogTitle(id)}`, 24, y);
      y += 30;
    }
    for (let i = 0; i < Math.min(2, state.logQueue.length); i++) {
      g.fillText('> ▓▒░▓ CORRUPT ░▒▓', 24, y);
      y += 30;
    }
    if (Math.floor(t * 1.6) % 2 === 0) g.fillRect(24, y - 18, 14, 22);
    scanlines(g);
    s.texture.needsUpdate = true;
  };
  return s;
}
