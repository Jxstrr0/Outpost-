// Positional and ambient audio. Starts on the first "Begin shift" tap, because phone
// browsers block audio until the player touches the screen.

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { createNoiseBuffer, createWind, createGeneratorHum, createHiss, SOUNDS } from './synth.js';

const A = CONFIG.audio;

/**
 * @param {THREE.Camera} camera
 * @param {THREE.Object3D} scene
 * @param {Record<string, THREE.Vector3>} anchors
 * @param {object} events
 */
export function createAudio(camera, scene, anchors, events) {
  let listener = null;
  let ctx = null;
  let noise = null;
  let wind = null;
  let hum = null;
  let hiss = null;
  let windAudio = null;
  const emitters = {};
  let effectsVolume = 1;
  let creakTimer = 12;
  let beepTimer = 0;

  function makeEmitter(name, position, refDistance = 1.6) {
    const holder = new THREE.Object3D();
    holder.position.copy(position);
    scene.add(holder);
    const input = ctx.createGain();
    const pa = new THREE.PositionalAudio(listener);
    pa.setRefDistance(refDistance);
    pa.setRolloffFactor(1.3);
    pa.setDistanceModel('inverse');
    pa.setNodeSource(input);
    holder.add(pa);
    emitters[name] = { holder, input, pa, base: 1 };
    return emitters[name];
  }

  function play(sound, at) {
    if (!ctx) return;
    const emitter = emitters[at] || emitters.player;
    SOUNDS[sound](ctx, emitter.input, noise);
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

      wind = createWind(ctx, noise);
      windAudio = new THREE.Audio(listener);
      windAudio.setNodeSource(wind.output);

      makeEmitter('generator', anchors.generator, 2.2);
      makeEmitter('heater', anchors.heater, 1.2);
      makeEmitter('console', anchors.metScreen, 1.2);
      makeEmitter('westDoor', anchors.westDoor, 2.5);
      makeEmitter('breaker', anchors.breakerSound, 1.6);
      makeEmitter('roof', anchors.roof, 2.5);
      makeEmitter('window', anchors.window, 2);
      makeEmitter('cans', anchors.cans, 1.2);
      makeEmitter('player', new THREE.Vector3(), 3);
      camera.add(emitters.player.holder);
      emitters.player.holder.position.set(0, 0, -0.3);

      hum = createGeneratorHum(ctx, noise);
      hum.output.connect(emitters.generator.input);
      hiss = createHiss(ctx, noise);
      hiss.output.connect(emitters.heater.input);

      this.applySettings(settings);
    },

    applySettings(settings) {
      if (!listener) return;
      listener.setMasterVolume(settings.masterVolume);
      effectsVolume = settings.effectsVolume;
      windAudio.setVolume(A.windVolume);
      for (const e of Object.values(emitters)) e.pa.setVolume(effectsVolume);
    },

    suspend() {
      ctx?.suspend?.();
    },
    resume() {
      ctx?.resume?.();
    },

    play,

    update(state, dt, playing) {
      if (!ctx) return;
      wind.update(dt);
      if (!playing) {
        hum.set(0);
        hiss.set(0);
        return;
      }
      hum.set(state.generator.running ? A.generatorVolume : 0, state.power < CONFIG.power.unstableBelow);
      hiss.set(state.heaterActive ? A.heaterVolume : 0);

      creakTimer -= dt;
      if (creakTimer <= 0) {
        creakTimer = 14 + Math.random() * 26;
        const spots = ['roof', 'window', 'westDoor'];
        play('creak', spots[Math.floor(Math.random() * spots.length)]);
      }

      // The console repeats its beep while a reading is waiting.
      const waiting = state.readings.some((r) => r.status === 'open');
      if (waiting && state.consolesPowered) {
        beepTimer -= dt;
        if (beepTimer <= 0) {
          beepTimer = 18;
          play('beeps', 'console');
        }
      } else {
        beepTimer = 0;
      }
    },

    /** Footsteps that walk across the roof, toward the west door. */
    roofSteps() {
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

  // Event-driven one-shots
  events.on('generator:stalled', () => play('stall', 'generator'));
  events.on('generator:outOfFuel', () => play('stall', 'generator'));
  events.on('generator:cranking', () => play('crank', 'generator'));
  events.on('generator:started', () => play('started', 'generator'));
  events.on('generator:restartFailed', () => play('sputter', 'generator'));
  events.on('generator:stopped', () => play('click', 'generator'));
  events.on('generator:refueled', () => play('pour', 'generator'));
  events.on('breaker:tripped', () => play('clunk', 'breaker'));
  events.on('breaker:reset', () => play('click', 'breaker'));
  events.on('lights:toggled', () => play('click', 'player'));
  events.on('heater:toggled', ({ on }) => play(on ? 'whump' : 'click', 'heater'));
  events.on('reading:open', () => {
    beepTimer = 0;
  });
  events.on('reading:logged', () => play('confirm', 'console'));
  events.on('note:found', () => play('rustle', 'player'));
  events.on('can:pickedUp', () => play('lift', 'player'));
  events.on('scripted:knocks', () => play('knocks', 'westDoor'));
  events.on('scripted:roofSteps', () => audio.roofSteps());
  events.on('scripted:anomaly', () => play('drone', 'player'));

  return audio;
}
