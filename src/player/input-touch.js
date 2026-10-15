// Touch controls: a floating stick on the left half, drag to look on the right,
// a Use button bottom right and a pause button top centre.

import { CONFIG } from '../config.js';

const P = CONFIG.player;

/**
 * @param {HTMLElement} root
 * @param {ReturnType<import('./controller.js').createInputState>} input
 * @param {{ getSettings: () => object, onPause: () => void }} hooks
 */
export function attachTouchInput(root, input, hooks) {
  const el = document.createElement('div');
  el.className = 'touch hidden';
  el.innerHTML = `
    <div class="touch-zone left"></div>
    <div class="touch-zone right"></div>
    <div class="stick idle"><div class="stick-knob"></div></div>
    <button class="touch-btn use" aria-label="Use">USE</button>
    <button class="touch-btn pause" aria-label="Pause">II</button>
  `;
  root.appendChild(el);

  const left = el.querySelector('.touch-zone.left');
  const right = el.querySelector('.touch-zone.right');
  const stick = el.querySelector('.stick');
  const knob = el.querySelector('.stick-knob');
  const useBtn = el.querySelector('.use');
  const pauseBtn = el.querySelector('.pause');

  const restStick = () => {
    const r = left.getBoundingClientRect();
    stick.style.left = `${Math.max(90, r.width * 0.22)}px`;
    stick.style.top = `${r.height - 110}px`;
  };

  let stickId = null;
  let ox = 0;
  let oy = 0;
  left.addEventListener('pointerdown', (e) => {
    if (stickId !== null) return;
    stickId = e.pointerId;
    left.setPointerCapture(e.pointerId);
    ox = e.clientX;
    oy = e.clientY;
    stick.style.left = `${ox}px`;
    stick.style.top = `${oy}px`;
    stick.classList.remove('idle');
    e.preventDefault();
  });
  left.addEventListener('pointermove', (e) => {
    if (e.pointerId !== stickId) return;
    let dx = e.clientX - ox;
    let dy = e.clientY - oy;
    const d = Math.hypot(dx, dy);
    if (d > P.stickRadius) {
      dx = (dx / d) * P.stickRadius;
      dy = (dy / d) * P.stickRadius;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const dead = 0.12;
    const nx = dx / P.stickRadius;
    const ny = -dy / P.stickRadius;
    input.moveX = Math.abs(nx) < dead ? 0 : nx;
    input.moveY = Math.abs(ny) < dead ? 0 : ny;
  });
  const endStick = (e) => {
    if (e.pointerId !== stickId) return;
    stickId = null;
    input.moveX = input.moveY = 0;
    knob.style.transform = '';
    stick.classList.add('idle');
    restStick();
  };
  left.addEventListener('pointerup', endStick);
  left.addEventListener('pointercancel', endStick);

  let lookId = null;
  let lx = 0;
  let ly = 0;
  right.addEventListener('pointerdown', (e) => {
    if (lookId !== null) return;
    lookId = e.pointerId;
    right.setPointerCapture(e.pointerId);
    lx = e.clientX;
    ly = e.clientY;
    e.preventDefault();
  });
  right.addEventListener('pointermove', (e) => {
    if (e.pointerId !== lookId) return;
    const s = P.lookSensitivityTouch * hooks.getSettings().lookSensitivity;
    input.lookX += (e.clientX - lx) * s;
    input.lookY += (e.clientY - ly) * s;
    lx = e.clientX;
    ly = e.clientY;
  });
  const endLook = (e) => {
    if (e.pointerId === lookId) lookId = null;
  };
  right.addEventListener('pointerup', endLook);
  right.addEventListener('pointercancel', endLook);

  useBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    useBtn.setPointerCapture(e.pointerId);
    if (!input.useDown) input.usePressed = true;
    input.useDown = true;
  });
  const endUse = () => {
    input.useDown = false;
  };
  useBtn.addEventListener('pointerup', endUse);
  useBtn.addEventListener('pointercancel', endUse);

  pauseBtn.addEventListener('click', (e) => {
    e.preventDefault();
    hooks.onPause();
  });

  window.addEventListener('resize', restStick);
  restStick();

  return {
    show(visible) {
      el.classList.toggle('hidden', !visible);
      if (visible) restStick();
    },
    setUseReady(ready) {
      useBtn.classList.toggle('ready', ready);
    },
    clear() {
      stickId = lookId = null;
      input.moveX = input.moveY = 0;
      input.useDown = false;
      knob.style.transform = '';
      stick.classList.add('idle');
    },
  };
}

/** True on phones and tablets. */
export function isTouchDevice() {
  return window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window;
}
