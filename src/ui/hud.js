// The in-play HUD: clock and meters, current objective, crosshair, frost.

import { CONFIG } from '../config.js';
import { formatClock } from '../core/clock.js';
import { openReading, nextUpcomingReading, fullCansLeft, ringingCall } from '../systems/index.js';

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
  const indoorCans = state.jerryCans.some((c) => c.state === 'full' && c.where !== 'shed');
  const canWhere = indoorCans ? 'Jerry cans: generator room, east wall' : 'Jerry cans: the fuel shed outside, east of the station';
  const outside = state.room === 'outside';
  const freezing = state.temp < CONFIG.heat.freezeBelow;
  const gen = state.generator;

  if (outside && state.bodyHeat < CONFIG.body.dangerBelow) {
    return { text: 'Get back inside. You are freezing', where: 'Follow the tether back to the airlock', urgent: true };
  }
  if (gen.stalled && gen.cranking <= 0 && state.fuel > 0) {
    return { text: 'Restart the generator', where: 'Generator room', urgent: true };
  }
  if (state.breakerTripped) {
    return { text: 'Reset the breaker', where: 'Generator room, beside the doorway', urgent: true };
  }
  if (state.heaterFuseBlown && state.heaterOn) {
    return state.pocket.fuse
      ? { text: 'Replace the heater fuse', where: 'Main room, west wall. Hold USE', urgent: true }
      : state.inventory.fuses > 0
        ? { text: 'The heater fuse has blown', where: 'Spare fuses: supply room shelves', urgent: true }
        : { text: 'No spare fuses left', where: 'Keep warm some other way: lights on, keep moving', urgent: true };
  }
  if (state.carrying) {
    return { text: 'Pour the fuel into the generator', where: 'Generator room', urgent: state.fuel <= 0 };
  }
  if (state.fuel <= 0) {
    return cans > 0
      ? { text: 'Refuel the generator', where: canWhere, urgent: true }
      : { text: 'No fuel left. Save the battery', where: 'Lights off, heater only when you must', urgent: true };
  }
  if (freezing && !state.heaterOn) {
    return { text: 'You are freezing. Turn the heater on', where: 'Main room, west wall', urgent: true };
  }
  if (freezing && state.power <= 0) {
    return { text: 'You are freezing. Get power back', where: 'Start the generator', urgent: true };
  }
  const call = ringingCall(state);
  if (call) {
    return { text: 'Answer the radio', where: `Supply room. Rings until ${formatClock(call.closes)}`, urgent: call.closes - state.minute < 15 };
  }
  if (state.windowCracked) {
    return state.pocket.tape
      ? { text: 'Tape over the cracked window', where: 'North window, main room. Hold USE', urgent: true }
      : state.inventory.tape > 0
        ? { text: 'The north window has cracked', where: 'Seal tape: supply room shelves', urgent: true }
        : { text: 'Out of tape. The window stays cracked', where: 'Keep the heater running', urgent: false };
  }
  if (state.doors.airlockOuter === 'open' && !outside && state.room !== 'airlock') {
    return { text: 'Close the outer door', where: 'Airlock. The cold is pouring in', urgent: false };
  }
  if (state.antennaIced) {
    return {
      text: 'Ice on the mast antenna',
      where: outside ? 'Follow the tether north to the beacon' : 'Radio and console are dead. Knock it off at the north mast',
      urgent: !!openReading(state) || !!ringingCall(state),
    };
  }
  if (state.fuelLineFrozen && state.generator.running) {
    return state.pocket.heatGun
      ? { text: 'Thaw the frozen fuel line', where: 'Generator room. Hold USE for 10 seconds', urgent: false }
      : { text: 'The fuel line is freezing', where: 'Heat gun: supply room shelves', urgent: false };
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
    return { text: 'Fuel is low. Fetch a jerry can', where: canWhere.replace('Jerry cans: ', ''), urgent: false };
  }
  if (state.mastDuty && !state.mastInspected) {
    return {
      text: 'Inspect the north mast',
      where: outside ? 'Follow the tether north to the beacon' : 'Out through the airlock. Follow the tether',
      urgent: false,
    };
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
  const white = el('div', 'whiteout', hud); // night 5: walking out toward the light

  const status = el('div', 'hud-status', hud);
  const clock = el('div', 'hud-clock', status);
  const power = meter(status, 'POWER');
  const fuel = meter(status, 'FUEL');
  const temp = meter(status, 'TEMP');
  const torch = meter(status, 'TORCH');
  const mind = meter(status, 'NERVES');
  const body = meter(status, 'BODY');
  const pocket = el('div', 'hud-pocket', status);

  const objective = el('div', 'hud-objective', hud);
  const objMain = el('div', 'hud-objective-main', objective);
  const objWhere = el('div', 'hud-objective-where', objective);

  const crosshair = el('div', 'crosshair', hud);
  const ring = el('div', 'hold-ring', hud);
  const label = el('div', 'interact-label', hud);
  const desktopHint = el('div', 'desktop-hint hidden', hud, 'Click to look around');
  const rotateHint = el('div', 'rotate-hint', hud, 'Turn your phone sideways for the best view');

  let lastText = '';

  return {
    el: hud,

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
      const fl = state.flashlight;
      torch.row.classList.toggle('hidden', !fl.owned);
      if (fl.owned) setMeter(torch, fl.battery, fl.on ? `${Math.round(fl.battery)}%` : 'off', fl.battery < CONFIG.flashlight.lowBelow);
      mind.row.classList.toggle('hidden', !state.sanityEnabled);
      if (state.sanityEnabled) setMeter(mind, state.sanity, `${Math.round(state.sanity)}`, state.sanity < CONFIG.sanity.dangerBelow);
      const showBody = state.room === 'outside' || state.bodyHeat < 99.5;
      body.row.classList.toggle('hidden', !showBody);
      if (showBody) setMeter(body, state.bodyHeat, `${Math.round(state.bodyHeat)}`, state.bodyHeat < CONFIG.body.dangerBelow);
      const held = [state.pocket.fuse && 'fuse', state.pocket.tape && 'tape', state.pocket.heatGun && 'heat gun'].filter(Boolean);
      const pocketText = held.length ? `Pockets: ${held.join(', ')}` : '';
      if (pocket.textContent !== pocketText) pocket.textContent = pocketText;

      const obj = computeObjective(state);
      const text = `${obj.text}|${obj.where}|${obj.urgent}`;
      if (text !== lastText) {
        lastText = text;
        objMain.textContent = obj.text;
        objMain.classList.toggle('urgent', obj.urgent);
        objWhere.textContent = obj.where;
      }

      const roomFrost = (H.frostStartsBelow - state.temp) / (H.frostStartsBelow - H.frostFullAt);
      const bodyFrost = (CONFIG.body.frostFrom - state.bodyHeat) / CONFIG.body.frostFrom;
      const frostLevel = Math.max(state.room === 'outside' ? 0 : roomFrost, bodyFrost);
      frost.style.opacity = String(Math.max(0, Math.min(1, frostLevel)));
      white.style.opacity = String(state.westDoor?.answer ?? 0);

      const action = interactor.action;
      crosshair.classList.toggle('active', !!action && !action.disabled);
      crosshair.classList.toggle('disabled', !!action && !!action.disabled);
      label.textContent = action ? action.label : '';
      label.classList.toggle('disabled', !!action?.disabled);
      const progress = interactor.holdProgress || 0;
      ring.style.setProperty('--p', String(progress));
      ring.classList.toggle('on', progress > 0);
    },
  };
}
