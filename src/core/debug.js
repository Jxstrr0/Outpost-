// Debug panel, shown with ?debug=1. Skip time, set meters, trigger any failure or
// scripted event, jump to any night.

import { formatClock, parseClock } from './clock.js';

export function isDebug() {
  try {
    return new URLSearchParams(window.location.search).get('debug') === '1';
  } catch {
    return false;
  }
}

/**
 * @param {HTMLElement} root
 * @param {object} api - functions provided by main.js
 */
export function createDebugPanel(root, api) {
  const panel = document.createElement('details');
  panel.className = 'debug';
  panel.open = false;
  const failures = api.failureIds.map((id) => `<button data-fail="${id}">${id}</button>`).join('');
  const scripted = api.scriptedIds.map((id) => `<button data-script="${id}">${id}</button>`).join('');
  const sounds = Object.keys(api.soundSpots || {}).map((id) => `<button data-sound="${id}">${id}</button>`).join('');
  const nights = api.nightNumbers.map((n) => `<button data-night="${n}">N${n}</button>`).join('');
  panel.innerHTML = `
    <summary>DEBUG <span data-info></span></summary>
    <div class="dbg-body">
      <div class="dbg-row"><span data-clock></span> <span data-fps></span></div>
      <div class="dbg-row"><span data-stats></span></div>
      <div class="dbg-row">
        <button data-skip="60">+1h</button>
        <button data-skip="15">+15m</button>
        <button data-goto="03:00">to 03:00</button>
        <button data-goto="05:55">to 05:55</button>
      </div>
      <div class="dbg-row">speed
        <button data-speed="1">1x</button><button data-speed="4">4x</button><button data-speed="16">16x</button>
      </div>
      <div class="dbg-row"><label>power</label><input type="range" min="0" max="100" data-meter="power" /></div>
      <div class="dbg-row"><label>fuel</label><input type="range" min="0" max="100" data-meter="fuel" /></div>
      <div class="dbg-row"><label>temp</label><input type="range" min="-30" max="18" data-meter="temp" /></div>
      <div class="dbg-row"><label>torch</label><input type="range" min="0" max="100" data-meter="battery" /></div>
      <div class="dbg-row">fail ${failures}</div>
      <div class="dbg-row">event ${scripted}</div>
      <div class="dbg-row">sound ${sounds}</div>
      <div class="dbg-row">night ${nights}</div>
      <div class="dbg-row">
        <button data-end="survived">survive</button>
        <button data-end="frozen">freeze</button>
        <button data-nofail>failures: on</button>
      </div>
      <div class="dbg-row"><button data-doors>unlock doors</button><button data-torch>give flashlight</button></div>
      <div class="dbg-row"><button data-wipe>wipe save</button></div>
    </div>`;
  panel.style.pointerEvents = 'auto';
  root.appendChild(panel);

  const q = (s) => panel.querySelector(s);
  panel.querySelectorAll('[data-skip]').forEach((b) => b.addEventListener('click', () => api.skip(Number(b.dataset.skip))));
  panel.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => api.jumpTo(parseClock(b.dataset.goto))));
  panel.querySelectorAll('[data-speed]').forEach((b) => b.addEventListener('click', () => api.setSpeed(Number(b.dataset.speed))));
  panel.querySelectorAll('[data-meter]').forEach((input) =>
    input.addEventListener('input', () => api.setMeter(input.dataset.meter, Number(input.value)))
  );
  panel.querySelectorAll('[data-fail]').forEach((b) => b.addEventListener('click', () => api.trigger(b.dataset.fail)));
  panel.querySelectorAll('[data-script]').forEach((b) => b.addEventListener('click', () => api.scripted(b.dataset.script)));
  panel.querySelectorAll('[data-sound]').forEach((b) => b.addEventListener('click', () => api.sound(b.dataset.sound)));
  panel.querySelectorAll('[data-night]').forEach((b) => b.addEventListener('click', () => api.jumpNight(Number(b.dataset.night))));
  panel.querySelectorAll('[data-end]').forEach((b) => b.addEventListener('click', () => api.end(b.dataset.end)));
  q('[data-nofail]').addEventListener('click', (e) => {
    const on = api.toggleFailures();
    e.target.textContent = `failures: ${on ? 'on' : 'off'}`;
  });
  q('[data-wipe]').addEventListener('click', () => api.wipe());
  q('[data-doors]').addEventListener('click', () => api.unlockDoors());
  q('[data-torch]').addEventListener('click', () => api.giveFlashlight());

  let frames = 0;
  let last = performance.now();
  let fps = 0;
  return {
    update(state) {
      frames++;
      const now = performance.now();
      if (now - last > 500) {
        fps = Math.round((frames * 1000) / (now - last));
        frames = 0;
        last = now;
        q('[data-info]').textContent = `seed ${state.seed}`;
        q('[data-clock]').textContent = `${formatClock(state.minute)} freeze ${state.freezeMinutes.toFixed(0)}m`;
        q('[data-fps]').textContent = `${fps} fps`;
        const st = api.stats?.();
        if (st) q('[data-stats]').textContent = `${st.calls} draws · ${(st.triangles / 1000).toFixed(1)}k tris · ${st.lights} lights`;
        panel.querySelectorAll('[data-meter]').forEach((input) => {
          const key = input.dataset.meter;
          const value = key === 'battery' ? state.flashlight.battery : state[key];
          if (document.activeElement !== input) input.value = String(Math.round(value));
        });
      }
    },
    show(visible) {
      panel.classList.toggle('hidden', !visible);
    },
  };
}
