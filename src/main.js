// Boot, renderer, game flow and the main loop.

import './ui/styles.css';
import * as THREE from 'three';

import { CONFIG } from './config.js';
import { events } from './core/events.js';
import { createRng, nightSeed } from './core/rng.js';
import { createState } from './core/state.js';
import { loadSave, getSave, updateSave, updateSettings, resetCampaign, rememberFound } from './core/save.js';
import { isDebug, createDebugPanel } from './core/debug.js';
import { stepSimulation, setMeter, forceOutcome, triggerFailure, jumpTo, unlockDoors, FAILURE_IDS } from './systems/index.js';
import { buildStation } from './world/station.js';
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

const T = CONFIG.time;
const R = CONFIG.render;

// ---------- Renderer, scene, camera ----------

const canvas = document.getElementById('scene');
const uiRoot = document.getElementById('ui');
let touchMode = isTouchDevice();

const renderer = new THREE.WebGLRenderer({ canvas, antialias: !touchMode, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touchMode ? R.phonePixelRatio : R.maxPixelRatio));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

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
}

// ---------- World, player, UI ----------

const station = buildStation(scene, camera, { getLogTitle: (id) => LOGS[id]?.title ?? id });
const player = createPlayer(camera);
const input = createInputState();
const interactor = createInteractor(camera, station);
const audio = createAudio(camera, scene, station.anchors, events);
const hud = createHud(uiRoot);
const toasts = createToasts(uiRoot);
bindToasts(events, toasts, settings);
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

// The title screen shows the station behind it, lit as on a calm night.
game.state = createState(getNight(1));
game.night = getNight(1);
station.resetForNight(game.state, game.night);
player.spawn(station.anchors.spawn, 0.5);

// ---------- Flow ----------

/** Systems context for a night; the debug panel can switch random failures off. */
function nightContext(night) {
  const effective = game.failuresOn ? night : { ...night, failures: { generatorStall: 0, breakerTrip: 0 } };
  return { events, night: effective };
}

function showTitle() {
  game.mode = 'title';
  hud.show(false);
  touch.show(false);
  debug?.show(false);
  desktop.releaseLock();
  panels.close();
  const save = getSave();
  const continueNight = save.currentNight > 1 || save.logsFound.length ? save.currentNight : null;
  menus.title({
    continueNight,
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
  });
}

function openSettings(back) {
  menus.settings(
    settings(),
    (changes) => {
      updateSettings(changes);
      applySettings();
    },
    back
  );
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
  input.reset();
  touch.clear();
  touch.show(false);
  hud.show(false);
  desktop.releaseLock();
  panels.close();

  if (state.outcome === 'survived') {
    game.mode = 'summary';
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
          game.mode = 'end';
          menus.end({ night: night.night, onTitle: showTitle });
        }
      },
    });
  } else {
    game.mode = 'lost';
    menus.lost({ state, onRetry: () => beginNight(night.night), onQuit: showTitle });
  }
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
if (debug) window.__outpost = { game, player, station, renderer, scene, camera };

// ---------- Main loop ----------

let last = performance.now();
let acc = 0;
let time = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  time += dt;

  if (game.mode === 'playing') {
    player.update(dt, input, station.colliders, settings());
    interactor.update(dt, input, game);
    touch.setUseReady(!!interactor.action && !interactor.action.disabled);

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
