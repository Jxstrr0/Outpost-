// Fixing the faults that need a part: a spare fuse for the heater, seal tape for the window,
// the heat gun for a frozen fuel line. Parts come from the supply room shelves and go in
// the player's pockets; the jerry can is the only thing that takes both hands.

import { CONFIG } from '../config.js';

const S = CONFIG.sanity;

/**
 * What the supply shelves offer right now, most urgent first, or null if nothing is needed.
 * @returns {{ item: 'fuse' | 'tape' | 'heatGun' | 'ration', label: string } | null}
 */
export function nextSupply(state) {
  const { inventory: inv, pocket } = state;
  if (state.heaterFuseBlown && !pocket.fuse && inv.fuses > 0) return { item: 'fuse', label: `Take a spare fuse (${inv.fuses} left)` };
  if (state.fuelLineFrozen && !pocket.heatGun) return { item: 'heatGun', label: 'Take the heat gun' };
  if (state.windowCracked && !pocket.tape && inv.tape > 0) return { item: 'tape', label: `Take a roll of seal tape (${inv.tape} left)` };
  if (state.sanityEnabled && inv.food > 0 && state.sanity < 100) return { item: 'ration', label: `Eat a ration (${inv.food} left)` };
  return null;
}

/** Take whatever nextSupply() offers. */
export function takeSupply(state, { events }) {
  const offer = nextSupply(state);
  if (!offer) return null;
  const inv = state.inventory;
  if (offer.item === 'fuse') {
    inv.fuses--;
    state.pocket.fuse = true;
  } else if (offer.item === 'tape') {
    inv.tape--;
    state.pocket.tape = true;
  } else if (offer.item === 'heatGun') {
    state.pocket.heatGun = true;
  } else if (offer.item === 'ration') {
    inv.food--;
    state.sanity = Math.min(100, state.sanity + S.rationBonus);
    state.fedMinutes = S.rationMinutes;
  }
  events.emit('supply:taken', { item: offer.item });
  return offer.item;
}

export function replaceFuse(state, { events }) {
  if (!state.heaterFuseBlown || !state.pocket.fuse) return false;
  state.pocket.fuse = false;
  state.heaterFuseBlown = false;
  events.emit('heater:fixed');
  return true;
}

export function sealWindow(state, { events }) {
  if (!state.windowCracked || !state.pocket.tape) return false;
  state.pocket.tape = false;
  state.windowCracked = false;
  events.emit('window:sealed');
  return true;
}

/** The heat gun stays in your pocket afterwards; the line can freeze again. */
export function thawFuelLine(state, { events }) {
  if (!state.fuelLineFrozen || !state.pocket.heatGun) return false;
  state.fuelLineFrozen = false;
  events.emit('fuelLine:thawed');
  return true;
}

/** Debug: fill your pockets. */
export function fillPockets(state) {
  state.pocket.fuse = true;
  state.pocket.tape = true;
  state.pocket.heatGun = true;
}
