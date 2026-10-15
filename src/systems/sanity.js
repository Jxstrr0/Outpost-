// Sanity (night 3+). Light, warmth and doing the job keep it up; darkness, cold and the
// things that happen at night wear it down. Below a threshold the player starts hearing
// and seeing things that aren't there. At zero, the night is lost.

import { CONFIG } from '../config.js';

const S = CONFIG.sanity;

export const HALLUCINATIONS = ['knocks', 'roofSteps', 'whisper', 'fakeStall', 'fakeBreaker', 'fakeCall'];

/** Is the place the player is standing lit? */
export function playerInLight(state) {
  if (state.room === 'main') return state.lightsLit;
  if (state.room === 'outside' || state.room === 'bunk') return false; // Vance's room has no working light
  return state.power > 0; // the plant rooms are on their own circuit
}

export function updateSanity(state, dt, { events, rng }) {
  if (!state.sanityEnabled) return;
  const lit = playerInLight(state);
  let loss = 0;
  if (!lit) loss += S.darkLoss * (state.flashlight.on ? S.flashlightDarkFactor : 1);
  if (state.temp < 0) loss += S.coldLoss;
  if (state.fedMinutes > 0) {
    loss *= S.rationLossFactor;
    state.fedMinutes = Math.max(0, state.fedMinutes - dt);
  }
  let gain = 0;
  if (lit) gain += S.lightGain;
  if (state.temp >= 10) gain += S.warmGain;
  changeSanity(state, (gain - loss) * dt, { events });

  if (state.sanity < S.hallucinateBelow && !state.outcome && rng.chance(dt / S.hallucinationEvery)) {
    events.emit('sanity:hallucination', { kind: rng.pick(HALLUCINATIONS) });
  }
}

/** Add or remove sanity, and lose the night at zero. */
export function changeSanity(state, amount, { events }) {
  if (!state.sanityEnabled || state.outcome) return;
  const before = state.sanity;
  state.sanity = Math.min(100, Math.max(0, state.sanity + amount));
  if (before >= S.hallucinateBelow && state.sanity < S.hallucinateBelow) events.emit('sanity:low');
  if (state.sanity <= 0) {
    state.outcome = 'breakdown';
    events.emit('night:lost', { night: state.night, reason: 'breakdown' });
  }
}

/** A scripted moment shakes the player. */
export function sanityShock(state, ctx, event) {
  const hit = S.shocks[event];
  if (hit) changeSanity(state, -hit, ctx);
}
