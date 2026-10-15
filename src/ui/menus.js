// Title, night card, pause, settings, save codes, day summary, lost and end screens.

import { formatClock } from '../core/clock.js';
import { CONFIG } from '../config.js';
import { SUPPLIES } from '../story/nights.js';
import OUTCOMES from '../story/data/outcomes.json';
import ENDINGS from '../story/data/endings.json';
import CREDITS from '../story/data/credits.json';

const ENDING_COUNT = 3;

/** The credits, as HTML. */
const creditsHtml = () =>
  CREDITS.sections
    .map((s) => `<div class="credit"><div class="credit-head">${esc(s.head)}</div>${s.lines.map((l) => `<div>${esc(l)}</div>`).join('')}</div>`)
    .join('');

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** The "Save code: Back up / Restore" pair on the title and pause menus. */
const SAVE_CODE_BUTTONS = `<div class="menu-caption" id="save-code-caption">Save code</div>
  <div class="menu-row" role="group" aria-labelledby="save-code-caption">
    <button class="btn" data-backup>Back up</button>
    <button class="btn" data-restore>Restore</button>
  </div>`;

/** The code box's own text-editing keys must never reach the game controls. Escape still closes the screen. */
function keepKeysInBox(box) {
  box.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') e.stopPropagation();
  });
}

export function createMenus(root) {
  const screen = document.createElement('div');
  screen.className = 'screen hidden';
  root.appendChild(screen);
  let onEscape = null;

  function show(html, { solid = false, escape = null, white = false } = {}) {
    screen.className = `screen${solid ? ' solid' : ''}${white ? ' white' : ''}`;
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

    title({ continueNight, endingsSeen = 0, onBegin, onContinue, onSettings, onBackup, onRestore, onCredits }) {
      show(
        `<h1 class="title-logo">OUTPOST</h1>
        <div class="title-sub">Station Kestrel-4 · Longlight Interactive</div>
        <p class="title-tag">Five nights alone on an arctic weather station. Keep the power on, log the weather, and don't open the west door.</p>
        <div class="menu">
          ${continueNight ? `<button class="btn primary" data-continue>Continue: night ${continueNight}</button>` : ''}
          <button class="btn ${continueNight ? '' : 'primary'}" data-begin>${continueNight ? 'New campaign' : 'Begin shift'}</button>
          <button class="btn" data-settings>Settings</button>
          <button class="btn" data-credits>Credits</button>
          ${SAVE_CODE_BUTTONS}
        </div>
        ${endingsSeen ? `<div class="fineprint">Endings found: ${endingsSeen} of ${ENDING_COUNT}</div>` : ''}
        <div class="fineprint">
          Headphones help: every fault has its own sound.<br />
          Phone: play sideways. Left thumb moves, right thumb looks, USE to interact.<br />
          Desktop: WASD to move, mouse to look, E or click to use, F for the flashlight, Esc to pause.
        </div>`
      );
      on('[data-continue]', onContinue);
      on('[data-begin]', onBegin);
      on('[data-settings]', onSettings);
      on('[data-backup]', onBackup);
      on('[data-restore]', onRestore);
      on('[data-credits]', onCredits);
    },

    credits(onBack) {
      show(
        `<div class="ending"><h2>${esc(CREDITS.title)}</h2>
        <div class="credits">${creditsHtml()}</div>
        <div class="btn-row"><button class="btn primary" data-back>Back</button></div></div>`,
        { solid: true, escape: onBack }
      );
      on('[data-back]', onBack);
    },

    nightCard(night, onDone) {
      show(
        `<div class="night-card">
          <div class="big">NIGHT ${night.night}</div>
          <div class="when">18:00 · STATION KESTREL-4</div>
          <p>${esc(night.intro || '')}</p>
          ${(night.newTonight || []).length ? `<ul class="new-tonight">${night.newTonight.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
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

    pause({ onResume, onSettings, onRestart, onQuit, onBackup, onRestore }) {
      show(
        `<h2>Paused</h2>
        <div class="menu">
          <button class="btn primary" data-resume>Resume</button>
          <button class="btn" data-settings>Settings</button>
          <button class="btn" data-restart>Restart this night</button>
          <button class="btn" data-quit>Quit to title</button>
          ${SAVE_CODE_BUTTONS}
        </div>`,
        { escape: onResume }
      );
      on('[data-resume]', onResume);
      on('[data-settings]', onSettings);
      on('[data-restart]', onRestart);
      on('[data-quit]', onQuit);
      on('[data-backup]', onBackup);
      on('[data-restore]', onRestore);
    },

    /** Shows the save code in a read-only box with a Copy button. */
    backup({ code, midNight, onBack }) {
      show(
        `<h2>Back up</h2>
        <p class="code-help" id="code-help">This code is all your saved progress and settings. Keep it somewhere safe, like your notes app, and paste it into Restore on any phone or browser to carry on there.</p>
        <label class="code-label" for="code-box">Your save code</label>
        <textarea id="code-box" class="code-box" rows="5" readonly spellcheck="false" autocomplete="off" autocapitalize="off" aria-describedby="code-help"></textarea>
        <div class="code-msg" role="status" aria-live="polite" data-msg></div>
        ${midNight ? '<div class="fineprint">The night you are playing now is not in the code yet: the game saves between nights.</div>' : ''}
        <div class="btn-row">
          <button class="btn primary" data-copy>Copy code</button>
          <button class="btn" data-back>Back</button>
        </div>`,
        { escape: onBack }
      );
      const box = screen.querySelector('#code-box');
      const msg = screen.querySelector('[data-msg]');
      box.value = code;
      keepKeysInBox(box);
      const selectAll = () => {
        box.focus({ preventScroll: true });
        box.select();
        box.setSelectionRange(0, box.value.length);
      };
      box.addEventListener('focus', selectAll);
      // Older browsers, and pages not on https, have no clipboard API: select the code
      // and try the old copy command, or ask the player to copy it by hand.
      const copyBySelecting = () => {
        selectAll();
        let copied = false;
        try {
          copied = document.execCommand('copy');
        } catch {
          copied = false;
        }
        msg.textContent = copied
          ? 'Copied. Paste it into your notes app or a message to yourself.'
          : 'The code is selected. Long-press it (or right-click) and choose Copy.';
      };
      on('[data-copy]', () => {
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(code).then(
            () => (msg.textContent = 'Copied. Paste it into your notes app or a message to yourself.'),
            copyBySelecting
          );
        } else copyBySelecting();
      });
      on('[data-back]', onBack);
    },

    /**
     * Paste a code, check it, confirm, then restore. `read` checks a code without
     * changing anything; only `onRestore` writes, and only after the player says yes.
     */
    restore({ read, describe, current, midNight, onRestore, onDone, onBack }) {
      let pasted = '';

      const pasteScreen = () => {
        show(
          `<h2>Restore</h2>
          <p class="code-help" id="code-help">Paste a save code from Back up. It replaces the progress saved in this browser.</p>
          <label class="code-label" for="code-box">Save code</label>
          <textarea id="code-box" class="code-box" rows="5" spellcheck="false" autocomplete="off" autocapitalize="off" autocorrect="off" placeholder="OP1:..." aria-describedby="code-help code-error"></textarea>
          <div class="code-msg error" id="code-error" role="alert" data-msg></div>
          <div class="btn-row">
            <button class="btn primary" data-check>Restore</button>
            <button class="btn" data-back>Back</button>
          </div>`,
          { escape: onBack }
        );
        const box = screen.querySelector('#code-box');
        const msg = screen.querySelector('[data-msg]');
        box.value = pasted;
        keepKeysInBox(box);
        // With a mouse and keyboard, start in the box. On a phone, wait for a tap so the
        // keyboard doesn't jump up over the screen.
        if (window.matchMedia?.('(pointer: fine)').matches) box.focus({ preventScroll: true });
        box.addEventListener('input', () => (msg.textContent = ''));
        on('[data-check]', () => {
          pasted = box.value;
          const result = read(pasted);
          if (result.ok) confirmScreen(result.save);
          else msg.textContent = result.message;
        });
        on('[data-back]', onBack);
      };

      const confirmScreen = (save) => {
        show(
          `<h2>Replace your progress?</h2>
          <dl class="code-compare">
            <dt>In this browser now</dt><dd>${esc(describe(current))}</dd>
            <dt>In the code</dt><dd>${esc(describe(save))}</dd>
          </dl>
          <p class="code-help">This can't be undone.${midNight ? ' The night you are playing now will end.' : ''}</p>
          <div class="btn-row">
            <button class="btn primary" data-yes>Replace my progress</button>
            <button class="btn" data-no>Cancel</button>
          </div>`,
          { escape: pasteScreen }
        );
        // Start on Cancel, so a stray Enter can't wipe anything.
        screen.querySelector('[data-no]').focus({ preventScroll: true });
        on('[data-no]', pasteScreen);
        on('[data-yes]', () => {
          const stored = onRestore(save);
          show(
            `<h2>Progress restored</h2>
            <p class="code-help">${esc(describe(save))}.</p>
            ${stored ? '' : '<p class="code-help warn">This browser is blocking saves, so it will forget this when the page closes. Keep your code.</p>'}
            <div class="btn-row"><button class="btn primary" data-done>Continue</button></div>`,
            { escape: onDone }
          );
          on('[data-done]', onDone);
        });
      };

      pasteScreen();
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
          <label for="s-flicker">Reduced flicker and motion</label>
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
          ${state.mastDuty ? `<div class="stat"><div class="n">${state.mastInspected ? 'Yes' : 'No'}</div><div class="l">north mast inspected</div></div>` : ''}
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
      const outcome = OUTCOMES[state.outcome] || OUTCOMES.frozen;
      show(
        `<h2>${formatClock(state.minute)} · Night ${state.night}</h2>
        <p style="font-family: var(--font-read); font-size: 1.25em; line-height: 1.5">${esc(outcome.text)}</p>
        <div class="fineprint">${esc(outcome.short)} Retry starts this night again from 18:00 with the same supplies.</div>
        <div class="btn-row">
          <button class="btn primary" data-retry>Retry night ${state.night}</button>
          <button class="btn" data-quit>Quit to title</button>
        </div>`,
        { solid: true }
      );
      on('[data-retry]', onRetry);
      on('[data-quit]', onQuit);
    },

    /**
     * One of the campaign's endings, then the credits.
     * @param {{ id: 'relief' | 'record' | 'answer', log?: string, onTitle: () => void }} options
     */
    ending({ id, log, onTitle }) {
      const e = ENDINGS[id] || ENDINGS.relief;
      const logHtml = log
        ? `<div class="ending-log"><div class="meta">${esc(ENDINGS.answer.logTitle)}</div>${esc(log)}</div>`
        : '';
      show(
        `<div class="ending">
          <h2>${esc(e.title)}</h2>
          ${e.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}
          ${logHtml}
          <div class="credits">${creditsHtml()}</div>
          <div class="btn-row"><button class="btn primary" data-title>Back to title</button></div>
        </div>`,
        { solid: id !== 'answer', white: id === 'answer' }
      );
      on('[data-title]', onTitle);
    },
  };
  return menus;
}
