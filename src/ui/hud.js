// The in-play HUD: clock and meters, current objective, crosshair, frost.

import { CONFIG } from '../config.js';
import { formatClock } from '../core/clock.js';
import { openReading, nextUpcomingReading, fullCansLeft } from '../systems/index.js';

function el(tag, className, parent, html = '') {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (html) e.innerHTML = html;
  parent.appendChild(e);
  return e;
}

function meter(parent, label) {
  const row = el('div', 'meter', parent);
  el('div', 'meter-label', row, label);
  const bar = el('div', 'meter-bar', row);
  const fill = el('div', 'meter-fill', bar);
  const value = el('div', 'meter-value', row);
  return { row, fill, value };
}

/** The single most urgent thing to do, and where. Reads state only. */
export function computeObjective(state) {
  const cans = fullCansLeft(state);
  const freezing = state.temp < CONFIG.heat.freezeBelow;
  const gen = state.generator;

  if (gen.stalled && gen.cranking <= 0 && state.fuel > 0) {
    return { text: 'Restart the generator', where: 'Generator room', urgent: true };
  }
  if (state.breakerTripped) {
    return { text: 'Reset the breaker', where: 'Generator room, beside the doorway', urgent: true };
  }
  if (state.carrying) {
    return { text: 'Pour the fuel into the generator', where: 'Generator room', urgent: state.fuel <= 0 };
  }
  if (state.fuel <= 0) {
    return cans > 0
      ? { text: 'Refuel the generator', where: 'Jerry cans: generator room, east wall', urgent: true }
      : { text: 'No fuel left. Save the battery', where: 'Lights off, heater only when you must', urgent: true };
  }
  if (freezing && !state.heaterOn) {
    return { text: 'You are freezing. Turn the heater on', where: 'Main room, west wall', urgent: true };
  }
  if (freezing && state.power <= 0) {
    return { text: 'You are freezing. Get power back', where: 'Start the generator', urgent: true };
  }
  const reading = openReading(state);
  if (reading) {
    const left = reading.closes - state.minute;
    return {
      text: 'Log the weather reading',
      where: `Met console, main room. Closes ${formatClock(reading.closes)}`,
      urgent: left < 20,
    };
  }
  if (!state.heaterOn && state.temp < 8) {
    return { text: 'Turn the heater back on', where: 'Main room, west wall', urgent: false };
  }
  if (!gen.running && gen.cranking <= 0 && state.power < 50) {
    return { text: 'Start the generator', where: 'Generator room', urgent: state.power < CONFIG.power.dangerBelow };
  }
  if (state.fuel < 20 && cans > 0) {
    return { text: 'Fuel is low. Fetch a jerry can', where: 'Generator room, east wall', urgent: false };
  }
  const next = nextUpcomingReading(state);
  if (next) {
    return {
      text: `Next reading at ${formatClock(next.due)}`,
      where: state.logsRecovered.length ? 'A new log entry is on the terminal' : 'Keep the station running',
      urgent: false,
    };
  }
  return { text: 'Hold on until 06:00', where: 'Keep the station running', urgent: false };
}

export function createHud(root) {
  const hud = el('div', 'hud hidden', root);
  const frost = el('div', 'frost', hud);

  const status = el('div', 'hud-status', hud);
  const clock = el('div', 'hud-clock', status);
  const power = meter(status, 'POWER');
  const fuel = meter(status, 'FUEL');
  const temp = meter(status, 'TEMP');

  const objective = el('div', 'hud-objective', hud);
  const objMain = el('div', 'hud-objective-main', objective);
  const objWhere = el('div', 'hud-objective-where', objective);

  const crosshair = el('div', 'crosshair', hud);
  const label = el('div', 'interact-label', hud);
  const desktopHint = el('div', 'desktop-hint hidden', hud, 'Click to look around');
  const rotateHint = el('div', 'rotate-hint', hud, 'Turn your phone sideways for the best view');

  let lastText = '';

  return {
    show(visible) {
      hud.classList.toggle('hidden', !visible);
      rotateHint.classList.toggle('armed', visible);
    },

    setDesktopHint(visible) {
      desktopHint.classList.toggle('hidden', !visible);
    },

    update(state, interactor) {
      clock.innerHTML = `${formatClock(state.minute)}<small>NIGHT ${state.night}</small>`;

      const setMeter = (m, pct, text, danger) => {
        m.fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
        m.value.textContent = text;
        m.row.classList.toggle('danger', danger);
      };
      setMeter(power, state.power, `${Math.round(state.power)}%`, state.power < CONFIG.power.dangerBelow);
      setMeter(fuel, state.fuel, `${Math.round(state.fuel)}%`, state.fuel < CONFIG.fuel.dangerBelow);
      const H = CONFIG.heat;
      setMeter(temp, ((state.temp - H.min) / (H.max - H.min)) * 100, `${state.temp.toFixed(0)}°`, state.temp < H.dangerBelow);

      const obj = computeObjective(state);
      const text = `${obj.text}|${obj.where}|${obj.urgent}`;
      if (text !== lastText) {
        lastText = text;
        objMain.textContent = obj.text;
        objMain.classList.toggle('urgent', obj.urgent);
        objWhere.textContent = obj.where;
      }

      const frostLevel = (H.frostStartsBelow - state.temp) / (H.frostStartsBelow - H.frostFullAt);
      frost.style.opacity = String(Math.max(0, Math.min(1, frostLevel)));

      const action = interactor.action;
      crosshair.classList.toggle('active', !!action && !action.disabled);
      crosshair.classList.toggle('disabled', !!action && !!action.disabled);
      label.textContent = action ? action.label : '';
      label.classList.toggle('disabled', !!action?.disabled);
    },
  };
}
