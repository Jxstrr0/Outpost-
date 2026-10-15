import { CONFIG } from '../config.js';

const P = CONFIG.power;

/** Battery charge and drain, and which circuits are live this tick. */
export function updatePower(state, dt, { events, rng }) {
  updateCranking(state, dt, { events, rng });

  const circuitLive = !state.breakerTripped && state.power > 0;
  state.lightsLit = state.lightsOn && circuitLive;
  state.heaterActive = state.heaterOn && circuitLive && !state.heaterFuseBlown;
  state.consolesPowered = circuitLive;

  let delta = -P.baseLoad;
  if (state.lightsLit) delta -= P.lightsLoad;
  if (state.heaterActive) delta -= P.heaterLoad;
  if (state.generator.running) delta += P.generatorCharge * (state.fuelLineFrozen ? P.frozenLineCharge : 1);

  const before = state.power;
  state.power = Math.min(100, Math.max(0, state.power + delta * dt));
  if (before > 0 && state.power <= 0) events.emit('power:depleted');
  if (before <= 0 && state.power > 0) events.emit('power:restored');
}

/** A restart attempt resolves after a short crank. */
function updateCranking(state, dt, { events, rng }) {
  const gen = state.generator;
  if (gen.cranking <= 0) return;
  gen.cranking -= dt;
  if (gen.cranking > 0) return;
  gen.cranking = 0;
  if (state.fuel <= 0) {
    events.emit('generator:noFuel');
    return;
  }
  if (gen.stalled && rng.chance(CONFIG.failures.restartFailChance)) {
    events.emit('generator:restartFailed');
    return;
  }
  gen.running = true;
  gen.stalled = false;
  events.emit('generator:started');
}

export function startGenerator(state, { events }) {
  const gen = state.generator;
  if (gen.running || gen.cranking > 0) return false;
  if (state.fuel <= 0) {
    events.emit('generator:noFuel');
    return false;
  }
  gen.cranking = CONFIG.failures.crankMinutes;
  events.emit('generator:cranking', { stalled: gen.stalled });
  return true;
}

export function stopGenerator(state, { events }) {
  if (!state.generator.running) return false;
  state.generator.running = false;
  events.emit('generator:stopped');
  return true;
}

export function toggleLights(state, { events }) {
  state.lightsOn = !state.lightsOn;
  events.emit('lights:toggled', { on: state.lightsOn });
}

export function toggleHeater(state, { events }) {
  state.heaterOn = !state.heaterOn;
  events.emit('heater:toggled', { on: state.heaterOn });
}

export function resetBreaker(state, { events }) {
  if (!state.breakerTripped) return false;
  state.breakerTripped = false;
  events.emit('breaker:reset');
  return true;
}
