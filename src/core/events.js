// A tiny event bus. Systems emit, the world, audio and UI listen.

/** @typedef {(payload?: any) => void} Listener */

export function createEventBus() {
  /** @type {Map<string, Set<Listener>>} */
  const listeners = new Map();

  return {
    /** Subscribe; returns an unsubscribe function. */
    on(name, fn) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(fn);
      return () => listeners.get(name)?.delete(fn);
    },
    off(name, fn) {
      listeners.get(name)?.delete(fn);
    },
    emit(name, payload) {
      const set = listeners.get(name);
      if (set) for (const fn of [...set]) fn(payload);
      const any = listeners.get('*');
      if (any) for (const fn of [...any]) fn({ name, payload });
    },
    clear() {
      listeners.clear();
    },
  };
}

/** The game's shared bus. */
export const events = createEventBus();
