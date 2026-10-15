// Short status messages and subtitles at the bottom of the screen.

import { CONFIG } from '../config.js';
import { formatClock } from '../core/clock.js';

export function createToasts(root) {
  const box = document.createElement('div');
  box.className = 'toasts';
  root.appendChild(box);

  const push = (text, kind = '') => {
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    t.textContent = text;
    box.appendChild(t);
    while (box.children.length > CONFIG.ui.maxToasts) box.firstChild.remove();
    setTimeout(() => t.classList.add('fade'), CONFIG.ui.toastSeconds * 1000);
    setTimeout(() => t.remove(), CONFIG.ui.toastSeconds * 1000 + 700);
  };

  return {
    push,
    clear() {
      box.innerHTML = '';
    },
  };
}

/**
 * Every failure and dread sound gets a written line, so nothing is told by sound alone.
 * @param {object} events
 * @param {ReturnType<typeof createToasts>} toasts
 * @param {() => object} getSettings
 */
export function bindToasts(events, toasts, getSettings) {
  const say = (text, kind) => toasts.push(text, kind);
  const subtitle = (text) => {
    if (getSettings().subtitles) toasts.push(text, 'subtitle');
  };

  events.on('generator:stalled', () => say('The generator coughs and dies.', 'warn'));
  events.on('generator:outOfFuel', () => say('The generator has run dry.', 'warn'));
  events.on('generator:noFuel', () => say('No fuel in the tank.', 'warn'));
  events.on('generator:restartFailed', () => say("It won't catch. Try again.", 'warn'));
  events.on('generator:started', () => say('The generator catches.'));
  events.on('generator:stopped', () => say('Generator off. The battery is on its own.'));
  events.on('generator:refueled', ({ fuel }) => say(`Fuel poured. Tank at ${Math.round(fuel)}%.`));
  events.on('breaker:tripped', () => say('Clunk. The main room goes dark: the breaker has tripped.', 'warn'));
  events.on('breaker:reset', () => say('Breaker reset.'));
  events.on('power:depleted', () => say('Battery flat. Emergency lighting only.', 'warn'));
  events.on('power:restored', () => say('Power back.'));
  events.on('console:unpowered', () => say('The console has no power.', 'warn'));
  events.on('reading:open', ({ reading }) => say(`Weather reading due. Log it by ${formatClock(reading.closes)}.`));
  events.on('reading:missed', () => say('Reading missed. Part of the log stays corrupted.', 'warn'));
  events.on('log:recovered', () => say('Keeper log entry recovered. Read it at the terminal.'));
  events.on('can:pickedUp', () => say('Jerry can. Take it to the generator.'));
  events.on('flavour', ({ text }) => say(text));
  events.on('flashlight:low', () => say('The flashlight is fading.', 'warn'));
  events.on('flashlight:dead', () => say('The flashlight dies. It recharges from station power while it is off.', 'warn'));
  events.on('flashlight:flat', () => say('The flashlight is flat. Leave it off while the station has power.', 'warn'));

  events.on('scripted:knocks', () => subtitle('[Three knocks at the west door]'));
  events.on('scripted:roofSteps', () => subtitle('[Footsteps cross the roof, toward the west door]'));
  events.on('scripted:anomaly', () => subtitle('[Every light in the station stutters]'));
}
