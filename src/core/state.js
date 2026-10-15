// The one game state object. Every number the simulation uses lives here.
// Only modules in src/systems/ write to it; everything else reads.

import { CONFIG } from '../config.js';
import { parseClock } from './clock.js';
import { doorsForNight } from '../systems/doors.js';

/**
 * @typedef {'upcoming' | 'open' | 'logged' | 'missed'} ReadingStatus
 * @typedef {{ due: number, closes: number, status: ReadingStatus, anomaly: boolean, values: object | null }} Reading
 */

/**
 * Build a fresh state for one night.
 * @param {object} night - a night definition from src/story/data/nightN.json
 * @param {{ bonusCans?: number, inventory?: object, seed?: number }} [options]
 */
export function createState(night, options = {}) {
  const start = { ...CONFIG.start, ...(night.start || {}) };
  const cans = (night.jerryCans ?? 3) + (options.bonusCans || 0);
  return {
    night: night.night,
    seed: options.seed ?? 0,
    minute: CONFIG.time.nightStart,
    tick: 0,

    power: start.power,
    fuel: start.fuel,
    temp: start.temp,
    sanity: 100,
    sanityEnabled: (night.systems || []).includes('sanity'),

    generator: { running: true, stalled: false, cranking: 0 },
    breakerTripped: false,
    lightsOn: true,
    heaterOn: true,
    // Derived each tick by the power system:
    lightsLit: true,
    heaterActive: true,
    consolesPowered: true,

    doors: doorsForNight(night),

    jerryCans: Array.from({ length: cans }, (_, i) => ({ id: `can-${i}`, state: 'full' })),
    carrying: null, // id of a jerry can in hand, or null

    readings: (night.readings || []).map((r) => {
      const due = parseClock(r.time);
      return {
        due,
        closes: due + CONFIG.duties.readingWindow,
        status: 'upcoming',
        anomaly: !!r.anomaly,
        values: null,
      };
    }),
    logQueue: [...(night.logs || [])], // log ids recovered in order, one per logged reading
    logsRecovered: [],
    notesFound: [],

    inventory: { fuses: 0, food: 0, batteries: 0, ...(options.inventory || {}) },

    freezeMinutes: 0,
    lowestTemp: start.temp,
    outcome: null, // null while playing, then 'survived' | 'frozen'
    flags: {},
  };
}
