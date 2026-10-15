import { CONFIG } from '../config.js';
import { changeSanity } from './sanity.js';

/** Weather readings open on schedule, then close; logging one recovers a keeper log. */
export function updateDuties(state, dt, { events, rng }) {
  for (const reading of state.readings) {
    // An iced antenna holds the window open: the trip out costs time, not the reading.
    if (reading.status === 'open' && state.antennaIced) reading.closes += dt;
    if (reading.status === 'upcoming' && state.minute >= reading.closes) {
      // Skipped past the whole window (debug time skips): it was never seen.
      reading.status = 'missed';
      events.emit('reading:missed', { reading });
    } else if (reading.status === 'upcoming' && state.minute >= reading.due) {
      reading.status = 'open';
      reading.values = makeReadingValues(rng, reading.anomaly);
      events.emit('reading:open', { reading });
    } else if (reading.status === 'open' && state.minute >= reading.closes) {
      reading.status = 'missed';
      events.emit('reading:missed', { reading });
    }
  }
}

/** Instrument values for one reading. An anomaly is a pressure drop the north mast sees alone. */
function makeReadingValues(rng, anomaly) {
  const south = rng.range(978, 992);
  const north = anomaly ? south - rng.range(6.5, 11.5) : south + rng.range(-0.4, 0.4);
  return {
    outsideTemp: Math.round(rng.range(-34, -24) * 10) / 10,
    windKmh: Math.round(rng.range(38, 96)),
    windDir: rng.pick(['N', 'NNE', 'NE', 'NNW', 'NW']),
    pressureSouth: Math.round(south * 10) / 10,
    pressureNorth: Math.round(north * 10) / 10,
    visibilityM: Math.round(rng.range(8, 60)),
  };
}

export function openReading(state) {
  return state.readings.find((r) => r.status === 'open') || null;
}

export function nextUpcomingReading(state) {
  return state.readings.find((r) => r.status === 'upcoming') || null;
}

/** Log the open reading at the met console. Returns the recovered log id, if any. */
export function logReading(state, { events }) {
  const reading = openReading(state);
  if (!reading) return null;
  if (!state.consolesPowered) {
    events.emit('console:unpowered');
    return null;
  }
  if (state.antennaIced) {
    events.emit('console:static');
    return null;
  }
  reading.status = 'logged';
  changeSanity(state, CONFIG.sanity.readingBonus, { events });
  const logId = reading.logId;
  if (logId) {
    state.logsRecovered.push(logId);
    state.logQueue = state.logQueue.filter((id) => id !== logId);
  }
  events.emit('reading:logged', { reading, logId });
  if (logId) events.emit('log:recovered', { id: logId });
  return logId;
}

/** Picking up a handwritten note. */
export function recordNote(state, { events }, noteId) {
  if (state.notesFound.includes(noteId)) return false;
  state.notesFound.push(noteId);
  events.emit('note:found', { id: noteId });
  return true;
}

/** Playing the tape left on Vance's recorder. */
export function recordTape(state, { events }, tapeId) {
  if (state.tapesFound.includes(tapeId)) return false;
  state.tapesFound.push(tapeId);
  events.emit('tape:found', { id: tapeId });
  return true;
}

export const READING_WINDOW = CONFIG.duties.readingWindow;
