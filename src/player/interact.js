// Finds what the player is looking at, and handles tap and hold to use.

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { describeAction, performAction } from './actions.js';

// Small things lying on furniture win over the furniture's own interaction box.
const PICKUPS = new Set(['note', 'tape', 'mug']);

function visibleInScene(object) {
  for (let o = object; o; o = o.parent) if (!o.visible) return false;
  return true;
}

export function createInteractor(camera, station) {
  const raycaster = new THREE.Raycaster();
  raycaster.far = CONFIG.player.interactDistance;
  const center = new THREE.Vector2(0, 0);
  let holdTime = 0;
  let holdTarget = null;

  return {
    target: null,
    action: null,
    holdProgress: 0,

    update(dt, input, game) {
      raycaster.setFromCamera(center, camera);
      const targets = [...station.occluders, ...station.interactables.map((i) => i.hitbox)];
      const hits = raycaster.intersectObjects(targets, false);
      // The nearest thing wins, except that small pickups lying on furniture are found
      // through the furniture's own box (and a little way past its blocker).
      let found = null;
      let blockedAt = null;
      for (const hit of hits) {
        if (!visibleInScene(hit.object)) continue;
        const entry = hit.object.userData.interactable;
        if (blockedAt === null && !entry) blockedAt = hit.distance;
        if (blockedAt !== null && hit.distance > blockedAt + CONFIG.player.pickupThroughProps) break;
        if (!entry) continue;
        if (PICKUPS.has(entry.kind)) {
          found = entry;
          break;
        }
        if (!found && blockedAt === null) found = entry;
      }
      this.target = found;
      this.action = found ? describeAction(found, game.state) : null;

      if (!this.action || this.action.disabled) {
        holdTime = 0;
        holdTarget = null;
        this.holdProgress = 0;
        return;
      }

      if (this.action.hold) {
        if (input.useDown && (holdTarget === found || input.usePressed)) {
          holdTarget = found;
          holdTime += dt;
          const needed = this.action.holdSeconds ?? CONFIG.player.holdToUseSeconds;
          this.holdProgress = Math.min(1, holdTime / needed);
          if (holdTime >= needed) {
            holdTime = 0;
            holdTarget = null;
            this.holdProgress = 0;
            input.useDown = false;
            performAction(found, game);
          }
        } else {
          holdTime = 0;
          holdTarget = null;
          this.holdProgress = 0;
        }
      } else if (input.usePressed) {
        performAction(found, game);
      }
    },
  };
}
