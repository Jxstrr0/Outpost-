// Radio check-ins (night 2+). A call rings at the radio set in the supply room for a while;
// answering it opens the conversation, and the reply the player picks is remembered as a tag
// that later calls can react to. Missing a call costs story, never the night.

import { CONFIG } from '../config.js';
import { parseClock } from '../core/clock.js';
import { changeSanity } from './sanity.js';

/**
 * @typedef {'upcoming' | 'ringing' | 'answered' | 'missed'} CallStatus
 * @typedef {{ id: string, at: number, closes: number, status: CallStatus, choice: number | null }} Call
 */

/** Calls scheduled by a night definition: `"radio": [{ "id": "n2a", "time": "21:00" }]`. */
export function callsForNight(night) {
  return (night.radio || []).map((c) => {
    const at = parseClock(c.time);
    return { id: c.id, at, closes: at + CONFIG.radio.ringMinutes, status: 'upcoming', choice: null };
  });
}

export function ringingCall(state) {
  return state.radio.calls.find((c) => c.status === 'ringing') || null;
}

/** A call that was picked up but not yet replied to. */
export function openCall(state) {
  return state.radio.calls.find((c) => c.status === 'answered' && c.choice === null) || null;
}

export function updateRadio(state, dt, { events }) {
  for (const call of state.radio.calls) {
    if (call.status === 'upcoming' && state.minute >= call.closes) {
      call.status = 'missed';
      events.emit('radio:missed', { id: call.id });
    } else if (call.status === 'upcoming' && state.minute >= call.at) {
      call.status = 'ringing';
      events.emit('radio:ringing', { id: call.id });
    } else if (call.status === 'ringing' && state.minute >= call.closes) {
      call.status = 'missed';
      events.emit('radio:missed', { id: call.id });
    }
  }
}

/** Pick up the ringing call. The radio runs off the station battery. */
export function answerCall(state, { events }) {
  const call = ringingCall(state);
  if (!call) return null;
  if (state.power <= 0) {
    events.emit('radio:unpowered');
    return null;
  }
  call.status = 'answered';
  changeSanity(state, CONFIG.sanity.radioBonus, { events });
  events.emit('radio:answered', { id: call.id });
  return call;
}

/**
 * Choose a reply in an answered call.
 * @param {{ text: string, tag?: string }} reply - the reply as written in radio.json
 */
export function chooseReply(state, { events }, callId, index, reply) {
  const call = state.radio.calls.find((c) => c.id === callId);
  if (!call || call.status !== 'answered' || call.choice !== null) return false;
  call.choice = index;
  if (reply?.tag && !state.radio.tags.includes(reply.tag)) state.radio.tags.push(reply.tag);
  if (reply?.text) state.radio.said.push(reply.text);
  events.emit('radio:replied', { id: callId, index, tag: reply?.tag ?? null });
  return true;
}

/** Debug: ring the next call that hasn't happened yet, right now. */
export function ringNow(state, { events }) {
  if (ringingCall(state)) return false;
  const call = state.radio.calls.find((c) => c.status === 'upcoming');
  if (!call) return false;
  call.at = state.minute;
  call.closes = state.minute + CONFIG.radio.ringMinutes;
  call.status = 'ringing';
  events.emit('radio:ringing', { id: call.id });
  return true;
}
