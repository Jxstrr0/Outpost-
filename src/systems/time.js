import { CONFIG } from '../config.js';

/** Advance the clock and announce each new game minute and hour. */
export function updateTime(state, dt, { events }) {
  const before = Math.floor(state.minute);
  state.minute += dt;
  state.tick += 1;
  const after = Math.floor(state.minute);
  for (let m = before + 1; m <= after; m++) {
    events.emit('time:minute', { minute: m });
    if (m % 60 === 0) events.emit('time:hour', { minute: m });
  }
  if (state.minute >= CONFIG.time.nightEnd && !state.outcome) {
    state.minute = CONFIG.time.nightEnd;
    state.outcome = 'survived';
    events.emit('night:survived', { night: state.night });
  }
}

/** Jump the clock forward without simulating resources (debug only). */
export function jumpTo(state, minute) {
  state.minute = Math.min(Math.max(minute, state.minute), CONFIG.time.nightEnd - 1);
}
