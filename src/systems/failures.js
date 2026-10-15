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
}

export const FAILURE_IDS = ['generatorStall', 'breakerTrip'];

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
  return false;
}
