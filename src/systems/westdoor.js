// The west door on the last night. It is frozen shut every other night. From 03:00 on
// night 5 the ice lets go and a voice that sounds like Vance calls through it. Opening it
// and walking out into the snow is the Answer ending; at 04:00 it freezes again.

import { CONFIG } from '../config.js';
import { parseClock } from '../core/clock.js';

const E = CONFIG.endings;

export function updateWestDoor(state, dt, { events, night }) {
  const wd = night?.westDoor;
  if (!wd) return;
  const opens = parseClock(wd.opens);
  const closes = parseClock(wd.closes);
  const doors = state.doors;
  const inWindow = state.minute >= opens && state.minute < closes;

  if (inWindow && doors.west === 'locked' && !state.westDoor.freed) freeWestDoor(state, { events });

  // The voice keeps calling while the door is shut.
  const lines = wd.voice || [];
  if (state.westDoor.freed && inWindow && doors.west !== 'open' && state.minute >= state.westDoor.nextVoice) {
    const index = state.westDoor.voiceIndex % Math.max(1, lines.length);
    if (lines.length) events.emit('westDoor:voice', { text: lines[index], index });
    state.westDoor.voiceIndex++;
    state.westDoor.nextVoice = state.minute + E.voiceEvery;
  }

  if (!inWindow && state.minute >= closes && doors.west === 'closed') {
    doors.west = 'locked';
    events.emit('westDoor:frozen');
  }

  // Opened in the window: walking out into it is the answer. Going back in lets it fade.
  if (doors.west === 'open' && state.westDoor.freed) state.westDoor.opened = true;
  const out = state.westDoor.opened && state.room === 'outside';
  const before = state.westDoor.answer;
  state.westDoor.answer = Math.min(1, Math.max(0, before + (out ? dt / E.answerMinutes : -dt / E.answerFadeMinutes)));
  if (before === 0 && state.westDoor.answer > 0) events.emit('westDoor:walking');
  if (state.westDoor.answer >= 1 && !state.outcome) {
    state.outcome = 'answered';
    events.emit('night:answered', { night: state.night });
  }
}

/** The ice lets go of the west door. Debug can do this at any time. */
export function freeWestDoor(state, { events }) {
  if (state.westDoor.freed) return false;
  state.westDoor.freed = true;
  state.westDoor.nextVoice = state.minute;
  if (state.doors.west === 'locked') state.doors.west = 'closed';
  events.emit('westDoor:free');
  return true;
}
