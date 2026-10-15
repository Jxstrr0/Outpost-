import { CONFIG } from '../config.js';

const F = CONFIG.failures;

/** Random failures, weighted per night by the night's "failures" table. */
export function updateFailures(state, dt, { events, rng, night }) {
  const weights = night?.failures || {};
  if (state.minute < CONFIG.time.nightStart + F.graceMinutes) return;

  const stallWeight = weights.generatorStall ?? 1;
  if (state.generator.running && rng.chance((dt / F.generatorStallEvery) * stallWeight)) {
    triggerFailure(state, { events }, 'generatorStall');
  }

  const tripWeight = weights.breakerTrip ?? 1;
  if (state.heaterActive && rng.chance((dt / F.breakerTripEvery) * tripWeight)) {
    triggerFailure(state, { events }, 'breakerTrip');
  }

  // Later faults happen only on nights that list them.
  const fuseWeight = weights.heaterFault ?? 0;
  if (state.heaterActive && rng.chance((dt / F.heaterFaultEvery) * fuseWeight)) {
    triggerFailure(state, { events }, 'heaterFault');
  }
  const lineWeight = weights.fuelLine ?? 0;
  if (state.generator.running && rng.chance((dt / F.fuelLineEvery) * lineWeight)) {
    triggerFailure(state, { events }, 'fuelLine');
  }
  const crackWeight = weights.windowCrack ?? 0;
  if (rng.chance((dt / F.windowCrackEvery) * crackWeight)) {
    triggerFailure(state, { events }, 'windowCrack');
  }
}

export const FAILURE_IDS = ['generatorStall', 'breakerTrip', 'heaterFault', 'fuelLine', 'windowCrack'];

/** Force a failure now. Used by random rolls and the debug panel. */
export function triggerFailure(state, { events }, id) {
  if (id === 'generatorStall') {
    if (!state.generator.running) return false;
    state.generator.running = false;
    state.generator.stalled = true;
    events.emit('generator:stalled');
    return true;
  }
  if (id === 'breakerTrip') {
    if (state.breakerTripped) return false;
    state.breakerTripped = true;
    events.emit('breaker:tripped');
    return true;
  }
  if (id === 'heaterFault') {
    if (state.heaterFuseBlown) return false;
    state.heaterFuseBlown = true;
    events.emit('heater:fault');
    return true;
  }
  if (id === 'fuelLine') {
    if (state.fuelLineFrozen) return false;
    state.fuelLineFrozen = true;
    events.emit('fuelLine:frozen');
    return true;
  }
  if (id === 'windowCrack') {
    if (state.windowCracked) return false;
    state.windowCracked = true;
    events.emit('window:cracked');
    return true;
  }
  return false;
}
