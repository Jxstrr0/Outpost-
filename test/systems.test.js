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
