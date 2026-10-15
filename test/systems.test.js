import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { CONFIG } from '../src/config.js';
import { createState } from '../src/core/state.js';
import { createEventBus } from '../src/core/events.js';
import { createRng, nightSeed } from '../src/core/rng.js';
import { parseClock, formatClock } from '../src/core/clock.js';
import {
  stepSimulation,
  startGenerator,
  resetBreaker,
  pickUpCan,
  pourCan,
  logReading,
  openReading,
  triggerFailure,
  useDoor,
  unlockDoors,
  toggleFlashlight,
  updateFlashlight,
  flashlightDrain,
  takeSupply,
  replaceFuse,
  sealWindow,
  thawFuelLine,
  ringingCall,
  answerCall,
  chooseReply,
  sanityShock,
} from '../src/systems/index.js';

const night1 = JSON.parse(readFileSync(new URL('../src/story/data/night1.json', import.meta.url)));
const night2 = JSON.parse(readFileSync(new URL('../src/story/data/night2.json', import.meta.url)));

function setup(night, seed = nightSeed(night.night)) {
  const events = createEventBus();
  const rng = createRng(seed);
  const state = createState(night, { seed });
  const log = [];
  events.on('*', (e) => log.push(e.name));
  return { state, ctx: { events, rng, night }, log };
}

/** A competent player: fixes things as soon as they happen. */
function autopilot(state, ctx) {
  keepAlive(state, ctx);
  if (openReading(state)) logReading(state, ctx);
}

/** Step until the clock reaches a time, with the autopilot keeping the station alive. */
function runUntil(state, ctx, minute) {
  while (state.minute < minute && !state.outcome) {
    keepAlive(state, ctx);
    stepSimulation(state, ctx);
  }
}

function keepAlive(state, ctx) {
  if (state.generator.stalled && state.generator.cranking <= 0) startGenerator(state, ctx);
  if (state.breakerTripped) resetBreaker(state, ctx);
  // Faults that need a part from the supply room: fetch it, then fix.
  for (let i = 0; i < 4; i++) takeSupply(state, ctx);
  replaceFuse(state, ctx);
  sealWindow(state, ctx);
  thawFuelLine(state, ctx);
  if (ringingCall(state)) {
    const call = answerCall(state, ctx);
    if (call) chooseReply(state, ctx, call.id, 0, { text: 'All quiet.' });
  }
  if (state.fuel < 15 && !state.carrying) {
    const can = state.jerryCans.find((c) => c.state === 'full');
    if (can) {
      pickUpCan(state, ctx, can.id);
      pourCan(state, ctx);
    }
  }
}

function runNight(night, seed, player) {
  const { state, ctx, log } = setup(night, seed);
  let guard = 0;
  while (!state.outcome && guard++ < 100000) {
    if (player) player(state, ctx);
    stepSimulation(state, ctx);
  }
  return { state, log };
}

test('clock parses night times across midnight', () => {
  assert.equal(parseClock('18:00'), 1080);
  assert.equal(parseClock('03:00'), 1620);
  assert.equal(formatClock(1620), '03:00');
  assert.equal(formatClock(1800), '06:00');
});

test('a 12-hour night lasts about 7.5 real minutes', () => {
  const minutes = (CONFIG.time.nightEnd - CONFIG.time.nightStart) / CONFIG.time.gameMinutesPerSecond / 60;
  assert.ok(minutes > 7 && minutes < 8, `night lasts ${minutes} real minutes`);
});

test('the same seed replays the same night exactly', () => {
  const a = runNight(night1, 1234, autopilot);
  const b = runNight(night1, 1234, autopilot);
  assert.deepEqual(a.log, b.log);
  assert.equal(a.state.power, b.state.power);
});

test('a competent player survives night 1 and night 2 on most seeds', () => {
  for (const night of [night1, night2]) {
    let survived = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const { state } = runNight(night, seed, autopilot);
      if (state.outcome === 'survived') survived++;
    }
    assert.ok(survived >= 32, `night ${night.night}: survived ${survived}/40`);
  }
});

test('a player who does nothing loses night 1', () => {
  let lost = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const { state } = runNight(night1, seed, null);
    if (state.outcome === 'frozen') lost++;
  }
  assert.ok(lost >= 15, `idle player froze on ${lost}/20 seeds`);
});

test('readings open, recover logs in order, and miss after the window', () => {
  const { state, ctx } = setup(night1);
  runUntil(state, ctx, parseClock('20:00') + 1);
  assert.equal(state.readings[0].status, 'open');
  assert.equal(logReading(state, ctx), 'v01');
  assert.equal(state.readings[0].status, 'logged');
  runUntil(state, ctx, parseClock('22:00') + CONFIG.duties.readingWindow + 1);
  assert.equal(state.readings[1].status, 'missed');
  assert.deepEqual(state.logsRecovered, ['v01']);
});

test('the anomaly reading shows the north mast well below the south', () => {
  const { state, ctx } = setup(night1);
  runUntil(state, ctx, parseClock('02:00') + 1);
  const r = state.readings[3];
  assert.ok(r.anomaly);
  assert.ok(r.values.pressureSouth - r.values.pressureNorth > 6);
});

test('a tripped breaker cuts lights, heater and consoles', () => {
  const { state, ctx } = setup(night1);
  triggerFailure(state, ctx, 'breakerTrip');
  stepSimulation(state, ctx);
  assert.equal(state.lightsLit, false);
  assert.equal(state.heaterActive, false);
  assert.equal(state.consolesPowered, false);
  resetBreaker(state, ctx);
  stepSimulation(state, ctx);
  assert.equal(state.heaterActive, true);
});

test('a dry generator stops and will not start until refuelled', () => {
  const { state, ctx } = setup(night1);
  state.fuel = 0.01;
  stepSimulation(state, ctx);
  assert.equal(state.generator.running, false);
  assert.equal(startGenerator(state, ctx), false);
  pickUpCan(state, ctx, state.jerryCans[0].id);
  pourCan(state, ctx);
  assert.equal(state.fuel > 29, true);
  assert.equal(startGenerator(state, ctx), true);
});

test('freezing takes 80 game minutes below -6 °C', () => {
  const { state, ctx } = setup(night1);
  state.heaterOn = false;
  state.temp = -20;
  let minutes = 0;
  while (!state.outcome && minutes < 200) {
    stepSimulation(state, ctx);
    minutes += CONFIG.time.gameMinutesPerSecond / CONFIG.time.ticksPerSecond;
    // keep failures from ending the test early
    state.generator.running = true;
  }
  assert.equal(state.outcome, 'frozen');
  assert.ok(Math.abs(minutes - 80) < 1, `froze after ${minutes} minutes`);
});

test('night 1 keeps every door locked; night 2 opens the supply room and airlock', () => {
  const one = setup(night1);
  assert.deepEqual(Object.values(one.state.doors), ['locked', 'locked', 'locked', 'locked']);
  const two = setup(night2);
  assert.equal(two.state.doors.supply, 'closed');
  assert.equal(two.state.doors.airlockInner, 'closed');
  assert.equal(two.state.doors.airlockSide, 'closed');
  assert.equal(two.state.doors.airlockOuter, 'locked');
});

test('doors open and close, locked doors stay shut, and debug unlock spares the outer door', () => {
  const { state, ctx, log } = setup(night1);
  assert.equal(useDoor(state, ctx, 'supply'), false);
  assert.equal(state.doors.supply, 'locked');
  assert.ok(log.includes('door:locked'));
  unlockDoors(state, ctx);
  assert.equal(state.doors.airlockOuter, 'locked');
  assert.equal(useDoor(state, ctx, 'supply'), true);
  assert.equal(state.doors.supply, 'open');
  useDoor(state, ctx, 'supply');
  assert.equal(state.doors.supply, 'closed');
  assert.ok(log.includes('door:opened') && log.includes('door:closed'));
});

test('the flashlight arrives on night 2, drains while on and recharges only from station power', () => {
  assert.equal(setup(night1).state.flashlight.owned, false);
  const { state, ctx, log } = setup(night2);
  assert.equal(state.flashlight.owned, true);
  assert.equal(toggleFlashlight(state, ctx), true);
  const tick = CONFIG.time.gameMinutesPerSecond / CONFIG.time.ticksPerSecond;
  const minutes = 100 / CONFIG.flashlight.drainPerMinute;
  for (let m = 0; m < minutes + 5 && state.flashlight.on; m += tick) {
    updateFlashlight(state, tick, ctx);
  }
  assert.equal(state.flashlight.battery, 0);
  assert.equal(state.flashlight.on, false);
  assert.ok(log.includes('flashlight:low') && log.includes('flashlight:dead'));
  assert.equal(toggleFlashlight(state, ctx), false, 'a flat cell will not switch on');

  state.power = 0;
  updateFlashlight(state, 10, ctx);
  assert.equal(state.flashlight.battery, 0, 'no recharge without station power');
  state.power = 50;
  updateFlashlight(state, 10, ctx);
  assert.ok(state.flashlight.battery > 8, 'recharges while off');
  assert.ok(state.power < 50, 'recharging draws on the station battery');
});

test('the better cell from the supply drop makes the flashlight last longer', () => {
  const plain = setup(night2).state;
  const better = createState(night2, { inventory: { batteries: 1 } });
  assert.ok(flashlightDrain(better) < flashlightDrain(plain));
});

// ---------- M6: faults that need parts, the radio, sanity ----------

const night3 = JSON.parse(readFileSync(new URL('../src/story/data/night3.json', import.meta.url)));
const night4 = JSON.parse(readFileSync(new URL('../src/story/data/night4.json', import.meta.url)));
const night5 = JSON.parse(readFileSync(new URL('../src/story/data/night5.json', import.meta.url)));
const radio = JSON.parse(readFileSync(new URL('../src/story/data/radio.json', import.meta.url)));

test('a blown heater fuse needs a spare from the supply room', () => {
  const { state, ctx, log } = setup(night2);
  const stock = state.inventory.fuses;
  assert.equal(stock, CONFIG.stock.spareFuses);
  triggerFailure(state, ctx, 'heaterFault');
  stepSimulation(state, ctx);
  assert.equal(state.heaterActive, false, 'no heat with a blown fuse, even with power');
  assert.equal(replaceFuse(state, ctx), false, 'nothing to replace it with yet');
  assert.equal(takeSupply(state, ctx), 'fuse');
  assert.equal(state.inventory.fuses, stock - 1);
  assert.equal(replaceFuse(state, ctx), true);
  stepSimulation(state, ctx);
  assert.equal(state.heaterActive, true);
  assert.ok(log.includes('heater:fault') && log.includes('heater:fixed'));
});

test('a frozen fuel line burns fuel faster until the heat gun thaws it', () => {
  const a = setup(night3);
  const b = setup(night3);
  triggerFailure(b.state, b.ctx, 'fuelLine');
  for (let i = 0; i < 100; i++) {
    stepSimulation(a.state, a.ctx);
    stepSimulation(b.state, b.ctx);
  }
  const burnA = night3.start.fuel - a.state.fuel;
  const burnB = night3.start.fuel - b.state.fuel;
  assert.ok(Math.abs(burnB / burnA - CONFIG.fuel.frozenLineBurn) < 0.05, `burn ratio ${burnB / burnA}`);
  assert.equal(thawFuelLine(b.state, b.ctx), false, 'needs the heat gun');
  assert.equal(takeSupply(b.state, b.ctx), 'heatGun');
  assert.equal(thawFuelLine(b.state, b.ctx), true);
  assert.equal(b.state.fuelLineFrozen, false);
  assert.equal(b.state.pocket.heatGun, true, 'the heat gun stays in your pocket');
});

test('a cracked window loses heat faster until it is taped', () => {
  const a = setup(night4);
  const b = setup(night4);
  for (const s of [a.state, b.state]) s.heaterOn = false;
  triggerFailure(b.state, b.ctx, 'windowCrack');
  for (let i = 0; i < 200; i++) {
    stepSimulation(a.state, a.ctx);
    stepSimulation(b.state, b.ctx);
  }
  assert.ok(b.state.temp < a.state.temp - 1, `cracked ${b.state.temp.toFixed(1)} vs sealed ${a.state.temp.toFixed(1)}`);
  assert.equal(sealWindow(b.state, b.ctx), false);
  assert.equal(takeSupply(b.state, b.ctx), 'tape');
  assert.equal(sealWindow(b.state, b.ctx), true);
  assert.equal(b.state.windowCracked, false);
});

test('radio calls ring on time, can be answered once, and are missed if ignored', () => {
  const { state, ctx, log } = setup(night2);
  const [first, second] = state.radio.calls;
  const stepTo = (minute) => {
    while (state.minute < minute && !state.outcome) stepSimulation(state, ctx);
  };
  state.fuel = 100;
  ctx.night = { ...night2, failures: { generatorStall: 0, breakerTrip: 0 } };
  stepTo(first.at + 1);
  assert.equal(ringingCall(state)?.id, first.id);
  const call = answerCall(state, ctx);
  assert.equal(call.id, first.id);
  assert.equal(chooseReply(state, ctx, call.id, 1, radio.calls[call.id].replies[1]), true);
  assert.equal(chooseReply(state, ctx, call.id, 0, radio.calls[call.id].replies[0]), false, 'one reply per call');
  assert.deepEqual(state.radio.tags, ['tracks']);
  stepTo(second.closes + 1);
  assert.equal(second.status, 'missed');
  assert.ok(log.includes('radio:missed'));
});

test('the radio needs station power', () => {
  const { state, ctx } = setup(night2);
  while (state.minute < state.radio.calls[0].at + 1) stepSimulation(state, ctx);
  state.power = 0;
  assert.equal(answerCall(state, ctx), null);
});

test('every scheduled radio call has a script, and every reply has an answer', () => {
  for (const night of [night2, night3, night4, night5]) {
    for (const { id } of night.radio) {
      const call = radio.calls[id];
      assert.ok(call, `night ${night.night}: no script for ${id}`);
      assert.ok(call.lines.length && call.replies.length >= 2, id);
      for (const r of call.replies) assert.ok(r.text && r.answer?.length, `${id}: reply without an answer`);
    }
  }
});

test('sanity only exists from night 3, falls in the dark and rises in the light', () => {
  const two = setup(night2);
  two.state.lightsOn = false;
  runUntil(two.state, two.ctx, parseClock('20:00'));
  assert.equal(two.state.sanity, 100);

  const dark = setup(night3);
  dark.state.lightsOn = false;
  for (let i = 0; i < 300; i++) stepSimulation(dark.state, dark.ctx);
  assert.ok(dark.state.sanity < 100, `dark: ${dark.state.sanity}`);
  const low = dark.state.sanity;
  dark.state.lightsOn = true;
  for (let i = 0; i < 300; i++) stepSimulation(dark.state, dark.ctx);
  assert.ok(dark.state.sanity > low, 'light brings it back');
});

test('a ration slows sanity loss, and zero sanity loses the night', () => {
  const fed = setup(night3);
  const hungry = setup(night3);
  for (const s of [fed.state, hungry.state]) {
    s.lightsOn = false;
    s.sanity = 60;
  }
  assert.equal(takeSupply(fed.state, fed.ctx), 'ration');
  const afterMeal = fed.state.sanity;
  for (let i = 0; i < 200; i++) {
    stepSimulation(fed.state, fed.ctx);
    stepSimulation(hungry.state, hungry.ctx);
  }
  assert.ok(afterMeal - fed.state.sanity < 60 - hungry.state.sanity, 'fed loses less');

  const { state, ctx, log } = setup(night3);
  state.sanity = 1;
  sanityShock(state, ctx, 'knocks');
  assert.equal(state.outcome, 'breakdown');
  assert.ok(log.includes('night:lost'));
});

test('a frayed mind hears things that are not there', () => {
  const { state, ctx, log } = setup(night3);
  state.sanity = 20;
  state.fedMinutes = 1e9;
  for (let i = 0; i < 3000 && !state.outcome; i++) {
    state.sanity = 20;
    stepSimulation(state, ctx);
  }
  assert.ok(log.filter((e) => e === 'sanity:hallucination').length >= 3);
});

test('a competent player survives nights 3 to 5 on most seeds', () => {
  for (const night of [night3, night4, night5]) {
    let survived = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const { state } = runNight(night, seed, autopilot);
      if (state.outcome === 'survived') survived++;
    }
    assert.ok(survived >= 24, `night ${night.night}: survived ${survived}/30`);
  }
});
