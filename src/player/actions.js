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
  useDoor,
  nextSupply,
  takeSupply,
  replaceFuse,
  sealWindow,
  thawFuelLine,
  ringingCall,
  openCall,
  answerCall,
  inspectMast,
  clearAntenna,
} from '../systems/index.js';

const R = CONFIG.repairs;
import DOORS from '../story/data/doors.json';

/** @returns {{ label: string, disabled?: boolean, hold?: boolean, holdSeconds?: number } | null} */
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
      if (state.fuelLineFrozen) {
        return state.pocket.heatGun
          ? { label: 'Hold to thaw the fuel line', hold: true, holdSeconds: R.thawSeconds }
          : { label: 'Fuel line frozen: fetch the heat gun', disabled: true };
      }
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
      if (state.heaterFuseBlown) {
        return state.pocket.fuse
          ? { label: 'Hold to replace the blown fuse', hold: true, holdSeconds: R.fuseSeconds }
          : { label: 'Fuse blown: spares in the supply room', disabled: true };
      }
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
    case 'door': {
      const id = entry.data.doorId;
      const name = DOORS[id]?.name ?? 'Door';
      const s = state.doors[id];
      if (s === 'locked') return { label: `${name}: locked` };
      return { label: s === 'open' ? `Close the door` : `Open: ${name}` };
    }
    case 'supplies':
      return { label: nextSupply(state)?.label ?? 'Check the supplies' };
    case 'radio':
      if (ringingCall(state)) return { label: 'Answer the radio' };
      if (openCall(state)) return { label: 'Back to the call' };
      return { label: 'Radio set' };
    case 'window':
      if (!state.windowCracked) return { label: 'North window', disabled: true };
      return state.pocket.tape
        ? { label: 'Hold to tape over the crack', hold: true, holdSeconds: R.tapeSeconds }
        : { label: 'Cracked: seal tape is in the supply room', disabled: true };
    case 'mast':
      if (state.antennaIced) return { label: 'Hold to knock the ice off the antenna', hold: true, holdSeconds: R.deiceSeconds };
      if (state.mastDuty && !state.mastInspected) {
        return { label: 'Hold to check the instruments', hold: true, holdSeconds: R.inspectSeconds };
      }
      return { label: 'North mast', disabled: !state.mastInspected };
    case 'westDoorOutside':
      return { label: 'West door' };
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
      else if (state.fuelLineFrozen && state.pocket.heatGun && !state.generator.stalled) thawFuelLine(state, ctx);
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
      if (state.heaterFuseBlown) replaceFuse(state, ctx);
      else toggleHeater(state, ctx);
      break;
    case 'window':
      sealWindow(state, ctx);
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
    case 'door':
      if (state.doors[entry.data.doorId] === 'locked') {
        ctx.events.emit('flavour', { text: DOORS[entry.data.doorId]?.locked ?? 'Locked.' });
      }
      useDoor(state, ctx, entry.data.doorId);
      break;
    case 'supplies': {
      if (takeSupply(state, ctx)) break;
      const inv = state.inventory;
      ctx.events.emit('flavour', {
        text: `Spare fuses: ${inv.fuses}. Seal tape: ${inv.tape}. Rations: ${inv.food}. Flashlight cells: ${inv.batteries}. The heat gun, filters.`,
      });
      break;
    }
    case 'radio': {
      const call = ringingCall(state) ? answerCall(state, ctx) : openCall(state);
      if (call) ui.openPanel('radio', { id: call.id });
      else ctx.events.emit('flavour', { text: 'The radio set hums on standby. Nothing on the channel.' });
      break;
    }
    case 'mast':
      if (state.antennaIced) clearAntenna(state, ctx);
      else if (state.mastDuty && !state.mastInspected) inspectMast(state, ctx);
      else ctx.events.emit('flavour', { text: 'The instruments tick over. The north pressure gauge reads lower than it should.' });
      break;
    case 'westDoorOutside':
      ctx.events.emit('flavour', { text: 'The west door, from the wrong side. Ice has welded it into the frame.' });
      break;
    case 'bunk':
      ctx.events.emit('flavour', { text: 'No sleeping on shift.' });
      break;
    case 'recorderShelf':
      ctx.events.emit('flavour', { text: 'An empty shelf, and a clean rectangle in the dust where a recorder sat.' });
      break;
  }
}
