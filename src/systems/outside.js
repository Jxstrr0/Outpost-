// The world outside (night 3 on): whiteout gusts, the player's body heat while they're out
// in it, the mast inspection duty and the ice that builds on the mast's antenna.

import { CONFIG } from '../config.js';

const B = CONFIG.body;
const W = CONFIG.weather;

/** Gusts come and go all night. They only matter to someone standing outside. */
export function updateWeather(state, dt, { events, rng, night }) {
  const gust = state.gust;
  const every = night?.weather?.gustEvery ?? W.gustEvery;
  if (gust.active) {
    gust.minutesLeft -= dt;
    if (gust.minutesLeft <= 0) {
      gust.active = false;
      gust.next = state.minute + rng.range(every[0], every[1]);
      events.emit('gust:end');
    }
  } else if (state.minute >= gust.next) {
    startGust(state, { events });
  }
}

export function startGust(state, { events }) {
  if (state.gust.active) return false;
  state.gust.active = true;
  state.gust.minutesLeft = W.gustMinutes;
  events.emit('gust:start', { outside: state.room === 'outside' });
  return true;
}

/** Body heat drains outside and comes back indoors. At zero the night is lost. */
export function updateBody(state, dt, { events }) {
  if (state.room === 'outside') {
    const loss = B.outsideLoss * (state.gust.active ? B.gustFactor : 1);
    const before = state.bodyHeat;
    state.bodyHeat = Math.max(0, state.bodyHeat - loss * dt);
    if (before >= B.dangerBelow && state.bodyHeat < B.dangerBelow) events.emit('body:cold');
    if (state.bodyHeat <= 0 && !state.outcome) {
      state.outcome = 'exposure';
      events.emit('night:lost', { night: state.night, reason: 'exposure' });
    }
  } else if (state.bodyHeat < 100) {
    const gain = state.temp >= B.warmAbove ? B.warmGain : B.coldGain;
    state.bodyHeat = Math.min(100, state.bodyHeat + gain * dt);
  }
}

/** Check the instruments on the north mast: once a night, nights 3 on. */
export function inspectMast(state, { events }) {
  if (state.mastInspected) return false;
  state.mastInspected = true;
  events.emit('mast:inspected', { night: state.night });
  return true;
}

/** Knock the ice off the antenna. */
export function clearAntenna(state, { events }) {
  if (!state.antennaIced) return false;
  state.antennaIced = false;
  events.emit('antenna:cleared');
  return true;
}
