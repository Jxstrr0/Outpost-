// The one game state object. Every number the simulation uses lives here.
// Only modules in src/systems/ write to it; everything else reads.

import { CONFIG } from '../config.js';
import { parseClock } from './clock.js';
import { doorsForNight } from '../systems/doors.js';
import { callsForNight } from '../systems/radio.js';

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
  const extra = options.inventory || {};
  const stock = { ...CONFIG.stock, ...(night.stock || {}) };
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
    fedMinutes: 0, // a ration slows sanity loss while this counts down

    generator: { running: true, stalled: false, cranking: 0 },
    breakerTripped: false,
    heaterFuseBlown: false,
    fuelLineFrozen: false,
    windowCracked: false,
    lightsOn: true,
    heaterOn: true,
    // Derived each tick by the power system:
    lightsLit: true,
    heaterActive: true,
    consolesPowered: true,

    doors: doorsForNight(night),
    flashlight: { owned: !!night.flashlight, on: false, battery: 100 },

    // Cans in the generator room, then any left in the fuel shed outside (night 3 on).
    jerryCans: [
      ...Array.from({ length: cans }, (_, i) => ({ id: `can-${i}`, state: 'full', where: 'generator' })),
      ...Array.from({ length: night.shedCans ?? 0 }, (_, i) => ({ id: `shed-${i}`, state: 'full', where: 'shed' })),
    ],
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

    // The supply room's stock, and what the player has in their pockets.
    inventory: {
      fuses: stock.spareFuses + (extra.fuses || 0),
      food: stock.rations + (extra.food || 0),
      tape: stock.tape + (extra.tape || 0),
      batteries: extra.batteries || 0,
    },
    pocket: { fuse: false, tape: false, heatGun: false },
    room: 'main', // where the player is standing; written by systems/player.js

    radio: { calls: callsForNight(night), tags: [], said: [] },

    // Outside (night 3 on)
    bodyHeat: 100,
    gust: { active: false, minutesLeft: 0, next: CONFIG.time.nightStart + CONFIG.weather.gustEvery[0] },
    mastDuty: !!night.mastInspection, // tonight the north mast needs inspecting
    mastInspected: false,
    antennaIced: false,

    freezeMinutes: 0,
    lowestTemp: start.temp,
    outcome: null, // null while playing, then 'survived' | 'frozen' | 'breakdown' | 'exposure'
    flags: {},
  };
}
