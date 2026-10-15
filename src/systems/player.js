// Where the player is, as game state. The controller works out the room from the player's
// position each frame; this is the one place that writes it, so systems can use it.

export function setPlayerRoom(state, room) {
  if (state && state.room !== room) state.room = room;
}
