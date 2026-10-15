// The flashlight (night 2+): its battery drains while it's on and recharges from
// station power while it's off. Recharging draws a little from the station battery.

import { CONFIG } from '../config.js';

const F = CONFIG.flashlight;

/** Drain rate per game minute, after any better cell from the supply drop. */
export function flashlightDrain(state) {
  return F.drainPerMinute * (state.inventory.batteries > 0 ? F.betterCellDrain : 1);
}

export function updateFlashlight(state, dt, { events }) {
  const torch = state.flashlight;
  if (!torch.owned) return;
  if (torch.on) {
    const before = torch.battery;
    torch.battery = Math.max(0, torch.battery - flashlightDrain(state) * dt);
    if (before > F.lowBelow && torch.battery <= F.lowBelow) events.emit('flashlight:low');
    if (torch.battery <= 0) {
      torch.on = false;
      events.emit('flashlight:dead');
    }
  } else if (state.power > 0 && torch.battery < 100) {
    torch.battery = Math.min(100, torch.battery + F.rechargePerMinute * dt);
    state.power = Math.max(0, state.power - F.chargeLoad * dt);
  }
}

/** Switch the flashlight on or off. A flat cell won't switch on. */
export function toggleFlashlight(state, { events }) {
  const torch = state.flashlight;
  if (!torch.owned) return false;
  if (torch.on) {
    torch.on = false;
    events.emit('flashlight:toggled', { on: false });
    return true;
  }
  if (torch.battery < F.minToSwitchOn) {
    events.emit('flashlight:flat');
    return false;
  }
  torch.on = true;
  events.emit('flashlight:toggled', { on: true });
  return true;
}

/** Debug: hand over a fully charged flashlight. */
export function giveFlashlight(state) {
  state.flashlight.owned = true;
  state.flashlight.battery = 100;
}
