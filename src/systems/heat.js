import { CONFIG } from '../config.js';

const H = CONFIG.heat;

/** Inside temperature drifts toward the heater's target or the cold outside. */
export function updateHeat(state, dt, { events }) {
  const heating = state.heaterActive;
  const target = heating ? H.heaterTarget : H.coldTarget;
  const rate = heating ? H.heatingRate : H.coolingRate * (state.windowCracked ? H.crackCooling : 1);
  const k = 1 - Math.pow(1 - rate, dt);
  state.temp = Math.min(H.max, Math.max(H.min, state.temp + (target - state.temp) * k));
  state.lowestTemp = Math.min(state.lowestTemp, state.temp);

  if (state.temp < H.freezeBelow) {
    state.freezeMinutes += dt;
  } else {
    state.freezeMinutes = Math.max(0, state.freezeMinutes - H.freezeRecoveryRate * dt);
  }

  if (state.freezeMinutes >= H.freezeMinutes && !state.outcome) {
    state.outcome = 'frozen';
    events.emit('night:lost', { night: state.night, reason: 'frozen' });
  }
}
