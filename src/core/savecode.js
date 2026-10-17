// Save codes: all saved progress and settings as one line of text, so a player can
// back it up (notes app, a message to themselves) and restore it on another phone
// or browser. Nothing is sent anywhere: codes are made and read inside the page.
//
// A code looks like  OP1:eyJ2ZXJzaW9uIjox...Ab3_xQ
//   OP1:      Outpost, save code format 1. A future format would be OP2:.
//   the body  the save as JSON, turned into base64url (letters, digits, - and _ only),
//             so chat apps and notes can't mangle it.
//   the end   a short checksum worked out from the body. If any character is lost
//             or changed, it no longer matches and the code is turned down.
//
// Reading a code never writes anything. It checks the checksum, then checks every
// field has the right type, and only then hands back a clean save for restoreSave().

import { CONFIG } from '../config.js';
import { SAVE_VERSION, DEFAULT_SETTINGS, TEXT_SIZES, GRAPHICS, defaultSave } from './save.js';

const CODE_FORMAT = 1;
export const CODE_PREFIX = `OP${CODE_FORMAT}:`;

/** What the player sees when a code can't be used. */
export const CODE_ERRORS = {
  empty: 'Paste a save code into the box first.',
  notACode: "That doesn't look like a save code. Outpost save codes start with OP1:",
  wrongGame: "That's a save code for a different game. Outpost save codes start with OP1:",
  newer: 'That code comes from a newer version of Outpost. Reload the page to update the game, then try again.',
  damaged: 'That code is damaged or cut short. Copy the whole thing again, from OP1: right to the end, and paste it here.',
};

// ---------- Text <-> base64url ----------

const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text); // UTF-8, so any character survives
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Throws if the body isn't valid base64url or valid UTF-8. */
function fromBase64Url(body) {
  const padding = '='.repeat((4 - (body.length % 4)) % 4); // base64 comes in blocks of 4
  const binary = atob(body.replace(/-/g, '+').replace(/_/g, '/') + padding);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

/** FNV-1a hash of the body, written as a few base64url characters. */
function checksum(body) {
  let h = 0x811c9dc5; // FNV-1a starting value
  for (let i = 0; i < body.length; i++) {
    h ^= body.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0; // FNV prime, kept as an unsigned 32-bit number
  }
  let out = '';
  for (let i = 0; i < CONFIG.saveCode.checksumChars; i++) {
    out += B64URL[h % B64URL.length];
    h = Math.floor(h / B64URL.length);
  }
  return out;
}

// ---------- Making and reading codes ----------

/** Turn a save into a code. */
export function makeSaveCode(save) {
  const body = toBase64Url(JSON.stringify(save));
  return CODE_PREFIX + body + checksum(body);
}

/**
 * Read a pasted code. Never throws and never writes anything.
 * @returns {{ ok: true, save: object } | { ok: false, reason: string, message: string }}
 */
export function readSaveCode(text) {
  const fail = (reason) => ({ ok: false, reason, message: CODE_ERRORS[reason] });
  // Chat apps and notes can add invisible characters; drop them first.
  const raw = String(text ?? '').replace(/[​-‍⁠﻿]/g, '');
  if (!raw.trim()) return fail('empty');
  if (raw.length > CONFIG.saveCode.maxPasteChars) return fail('damaged');

  // The prefix can sit anywhere ("here's my code: OP1:..."). Upper or lower case is fine,
  // because some keyboards change the first letters.
  const found = /(^|[^A-Za-z0-9])OP(\d+):/i.exec(raw);
  if (!found) {
    const otherGame = /(^|[^A-Za-z0-9])[A-Za-z]{2,5}\d+:\s*[A-Za-z0-9_-]{8,}/.test(raw);
    return fail(otherGame ? 'wrongGame' : 'notACode');
  }
  const format = Number(found[2]);
  if (format > CODE_FORMAT) return fail('newer');
  if (format !== CODE_FORMAT) return fail('damaged');

  const body = findBody(raw.slice(found.index + found[0].length));
  if (body === null) return fail('damaged');

  let data;
  try {
    data = JSON.parse(fromBase64Url(body));
  } catch {
    return fail('damaged');
  }
  if (isObject(data) && Number.isInteger(data.version) && data.version > SAVE_VERSION) return fail('newer');
  const save = cleanSave(data);
  return save ? { ok: true, save } : fail('damaged');
}

/**
 * The code's body, from the text after "OP1:", or null if no checksum matches.
 * A chat app may break a long code over several lines, and words can follow it
 * ("OP1:... thanks"), so pieces are joined one at a time until the checksum fits.
 * The code also ends at the first character it can't contain (a full stop, a quote).
 */
function findBody(afterPrefix) {
  const n = CONFIG.saveCode.checksumChars;
  let chars = '';
  for (const piece of afterPrefix.split(/\s+/)) {
    const run = /^[A-Za-z0-9_-]*/.exec(piece)[0];
    chars += run;
    if (chars.length > n && checksum(chars.slice(0, -n)) === chars.slice(-n)) return chars.slice(0, -n);
    if (run.length < piece.length) break;
  }
  return null;
}

// ---------- Checking what's inside ----------

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNight = (v) => Number.isInteger(v) && v >= 1;
const isIdList = (v) => Array.isArray(v) && v.every((id) => typeof id === 'string' && id.length > 0);
const isBool = (v) => typeof v === 'boolean';
const isVolume = (v) => Number.isFinite(v) && v >= 0 && v <= 1;
const sameType = (v, example) => typeof v === typeof example && Array.isArray(v) === Array.isArray(example);

/** Checks for each save field. A field without one here just needs the same type as its default. */
const FIELD_CHECKS = {
  highestNight: isNight,
  currentNight: isNight,
  supplyChoices: (v) => isObject(v) && Object.entries(v).every(([night, ids]) => /^\d+$/.test(night) && isIdList(ids)),
  logsFound: isIdList,
  notesFound: isIdList,
  tapesFound: isIdList,
  endingsSeen: isIdList,
  radioTags: isIdList,
  radioSaid: (v) => Array.isArray(v) && v.every((line) => typeof line === 'string'),
};

const SETTING_CHECKS = {
  lookSensitivity: (v) => Number.isFinite(v) && v > 0,
  invertY: isBool,
  masterVolume: isVolume,
  effectsVolume: isVolume,
  subtitles: isBool,
  reducedFlicker: isBool,
  textSize: (v) => TEXT_SIZES.includes(v),
  graphics: (v) => GRAPHICS.includes(v),
};

/**
 * Build a clean save from decoded data, or null if anything is the wrong shape.
 * A field missing from the code (an older code) gets its default; a field that is
 * there but wrong turns the whole code down; anything unknown is left out.
 */
export function cleanSave(data) {
  if (!isObject(data) || data.version !== SAVE_VERSION) return null;
  const save = defaultSave();
  for (const key of Object.keys(save)) {
    if (key === 'version' || key === 'settings' || data[key] === undefined) continue;
    const check = FIELD_CHECKS[key] || ((v) => sameType(v, save[key]));
    if (!check(data[key])) return null;
    save[key] = data[key];
  }
  if (data.settings !== undefined) {
    if (!isObject(data.settings)) return null;
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      const value = data.settings[key];
      if (value === undefined) continue;
      const check = SETTING_CHECKS[key] || ((v) => sameType(v, DEFAULT_SETTINGS[key]));
      if (!check(value)) return null;
      save.settings[key] = value;
    }
  }
  return save;
}

/** A short line about a save, for the restore screen: "Night 2, 3 log entries, 1 note". */
export function describeSave(save) {
  const logs = save.logsFound.length;
  const notes = save.notesFound.length;
  const tapes = save.tapesFound?.length || 0;
  const parts = [`Night ${save.currentNight}`];
  if (logs) parts.push(`${logs} log ${logs === 1 ? 'entry' : 'entries'}`);
  if (notes) parts.push(`${notes} ${notes === 1 ? 'note' : 'notes'}`);
  if (tapes) parts.push(`${tapes} ${tapes === 1 ? 'tape' : 'tapes'}`);
  if (!logs && !notes && !tapes) parts.push('nothing found yet');
  return parts.join(', ');
}
