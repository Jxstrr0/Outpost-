// What each interactable says and does. Game state changes go through systems/.

import { CONFIG } from '../config.js';
import {
  startGenerator,
  stopGenerator,
  toggleLights,
  toggleHeater,
  resetBreaker,
  pickUpCan,
  pourCan,
  recordNote,
  openReading,
} from '../systems/index.js';

/** @returns {{ label: string, disabled?: boolean, hold?: boolean } | null} */
export function describeAction(entry, state) {
  switch (entry.kind) {
    case 'generator': {
      const gen = state.generator;
      if (state.carrying) {
        return state.fuel >= 99.5 ? { label: 'The tank is full', disabled: true } : { label: `Pour fuel (+${CONFIG.fuel.canAmount}%)` };
      }
      if (gen.cranking > 0) return { label: 'Cranking...', disabled: true };
      if (state.fuel <= 0) return { label: 'Tank empty: bring a jerry can', disabled: true };
      if (gen.stalled) return { label: 'Restart the generator' };
      if (gen.running) return { label: 'Stop the generator' };
      return { label: 'Start the generator' };
    }
    case 'jerryCan':
      if (state.carrying) return { label: 'Your hands are full', disabled: true };
      return { label: 'Pick up the jerry can' };
    case 'breaker':
      return state.breakerTripped ? { label: 'Reset the breaker' } : { label: 'Breaker panel: all circuits on', disabled: true };
    case 'lightSwitch':
      return { label: state.lightsOn ? 'Switch the lights off' : 'Switch the lights on' };
    case 'heater':
      if (!state.heaterOn) return { label: 'Turn the heater on' };
      return { label: state.heaterActive ? 'Turn the heater off' : 'Turn the heater off (no power)' };
    case 'metConsole':
      return { label: openReading(state) ? 'Log the weather reading' : 'Use the met console' };
    case 'terminal':
      return { label: 'Read the keeper log' };
    case 'note':
      return { label: 'Read the note' };
    case 'westDoor':
      return { label: 'West door' };
    case 'supplyDoor':
      return { label: 'Supply room' };
    case 'bunk':
      return { label: 'Your bunk' };
    case 'recorderShelf':
      return { label: 'Recorder shelf' };
    default:
      return null;
  }
}

/**
 * @param {{ kind: string, data: object }} entry
 * @param {{ state: object, ctx: object, ui: object }} game
 */
export function performAction(entry, game) {
  const { state, ctx, ui } = game;
  switch (entry.kind) {
    case 'generator':
      if (state.carrying) pourCan(state, ctx);
      else if (state.generator.running) stopGenerator(state, ctx);
      else startGenerator(state, ctx);
      break;
    case 'jerryCan':
      pickUpCan(state, ctx, entry.data.canId);
      break;
    case 'breaker':
      resetBreaker(state, ctx);
      break;
    case 'lightSwitch':
      toggleLights(state, ctx);
      break;
    case 'heater':
      toggleHeater(state, ctx);
      break;
    case 'metConsole':
      ui.openPanel('console');
      break;
    case 'terminal':
      ui.openPanel('terminal');
      break;
    case 'note':
      recordNote(state, ctx, entry.data.noteId);
      ui.openPanel('note', { id: entry.data.noteId });
      break;
    case 'westDoor':
      ctx.events.emit('flavour', { text: 'Frozen into its frame. Minus thirty out there, and nothing worth going out for.' });
      break;
    case 'supplyDoor':
      ctx.events.emit('flavour', { text: 'Supply room. The lock has iced over.' });
      break;
    case 'bunk':
      ctx.events.emit('flavour', { text: 'No sleeping on shift.' });
      break;
    case 'recorderShelf':
      ctx.events.emit('flavour', { text: 'An empty shelf, and a clean rectangle in the dust where a recorder sat.' });
      break;
  }
}
