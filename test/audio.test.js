import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CONFIG } from '../src/config.js';
import { roomAt, openHops, OUTSIDE } from '../src/world/layout.js';
import { occlusionBetween, occlusionMix, describeDirection } from '../src/audio/space.js';

const shut = { supply: 'closed', airlockInner: 'closed', airlockSide: 'closed', airlockOuter: 'locked' };
const open = { supply: 'open', airlockInner: 'open', airlockSide: 'open', airlockOuter: 'locked' };

test('points map to the right room', () => {
  assert.equal(roomAt(-6.5, 2.45), 'main'); // spawn, at the met console
  assert.equal(roomAt(2.6, -3), 'generator');
  assert.equal(roomAt(1.4, 7.95), 'supply');
  assert.equal(roomAt(-0.5, 6), 'airlock');
  assert.equal(roomAt(-4.5, -14), OUTSIDE);
});

test('sound travels through open doorways and is blocked by closed doors', () => {
  assert.equal(openHops('main', 'main', shut), 0);
  assert.equal(openHops('main', 'generator', shut), 1); // the doorway has no door
  assert.equal(openHops('main', 'supply', shut), Infinity);
  assert.equal(openHops('main', 'supply', open), 2);
  assert.equal(openHops('main', 'airlock', open), 1);
  assert.equal(openHops('airlock', OUTSIDE, open), Infinity); // outer door still locked
});

test('walls muffle a sound more than an open doorway', () => {
  const A = CONFIG.audio;
  assert.equal(occlusionBetween('generator', 'generator', shut), 0);
  assert.equal(occlusionBetween('main', 'generator', shut), A.occlusionByHops[1]);
  assert.equal(occlusionBetween('main', 'supply', shut), 1);
  const clear = occlusionMix(0);
  const through = occlusionMix(A.occlusionByHops[1]);
  const walled = occlusionMix(1);
  assert.ok(Math.abs(clear.cutoff - A.clearCutoff) < 1);
  assert.ok(Math.abs(walled.cutoff - A.occludedCutoff) < 1);
  assert.ok(clear.cutoff > through.cutoff && through.cutoff > walled.cutoff);
  assert.ok(clear.gain > through.gain && through.gain > walled.gain);
});

test('subtitles say where a sound came from', () => {
  // Standing at the met console, facing north (-z).
  const listener = { x: -6.5, z: 2.45, fx: 0, fz: -1, room: 'main' };
  assert.equal(describeDirection(listener, { x: -6.5, z: -4.9, room: 'main' }), 'ahead');
  assert.equal(describeDirection(listener, { x: 2.6, z: 2.4, room: 'generator' }), 'to your right, in the generator room');
  assert.equal(describeDirection(listener, { x: -10.8, z: 2.4, room: 'main' }), 'to your left');
  assert.equal(describeDirection(listener, { x: -6.5, z: 8, room: 'airlock' }), 'behind you, in the airlock');
  assert.equal(describeDirection(listener, { x: -6, z: 2.2, room: 'main' }), 'right beside you');
  assert.equal(describeDirection(listener, { x: -4.5, z: -9, room: OUTSIDE }), 'ahead, outside');
});
