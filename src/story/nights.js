// Night definitions and story text, loaded from JSON in ./data.

import { CONFIG } from '../config.js';
import nightsIndex from './data/nights.json';
import night1 from './data/night1.json';
import night2 from './data/night2.json';
import night3 from './data/night3.json';
import night4 from './data/night4.json';
import night5 from './data/night5.json';
import logs from './data/logs.json';
import notes from './data/notes.json';
import supplies from './data/supplies.json';

const NIGHT_FILES = { night1, night2, night3, night4, night5 };

export const NIGHTS = nightsIndex.order.map((key) => NIGHT_FILES[key]);
export const LOGS = logs;
export const NOTES = notes;
export const SUPPLIES = supplies;
export const LAST_NIGHT = NIGHTS.length;

export function getNight(number) {
  return NIGHTS.find((n) => n.night === number) || NIGHTS[0];
}

/**
 * Turn the supply drop chosen before a night into starting extras.
 * @param {string[]} choices
 */
export function applySupplies(choices = []) {
  const S = CONFIG.supplies;
  const result = { bonusCans: 0, inventory: { fuses: 0, food: 0, batteries: 0 } };
  for (const id of choices) {
    if (id === 'fuel') result.bonusCans += S.fuelCansPerPick;
    if (id === 'fuses') result.inventory.fuses += S.fusesPerPick;
    if (id === 'food') result.inventory.food += S.foodPerPick;
    if (id === 'battery') result.inventory.batteries += S.batteriesPerPick;
  }
  return result;
}
