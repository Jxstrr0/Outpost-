// Graphics quality: the level Auto starts on, and when it steps down.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { startingLevel, levelBelow, createFpsWatch } from '../src/world/quality.js';

const Q = CONFIG.render.quality;

test('auto starts high on desktops, lower on phones, lowest on weak phones', () => {
  assert.equal(startingLevel({ touch: false, memoryGb: 0 }), Q.autoDesktop);
  assert.equal(startingLevel({ touch: true, memoryGb: 0 }), Q.autoPhone);
  assert.equal(startingLevel({ touch: true, memoryGb: 8 }), Q.autoPhone);
  assert.equal(startingLevel({ touch: true, memoryGb: Q.weakMemoryGb }), Q.autoWeakPhone);
});

test('stepping down stops at low', () => {
  assert.equal(levelBelow('high'), 'medium');
  assert.equal(levelBelow('medium'), 'low');
  assert.equal(levelBelow('low'), 'low');
});

/** Feed the watch `seconds` of frames at `fps`; true if it called any sample slow. */
function run(watch, fps, seconds) {
  let slow = false;
  for (let t = 0; t < seconds; t += 1 / fps) slow = watch.frame(1 / fps) || slow;
  return slow;
}

test('the fps watch flags choppy play, but not smooth play or the settling time', () => {
  const sample = Q.autoSettleSeconds + Q.autoSampleSeconds + 0.5;
  assert.equal(run(createFpsWatch(), 60, sample), false);
  assert.equal(run(createFpsWatch(), Q.autoMinFps / 2, sample), true);

  // Slow frames right after a level change don't count.
  const watch = createFpsWatch();
  run(watch, 60, sample);
  watch.settle();
  assert.equal(run(watch, Q.autoMinFps / 2, Q.autoSettleSeconds * 0.9), false);
});

test('a long gap (tab switched away) is left out instead of counting as slow', () => {
  const watch = createFpsWatch();
  run(watch, 60, Q.autoSettleSeconds + 0.1);
  let slow = false;
  for (let i = 0; i < 20; i++) slow = watch.frame(Q.autoMaxGapSeconds + 1) || slow;
  assert.equal(slow, false);
});
