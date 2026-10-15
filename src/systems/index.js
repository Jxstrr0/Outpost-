// One fixed simulation step, in a fixed order. Systems never touch Three.js.

import { CONFIG } from '../config.js';
import { updateTime } from './time.js';
import { updateFailures } from './failures.js';
import { updatePower } from './power.js';
import { updateFuel } from './fuel.js';
import { updateHeat } from './heat.js';
import { updateDuties } from './duties.js';
import { updateSanity } from './sanity.js';

/** Game minutes simulated by one fixed tick. */
export const TICK_MINUTES = CONFIG.time.gameMinutesPerSecond / CONFIG.time.ticksPerSecond;

/**
 * @param {object} state
 * @param {{ events: object, rng: object, night: object }} ctx
 */
export function stepSimulation(state, ctx, dt = TICK_MINUTES) {
  if (state.outcome) return;
  updateTime(state, dt, ctx);
  if (state.outcome) return;
  updateFailures(state, dt, ctx);
  updatePower(state, dt, ctx);
  updateFuel(state, dt, ctx);
  updateHeat(state, dt, ctx);
  updateDuties(state, dt, ctx);
  updateSanity(state, dt, ctx);
}

/** Debug: set a meter directly. */
export function setMeter(state, key, value) {
  if (key === 'power') state.power = Math.min(100, Math.max(0, value));
  if (key === 'fuel') state.fuel = Math.min(100, Math.max(0, value));
  if (key === 'temp') {
    state.temp = Math.min(CONFIG.heat.max, Math.max(CONFIG.heat.min, value));
    state.lowestTemp = Math.min(state.lowestTemp, state.temp);
  }
}

/** Debug: end the night now. */
export function forceOutcome(state, { events }, outcome) {
  if (state.outcome) return;
  state.outcome = outcome;
  if (outcome === 'survived') events.emit('night:survived', { night: state.night });
  else events.emit('night:lost', { night: state.night, reason: outcome });
}

export * from './power.js';
export * from './fuel.js';
export * from './failures.js';
export * from './duties.js';
export * from './doors.js';
export { jumpTo } from './time.js';
