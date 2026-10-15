// Positional and ambient audio. Starts on the first "Begin shift" tap, because phone
// browsers block audio until the player touches the screen.
//
// Every sound comes from somewhere: an emitter at its source. Each emitter runs through a
// low-pass filter that closes when walls are in the way, then a head-related panner, so a
// fault can be found by ear: loud and bright in its own room, dull through a wall.
// Sounds layer a generated base (synth.js) with recorded CC0 samples (samples.js).

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import {
  createNoiseBuffer,
  createWind,
  createGeneratorHum,
  createHiss,
  createBuzz,
  createStatic,
  createDrone,
  createImpulse,
  SOUNDS,
} from './synth.js';
import { loadSamples } from './samples.js';
import { occlusionBetween, occlusionMix, describeDirection } from './space.js';
import { roomAt, OUTSIDE } from '../world/layout.js';
import { ringingCall } from '../systems/radio.js';
import SUBTITLES from '../story/data/subtitles.json';

const A = CONFIG.audio;
/** Generated stand-ins for sounds that are recorded-only, while samples load or if they fail. */
const FALLBACK = { doorOpen: 'creak', doorClose: 'click', locked: 'click' };
const between = ([min, max]) => min + Math.random() * (max - min);

/**
 * @param {THREE.Camera} camera
 * @param {THREE.Object3D} scene
 * @param {Record<string, THREE.Vector3>} anchors
 * @param {object} events
 * @param {{ subtitle?: (text: string) => void }} [hooks]
 */
export function createAudio(camera, scene, anchors, events, hooks = {}) {
  let listener = null;
  let ctx = null;
  let noise = null;
  let samples = null;
  let reverb = null;
  const loops = {};
  let windAudio = null;
  let engine = null;
  const emitters = {};
  const timers = {
    creak: between(A.creakEvery),
    groan: between(A.groanEvery),
    beep: 0,
    alarm: 0,
    relay: 0,
    tick: 0,
    ring: 0,
    sputter: between(A.sputterEvery),
    glass: between(A.glassTickEvery),
  };
  let windLevel = -1;
  let coolingLeft = 0;
  let elapsed = 0;
  const lastSaid = {};
  let stepDistance = 0;
  const lastPos = new THREE.Vector3();
  const facing = new THREE.Vector3();
  let doors = {};

  const mainLights = anchors.fixtureA.clone().lerp(anchors.fixtureB, 0.5);

  /** Fixed emitter positions, used for subtitles even when Web Audio is unavailable. */
  const spots = {
    generator: { at: anchors.generator, ref: 2.2 },
    heater: { at: anchors.heater, ref: 1.2 },
    console: { at: anchors.metScreen, ref: 1.2, flat: true },
    westDoor: { at: anchors.westDoor, ref: 2.5 },
    breaker: { at: anchors.breakerSound, ref: 1.6 },
    roof: { at: anchors.roof, ref: 2.5, room: OUTSIDE },
    window: { at: anchors.window, ref: 2 },
    cans: { at: anchors.cans, ref: 1.2, flat: true },
    door: { at: anchors['door-supply'], ref: 1.6 },
    radio: { at: anchors.radio, ref: 1.2 },
    lightsMain: { at: mainLights, ref: 1.5, flat: true },
    lightsGen: { at: anchors.fixtureGen, ref: 1.5, flat: true },
    outside: { at: new THREE.Vector3(0, 2, -14), ref: 6, room: OUTSIDE },
    mast: { at: anchors.antenna, ref: 3, room: OUTSIDE },
    ghost: { at: new THREE.Vector3(0, 1.6, 0), ref: 1 }, // moved next to the player for hallucinations
  };

  /** `flat` emitters use cheaper equal-power panning: only sounds worth locating get HRTF. */
  function makeEmitter(name, position, refDistance, room = null, flat = false) {
    const holder = new THREE.Object3D();
    holder.position.copy(position);
    scene.add(holder);
    const input = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = A.clearCutoff;
    const level = ctx.createGain();
    input.connect(filter).connect(level);
    const send = ctx.createGain();
    send.gain.value = A.reverbSend;
    level.connect(send).connect(reverb);
    const pa = new THREE.PositionalAudio(listener);
    pa.panner.panningModel = A.hrtf && !flat ? 'HRTF' : 'equalpower';
    pa.setRefDistance(refDistance);
    pa.setRolloffFactor(A.rolloff);
    pa.setDistanceModel('inverse');
    pa.setNodeSource(level);
    holder.add(pa);
    emitters[name] = { holder, input, filter, level, pa, room, occlusion: 0 };
    return emitters[name];
  }

  /** Emitters that travel with the player: their own voice, hands and feet. */
  function makeBodyEmitter(name, y) {
    const e = makeEmitter(name, new THREE.Vector3(), A.refDistance * 2, null, true);
    camera.add(e.holder);
    e.holder.position.set(0, y, -0.3);
    e.body = true;
    return e;
  }

  function play(sound, at) {
    if (!ctx) return;
    const emitter = emitters[at] || emitters.player;
    SOUNDS[sound]?.(ctx, emitter.input, noise);
    const recorded = samples?.play(sound, emitter.input);
    if (!recorded && FALLBACK[sound]) SOUNDS[FALLBACK[sound]](ctx, emitter.input, noise);
  }

  function listenerInfo() {
    camera.getWorldDirection(facing);
    const len = Math.hypot(facing.x, facing.z) || 1;
    const { x, z } = camera.position;
    return { x, z, fx: facing.x / len, fz: facing.z / len, room: roomAt(x, z) };
  }

  /** Write a subtitle for a sound, saying where it came from. */
  function say(key, at, repeat = false) {
    const text = SUBTITLES[key];
    if (!text || !hooks.subtitle) return;
    if (repeat && lastSaid[key] !== undefined && elapsed - lastSaid[key] < A.subtitleRepeatSeconds) return;
    lastSaid[key] = elapsed;
    const spot = emitters[at]?.holder.position ?? spots[at]?.at;
    if (!spot) {
      hooks.subtitle(`[${text}]`);
      return;
    }
    const room = spots[at]?.room ?? roomAt(spot.x, spot.z);
    hooks.subtitle(`[${text} · ${describeDirection(listenerInfo(), { x: spot.x, z: spot.z, room })}]`);
  }

  /** Close each emitter's filter by how many walls stand between it and the listener. */
  function updateOcclusion() {
    const listenerRoom = roomAt(camera.position.x, camera.position.z);
    const now = ctx.currentTime;
    for (const e of Object.values(emitters)) {
      if (e.body) continue;
      const room = e.room ?? roomAt(e.holder.position.x, e.holder.position.z);
      const amount = occlusionBetween(listenerRoom, room, doors);
      if (Math.abs(amount - e.occlusion) < 0.01) continue;
      e.occlusion = amount;
      const mix = occlusionMix(amount);
      e.filter.frequency.setTargetAtTime(mix.cutoff, now, 0.08);
      e.level.gain.setTargetAtTime(mix.gain, now, 0.08);
    }
  }

  function updateFootsteps(playing) {
    const p = camera.position;
    const moved = Math.hypot(p.x - lastPos.x, p.z - lastPos.z);
    lastPos.copy(p);
    if (!playing || moved > 1) return; // teleports and respawns are not steps
    stepDistance += moved;
    if (stepDistance >= A.stepEvery) {
      stepDistance = 0;
      play(roomAt(p.x, p.z) === OUTSIDE ? 'footstepSnow' : 'footstep', 'feet');
    }
  }

  /** Repeating tells: each fault keeps making its own sound until it's fixed. */
  function updateTells(state, dt) {
    const gen = state.generator;
    const idle = gen.cranking <= 0 && !gen.running;
    if (idle && gen.stalled) {
      timers.alarm -= dt;
      if (timers.alarm <= 0) {
        timers.alarm = A.stallAlarmEvery;
        play('alarm', 'generator');
        say('stallAlarm', 'generator', true);
      }
    } else if (idle && state.fuel <= 0) {
      timers.alarm -= dt;
      if (timers.alarm <= 0) {
        timers.alarm = A.fuelAlarmEvery;
        play('fuelAlarm', 'generator');
        say('fuelAlarm', 'generator', true);
      }
    } else {
      timers.alarm = 0.6; // the first buzz comes just after the stall itself
    }

    if (state.breakerTripped) {
      timers.relay -= dt;
      if (timers.relay <= 0) {
        timers.relay = A.relayBuzzEvery;
        play('relay', 'breaker');
        say('relay', 'breaker', true);
      }
    } else {
      timers.relay = 1.2;
    }

    if (ringingCall(state)) {
      timers.ring -= dt;
      if (timers.ring <= 0) {
        timers.ring = CONFIG.radio.ringEvery;
        play('ring', 'radio');
        say('radioCall', 'radio', true);
      }
    } else {
      timers.ring = 0;
    }

    if (state.fuelLineFrozen && gen.running) {
      timers.sputter -= dt;
      if (timers.sputter <= 0) {
        timers.sputter = between(A.sputterEvery);
        play('sputter', 'generator');
        say('sputter', 'generator', true);
      }
    }

    if (state.windowCracked) {
      timers.glass -= dt;
      if (timers.glass <= 0) {
        timers.glass = between(A.glassTickEvery);
        play('glassTick', 'window');
        say('windowWind', 'window', true);
      }
    }

    if (!gen.running && coolingLeft > 0) {
      coolingLeft -= dt;
      timers.tick -= dt;
      if (timers.tick <= 0) {
        timers.tick = 0.4 + Math.random() * 2;
        play('tick', 'generator');
      }
    }
  }

  function updateAmbience(state, dt) {
    timers.creak -= dt;
    if (timers.creak <= 0) {
      timers.creak = between(A.creakEvery);
      const where = ['roof', 'window', 'westDoor'];
      play('creak', where[Math.floor(Math.random() * where.length)]);
    }
    timers.groan -= dt;
    if (timers.groan <= 0) {
      timers.groan = between(A.groanEvery);
      const angle = Math.random() * Math.PI * 2;
      emitters.outside.holder.position.set(-3 + Math.cos(angle) * A.groanDistance, 2, 2 + Math.sin(angle) * A.groanDistance);
      play('groan', 'outside');
    }

    // The console repeats its beep while a reading is waiting.
    const waiting = state.readings.some((r) => r.status === 'open');
    if (waiting && state.consolesPowered) {
      timers.beep -= dt;
      if (timers.beep <= 0) {
        timers.beep = 18;
        play('beeps', 'console');
      }
    } else {
      timers.beep = 0;
    }
  }

  const audio = {
    started: false,

    /** Must be called from a tap or click. */
    start(settings) {
      if (this.started) {
        ctx?.resume?.();
        return;
      }
      try {
        listener = new THREE.AudioListener();
        camera.add(listener);
        ctx = listener.context;
        ctx.resume?.();
      } catch {
        return; // no Web Audio: the game is still fully playable with subtitles
      }
      this.started = true;
      noise = createNoiseBuffer(ctx);

      reverb = ctx.createConvolver();
      reverb.buffer = createImpulse(ctx, A.reverbSeconds);
      reverb.connect(listener.getInput());

      loops.wind = createWind(ctx, noise);
      windAudio = new THREE.Audio(listener);
      windAudio.setNodeSource(loops.wind.output);

      for (const [name, s] of Object.entries(spots)) makeEmitter(name, s.at, s.ref, s.room ?? null, !!s.flat);
      makeBodyEmitter('player', 0);
      makeBodyEmitter('feet', -1.5);

      loops.hum = createGeneratorHum(ctx, noise);
      loops.hum.output.connect(emitters.generator.input);
      loops.hiss = createHiss(ctx, noise);
      loops.hiss.output.connect(emitters.heater.input);
      loops.buzzMain = createBuzz(ctx);
      loops.buzzMain.output.connect(emitters.lightsMain.input);
      loops.buzzGen = createBuzz(ctx);
      loops.buzzGen.output.connect(emitters.lightsGen.input);
      loops.static = createStatic(ctx, noise);
      loops.static.output.connect(emitters.radio.input);
      loops.drone = createDrone(ctx);
      loops.drone.output.connect(listener.getInput());

      samples = loadSamples(ctx);
      samples.ready.then(() => {
        if (!samples.engine) return;
        // The recorded engine rides under the generated hum and follows its level.
        const src = ctx.createBufferSource();
        src.buffer = samples.engine;
        src.loop = true;
        const g = ctx.createGain();
        g.gain.value = A.engineLayerVolume;
        src.connect(g).connect(loops.hum.output);
        src.start();
        engine = src;
      });

      this.applySettings(settings);
    },

    applySettings(settings) {
      if (!listener) return;
      listener.setMasterVolume(settings.masterVolume);
      windAudio.setVolume(A.windVolume);
      windLevel = A.windVolume;
      for (const e of Object.values(emitters)) e.pa.setVolume(settings.effectsVolume);
    },

    suspend() {
      ctx?.suspend?.();
    },
    resume() {
      ctx?.resume?.();
    },

    play,

    /** The low drone that plays under the day summary, and nowhere else. */
    setDrone(on) {
      loops.drone?.set(on ? A.droneVolume : 0);
    },

    update(state, dt, playing) {
      if (!ctx) return;
      doors = state.doors;
      loops.wind.update(dt);
      updateOcclusion();
      updateFootsteps(playing);
      if (!playing) {
        for (const key of ['hum', 'hiss', 'buzzMain', 'buzzGen', 'static']) loops[key].set(0);
        return;
      }
      elapsed += dt;
      const shaky = state.power < CONFIG.power.unstableBelow || !state.generator.running;
      loops.hum.set(state.generator.running ? A.generatorVolume : 0, state.power < CONFIG.power.unstableBelow);
      if (engine) engine.playbackRate.setTargetAtTime(shaky ? 0.9 + Math.random() * 0.12 : 1, ctx.currentTime, 0.2);
      loops.hiss.set(state.heaterActive ? A.heaterVolume : 0);
      const flicker = shaky ? 0.4 + Math.random() * 0.6 : 1;
      loops.buzzMain.set(state.lightsLit ? A.lightBuzzVolume * flicker : 0);
      loops.buzzGen.set(state.power > 0 ? A.lightBuzzVolume * flicker : 0);
      const hiss = (ringingCall(state) ? 3 : 1) * (state.antennaIced ? A.icedStaticBoost : 1);
      loops.static.set(state.power > 0 ? A.radioStaticVolume * hiss : 0);
      // The wind: louder through a cracked window or an open outer door, loudest outside.
      const outside = state.room === OUTSIDE;
      let wind = A.windVolume * (state.windowCracked ? A.crackWindBoost : 1);
      if (outside) wind = A.windVolume * A.outsideWindBoost;
      else if (state.doors.airlockOuter === 'open') wind *= A.openDoorWindBoost;
      if (state.gust?.active) wind *= outside ? A.gustWindBoost : A.gustIndoorBoost;
      const next = windLevel + (wind - windLevel) * Math.min(1, dt * 3);
      if (Math.abs(next - windLevel) > 0.002) {
        windLevel = next;
        windAudio.setVolume(windLevel);
      }

      updateTells(state, dt);
      updateAmbience(state, dt);
    },

    /** For automated checks in debug sessions: the context, listener and each emitter's mix. */
    inspect() {
      return {
        ctx,
        listener,
        loops,
        timers,
        emitters: Object.fromEntries(
          Object.entries(emitters).map(([k, e]) => [k, { occlusion: e.occlusion, cutoff: e.filter.frequency.value, gain: e.level.gain.value }])
        ),
      };
    },

    /** Footsteps that walk across the roof, toward the west door. */
    roofSteps() {
      say('roofSteps', 'roof');
      if (!ctx) return;
      const roof = emitters.roof.holder;
      const from = new THREE.Vector3(2, 3.1, 1);
      const to = new THREE.Vector3(-10, 3.1, -2.4);
      const steps = 8;
      for (let i = 0; i < steps; i++) {
        setTimeout(() => {
          roof.position.lerpVectors(from, to, i / (steps - 1));
          play('step', 'roof');
        }, i * 650);
      }
    },
  };

  const atDoor = (id, sound) => {
    if (!ctx || !anchors[`door-${id}`]) return;
    emitters.door.holder.position.copy(anchors[`door-${id}`]);
    play(sound, 'door');
  };
  const cooling = () => {
    coolingLeft = A.coolingSeconds;
  };

  // Event-driven one-shots
  events.on('generator:stalled', () => {
    play('stall', 'generator');
    cooling();
  });
  events.on('generator:outOfFuel', () => {
    play('stall', 'generator');
    cooling();
  });
  events.on('generator:stopped', () => {
    play('click', 'generator');
    cooling();
  });
  events.on('generator:cranking', () => play('crank', 'generator'));
  events.on('generator:started', () => play('started', 'generator'));
  events.on('generator:restartFailed', () => play('sputter', 'generator'));
  events.on('generator:refueled', () => play('pour', 'generator'));
  events.on('breaker:tripped', () => play('clunk', 'breaker'));
  events.on('breaker:reset', () => play('click', 'breaker'));
  events.on('lights:toggled', () => play('click', 'player'));
  events.on('flashlight:toggled', () => play('click', 'player'));
  events.on('flashlight:flat', () => play('click', 'player'));
  events.on('heater:toggled', ({ on }) => play(on ? 'whump' : 'click', 'heater'));
  events.on('reading:open', () => {
    timers.beep = 0;
  });
  events.on('reading:logged', () => play('confirm', 'console'));
  events.on('note:found', () => play('rustle', 'player'));
  events.on('can:pickedUp', () => play('lift', 'player'));
  events.on('door:opened', ({ id }) => atDoor(id, 'doorOpen'));
  events.on('door:closed', ({ id }) => atDoor(id, 'doorClose'));
  events.on('door:locked', ({ id }) => atDoor(id, 'locked'));
  events.on('scripted:knocks', () => {
    play('knocks', 'westDoor');
    say('knocks', 'westDoor');
  });
  events.on('scripted:roofSteps', () => audio.roofSteps());
  events.on('heater:fault', () => {
    play('pop', 'heater');
    say('pop', 'heater');
  });
  events.on('heater:fixed', () => play('whump', 'heater'));
  events.on('fuelLine:frozen', () => play('sputter', 'generator'));
  events.on('fuelLine:thawed', () => play('started', 'generator'));
  events.on('window:cracked', () => {
    for (let i = 0; i < 4; i++) setTimeout(() => play('glassTick', 'window'), i * 140);
  });
  events.on('window:sealed', () => play('cloth', 'window'));
  events.on('supply:taken', () => play('cloth', 'player'));
  events.on('radio:answered', () => play('click', 'radio'));
  // Things that aren't there sound exactly like things that are.
  events.on('sanity:hallucination', ({ kind }) => {
    if (kind === 'knocks') {
      play('knocks', 'westDoor');
      say('knocks', 'westDoor');
    } else if (kind === 'roofSteps') {
      audio.roofSteps();
    } else if (kind === 'whisper') {
      if (ctx) {
        // Just behind the player's shoulder.
        camera.getWorldDirection(facing);
        emitters.ghost.holder.position.set(camera.position.x - facing.x * 1.2, 1.6, camera.position.z - facing.z * 1.2);
      }
      play('whisper', 'ghost');
      say('whisper', null);
    } else if (kind === 'fakeStall') {
      play('stall', 'generator');
    } else if (kind === 'fakeBreaker') {
      play('clunk', 'breaker');
    } else if (kind === 'fakeCall') {
      play('ring', 'radio');
      say('radioCall', 'radio');
    }
  });
  events.on('antenna:iced', () => play('staticBurst', 'radio'));
  events.on('antenna:cleared', () => {
    for (let i = 0; i < 5; i++) setTimeout(() => play('glassTick', 'mast'), i * 90);
    play('clunk', 'mast');
  });
  events.on('mast:inspected', () => play('click', 'mast'));
  events.on('gust:start', ({ outside }) => {
    if (outside) say('gust', null);
  });
  events.on('scripted:anomaly', () => {
    play('drone', 'player');
    say('anomaly', null);
  });

  return audio;
}
