// Radio scripts: which lines of a call play, given the replies the player chose before.

import radio from './data/radio.json';

export const CALLS = radio.calls;
export const ECHO_FALLBACK = radio.echo;

/** Lines of a call (or a reply's answer) that apply, given the tags chosen so far. */
export function visibleLines(lines = [], tags = []) {
  return lines.filter((l) => (!l.if || tags.includes(l.if)) && (!l.unless || !tags.includes(l.unless)));
}
