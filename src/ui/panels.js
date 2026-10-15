// Full-screen reading panels: met console, keeper terminal, notes.
// Opening a panel pauses the game, so story never competes with survival.

import { formatClock } from '../core/clock.js';
import { openReading, nextUpcomingReading, logReading, chooseReply } from '../systems/index.js';
import { LOGS, NOTES, NIGHTS, TAPES } from '../story/nights.js';
import { CALLS, visibleLines } from '../story/radio.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function corrupt(text) {
  const glyphs = '░▒▓█ ';
  let out = '';
  for (let i = 0; i < Math.min(text.length, 150); i++) out += text[i] === ' ' ? ' ' : glyphs[(i * 7 + text.length) % 5];
  return out;
}

/**
 * @param {HTMLElement} root
 * @param {{ getGame: () => object, getSave: () => object, onClose: () => void }} hooks
 */
export function createPanels(root, hooks) {
  const screen = document.createElement('div');
  screen.className = 'screen hidden';
  root.appendChild(screen);
  let current = null;
  const seenLogs = new Set();

  function frame(cls, title, body) {
    screen.innerHTML = `
      <div class="panel ${cls}" role="dialog" aria-label="${esc(title)}">
        <div class="panel-head"><span>${esc(title)}</span><button class="close" data-close>Close</button></div>
        <div class="panel-body">${body}</div>
      </div>`;
    screen.querySelector('[data-close]').addEventListener('click', () => panels.close());
  }

  function renderConsole(message = '') {
    const { state, ctx } = hooks.getGame();
    const open = openReading(state);
    const latest = open || [...state.readings].reverse().find((r) => r.values);
    let body = '';
    if (!state.consolesPowered) {
      body += `<p>NO MAIN POWER.</p><p>Reset the breaker or get the generator running, then come back.</p>`;
    } else if (latest?.values) {
      const v = latest.values;
      const diff = v.pressureNorth - v.pressureSouth;
      body += `<div>${open ? `READING DUE ${formatClock(open.due)}. LOG BY ${formatClock(open.closes)}` : `LAST READING ${formatClock(latest.due)}`}</div>
        <table class="readings-table">
          <tr><td>Outside temperature</td><td>${v.outsideTemp.toFixed(1)} °C</td></tr>
          <tr><td>Wind</td><td>${v.windKmh} km/h ${v.windDir}</td></tr>
          <tr><td>Visibility</td><td>${v.visibilityM} m</td></tr>
          <tr><td>Pressure, south mast</td><td>${v.pressureSouth.toFixed(1)} hPa</td></tr>
          <tr><td>Pressure, north mast</td><td>${v.pressureNorth.toFixed(1)} hPa</td></tr>
          <tr><td>North minus south</td><td class="${Math.abs(diff) > 3 ? 'warn' : ''}">${diff >= 0 ? '+' : ''}${diff.toFixed(1)} hPa</td></tr>
        </table>`;
      if (open) body += `<button class="action" data-log>Log reading</button>`;
    } else {
      body += `<p>No readings yet tonight.</p>`;
    }
    if (!open && state.consolesPowered) {
      const next = nextUpcomingReading(state);
      body += `<p>${next ? `Next reading due at ${formatClock(next.due)}.` : 'No more readings tonight.'}</p>`;
    }
    if (message) body += `<p>${esc(message)}</p>`;
    body += `<div class="schedule">${state.readings
      .map((r) => `<span class="${r.status}">${formatClock(r.due)}${r.status === 'logged' ? ' ✓' : ''}</span>`)
      .join('')}</div>`;
    frame('console', 'Met console · Kestrel-4', body);
    screen.querySelector('[data-log]')?.addEventListener('click', () => {
      const id = logReading(state, ctx);
      renderConsole(id ? 'Logged. A keeper log entry has been recovered at the terminal.' : 'Logged.');
    });
  }

  function renderTerminal() {
    const { state, night } = hooks.getGame();
    const save = hooks.getSave();
    const entry = (id, recovered) => {
      const log = LOGS[id];
      if (!log) return '';
      const fresh = recovered && !seenLogs.has(id);
      return `<div class="log-entry ${recovered ? '' : 'corrupt'} ${fresh ? 'fresh' : ''}">
        <div class="meta">${recovered ? `${esc(log.title)} · ${esc(log.author)}` : 'ENTRY CORRUPTED · LOG A READING TO RECOVER'}</div>
        <div class="text">${recovered ? esc(log.text) : corrupt(log.text)}</div>
      </div>`;
    };

    let body = '';
    const earlier = NIGHTS.filter((n) => n.night < night.night).flatMap((n) => n.logs.filter((id) => save.logsFound.includes(id)));
    if (earlier.length) {
      body += `<div class="log-entry"><div class="meta">EARLIER ENTRIES</div></div>`;
      body += earlier.map((id) => entry(id, true)).join('');
      body += `<div class="log-entry"><div class="meta">TONIGHT</div></div>`;
    }
    body += night.logs.map((id) => entry(id, state.logsRecovered.includes(id))).join('');

    const notes = [...new Set([...save.notesFound, ...state.notesFound])].filter((id) => NOTES[id]);
    if (notes.length) {
      body += `<div class="log-entry"><div class="meta">NOTES YOU'VE FOUND</div></div>`;
      body += notes.map((id) => `<div class="log-entry"><div class="meta">${esc(NOTES[id].title)}</div><div class="text">${esc(NOTES[id].text)}</div></div>`).join('');
    }
    const tapes = [...new Set([...(save.tapesFound || []), ...state.tapesFound])].filter((id) => TAPES[id]);
    if (tapes.length) {
      body += `<div class="log-entry"><div class="meta">TAPES YOU'VE PLAYED</div></div>`;
      body += tapes
        .map((id) => `<div class="log-entry"><div class="meta">${esc(TAPES[id].title)}</div><div class="text">${TAPES[id].lines.filter((l) => l.who).map((l) => `${esc(l.who)}: ${esc(l.text)}`).join('<br>')}</div></div>`)
        .join('');
    }
    frame('terminal', 'Keeper log · R. Vance', body);
    for (const id of state.logsRecovered) seenLogs.add(id);
  }

  /** A radio call: Dispatch speaks, the player picks a reply, Dispatch answers. */
  function renderRadio(id) {
    const { state, ctx } = hooks.getGame();
    const script = CALLS[id];
    const call = state.radio.calls.find((c) => c.id === id);
    if (!script || !call) {
      frame('radio', 'Radio', '<p>Static.</p>');
      return;
    }
    const tags = [...new Set([...(hooks.getSave().radioTags || []), ...state.radio.tags])];
    const say = (l) => `<div class="radio-line"><span class="who">${esc(l.who)}</span> ${esc(l.text)}</div>`;
    let body = visibleLines(script.lines, tags).map(say).join('');
    if (call.choice === null) {
      body += `<div class="radio-replies">${script.replies
        .map((r, i) => `<button class="action reply" data-reply="${i}">${esc(r.text)}</button>`)
        .join('')}</div>`;
    } else {
      const reply = script.replies[call.choice];
      body += `<div class="radio-line you"><span class="who">You</span> ${esc(reply.text)}</div>`;
      body += visibleLines(reply.answer, tags).map(say).join('');
      body += `<div class="radio-end">The channel goes back to static.</div>`;
    }
    frame('radio', 'Radio · channel 4', body);
    screen.querySelectorAll('[data-reply]').forEach((b) =>
      b.addEventListener('click', () => {
        const index = Number(b.dataset.reply);
        chooseReply(state, ctx, id, index, script.replies[index]);
        renderRadio(id);
      })
    );
  }

  /** A recorder tape, written out as a transcript. */
  function renderTape(id) {
    const tape = TAPES[id];
    const lines = (tape?.lines || [])
      .map((l) => (l.who ? `<div class="radio-line"><span class="who">${esc(l.who)}</span> ${esc(l.text)}</div>` : `<div class="radio-end">${esc(l.text)}</div>`))
      .join('');
    frame('tape', tape?.title || 'Tape', lines);
  }

  function renderNote(id) {
    const note = NOTES[id];
    frame('paper', note?.title || 'Note', esc(note?.text || ''));
  }

  const panels = {
    get isOpen() {
      return current !== null;
    },
    open(kind, data = {}) {
      current = kind;
      if (kind === 'console') renderConsole();
      if (kind === 'terminal') renderTerminal();
      if (kind === 'note') renderNote(data.id);
      if (kind === 'tape') renderTape(data.id);
      if (kind === 'radio') renderRadio(data.id);
      screen.classList.remove('hidden');
      screen.querySelector('[data-close]')?.focus({ preventScroll: true });
    },
    close() {
      if (current === null) return;
      current = null;
      screen.classList.add('hidden');
      screen.innerHTML = '';
      hooks.onClose();
    },
    resetNight() {
      seenLogs.clear();
    },
  };

  screen.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' || e.code === 'KeyE') {
      e.preventDefault();
      panels.close();
    }
  });

  return panels;
}
