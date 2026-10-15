// Every sign, poster, paper and floor shadow in the station is a quad cut from one
// canvas atlas, merged into one mesh: one draw call for all of them.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const SIZE = 1024;

/** Simple shelf packer over the atlas canvas. */
function createAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const g = canvas.getContext('2d');
  let x = 0;
  let y = 0;
  let row = 0;
  const regions = {};
  return {
    canvas,
    regions,
    add(name, w, h, draw) {
      if (x + w > SIZE) {
        x = 0;
        y += row + 2;
        row = 0;
      }
      const r = { x, y, w, h };
      g.save();
      g.beginPath();
      g.rect(x, y, w, h);
      g.clip();
      g.translate(x, y);
      draw(g, w, h);
      g.restore();
      regions[name] = r;
      x += w + 2;
      row = Math.max(row, h);
    },
  };
}

function text(g, str, x, y, size, color = '#1d1f20', align = 'center', weight = 'bold') {
  g.fillStyle = color;
  g.font = `${weight} ${size}px monospace`;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.fillText(str, x, y);
}

function scribble(g, x, y, w, lines, color = 'rgba(30,30,40,0.7)') {
  g.strokeStyle = color;
  g.lineWidth = 1.5;
  for (let i = 0; i < lines; i++) {
    g.beginPath();
    const yy = y + i * 9;
    g.moveTo(x, yy);
    for (let s = 0; s < w; s += 6) g.lineTo(x + s, yy + Math.sin((s + i * 13) * 0.7) * 1.5);
    g.stroke();
  }
}

function sign(lines, { bg = '#d8d2c0', ink = '#1d1f20', stripe = null } = {}) {
  return (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    if (stripe) {
      g.fillStyle = stripe;
      g.fillRect(0, 0, w, h * 0.22);
    }
    g.strokeStyle = 'rgba(0,0,0,0.5)';
    g.lineWidth = 3;
    g.strokeRect(2, 2, w - 4, h - 4);
    // Shrink the type until the longest line fits.
    let size = Math.min(34, h / (lines.length + 1));
    g.font = `bold ${size}px monospace`;
    const widest = Math.max(...lines.map((l) => g.measureText(l).width));
    if (widest > w - 16) size *= (w - 16) / widest;
    lines.forEach((l, i) => text(g, l, w / 2, h * (stripe ? 0.6 : 0.5) + (i - (lines.length - 1) / 2) * size * 1.2, size, ink));
    // grime
    g.fillStyle = 'rgba(40,30,20,0.12)';
    g.fillRect(0, h * 0.8, w, h * 0.2);
  };
}

function hazard(g, w, h) {
  g.fillStyle = '#d8b02a';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#16181a';
  for (let x = -h; x < w; x += 28) {
    g.beginPath();
    g.moveTo(x, h);
    g.lineTo(x + 14, h);
    g.lineTo(x + 14 + h, 0);
    g.lineTo(x + h, 0);
    g.fill();
  }
}

function drawAtlas() {
  const a = createAtlas();

  a.add('blob', 64, 64, (g) => {
    const grad = g.createRadialGradient(32, 32, 3, 32, 32, 31);
    grad.addColorStop(0, 'rgba(0,0,0,0.7)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.38)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  });
  a.add('blobLong', 128, 64, (g) => {
    g.save();
    g.scale(2, 1);
    const grad = g.createRadialGradient(32, 32, 3, 32, 32, 31);
    grad.addColorStop(0, 'rgba(0,0,0,0.65)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.32)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    g.restore();
  });

  a.add('signGenerator', 256, 96, sign(['GENERATOR ROOM'], { stripe: '#d8b02a' }));
  a.add('signSupply', 256, 96, sign(['SUPPLY'], { stripe: '#5b7a99' }));
  a.add('signAirlock', 256, 96, sign(['AIRLOCK', 'SUIT UP FIRST'], { stripe: '#a8301f' }));
  a.add('signStation', 384, 96, sign(['KESTREL-4', 'METEOROLOGICAL SERVICE'], { bg: '#20343f', ink: '#d8e2e8' }));
  a.add('signVoltage', 160, 128, (g, w, h) => {
    g.fillStyle = '#d8b02a';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#16181a';
    g.beginPath();
    g.moveTo(w / 2, 10);
    g.lineTo(w - 22, h * 0.62);
    g.lineTo(22, h * 0.62);
    g.closePath();
    g.fill();
    g.fillStyle = '#d8b02a';
    g.beginPath();
    g.moveTo(w / 2 + 6, 32);
    g.lineTo(w / 2 - 10, 58);
    g.lineTo(w / 2 + 2, 58);
    g.lineTo(w / 2 - 6, 76);
    g.lineTo(w / 2 + 12, 50);
    g.lineTo(w / 2, 50);
    g.closePath();
    g.fill();
    text(g, 'DANGER', w / 2, h * 0.78, 22);
    text(g, '400 V', w / 2, h * 0.92, 16);
  });
  a.add('signFuel', 192, 96, sign(['FUEL STORE', 'NO NAKED FLAME'], { bg: '#a8301f', ink: '#f0e6d8' }));
  a.add('signShut', 192, 96, sign(['KEEP DOOR SHUT', 'HEAT LOSS KILLS'], { stripe: '#d8b02a' }));
  a.add('hazard', 256, 32, hazard);

  // Regional map: a coastline, the station, the mast.
  a.add('map', 256, 192, (g, w, h) => {
    g.fillStyle = '#cfd6d2';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#9fb3bf';
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(w * 0.45, 0);
    g.bezierCurveTo(w * 0.4, h * 0.3, w * 0.62, h * 0.4, w * 0.5, h * 0.6);
    g.bezierCurveTo(w * 0.4, h * 0.8, w * 0.7, h * 0.9, w * 0.6, h);
    g.lineTo(0, h);
    g.fill();
    g.strokeStyle = 'rgba(60,80,90,0.5)';
    g.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      g.beginPath();
      g.ellipse(w * 0.75, h * 0.45, i * 14, i * 10, 0.3, 0, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = '#a8301f';
    g.fillRect(w * 0.74 - 3, h * 0.46 - 3, 6, 6);
    text(g, 'K-4', w * 0.74, h * 0.46 + 12, 11);
    g.fillStyle = '#1d1f20';
    g.fillRect(w * 0.74 - 1, h * 0.2, 2, 8);
    text(g, 'MAST', w * 0.74, h * 0.16, 10);
    g.strokeStyle = '#a8301f';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(w * 0.74, h * 0.24, 16, 0, Math.PI * 2);
    g.stroke();
    text(g, 'NORTH SHELF · 1:250 000', w / 2, h - 10, 11);
  });

  // Calendar with the days crossed off.
  a.add('calendar', 128, 160, (g, w, h) => {
    g.fillStyle = '#e4dfd2';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#7b2a20';
    g.fillRect(0, 0, w, 30);
    text(g, 'NOVEMBER', w / 2, 15, 14, '#f0e6d8');
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 7; c++) {
        const x = 6 + c * 17;
        const y = 38 + r * 23;
        g.strokeRect(x, y, 16, 22);
        const day = r * 7 + c + 1;
        if (day <= 30) text(g, String(day), x + 8, y + 7, 8, '#333', 'center', 'normal');
        if (day < 19) {
          g.strokeStyle = 'rgba(160,30,20,0.8)';
          g.beginPath();
          g.moveTo(x + 2, y + 4);
          g.lineTo(x + 14, y + 20);
          g.stroke();
          g.strokeStyle = 'rgba(0,0,0,0.25)';
        }
      }
    }
  });

  // Pressure chart pinned by the met console.
  a.add('chart', 192, 128, (g, w, h) => {
    g.fillStyle = '#e8e4d8';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(80,120,160,0.35)';
    for (let x = 0; x < w; x += 12) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }
    for (let y = 0; y < h; y += 12) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
    g.lineWidth = 2;
    g.strokeStyle = '#2a4a8a';
    g.beginPath();
    for (let x = 0; x < w; x += 4) g.lineTo(x, 60 + Math.sin(x * 0.05) * 14 + x * 0.05);
    g.stroke();
    g.strokeStyle = '#a8301f';
    g.beginPath();
    for (let x = 0; x < w; x += 4) g.lineTo(x, 64 + Math.sin(x * 0.05) * 14 + (x > 120 ? (x - 120) * 0.5 : 0) + x * 0.05);
    g.stroke();
    text(g, 'N / S  hPa', 40, 12, 11, '#333');
  });

  // Corkboard with pinned papers.
  a.add('cork', 256, 160, (g, w, h) => {
    g.fillStyle = '#8a6a44';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = i % 2 ? 'rgba(0,0,0,0.12)' : 'rgba(255,220,170,0.1)';
      g.fillRect((i * 37) % w, (i * 53) % h, 2, 2);
    }
    const papers = [
      [14, 14, 70, 90, '#e8e2d2', -0.05],
      [96, 20, 60, 50, '#f0e8a8', 0.06],
      [170, 12, 72, 96, '#e8e2d2', 0.03],
      [92, 84, 80, 64, '#dfe6ea', -0.04],
      [20, 110, 56, 40, '#f0e8a8', 0.08],
    ];
    for (const [x, y, pw, ph, color, rot] of papers) {
      g.save();
      g.translate(x + pw / 2, y + ph / 2);
      g.rotate(rot);
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.fillRect(-pw / 2 + 2, -ph / 2 + 3, pw, ph);
      g.fillStyle = color;
      g.fillRect(-pw / 2, -ph / 2, pw, ph);
      scribble(g, -pw / 2 + 6, -ph / 2 + 10, pw - 12, Math.floor(ph / 11));
      g.fillStyle = '#c0301f';
      g.beginPath();
      g.arc(0, -ph / 2 + 4, 3, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  });

  // A faded crew photo.
  a.add('photo', 96, 72, (g, w, h) => {
    g.fillStyle = '#e8e4da';
    g.fillRect(0, 0, w, h);
    const grad = g.createLinearGradient(0, 4, 0, h - 14);
    grad.addColorStop(0, '#7f8f9a');
    grad.addColorStop(1, '#c8ccc4');
    g.fillStyle = grad;
    g.fillRect(4, 4, w - 8, h - 18);
    g.fillStyle = '#3d4044';
    for (let i = 0; i < 3; i++) {
      const x = 22 + i * 26;
      g.beginPath();
      g.arc(x, 26, 6, 0, Math.PI * 2);
      g.fill();
      g.fillRect(x - 8, 32, 16, 22);
    }
    text(g, 'K-4 · SPRING', w / 2, h - 7, 8, '#555', 'center', 'normal');
  });

  // Duty roster: the last name is crossed out.
  a.add('roster', 128, 160, (g, w, h) => {
    g.fillStyle = '#e8e2d2';
    g.fillRect(0, 0, w, h);
    text(g, 'KEEPER ROSTER', w / 2, 14, 11);
    const names = ['HOLLIS  A.', 'MARSH   T.', 'OKAFOR  E.', 'VANCE   R.', ''];
    names.forEach((n, i) => {
      text(g, n, 14, 40 + i * 24, 11, '#222', 'left', 'normal');
      g.strokeStyle = 'rgba(0,0,0,0.2)';
      g.beginPath();
      g.moveTo(10, 50 + i * 24);
      g.lineTo(w - 10, 50 + i * 24);
      g.stroke();
    });
    g.strokeStyle = 'rgba(20,20,90,0.8)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(10, 112);
    g.lineTo(w - 12, 108);
    g.stroke();
    text(g, '?', w - 20, 136, 14, 'rgba(20,20,90,0.8)');
  });

  // Ice on the inside of the airlock porthole.
  a.add('frost', 128, 128, (g, w, h) => {
    g.beginPath();
    g.arc(w / 2, h / 2, w / 2 - 1, 0, Math.PI * 2);
    g.clip();
    const grad = g.createRadialGradient(w / 2, h / 2, 6, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(150,175,195,0.55)');
    grad.addColorStop(0.7, 'rgba(230,240,248,0.75)');
    grad.addColorStop(1, 'rgba(240,248,255,0.95)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 26; i++) {
      const ang = (i / 26) * Math.PI * 2;
      g.beginPath();
      g.moveTo(w / 2 + Math.cos(ang) * 64, h / 2 + Math.sin(ang) * 64);
      g.lineTo(w / 2 + Math.cos(ang + 0.2) * (30 + (i % 4) * 6), h / 2 + Math.sin(ang + 0.2) * (30 + (i % 4) * 6));
      g.stroke();
    }
  });

  // Labels for supply bins and the fuse box.
  a.add('labelFuses', 96, 32, sign(['FUSES 30A'], { bg: '#e8e2d2' }));
  a.add('labelFood', 96, 32, sign(['RATIONS'], { bg: '#e8e2d2' }));
  a.add('labelTape', 96, 32, sign(['SEAL TAPE'], { bg: '#e8e2d2' }));
  a.add('labelCells', 96, 32, sign(['CELLS'], { bg: '#e8e2d2' }));
  a.add('labelSpare', 96, 32, sign(['SPARES'], { bg: '#e8e2d2' }));
  a.add('firstAid', 64, 64, (g, w, h) => {
    g.fillStyle = '#e8e8e2';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#b02a20';
    g.fillRect(w / 2 - 7, 12, 14, h - 24);
    g.fillRect(12, h / 2 - 7, w - 24, 14);
  });
  a.add('dial', 64, 64, (g, w, h) => {
    g.fillStyle = '#e8e4d8';
    g.beginPath();
    g.arc(32, 32, 30, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#222';
    g.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      g.beginPath();
      g.moveTo(32 + Math.cos(ang) * 22, 32 + Math.sin(ang) * 22);
      g.lineTo(32 + Math.cos(ang) * 27, 32 + Math.sin(ang) * 27);
      g.stroke();
    }
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(32, 32);
    g.lineTo(32 + 14, 32 - 12);
    g.stroke();
    g.strokeStyle = '#a8301f';
    g.beginPath();
    g.moveTo(32, 32);
    g.lineTo(32 - 4, 32 + 18);
    g.stroke();
  });
  return a;
}

const v = new THREE.Vector3();

/**
 * @returns {{ add: (name: string, w: number, h: number, x: number, y: number, z: number, o?: object) => void,
 *   floor: (name: string, w: number, d: number, x: number, z: number, ry?: number) => void, bake: (parent: THREE.Object3D) => THREE.Mesh }}
 */
export function createDecals() {
  const atlas = drawAtlas();
  const parts = [];

  const decals = {
    /**
     * A decal quad facing along `o.face` ('+x', '-x', '+z', '-z', 'up'), centred at (x, y, z).
     * `o.roll` turns it in its own plane.
     */
    add(name, w, h, x, y, z, o = {}) {
      const r = atlas.regions[name];
      if (!r) return;
      const geo = new THREE.PlaneGeometry(w, h);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        const u = (r.x + uv.getX(i) * r.w) / SIZE;
        const vv = 1 - (r.y + (1 - uv.getY(i)) * r.h) / SIZE;
        uv.setXY(i, u, vv);
      }
      if (o.roll) geo.rotateZ(o.roll);
      switch (o.face || '+z') {
        case '-z':
          geo.rotateY(Math.PI);
          break;
        case '+x':
          geo.rotateY(Math.PI / 2);
          break;
        case '-x':
          geo.rotateY(-Math.PI / 2);
          break;
        case 'up':
          geo.rotateX(-Math.PI / 2);
          if (o.ry) geo.rotateY(o.ry);
          break;
        default:
          break;
      }
      v.set(x, y, z);
      geo.translate(v.x, v.y, v.z);
      parts.push(geo);
    },
    /** A soft contact shadow on the floor under a prop. */
    floor(name, w, d, x, z, ry = 0, y = 0.004) {
      decals.add(name, w, d, x, y, z, { face: 'up', ry });
    },
    bake(parent) {
      const merged = mergeGeometries(parts, false);
      parts.forEach((p) => p.dispose());
      parts.length = 0;
      const tex = new THREE.CanvasTexture(atlas.canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const material = new THREE.MeshLambertMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const mesh = new THREE.Mesh(merged, material);
      mesh.receiveShadow = true;
      mesh.renderOrder = 1;
      mesh.matrixAutoUpdate = false;
      parent.add(mesh);
      return mesh;
    },
  };
  return decals;
}
