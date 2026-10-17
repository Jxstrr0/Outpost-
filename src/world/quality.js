// Graphics quality: how sharp the picture is, whether surfaces show relief, whether the
// flashlight casts shadows and how much snow falls. The player picks Low, Medium or High
// in Settings, or Auto, which starts on a level that suits the device and steps down
// one level at a time while play stays choppy. Auto never steps back up by itself.

import { CONFIG } from '../config.js';
import { setSurfaceDetail } from './textures.js';

const Q = CONFIG.render.quality;
export const QUALITY_LEVELS = ['low', 'medium', 'high'];

/** The level Auto starts on: phones lower than desktops, weak phones lower still. */
export function startingLevel({ touch, memoryGb }) {
  if (!touch) return Q.autoDesktop;
  if (memoryGb && memoryGb <= Q.weakMemoryGb) return Q.autoWeakPhone;
  return Q.autoPhone;
}

/** The level below this one, or the same level if it is already the lowest. */
export function levelBelow(level) {
  return QUALITY_LEVELS[Math.max(0, QUALITY_LEVELS.indexOf(level) - 1)];
}

/**
 * Watches frame times during play. `frame(seconds)` returns true when the last sample
 * averaged below the target frame rate. Frames soon after `settle()` are not counted.
 */
export function createFpsWatch() {
  let settleLeft = Q.autoSettleSeconds;
  let frames = 0;
  let seconds = 0;
  return {
    settle() {
      settleLeft = Q.autoSettleSeconds;
      frames = 0;
      seconds = 0;
    },
    frame(dt) {
      if (dt > Q.autoMaxGapSeconds) return false;
      if (settleLeft > 0) {
        settleLeft -= dt;
        return false;
      }
      frames++;
      seconds += dt;
      if (seconds < Q.autoSampleSeconds) return false;
      const slow = frames / seconds < Q.autoMinFps;
      frames = 0;
      seconds = 0;
      return slow;
    },
  };
}

function deviceMemory() {
  try {
    return navigator.deviceMemory || 0;
  } catch {
    return 0;
  }
}

/** Applies a quality level to the renderer, flashlight, surfaces and snow. */
export function createQuality({ renderer, flashlight, exterior, touch }) {
  let autoLevel = startingLevel({ touch, memoryGb: deviceMemory() });
  let choice = 'auto';
  let level = null;
  const watch = createFpsWatch();

  function apply(next) {
    if (next === level) return;
    level = next;
    const L = Q.levels[level];
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, L.pixelRatio));
    flashlight.setShadows(L.shadows);
    exterior.setSnowAmount(L.snow);
    setSurfaceDetail(L.surfaces);
    watch.settle();
  }

  return {
    /** Follow the Graphics setting: 'auto' or one of QUALITY_LEVELS. */
    set(graphics) {
      choice = QUALITY_LEVELS.includes(graphics) ? graphics : 'auto';
      apply(choice === 'auto' ? autoLevel : choice);
    },
    /** The level in use right now. */
    level: () => level,
    /** The level Auto has settled on, for the Settings screen. */
    autoLevel: () => autoLevel,
    /** Call every frame with the real frame time. Auto steps down if play is choppy. */
    update(dt, playing) {
      if (!playing) {
        watch.settle();
        return;
      }
      if (choice !== 'auto' || !watch.frame(dt) || autoLevel === QUALITY_LEVELS[0]) return;
      autoLevel = levelBelow(autoLevel);
      apply(autoLevel);
    },
  };
}
