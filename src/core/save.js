// Saving: one localStorage key. Every access is wrapped, because storage can be
// missing or blocked (private windows, previews, cleared site data).
// Save codes (core/savecode.js) turn this same save into text and back.

export const SAVE_KEY = 'outpost.save.v1';
export const SAVE_VERSION = 1;
export const TEXT_SIZES = ['small', 'medium', 'large'];

export const DEFAULT_SETTINGS = Object.freeze({
  lookSensitivity: 1,
  invertY: false,
  masterVolume: 0.8,
  effectsVolume: 0.9,
  subtitles: true,
  reducedFlicker: false,
  textSize: 'medium', // small | medium | large
});

/**
 * A brand new save. Adding a field? Give it a default here; save codes pick it up
 * automatically (core/savecode.js checks it has the same type as this default).
 */
export function defaultSave() {
  return {
    version: SAVE_VERSION,
    highestNight: 1,
    currentNight: 1,
    supplyChoices: {}, // { [nightNumber]: ['fuel', 'fuses'] } chosen before that night
    logsFound: [],
    notesFound: [],
    endingsSeen: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

/** @type {ReturnType<typeof defaultSave>} */
let current = defaultSave();

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      current = {
        ...defaultSave(),
        ...parsed,
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
      };
    }
  } catch {
    current = defaultSave();
  }
  return current;
}

export function getSave() {
  return current;
}

/** Merge changes into the save and write it. */
export function updateSave(changes) {
  current = { ...current, ...changes };
  writeSave();
  return current;
}

export function updateSettings(changes) {
  current = { ...current, settings: { ...current.settings, ...changes } };
  writeSave();
  return current.settings;
}

/** Write the save. Returns false if this browser won't store it. */
export function writeSave() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(current));
    return true;
  } catch {
    // Storage unavailable: the game still plays, it just won't remember.
    return false;
  }
}

/**
 * Replace everything with a save read from a save code. The code has already been
 * fully checked (readSaveCode), so this is one write of the whole save, never half.
 * Returns false if this browser won't store it; the restored progress still
 * works until the page is closed.
 */
export function restoreSave(save) {
  current = { ...defaultSave(), ...save, settings: { ...DEFAULT_SETTINGS, ...save.settings } };
  return writeSave();
}

/** Start a new campaign but keep settings. */
export function resetCampaign() {
  const settings = current.settings;
  current = { ...defaultSave(), settings };
  writeSave();
  return current;
}

/** Add ids to a list in the save without duplicates. */
export function rememberFound(key, ids) {
  const set = new Set(current[key] || []);
  for (const id of ids) set.add(id);
  updateSave({ [key]: [...set] });
}
