// Game time is counted in minutes from midnight of the night's first day.
// 18:00 is 1080 and 06:00 the next morning is 1800.

/** "20:00" -> 1200, "03:00" -> 1620 (times before noon belong to the next morning). */
export function parseClock(text) {
  const [h, m] = text.split(':').map(Number);
  const minutes = h * 60 + m;
  return h < 12 ? minutes + 24 * 60 : minutes;
}

/** 1620 -> "03:00" */
export function formatClock(minute) {
  const total = Math.floor(minute) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
