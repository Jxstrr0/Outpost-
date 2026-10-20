// Onboarding hints: short how-to lines that appear when they become useful.
// The hints themselves live in the night's JSON (src/story/data/night1.json).
// Each one shows once, ever, and the Hints setting turns them all off.

import { CONFIG } from '../config.js';

/**
 * @param {HTMLElement} root
 * @param {object} events
 * @param {{ getSettings: () => object, isTouch: () => boolean, getSeen: () => string[], markSeen: (id: string) => void }} api
 */
export function createHints(root, events, api) {
  const box = document.createElement('div');
  box.className = 'hint-banner';
  box.setAttribute('role', 'status');
  box.setAttribute('aria-live', 'polite');
  root.appendChild(box);

  const H = CONFIG.hints;
  let hints = [];
  let unsubscribe = [];
  let delayed = []; // { hint, left } waiting on a start delay
  let queue = [];
  let active = null; // { hint, left }
  let gap = 0;
  let shownThisRun = new Set();

  const textFor = (h) => (api.isTouch() && h.touch ? h.touch : h.text);
  const eligible = (h) =>
    api.getSettings().hints !== false &&
    !api.getSeen().includes(h.id) &&
    !shownThisRun.has(h.id) &&
    !queue.includes(h) &&
    active?.hint !== h;

  function offer(h) {
    if (!eligible(h)) return;
    if (!active && gap <= 0) show(h);
    else if (queue.length < H.maxQueued) queue.push(h);
  }

  function show(h) {
    active = { hint: h, left: h.seconds ?? H.seconds };
    shownThisRun.add(h.id);
    api.markSeen(h.id);
    box.textContent = textFor(h);
  }

  function hide() {
    active = null;
    gap = H.gapSeconds;
  }

  function clear() {
    for (const off of unsubscribe) off();
    unsubscribe = [];
    delayed = [];
    queue = [];
    active = null;
    gap = 0;
    box.classList.remove('on');
  }

  return {
    /** Start a night's hints. An empty or missing list means no hints this night. */
    begin(list = []) {
      clear();
      hints = list;
      shownThisRun = new Set();
      for (const h of hints) {
        if (h.on === 'start') delayed.push({ hint: h, left: h.after ?? 0 });
        else unsubscribe.push(events.on(h.on, () => offer(h)));
      }
    },

    /** Called every frame; only counts down while the player is actually playing. */
    update(dt, playing) {
      box.classList.toggle('on', playing && !!active);
      if (!playing) return;
      for (const d of delayed) d.left -= dt;
      const ready = delayed.filter((d) => d.left <= 0);
      if (ready.length) {
        delayed = delayed.filter((d) => d.left > 0);
        for (const d of ready) offer(d.hint);
      }
      if (active) {
        active.left -= dt;
        if (active.left <= 0) hide();
      } else if (gap > 0) {
        gap -= dt;
      } else if (queue.length) {
        const next = queue.shift();
        if (api.getSettings().hints !== false) show(next);
        else queue = [];
      }
    },

    /** Remove whatever is on screen (menus, pause, end of night). */
    stop: clear,

    /** Debug: forget which hints have been seen. */
    reset() {
      shownThisRun = new Set();
    },
  };
}
