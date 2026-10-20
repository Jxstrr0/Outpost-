import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import night1 from '../src/story/data/night1.json' with { type: 'json' };
import { DEFAULT_SETTINGS, defaultSave } from '../src/core/save.js';

const emitted = new Set();
for (const f of fs.readdirSync('src/systems')) {
  const text = fs.readFileSync(`src/systems/${f}`, 'utf8');
  for (const m of text.matchAll(/emit\('([a-zA-Z:]+)'/g)) emitted.add(m[1]);
}

test('every hint has an id, text, and a trigger that really fires', () => {
  const ids = new Set();
  for (const night of [night1]) {
    for (const h of night.hints || []) {
      assert.ok(h.id && h.text, `hint needs id and text: ${JSON.stringify(h)}`);
      assert.ok(!ids.has(h.id), `duplicate hint id ${h.id}`);
      ids.add(h.id);
      assert.ok(h.on === 'start' || emitted.has(h.on), `hint ${h.id} listens for ${h.on}, which no system emits`);
    }
  }
  assert.ok(night1.hints.length > 0, 'night 1 has hints');
});

test('hints are on by default and none are marked seen', () => {
  assert.equal(DEFAULT_SETTINGS.hints, true);
  assert.deepEqual(defaultSave().hintsSeen, []);
});
