// Keyboard and mouse. Mouse look uses pointer lock.

import { CONFIG } from '../config.js';

const KEYS = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

/**
 * @param {HTMLCanvasElement} canvas
 * @param {ReturnType<import('./controller.js').createInputState>} input
 * @param {{ isPlaying: () => boolean, getSettings: () => object, onPause: () => void, onKey?: (code: string) => void }} hooks
 */
export function attachDesktopInput(canvas, input, hooks) {
  const held = { up: false, down: false, left: false, right: false };
  let locked = false;

  const updateMove = () => {
    input.moveY = (held.up ? 1 : 0) - (held.down ? 1 : 0);
    input.moveX = (held.right ? 1 : 0) - (held.left ? 1 : 0);
  };

  const pressUse = () => {
    if (!input.useDown) input.usePressed = true;
    input.useDown = true;
  };

  window.addEventListener('keydown', (e) => {
    if (e.repeat && e.code !== 'KeyE') return;
    hooks.onKey?.(e.code, e);
    if (!hooks.isPlaying()) return;
    if (KEYS[e.code]) {
      held[KEYS[e.code]] = true;
      updateMove();
      e.preventDefault();
    }
    if (e.code === 'KeyE' && !e.repeat) pressUse();
    if (e.code === 'KeyF' && !e.repeat) input.torchPressed = true;
    if (e.code === 'Escape' && !locked) hooks.onPause();
  });

  window.addEventListener('keyup', (e) => {
    if (KEYS[e.code]) {
      held[KEYS[e.code]] = false;
      updateMove();
    }
    if (e.code === 'KeyE') input.useDown = false;
  });

  window.addEventListener('blur', () => {
    for (const k of Object.keys(held)) held[k] = false;
    updateMove();
    input.useDown = false;
  });

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || !hooks.isPlaying()) return;
    if (!locked) {
      requestLock();
      return;
    }
    pressUse();
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) input.useDown = false;
  });

  window.addEventListener('mousemove', (e) => {
    if (!locked || !hooks.isPlaying()) return;
    const s = CONFIG.player.lookSensitivityMouse * hooks.getSettings().lookSensitivity;
    input.lookX += e.movementX * s;
    input.lookY += e.movementY * s;
  });

  document.addEventListener('pointerlockchange', () => {
    const wasLocked = locked;
    locked = document.pointerLockElement === canvas;
    if (wasLocked && !locked && hooks.isPlaying()) hooks.onPause();
    hooks.onLockChange?.(locked);
  });

  function requestLock() {
    if (!canvas.requestPointerLock) return;
    try {
      const p = canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch {
      // Not supported (iOS Safari); touch controls take over.
    }
  }

  return {
    isLocked: () => locked,
    requestLock,
    releaseLock() {
      if (document.pointerLockElement) document.exitPointerLock();
    },
    clear() {
      for (const k of Object.keys(held)) held[k] = false;
      updateMove();
    },
  };
}
