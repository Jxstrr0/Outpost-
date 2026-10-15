// The station's rooms as plain rectangles, and how they connect. No Three.js here, so
// audio, tests and systems can ask "which room is this point in?" cheaply.
// North is -z. These match the walls drawn in rooms/shell.js.

export const ROOMS = {
  main: { name: 'the main room', minX: -11, maxX: 0, minZ: -5, maxZ: 5 },
  generator: { name: 'the generator room', minX: 0, maxX: 5, minZ: -5, maxZ: 5 },
  supply: { name: 'the supply room', minX: 1, maxX: 5, minZ: 5, maxZ: 9 },
  airlock: { name: 'the airlock', minX: -2, maxX: 1, minZ: 5, maxZ: 7 },
};

export const OUTSIDE = 'outside';

/** Which openings join which rooms. `door` is a door id, or null for an open doorway. */
export const ROOM_LINKS = [
  { a: 'main', b: 'generator', door: null },
  { a: 'generator', b: 'supply', door: 'supply' },
  { a: 'supply', b: 'airlock', door: 'airlockSide' },
  { a: 'airlock', b: 'main', door: 'airlockInner' },
  { a: 'airlock', b: OUTSIDE, door: 'airlockOuter' },
];

/** The room a point is in, or 'outside'. */
export function roomAt(x, z) {
  for (const [id, r] of Object.entries(ROOMS)) {
    if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) return id;
  }
  return OUTSIDE;
}

/**
 * How many open openings a sound has to pass through to get from one room to another.
 * 0 for the same room; Infinity when every route is shut.
 * @param {string} from
 * @param {string} to
 * @param {Record<string, string>} doors - door states from game state
 */
export function openHops(from, to, doors = {}) {
  if (from === to) return 0;
  const seen = new Set([from]);
  let frontier = [from];
  for (let hops = 1; frontier.length; hops++) {
    const next = [];
    for (const room of frontier) {
      for (const link of ROOM_LINKS) {
        if (link.door && doors[link.door] !== 'open') continue;
        const other = link.a === room ? link.b : link.b === room ? link.a : null;
        if (!other || seen.has(other)) continue;
        if (other === to) return hops;
        seen.add(other);
        next.push(other);
      }
    }
    frontier = next;
  }
  return Infinity;
}
