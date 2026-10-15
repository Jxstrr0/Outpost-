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
 * Every failure gets a written line, so nothing is told by sound alone. Subtitles for
 * sounds (with where they came from) are written by the audio module.
 * @param {object} events
 * @param {ReturnType<typeof createToasts>} toasts
 */
export function bindToasts(events, toasts) {
  const say = (text, kind) => toasts.push(text, kind);

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

  events.on('heater:fault', () => say('Pop. The heater grille goes dark: a fuse has blown.', 'warn'));
  events.on('heater:fixed', () => say('New fuse in. The heater ticks back to life.'));
  events.on('fuelLine:frozen', () => say('The generator stutters. The fuel line is freezing.', 'warn'));
  events.on('fuelLine:thawed', () => say('The fuel line runs clear. The engine settles.'));
  events.on('window:cracked', () => say('A crack runs across the north window. The cold is getting in.', 'warn'));
  events.on('window:sealed', () => say('Taped. The wind drops to a whistle.'));
  events.on('supply:taken', ({ item }) => {
    const text = {
      fuse: 'A spare fuse, in your pocket. The heater is on the main room west wall.',
      tape: 'A roll of seal tape, in your pocket.',
      heatGun: 'The heat gun, in your pocket. Hold USE at the generator to thaw the line.',
      ration: 'You eat standing up. Cold stew, but your head clears.',
    }[item];
    if (text) say(text);
  });
  events.on('radio:ringing', () => say('The radio is ringing in the supply room.', 'warn'));
  events.on('radio:missed', () => say('The radio falls silent. Dispatch will log you as unreachable.', 'warn'));
  events.on('radio:unpowered', () => say('The radio is dead without station power.', 'warn'));
  events.on('sanity:low', () => say('Your hands are shaking. Get somewhere lit and warm.', 'warn'));
  // A hallucinated fault looks exactly like the real thing on the HUD.
  events.on('sanity:hallucination', ({ kind }) => {
    if (kind === 'fakeStall') say('The generator coughs and dies.', 'warn');
    if (kind === 'fakeBreaker') say('Clunk. The main room goes dark: the breaker has tripped.', 'warn');
    if (kind === 'fakeCall') say('The radio is ringing in the supply room.', 'warn');
  });
}
