// Scripted moments: one per night, fired from the night's JSON at a set time, or when
// something happens: `{ "on": "mast:inspected", "event": "footprints" }`.
// This module only listens and announces events; it changes no game state.

import { parseClock } from '../core/clock.js';

export const SCRIPTED_EVENTS = ['knocks', 'roofSteps', 'anomaly', 'radioEcho', 'footprints'];

/**
 * @param {object} events - the event bus
 * @param {object} night - night definition
 * @returns {() => void} detach
 */
export function attachScripted(events, night) {
  const timed = (night.scripted || []).filter((s) => s.time).map((s) => ({ at: parseClock(s.time), event: s.event, fired: false }));
  const offs = [
    events.on('time:minute', ({ minute }) => {
      for (const s of timed) {
        if (!s.fired && minute >= s.at) {
          s.fired = true;
          events.emit(`scripted:${s.event}`);
        }
      }
    }),
  ];
  for (const s of (night.scripted || []).filter((e) => e.on)) {
    let fired = false;
    offs.push(
      events.on(s.on, () => {
        if (fired) return;
        fired = true;
        events.emit(`scripted:${s.event}`);
      })
    );
  }
  return () => offs.forEach((off) => off());
}
