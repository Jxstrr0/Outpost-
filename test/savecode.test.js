// Save codes: progress as one line of text, and back. No browser needed.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CONFIG } from '../src/config.js';
import { defaultSave, DEFAULT_SETTINGS, SAVE_KEY, restoreSave, getSave, loadSave } from '../src/core/save.js';
import { CODE_PREFIX, CODE_ERRORS, makeSaveCode, readSaveCode, describeSave } from '../src/core/savecode.js';

/** A save a few nights in, with every field changed from its default. */
function playedSave() {
  return {
    ...defaultSave(),
    highestNight: 3,
    currentNight: 2,
    supplyChoices: { 2: ['fuel', 'fuses'], 3: ['battery', 'food'] },
    logsFound: ['v01', 'v02', 'v03', 'v04'],
    notesFound: ['n01', 'n02'],
    tapesFound: ['t1'],
    endingsSeen: ['quiet'],
    radioTags: ['honest', 'stayed'],
    radioSaid: ['All quiet here.', "I'm staying put."],
    settings: {
      lookSensitivity: 1.35,
      invertY: true,
      masterVolume: 0.4,
      effectsVolume: 0.65,
      subtitles: false,
      reducedFlicker: true,
      textSize: 'large',
      graphics: 'low',
    },
  };
}

/** Swap one character in the middle of a code for a different one. */
function damage(code, at = Math.floor(code.length / 2)) {
  const swap = code[at] === 'A' ? 'B' : 'A';
  return code.slice(0, at) + swap + code.slice(at + 1);
}

test('round trip: a played save comes back exactly', () => {
  const save = playedSave();
  const code = makeSaveCode(save);
  assert.ok(code.startsWith(CODE_PREFIX));
  assert.equal(CODE_PREFIX, 'OP1:');
  // Only characters chat apps and notes leave alone.
  assert.match(code, /^OP1:[A-Za-z0-9_-]+$/);
  const result = readSaveCode(code);
  assert.equal(result.ok, true);
  assert.deepEqual(result.save, save);
});

test('round trip: every field of the save is carried', () => {
  // If a new field is added to the save, it must survive a code too.
  const save = playedSave();
  assert.deepEqual(Object.keys(save).sort(), Object.keys(defaultSave()).sort());
  assert.deepEqual(Object.keys(save.settings).sort(), Object.keys(DEFAULT_SETTINGS).sort());
  for (const key of Object.keys(save)) {
    if (key !== 'version') assert.notDeepEqual(save[key], defaultSave()[key], `${key} should differ from its default in this test`);
  }
  assert.deepEqual(readSaveCode(makeSaveCode(save)).save, save);
});

test('round trip: an empty, brand new save', () => {
  const result = readSaveCode(makeSaveCode(defaultSave()));
  assert.equal(result.ok, true);
  assert.deepEqual(result.save, defaultSave());
  assert.equal(describeSave(result.save), 'Night 1, nothing found yet');
});

test('pasting is forgiving: spaces, line breaks, invisible characters and words around the code', () => {
  const code = makeSaveCode(playedSave());
  const wrapped = code.match(/.{1,30}/g).join('\n');
  const pastes = [
    `  ${code}  `,
    wrapped,
    `${code.slice(0, 20)}​${code.slice(20)}`,
    `Here's my Outpost code: ${code}. Thanks!`,
    `"${code}"`,
    `${code} see you tomorrow`,
    `op1:${code.slice(CODE_PREFIX.length)}`,
  ];
  for (const text of pastes) {
    const result = readSaveCode(text);
    assert.equal(result.ok, true, `should read: ${JSON.stringify(text.slice(0, 40))}`);
    assert.deepEqual(result.save, playedSave());
  }
});

test('a damaged code is turned down with a friendly message', () => {
  const code = makeSaveCode(playedSave());
  const bad = [
    damage(code), // one character changed
    damage(code, CODE_PREFIX.length + 1),
    damage(code, code.length - 1), // the checksum itself
    code.slice(0, -1), // last character lost
    code.slice(0, -10),
    code.slice(0, Math.floor(code.length / 2)), // cut in half
    code.slice(0, 30) + code.slice(31), // a character dropped from the middle
    CODE_PREFIX,
    `${CODE_PREFIX}abc`,
    `${CODE_PREFIX}!!!!!!!!!!!!`,
  ];
  for (const text of bad) {
    const result = readSaveCode(text);
    assert.equal(result.ok, false, `should be turned down: ${text.slice(0, 40)}`);
    assert.equal(result.reason, 'damaged');
    assert.equal(result.message, CODE_ERRORS.damaged);
  }
});

test('a correct checksum around the wrong contents is still turned down', () => {
  // Valid codes made from broken saves: the shape check catches them.
  const broken = [
    { ...playedSave(), logsFound: 'v01' },
    { ...playedSave(), highestNight: -1 },
    { ...playedSave(), currentNight: 1.5 },
    { ...playedSave(), supplyChoices: { two: ['fuel'] } },
    { ...playedSave(), supplyChoices: { 2: 'fuel' } },
    { ...playedSave(), settings: { ...DEFAULT_SETTINGS, textSize: 'huge' } },
    { ...playedSave(), settings: { ...DEFAULT_SETTINGS, graphics: 'ultra' } },
    { ...playedSave(), settings: { ...DEFAULT_SETTINGS, masterVolume: 9 } },
    { ...playedSave(), settings: { ...DEFAULT_SETTINGS, invertY: 'yes' } },
    { ...playedSave(), settings: 'loud' },
    { ...playedSave(), version: 0 },
    { highestNight: 2 }, // no version
    ['not', 'a', 'save'],
    'just text',
    null,
  ];
  for (const data of broken) {
    const result = readSaveCode(makeSaveCode(data));
    assert.equal(result.ok, false, `should be turned down: ${JSON.stringify(data)}`);
    assert.equal(result.reason, 'damaged');
  }
});

test('an older code missing newer fields still restores, with defaults filled in', () => {
  const old = { version: 1, highestNight: 2, currentNight: 2, logsFound: ['v01'], settings: { invertY: true } };
  const result = readSaveCode(makeSaveCode(old));
  assert.equal(result.ok, true);
  assert.deepEqual(result.save, {
    ...defaultSave(),
    highestNight: 2,
    currentNight: 2,
    logsFound: ['v01'],
    settings: { ...DEFAULT_SETTINGS, invertY: true },
  });
});

test('unknown extra fields are left out', () => {
  const result = readSaveCode(makeSaveCode({ ...playedSave(), cheat: 'all nights', settings: { ...playedSave().settings, x: 1 } }));
  assert.equal(result.ok, true);
  assert.deepEqual(result.save, playedSave());
});

test("another game's code is turned down", () => {
  const body = makeSaveCode(playedSave()).slice(CODE_PREFIX.length);
  for (const text of [`GG1:${body}`, `RS1:${body}`]) {
    const result = readSaveCode(text);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'wrongGame');
    assert.match(result.message, /different game/);
  }
});

test('a code from a newer version gets its own message', () => {
  const body = makeSaveCode(playedSave()).slice(CODE_PREFIX.length);
  assert.equal(readSaveCode(`OP2:${body}`).reason, 'newer');
  assert.equal(readSaveCode(makeSaveCode({ ...playedSave(), version: 2 })).reason, 'newer');
});

test('empty and random pastes', () => {
  for (const text of ['', '   ', '\n\n', null, undefined]) assert.equal(readSaveCode(text).reason, 'empty');
  for (const text of ['hello', 'night 3 please', '12345']) assert.equal(readSaveCode(text).reason, 'notACode');
  assert.equal(readSaveCode(`OP1:${'A'.repeat(CONFIG.saveCode.maxPasteChars)}`).reason, 'damaged');
});

test('every error message is plain and friendly', () => {
  for (const message of Object.values(CODE_ERRORS)) {
    assert.ok(message.length > 10);
    assert.ok(!message.includes('—'), 'no em-dashes');
  }
});

test('describeSave reads naturally', () => {
  assert.equal(describeSave(playedSave()), 'Night 2, 4 log entries, 2 notes, 1 tape');
  assert.equal(describeSave({ ...defaultSave(), currentNight: 2, logsFound: ['v01'], notesFound: ['n01'] }), 'Night 2, 1 log entry, 1 note');
});

test('restoreSave writes the whole save at once, and copes with blocked storage', () => {
  const stored = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (k) => (stored.has(k) ? stored.get(k) : null),
      setItem: (k, v) => stored.set(k, v),
    },
  };
  try {
    const save = readSaveCode(makeSaveCode(playedSave())).save;
    assert.equal(restoreSave(save), true);
    assert.deepEqual(JSON.parse(stored.get(SAVE_KEY)), playedSave());
    assert.deepEqual(loadSave(), playedSave()); // reading it back from storage gives the same

    // Storage blocked (private window): restoring still works for this visit.
    window.localStorage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    const fresh = readSaveCode(makeSaveCode(defaultSave())).save;
    assert.equal(restoreSave(fresh), false);
    assert.deepEqual(getSave(), defaultSave());
  } finally {
    delete globalThis.window;
  }
});

test('radio replies must be lists of text', () => {
  for (const bad of [{ radioTags: [3] }, { radioTags: [''] }, { radioSaid: [null] }, { radioSaid: 'hello' }]) {
    const code = makeSaveCode({ ...playedSave(), ...bad });
    assert.equal(readSaveCode(code).ok, false, JSON.stringify(bad));
  }
});
