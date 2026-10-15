import { CONFIG } from '../config.js';

/** The generator burns fuel while it runs and stops when the tank is dry. */
export function updateFuel(state, dt, { events }) {
  if (!state.generator.running) return;
  state.fuel = Math.max(0, state.fuel - CONFIG.fuel.burn * dt);
  if (state.fuel <= 0) {
    state.generator.running = false;
    events.emit('generator:outOfFuel');
  }
}

export function pickUpCan(state, { events }, canId) {
  if (state.carrying) return false;
  const can = state.jerryCans.find((c) => c.id === canId);
  if (!can || can.state !== 'full') return false;
  can.state = 'carried';
  state.carrying = can.id;
  events.emit('can:pickedUp', { id: can.id });
  return true;
}

export function pourCan(state, { events }) {
  if (!state.carrying) return false;
  const can = state.jerryCans.find((c) => c.id === state.carrying);
  can.state = 'empty';
  state.carrying = null;
  state.fuel = Math.min(100, state.fuel + CONFIG.fuel.canAmount);
  events.emit('generator:refueled', { id: can.id, fuel: state.fuel });
  return true;
}

export function fullCansLeft(state) {
  return state.jerryCans.filter((c) => c.state === 'full').length;
}
