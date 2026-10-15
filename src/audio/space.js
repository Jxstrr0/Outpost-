// Where a sound is, as numbers for the mixer and words for subtitles. No Web Audio here,
// so it can be tested.

import { CONFIG } from '../config.js';
import { ROOMS, OUTSIDE, openHops } from '../world/layout.js';

const A = CONFIG.audio;

/** 0 when the sound is in the listener's room, up to 1 when walls are in the way. */
export function occlusionBetween(listenerRoom, sourceRoom, doors) {
  const hops = openHops(listenerRoom, sourceRoom, doors);
  return hops < A.occlusionByHops.length ? A.occlusionByHops[hops] : 1;
}

/** Low-pass cutoff (Hz) and gain for an occlusion amount. */
export function occlusionMix(amount) {
  const cutoff = A.clearCutoff * Math.pow(A.occludedCutoff / A.clearCutoff, amount);
  const gain = 1 - (1 - A.occludedGain) * amount;
  return { cutoff, gain };
}

/**
 * Where a sound is relative to the listener, in words: "behind you, in the generator room".
 * @param {{ x: number, z: number, fx: number, fz: number, room: string }} listener - position, facing (unit xz) and room
 * @param {{ x: number, z: number, room: string }} source
 */
export function describeDirection(listener, source) {
  const dx = source.x - listener.x;
  const dz = source.z - listener.z;
  const dist = Math.hypot(dx, dz);
  let dir;
  if (dist < 1.2) {
    dir = 'right beside you';
  } else {
    // Right of the facing direction is (-fz, fx) in this world (y up, north is -z).
    const ahead = dx * listener.fx + dz * listener.fz;
    const right = dx * -listener.fz + dz * listener.fx;
    const angle = Math.atan2(right, ahead);
    if (Math.abs(angle) <= Math.PI / 4) dir = 'ahead';
    else if (Math.abs(angle) >= (Math.PI * 3) / 4) dir = 'behind you';
    else dir = angle > 0 ? 'to your right' : 'to your left';
  }
  if (source.room === listener.room) return dir;
  const where = source.room === OUTSIDE ? 'outside' : `in ${ROOMS[source.room]?.name ?? 'the station'}`;
  return `${dir}, ${where}`;
}
