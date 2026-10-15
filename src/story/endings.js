// Which ending the campaign gets, and the keeper log the Answer ending writes in the
// player's own words. Plain functions over plain data, so tests can run them.

/** True once every log entry and every note across the campaign has been found. */
export function foundEverything(nights, logsFound, notesFound) {
  const logs = new Set(logsFound);
  const notes = new Set(notesFound);
  return nights.every((n) => (n.logs || []).every((id) => logs.has(id)) && (n.notes || []).every((note) => notes.has(note.id)));
}

/**
 * The ending for a finished campaign: 'answer' if the player walked out of the west door,
 * otherwise 'record' if they found everything, otherwise 'relief'.
 */
export function pickEnding(outcome, everything) {
  if (outcome === 'answered') return 'answer';
  return everything ? 'record' : 'relief';
}

/**
 * The new keeper log entry the Answer ending closes on, built from what the player said
 * on the radio over the campaign.
 * @param {{ logOpening: string, logNoWords: string, logClosing: string }} text
 * @param {string[]} said
 */
export function answerLog(text, said = []) {
  const words = [...new Set(said.map((s) => s.trim()).filter(Boolean))].map((s) => (/[.!?]$/.test(s) ? s : `${s}.`));
  const middle = words.length ? `I told them: ${words.join(' ')}` : text.logNoWords;
  return `${text.logOpening} ${middle} ${text.logClosing}`;
}
