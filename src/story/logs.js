// Keeper log helpers for the terminal panel.

import { LOGS, NOTES } from './nights.js';

/** Log entries for a night, recovered or still corrupted, in order. */
export function logEntriesForNight(night, recoveredIds) {
  return (night.logs || []).map((id) => ({
    id,
    recovered: recoveredIds.includes(id),
    ...LOGS[id],
  }));
}

export function getNote(id) {
  return NOTES[id];
}
