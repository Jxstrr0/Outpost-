import { CONFIG } from '../config.js';

const H = CONFIG.heat;

/** Inside temperature drifts toward the heater's target or the cold outside. */
export function updateHeat(state, dt, { events }) {
  const heating = state.heaterActive;
  const draft = doorDraft(state);
  const target = heating ? H.heaterTarget : H.coldTarget;
  const rate = heating ? H.heatingRate : H.coolingRate * (state.windowCracked ? H.crackCooling : 1) * draft;
  const k = 1 - Math.pow(1 - rate, dt);
  let temp = state.temp + (target - state.temp) * k;
  // An open outer door bleeds heat even with the heater on.
  if (heating && draft > 1) {
    const leak = H.coolingRate * (draft - 1);
    temp += (H.coldTarget - temp) * (1 - Math.pow(1 - leak, dt));
  }
  state.temp = Math.min(H.max, Math.max(H.min, temp));
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

/** How much faster the station cools with the outer airlock door open. */
export function doorDraft(state) {
  const d = state.doors || {};
  if (d.airlockOuter !== 'open') return 1;
  return d.airlockInner === 'open' || d.airlockSide === 'open' ? H.throughDraftCooling : H.outerDoorCooling;
}
