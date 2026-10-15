// Seeded randomness, so a night can be replayed exactly from its seed.

/** mulberry32: small, fast, good enough for gameplay. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {number} seed
 */
export function createRng(seed) {
  const next = mulberry32(seed);
  return {
    seed,
    /** Float in [0, 1). */
    next,
    /** True with probability p. */
    chance(p) {
      return next() < p;
    },
    /** Float in [min, max). */
    range(min, max) {
      return min + (max - min) * next();
    },
    /** Integer in [min, max]. */
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
  };
}

/** Stable seed for a night, so retries replay the same failures for the same actions. */
export function nightSeed(nightNumber, baseSeed = 0) {
  return (baseSeed || 0x4b345f00) ^ Math.imul(nightNumber + 1, 2654435761);
}
