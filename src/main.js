// Boot, renderer, game flow and the main loop.

import './ui/styles.css';
import * as THREE from 'three';

import { CONFIG } from './config.js';
import { events } from './core/events.js';
import { createRng, nightSeed } from './core/rng.js';
import { createState } from './core/state.js';
import { loadSave, getSave, updateSave, updateSettings, resetCampaign, rememberFound, restoreSave } from './core/save.js';
import { makeSaveCode, readSaveCode, describeSave } from './core/savecode.js';
import { isDebug, createDebugPanel } from './core/debug.js';
import {
  stepSimulation,
  setMeter,
  forceOutcome,
  triggerFailure,
  jumpTo,
  unlockDoors,
  toggleFlashlight,
  giveFlashlight,
  fillPockets,
  ringNow,
  sanityShock,
  setPlayerRoom,
  startGust,
  freeWestDoor,
  FAILURE_IDS,
} from './systems/index.js';
import { roomAt } from './world/layout.js';
import { ECHO_FALLBACK } from './story/radio.js';
import { buildStation } from './world/station.js';
import { DETAIL_LEVELS, setSurfaceDetail, surfaceDetail } from './world/textures.js';
import { createQuality, QUALITY_LEVELS } from './world/quality.js';
import { createFlashlight } from './world/flashlight.js';
import { createPlayer, createInputState } from './player/controller.js';
import { attachDesktopInput } from './player/input-desktop.js';
import { attachTouchInput, isTouchDevice } from './player/input-touch.js';
import { createInteractor } from './player/interact.js';
import { createAudio } from './audio/audio.js';
import { createHud } from './ui/hud.js';
import { createToasts, bindToasts } from './ui/toasts.js';
import { createPanels } from './ui/panels.js';
import { createMenus } from './ui/menus.js';
import { NIGHTS, LAST_NIGHT, LOGS, getNight, applySupplies } from './story/nights.js';
import { attachScripted, SCRIPTED_EVENTS } from './story/scripted.js';
import { foundEverything, pickEnding, answerLog } from './story/endings.js';
import ENDINGS from './story/data/endings.json';

const T = CONFIG.time;
const R = CONFIG.render;

// ---------- Renderer, scene, camera ----------

const canvas = document.getElementById('scene');
const uiRoot = document.getElementById('ui');
let touchMode = isTouchDevice();

const renderer = new THREE.WebGLRenderer({ canvas, antialias: !touchMode, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
// Only the flashlight casts shadows, and not on Low graphics. The pixel ratio is set by
// the Graphics setting (world/quality.js).
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(R.fogColor);
scene.fog = new THREE.Fog(R.fogColor, R.fogNear, R.fogFar);

const camera = new THREE.PerspectiveCamera(R.fov, 1, 0.05, 60);
scene.add(camera);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------- Save and settings ----------

loadSave();
const settings = () => getSave().settings;
const TEXT_SCALE = { small: 0.88, medium: 1, large: 1.2 };
function applySettings() {
  document.documentElement.style.setProperty('--text-scale', String(TEXT_SCALE[settings().textSize] || 1));
  audio.applySettings(settings());
  quality.set(settings().graphics);
}

// ---------- World, player, UI ----------

const station = buildStation(scene, camera, { getLogTitle: (id) => LOGS[id]?.title ?? id });
const flashlight = createFlashlight(camera);
const quality = createQuality({ renderer, flashlight, exterior: station.exterior, touch: touchMode });
const player = createPlayer(camera);
const input = createInputState();
const interactor = createInteractor(camera, station);
const hud = createHud(uiRoot);
const toasts = createToasts(uiRoot);
bindToasts(events, toasts);
const audio = createAudio(camera, scene, station.anchors, events, {
  subtitle: (text) => {
    if (settings().subtitles && (game.mode === 'playing' || game.mode === 'panel')) toasts.push(text, 'subtitle');
  },
});
const menus = createMenus(uiRoot);

const params = new URLSearchParams(window.location.search);
const debugSeed = params.has('seed') ? Number(params.get('seed')) : null;

/** Everything the current night needs. `state` is the one game state object. */
const game = {
  mode: 'title', // title | card | playing | panel | paused | summary | lost | end
  state: null,
  night: null,
  ctx: null,
  speed: 1,
  failuresOn: true,
  detachScripted: null,
  ui: { openPanel },
};

const panels = createPanels(uiRoot, { getGame: () => game, getSave, onClose: closePanel });

const desktop = attachDesktopInput(canvas, input, {
  isPlaying: () => game.mode === 'playing',
  getSettings: settings,
  onPause: pause,
  onLockChange: () => {},
});
const touch = attachTouchInput(uiRoot, input, { getSettings: settings, onPause: pause });
window.addEventListener(
  'touchstart',
  () => {
    if (!touchMode) {
      touchMode = true;
      if (game.mode === 'playing') touch.show(true);
    }
  },
  { passive: true }
);

events.on('scripted:anomaly', () => station.lighting.anomaly());
// Night 3: a second set of footprints beside yours in the snow.
events.on('scripted:footprints', () => station.exterior.addSecondSet());
// Scripted moments shake the player's nerves (night 3 on).
for (const id of SCRIPTED_EVENTS) events.on(`scripted:${id}`, () => game.state && sanityShock(game.state, game.ctx, id));
// Night 2: the radio plays the player's own words back to them.
events.on('scripted:radioEcho', () => {
  const said = game.state.radio.said;
  const words = said[said.length - 1] || getSave().radioSaid?.at(-1) || ECHO_FALLBACK;
  audio.play('staticBurst', 'radio');
  if (settings().subtitles) toasts.push(`[The radio, in your own voice: "${words}" · from the supply room]`, 'subtitle');
  else toasts.push('The radio crackles. It is your own voice.', 'warn');
});

// The title screen shows the station behind it, lit as on a calm night.
game.state = createState(getNight(1));
game.night = getNight(1);
station.resetForNight(game.state, game.night);
player.spawn(station.anchors.spawn, 0.5);

// ---------- Flow ----------

/** Systems context for a night; the debug panel can switch random failures off. */
function nightContext(night) {
  const off = Object.fromEntries(FAILURE_IDS.map((id) => [id, 0]));
  const effective = game.failuresOn ? night : { ...night, failures: off };
  return { events, night: effective };
}

function showTitle() {
  game.mode = 'title';
  audio.setDrone(false);
  hud.show(false);
  touch.show(false);
  debug?.show(false);
  desktop.releaseLock();
  panels.close();
  const save = getSave();
  document.getElementById('boot')?.remove();
  const continueNight = save.currentNight > 1 || save.logsFound.length ? save.currentNight : null;
  menus.title({
    continueNight,
    endingsSeen: (save.endingsSeen || []).length,
    onCredits: () => menus.credits(showTitle),
    onBegin: () => {
      audio.start(settings());
      resetCampaign();
      beginNight(1);
    },
    onContinue: () => {
      audio.start(settings());
      beginNight(getSave().currentNight);
    },
    onSettings: () => openSettings(showTitle),
    onBackup: () => openBackup(showTitle),
    onRestore: () => openRestore(showTitle),
  });
}

function openSettings(back) {
  menus.settings(
    settings(),
    (changes) => {
      updateSettings(changes);
      applySettings();
    },
    back,
    { graphicsAuto: quality.autoLevel() }
  );
}

// Save codes: back up all progress as text, or restore it from a code (see core/savecode.js).
// From the pause menu the night in progress isn't in the code, and restoring ends it.

function openBackup(back) {
  menus.backup({ code: makeSaveCode(getSave()), midNight: game.mode === 'paused', onBack: back });
}

function openRestore(back) {
  menus.restore({
    read: readSaveCode,
    describe: describeSave,
    current: getSave(),
    midNight: game.mode === 'paused',
    onRestore: (save) => {
      const stored = restoreSave(save);
      applySettings();
      return stored;
    },
    onDone: showTitle,
    onBack: back,
  });
}

function beginNight(number) {
  const night = getNight(number);
  const save = getSave();
  const supplies = applySupplies(save.supplyChoices[night.night] || []);
  const seed = debugSeed ?? nightSeed(night.night);

  game.night = night;
  game.state = createState(night, { ...supplies, seed });
  game.ctx = { ...nightContext(night), rng: createRng(seed) };
  game.detachScripted?.();
  game.detachScripted = attachScripted(events, night);

  station.resetForNight(game.state, night);
  player.spawn(station.anchors.spawn, 0);
  panels.close();
  panels.resetNight();
  toasts.clear();
  input.reset();
  updateSave({ currentNight: night.night });

  game.mode = 'card';
  audio.setDrone(false);
  hud.show(false);
  touch.show(false);
  debug?.show(true);
  menus.nightCard(night, startPlaying);
}

function startPlaying() {
  game.mode = 'playing';
  menus.close();
  hud.show(true);
  touch.show(touchMode);
  audio.resume();
  if (!touchMode) desktop.requestLock();
}

function pause() {
  if (game.mode !== 'playing') return;
  game.mode = 'paused';
  input.reset();
  touch.clear();
  touch.show(false);
  desktop.releaseLock();
  showPauseMenu();
}

function showPauseMenu() {
  menus.pause({
    onResume: resume,
    onSettings: () => openSettings(showPauseMenu),
    onRestart: () => beginNight(game.state.night),
    onQuit: showTitle,
    onBackup: () => openBackup(showPauseMenu),
    onRestore: () => openRestore(showPauseMenu),
  });
}

function resume() {
  menus.close();
  game.mode = 'playing';
  touch.show(touchMode);
  if (!touchMode) desktop.requestLock();
}

function openPanel(kind, data) {
  game.mode = 'panel';
  input.reset();
  touch.clear();
  touch.show(false);
  desktop.releaseLock();
  panels.open(kind, data);
}

function closePanel() {
  if (game.mode !== 'panel') return;
  game.mode = 'playing';
  touch.show(touchMode);
  if (!touchMode) desktop.requestLock();
}

function handleOutcome() {
  const { state, night } = game;
  rememberFound('logsFound', state.logsRecovered);
  rememberFound('notesFound', state.notesFound);
  rememberFound('tapesFound', state.tapesFound);
  rememberFound('radioTags', state.radio.tags);
  if (state.radio.said.length) updateSave({ radioSaid: [...(getSave().radioSaid || []), ...state.radio.said].slice(-5) });
  input.reset();
  touch.clear();
  touch.show(false);
  hud.show(false);
  desktop.releaseLock();
  panels.close();

  if (state.outcome === 'answered') {
    showEnding('answer');
  } else if (state.outcome === 'survived') {
    game.mode = 'summary';
    audio.setDrone(true);
    const nextNight = night.night < LAST_NIGHT ? night.night + 1 : null;
    updateSave({ highestNight: Math.max(getSave().highestNight, nextNight || night.night) });
    menus.summary({
      state,
      nextNight,
      onContinue: (choices) => {
        if (nextNight) {
          updateSave({ supplyChoices: { ...getSave().supplyChoices, [nextNight]: choices }, currentNight: nextNight });
          beginNight(nextNight);
        } else {
          const save = getSave();
          showEnding(pickEnding('survived', foundEverything(NIGHTS, save.logsFound, save.notesFound)));
        }
      },
    });
  } else {
    game.mode = 'lost';
    menus.lost({ state, onRetry: () => beginNight(night.night), onQuit: showTitle });
  }
}

/** The end of the campaign: one of three endings, then the credits. */
function showEnding(id) {
  game.mode = 'end';
  audio.setDrone(true);
  rememberFound('endingsSeen', [id]);
  const log = id === 'answer' ? answerLog(ENDINGS.answer, getSave().radioSaid || []) : null;
  menus.ending({ id, log, onTitle: showTitle });
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pause();
    audio.suspend();
  } else {
    audio.resume();
  }
});

// ---------- Debug (?debug=1) ----------

/** Debug sound tests, and where each one plays from, so direction and muffling can be checked. */
const SOUND_SPOTS = { alarm: 'generator', tick: 'generator', relay: 'breaker', groan: 'outside', creak: 'roof', glassTick: 'window', pop: 'heater' };

const debug = isDebug()
  ? createDebugPanel(uiRoot, {
      failureIds: FAILURE_IDS,
      scriptedIds: SCRIPTED_EVENTS,
      nightNumbers: NIGHTS.map((n) => n.night),
      skip: (m) => jumpTo(game.state, game.state.minute + m),
      jumpTo: (minute) => jumpTo(game.state, minute),
      setSpeed: (s) => (game.speed = s),
      setMeter: (k, v) => setMeter(game.state, k, v),
      trigger: (id) => triggerFailure(game.state, game.ctx, id),
      scripted: (id) => events.emit(`scripted:${id}`),
      soundSpots: SOUND_SPOTS,
      sound: (id) => {
        audio.start(settings());
        audio.play(id, SOUND_SPOTS[id]);
      },
      jumpNight: (n) => {
        audio.start(settings());
        beginNight(n);
      },
      end: (outcome) => forceOutcome(game.state, game.ctx, outcome),
      toggleFailures: () => {
        game.failuresOn = !game.failuresOn;
        game.ctx = { ...nightContext(game.night), rng: game.ctx.rng };
        return game.failuresOn;
      },
      wipe: () => {
        resetCampaign();
        showTitle();
      },
      unlockDoors: () => unlockDoors(game.state, game.ctx),
      ringRadio: () => ringNow(game.state, game.ctx),
      fillPockets: () => fillPockets(game.state),
      hallucinate: () => events.emit('sanity:hallucination', { kind: ['knocks', 'whisper', 'fakeStall', 'roofSteps'][Math.floor(Math.random() * 4)] }),
      giveFlashlight: () => giveFlashlight(game.state),
      gust: () => startGust(game.state, game.ctx),
      freeWestDoor: () => freeWestDoor(game.state, game.ctx),
      surfaceDetail,
      // full → flat → off → full: compare the textured station with the plain one.
      cycleSurfaceDetail: () => setSurfaceDetail(DETAIL_LEVELS[(DETAIL_LEVELS.indexOf(surfaceDetail()) + 1) % DETAIL_LEVELS.length]),
      graphics: () => quality.level(),
      // low → medium → high → low, through the Graphics setting so Settings shows it too.
      cycleGraphics: () => {
        updateSettings({ graphics: QUALITY_LEVELS[(QUALITY_LEVELS.indexOf(quality.level()) + 1) % QUALITY_LEVELS.length] });
        applySettings();
        return quality.level();
      },
      ending: (id) => {
        input.reset();
        touch.clear();
        touch.show(false);
        hud.show(false);
        desktop.releaseLock();
        panels.close();
        showEnding(id);
      },
      goOutside: () => {
        // Just outside the outer airlock door, facing the tether.
        player.x = -0.5;
        player.z = 8.0;
        player.yaw = Math.PI / 2;
        player.pitch = -0.1;
        player.apply();
      },
      stats: () => {
        let lights = 0;
        scene.traverse((o) => {
          if (o.isLight && !o.isAmbientLight && !o.isHemisphereLight && !o.isDirectionalLight) lights++;
        });
        return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, lights };
      },
    })
  : null;
debug?.show(false);
// Lets automated browser tests inspect and steer a debug session.
if (debug) window.__outpost = { game, player, station, renderer, scene, camera, audio };

// ---------- Main loop ----------

/** Deep snow slows you down outside, and a gust slows you more. */
function walkScale(state) {
  if (state.room !== 'outside') return 1;
  return state.gust.active ? CONFIG.exterior.gustSpeed : CONFIG.exterior.snowSpeed;
}

let last = performance.now();
let acc = 0;
let time = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const frameSeconds = (now - last) / 1000;
  const dt = Math.min(0.1, frameSeconds);
  last = now;
  quality.update(frameSeconds, game.mode === 'playing');
  time += dt;

  if (game.mode === 'playing') {
    player.update(dt, input, station.colliders, settings(), walkScale(game.state));
    setPlayerRoom(game.state, roomAt(player.x, player.z));
    interactor.update(dt, input, game);
    if (input.torchPressed) toggleFlashlight(game.state, game.ctx);
    touch.setUseReady(!!interactor.action && !interactor.action.disabled);
    touch.setTorch(game.state.flashlight.owned, game.state.flashlight.on);

    acc += dt * T.ticksPerSecond * game.speed;
    const maxSteps = T.maxStepsPerFrame * game.speed;
    let steps = 0;
    while (acc >= 1 && steps < maxSteps && game.mode === 'playing') {
      stepSimulation(game.state, game.ctx);
      acc -= 1;
      steps++;
    }
    if (steps >= maxSteps) acc = 0;
    if (game.state.outcome) handleOutcome();
  } else {
    acc = 0;
    if (game.mode === 'title') {
      player.yaw = 0.5 + Math.sin(time * 0.08) * 0.35;
      player.apply();
    }
  }
  input.consumeFrame();

  station.update(game.state, dt, time, settings());
  flashlight.update(game.state, dt, settings());
  audio.update(game.state, dt, game.mode === 'playing');
  if (game.mode === 'playing') {
    hud.update(game.state, interactor);
    hud.setDesktopHint(!touchMode && !desktop.isLocked());
  }
  debug?.update(game.state);
  renderer.render(scene, camera);
}

applySettings();
showTitle();
requestAnimationFrame(frame);
