// Scripted moments: one per night, fired from the night's JSON at a set time.
// This module only listens to the clock and announces events; it changes no game state.

import { parseClock } from '../core/clock.js';

export const SCRIPTED_EVENTS = ['knocks', 'roofSteps', 'anomaly'];

/**
 * @param {object} events - the event bus
 * @param {object} night - night definition
 * @returns {() => void} detach
 */
export function attachScripted(events, night) {
  const pending = (night.scripted || []).map((s) => ({ at: parseClock(s.time), event: s.event, fired: false }));
  return events.on('time:minute', ({ minute }) => {
    for (const s of pending) {
      if (!s.fired && minute >= s.at) {
        s.fired = true;
        events.emit(`scripted:${s.event}`);
      }
    }
  });
}
