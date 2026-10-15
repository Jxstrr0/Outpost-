// Doors between rooms. A door is 'locked', 'closed' or 'open'. Which doors a night
// unlocks comes from its JSON; every door not listed there stays locked.

export const DOOR_IDS = ['supply', 'airlockInner', 'airlockSide', 'airlockOuter'];

/** Initial door states for a night definition. */
export function doorsForNight(night) {
  const doors = {};
  for (const id of DOOR_IDS) doors[id] = night.doors?.[id] ?? 'locked';
  return doors;
}

/** Open a closed door or close an open one. Locked doors only report that they are locked. */
export function useDoor(state, { events }, id) {
  const current = state.doors[id];
  if (current === undefined) return false;
  if (current === 'locked') {
    events.emit('door:locked', { id });
    return false;
  }
  state.doors[id] = current === 'open' ? 'closed' : 'open';
  events.emit(state.doors[id] === 'open' ? 'door:opened' : 'door:closed', { id });
  return true;
}

/** Debug: unlock every door. */
export function unlockDoors(state, { events }) {
  for (const id of DOOR_IDS) {
    if (state.doors[id] === 'locked') state.doors[id] = 'closed';
  }
  events.emit('door:unlocked');
}
