// Saving: one localStorage key. Every access is wrapped, because storage can be
// missing or blocked (private windows, previews, cleared site data).

export const SAVE_KEY = 'outpost.save.v1';

export const DEFAULT_SETTINGS = Object.freeze({
  lookSensitivity: 1,
  invertY: false,
  masterVolume: 0.8,
  effectsVolume: 0.9,
  subtitles: true,
  reducedFlicker: false,
  textSize: 'medium', // small | medium | large
});

function defaultSave() {
  return {
    version: 1,
    highestNight: 1,
    currentNight: 1,
    supplyChoices: {}, // { [nightNumber]: ['fuel', 'fuses'] } chosen before that night
    logsFound: [],
    notesFound: [],
    endingsSeen: [],
    radioTags: [], // replies chosen on the radio, which later calls react to
    radioSaid: [], // the last few things the player said on the radio
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

export function writeSave() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(current));
  } catch {
    // Storage unavailable: the game still plays, it just won't remember.
  }
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
