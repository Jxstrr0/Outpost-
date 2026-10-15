// Lighting states: normal, unstable, blackout, and the scripted anomaly.
// Reads game state each frame; never writes it.

import * as THREE from 'three';
import { CONFIG } from '../config.js';

const L = CONFIG.lighting;

export function createLighting(scene, anchors) {
  const hemi = new THREE.HemisphereLight(0x3d4c5e, 0x0c0e11, 0.55);
  scene.add(hemi);

  const moon = new THREE.DirectionalLight(0x7d9cc8, 0.35);
  moon.position.set(-4.5, 3, -9);
  moon.target.position.set(-5, 0, 2);
  scene.add(moon, moon.target);

  const makeFixture = (anchor, intensity) => {
    const light = new THREE.PointLight(0xe4ecff, intensity, 11, 1.4);
    light.position.copy(anchor);
    scene.add(light);
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.05, 0.26),
      new THREE.MeshLambertMaterial({ color: 0x9aa4ad, emissive: 0xeaf2ff, emissiveIntensity: 1 })
    );
    panel.position.set(anchor.x, 2.77, anchor.z);
    scene.add(panel);
    return { light, panel, base: intensity };
  };

  const fixtureA = makeFixture(anchors.fixtureA, L.fixtureIntensity);
  const fixtureB = makeFixture(anchors.fixtureB, L.fixtureIntensity);
  const fixtureGen = makeFixture(anchors.fixtureGen, L.generatorRoomIntensity);

  const heaterGlow = new THREE.PointLight(0xff6a20, 0, 4, 1.6);
  heaterGlow.position.copy(anchors.heater);
  scene.add(heaterGlow);

  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.06, 0.06),
    new THREE.MeshLambertMaterial({ color: 0x300808, emissive: 0xff1a10, emissiveIntensity: 0 })
  );
  strip.position.copy(anchors.emergency);
  scene.add(strip);

  let anomalyTime = -1;
  let flickerA = 1;
  let flickerGen = 1;
  let flickerTarget = 1;
  let flickerHold = 0;

  function flicker(dt, reduced) {
    if (reduced) return 0.6;
    flickerHold -= dt;
    if (flickerHold <= 0) {
      const r = Math.random();
      flickerTarget = r < 0.12 ? 0.08 : r < 0.3 ? 0.45 : 0.75 + Math.random() * 0.25;
      flickerHold = 0.04 + Math.random() * (flickerTarget < 0.2 ? 0.12 : 0.5);
    }
    return flickerTarget;
  }

  function setFixture(f, level, red = false) {
    f.light.color.setHex(red ? 0xff2a18 : 0xe4ecff);
    f.light.intensity = f.base * level;
    f.panel.material.emissive.setHex(red ? 0x000000 : 0xeaf2ff);
    f.panel.material.emissiveIntensity = red ? 0 : level * 0.55;
  }

  return {
    /** Every light stutters together, then holds dark. */
    anomaly() {
      anomalyTime = 0;
    },

    /** The main-room lighting mode, for HUD and audio. */
    mainMode(state) {
      if (state.power <= 0 || state.breakerTripped) return 'blackout';
      if (!state.lightsOn) return 'off';
      if (!state.generator.running || state.power < CONFIG.power.unstableBelow) return 'unstable';
      return 'normal';
    },

    update(state, dt, t, settings) {
      const reduced = settings.reducedFlicker;
      const mode = this.mainMode(state);
      const f = flicker(dt, reduced);

      let main = 0;
      let red = false;
      if (mode === 'normal') main = 1;
      else if (mode === 'unstable') main = f;
      else if (mode === 'blackout') red = true;

      const genPowered = state.power > 0;
      const genUnstable = !state.generator.running || state.power < CONFIG.power.unstableBelow;
      let gen = genPowered ? (genUnstable ? flicker(0, reduced) * 0.9 : 1) : 0;

      // Anomaly overrides everything for its duration.
      if (anomalyTime >= 0) {
        anomalyTime += dt;
        const stutterEnd = L.anomalyStutterSeconds;
        const darkEnd = stutterEnd + L.anomalyDarkSeconds;
        if (anomalyTime < stutterEnd) {
          const s = reduced ? 0.4 : Math.random() < 0.5 ? 0.05 : 1;
          main = Math.min(main || 0.7, s);
          gen = Math.min(gen || 0.7, s);
        } else if (anomalyTime < darkEnd) {
          main = 0;
          gen = 0;
          red = false;
        } else {
          anomalyTime = -1;
        }
      }

      flickerA += (main - flickerA) * Math.min(1, dt * 30);
      flickerGen += (gen - flickerGen) * Math.min(1, dt * 30);

      if (red && anomalyTime < 0) {
        const pulse = reduced ? 0.6 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((t / L.emergencyPulseSeconds) * Math.PI * 2));
        setFixture(fixtureA, 0.28 * pulse, true);
        setFixture(fixtureB, 0);
        strip.material.emissiveIntensity = 2.2 * pulse;
      } else {
        setFixture(fixtureA, flickerA);
        setFixture(fixtureB, flickerA);
        strip.material.emissiveIntensity = 0;
      }
      setFixture(fixtureGen, flickerGen);

      const heaterTarget = state.heaterActive ? 1.6 : 0;
      heaterGlow.intensity += (heaterTarget - heaterGlow.intensity) * Math.min(1, dt * 1.5);
      hemi.intensity = mode === 'blackout' || mode === 'off' ? 0.32 : 0.55;
      return mode;
    },

    heaterGlowLevel() {
      return heaterGlow.intensity / 1.6;
    },
  };
}
