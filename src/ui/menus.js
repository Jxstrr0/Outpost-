// Title, night card, pause, settings, day summary, lost and end screens.

import { formatClock } from '../core/clock.js';
import { CONFIG } from '../config.js';
import { SUPPLIES } from '../story/nights.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function createMenus(root) {
  const screen = document.createElement('div');
  screen.className = 'screen hidden';
  root.appendChild(screen);
  let onEscape = null;

  function show(html, { solid = false, escape = null } = {}) {
    screen.className = `screen${solid ? ' solid' : ''}`;
    screen.innerHTML = `<div class="screen-inner">${html}</div>`;
    onEscape = escape;
    const first = screen.querySelector('.btn.primary, .btn');
    first?.focus({ preventScroll: true });
  }

  const on = (selector, fn) => screen.querySelector(selector)?.addEventListener('click', fn);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && onEscape && !screen.classList.contains('hidden')) {
      e.preventDefault();
      onEscape();
    }
  });

  const menus = {
    get isOpen() {
      return !screen.classList.contains('hidden');
    },

    close() {
      screen.className = 'screen hidden';
      screen.innerHTML = '';
      onEscape = null;
    },

    title({ continueNight, onBegin, onContinue, onSettings }) {
      show(
        `<h1 class="title-logo">OUTPOST</h1>
        <div class="title-sub">Station Kestrel-4 · Longlight Interactive</div>
        <div class="menu">
          ${continueNight ? `<button class="btn primary" data-continue>Continue: night ${continueNight}</button>` : ''}
          <button class="btn ${continueNight ? '' : 'primary'}" data-begin>${continueNight ? 'New campaign' : 'Begin shift'}</button>
          <button class="btn" data-settings>Settings</button>
        </div>
        <div class="fineprint">
          Headphones help: every fault has its own sound.<br />
          Phone: play sideways. Left thumb moves, right thumb looks, USE to interact.<br />
          Desktop: WASD to move, mouse to look, E or click to use, Esc to pause.
        </div>`
      );
      on('[data-continue]', onContinue);
      on('[data-begin]', onBegin);
      on('[data-settings]', onSettings);
    },

    nightCard(night, onDone) {
      show(
        `<div class="night-card">
          <div class="big">NIGHT ${night.night}</div>
          <div class="when">18:00 · STATION KESTREL-4</div>
          <p>${esc(night.intro || '')}</p>
          <div class="tap">TAP OR PRESS ANY KEY TO BEGIN</div>
        </div>`,
        { solid: true }
      );
      let done = false;
      const finish = (e) => {
        if (done) return;
        done = true;
        e?.preventDefault?.();
        window.removeEventListener('keydown', finish);
        menus.close();
        onDone();
      };
      screen.addEventListener('pointerdown', finish, { once: true });
      setTimeout(() => window.addEventListener('keydown', finish), 250);
    },

    pause({ onResume, onSettings, onRestart, onQuit }) {
      show(
        `<h2>Paused</h2>
        <div class="menu">
          <button class="btn primary" data-resume>Resume</button>
          <button class="btn" data-settings>Settings</button>
          <button class="btn" data-restart>Restart this night</button>
          <button class="btn" data-quit>Quit to title</button>
        </div>`,
        { escape: onResume }
      );
      on('[data-resume]', onResume);
      on('[data-settings]', onSettings);
      on('[data-restart]', onRestart);
      on('[data-quit]', onQuit);
    },

    settings(settings, onChange, onBack) {
      show(
        `<h2>Settings</h2>
        <div class="settings-grid">
          <label for="s-sens">Look sensitivity</label>
          <input id="s-sens" type="range" min="0.3" max="2.5" step="0.05" value="${settings.lookSensitivity}" />
          <label for="s-inv">Invert look up and down</label>
          <input id="s-inv" type="checkbox" ${settings.invertY ? 'checked' : ''} />
          <label for="s-master">Master volume</label>
          <input id="s-master" type="range" min="0" max="1" step="0.05" value="${settings.masterVolume}" />
          <label for="s-fx">Effects volume</label>
          <input id="s-fx" type="range" min="0" max="1" step="0.05" value="${settings.effectsVolume}" />
          <label for="s-subs">Subtitles for sounds</label>
          <input id="s-subs" type="checkbox" ${settings.subtitles ? 'checked' : ''} />
          <label for="s-flicker">Reduced flicker</label>
          <input id="s-flicker" type="checkbox" ${settings.reducedFlicker ? 'checked' : ''} />
          <label for="s-text">Text size</label>
          <select id="s-text">
            ${['small', 'medium', 'large'].map((v) => `<option value="${v}" ${settings.textSize === v ? 'selected' : ''}>${v[0].toUpperCase() + v.slice(1)}</option>`).join('')}
          </select>
        </div>
        <div class="btn-row"><button class="btn primary" data-back>Back</button></div>`,
        { escape: onBack }
      );
      const bind = (id, key, read) =>
        screen.querySelector(id).addEventListener('input', (e) => onChange({ [key]: read(e.target) }));
      bind('#s-sens', 'lookSensitivity', (t) => Number(t.value));
      bind('#s-inv', 'invertY', (t) => t.checked);
      bind('#s-master', 'masterVolume', (t) => Number(t.value));
      bind('#s-fx', 'effectsVolume', (t) => Number(t.value));
      bind('#s-subs', 'subtitles', (t) => t.checked);
      bind('#s-flicker', 'reducedFlicker', (t) => t.checked);
      bind('#s-text', 'textSize', (t) => t.value);
      on('[data-back]', onBack);
    },

    summary({ state, nextNight, onContinue }) {
      const logged = state.readings.filter((r) => r.status === 'logged').length;
      const picks = CONFIG.supplies.picks;
      const supplyHtml = nextNight
        ? `<h2>Supply drop: choose ${picks}</h2>
          <div class="supply-grid">
            ${Object.entries(SUPPLIES)
              .map(([id, s]) => `<button class="supply" data-supply="${id}" aria-pressed="false"><div class="name">${esc(s.name)}</div><div class="desc">${esc(s.text)}</div></button>`)
              .join('')}
          </div>`
        : '';
      show(
        `<h2>06:00 · Night ${state.night} survived</h2>
        <div class="summary-stats">
          <div class="stat"><div class="n">${logged}/${state.readings.length}</div><div class="l">readings logged</div></div>
          <div class="stat"><div class="n">${state.logsRecovered.length}</div><div class="l">log entries recovered</div></div>
          <div class="stat"><div class="n">${state.lowestTemp.toFixed(1)}°</div><div class="l">lowest temperature</div></div>
          <div class="stat"><div class="n">${state.notesFound.length}</div><div class="l">notes found</div></div>
        </div>
        ${supplyHtml}
        <div class="btn-row"><button class="btn primary" data-next ${nextNight ? 'disabled' : ''}>${nextNight ? `Begin night ${nextNight}` : 'Continue'}</button></div>`,
        { solid: true }
      );
      const chosen = [];
      const next = screen.querySelector('[data-next]');
      screen.querySelectorAll('[data-supply]').forEach((b) =>
        b.addEventListener('click', () => {
          const id = b.dataset.supply;
          const i = chosen.indexOf(id);
          if (i >= 0) chosen.splice(i, 1);
          else {
            chosen.push(id);
            if (chosen.length > picks) chosen.shift();
          }
          screen.querySelectorAll('[data-supply]').forEach((x) => {
            const on = chosen.includes(x.dataset.supply);
            x.classList.toggle('chosen', on);
            x.setAttribute('aria-pressed', String(on));
          });
          next.disabled = chosen.length !== picks;
        })
      );
      next.addEventListener('click', () => onContinue([...chosen]));
    },

    lost({ state, onRetry, onQuit }) {
      show(
        `<h2>${formatClock(state.minute)} · Night ${state.night}</h2>
        <p style="font-family: var(--font-read); font-size: 1.25em; line-height: 1.5">
          The cold got into your hands first, then your thinking. You sat down by the dead heater to rest for a minute.
        </p>
        <div class="fineprint">You froze. Retry starts this night again from 18:00 with the same supplies.</div>
        <div class="btn-row">
          <button class="btn primary" data-retry>Retry night ${state.night}</button>
          <button class="btn" data-quit>Quit to title</button>
        </div>`,
        { solid: true }
      );
      on('[data-retry]', onRetry);
      on('[data-quit]', onQuit);
    },

    end({ night, onTitle }) {
      show(
        `<h2>To be continued</h2>
        <p style="font-family: var(--font-read); font-size: 1.15em; line-height: 1.55">
          You made it through night ${night}. The later nights, the yard, the north mast and the radio are still being built.
        </p>
        <div class="fineprint">Your logs, notes and supply choices are saved.</div>
        <div class="btn-row"><button class="btn primary" data-title>Back to title</button></div>`,
        { solid: true }
      );
      on('[data-title]', onTitle);
    },
  };
  return menus;
}
