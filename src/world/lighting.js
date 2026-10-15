// Lighting states: normal, unstable, blackout, and the scripted anomaly.
// Reads game state each frame; never writes it.
//
// The budget is four point lights for the whole station: one for the main room (between
// its two fixtures), one for the generator room, one shared by the supply room and
// airlock, and the heater glow. Lights are never added or removed during play, only
// dimmed, so the renderer never has to recompile shaders mid-night.

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const L = CONFIG.lighting;
const WHITE = 0xe4ecff;
const RED = 0xff2a18;

/** One emissive mesh for several fixture diffusers, so they dim together in one draw call. */
function diffusers(scene, boxes, color = 0xeaf2ff) {
  const geos = boxes.map(([w, h, d, x, y, z]) => new THREE.BoxGeometry(w, h, d).translate(x, y, z));
  const mesh = new THREE.Mesh(
    mergeGeometries(geos),
    new THREE.MeshLambertMaterial({ color: 0x9aa4ad, emissive: color, emissiveIntensity: 1 })
  );
  geos.forEach((g) => g.dispose());
  scene.add(mesh);
  return mesh;
}

function pointLight(scene, position, intensity, distance, decay) {
  const light = new THREE.PointLight(WHITE, intensity, distance, decay);
  light.position.copy(position);
  light.position.y = L.lightHeight; // below the fixture, so the ceiling doesn't get a hot spot
  scene.add(light);
  return light;
}

export function createLighting(scene, anchors) {
  const hemi = new THREE.HemisphereLight(0x3d4c5e, 0x0c0e11, L.ambient);
  scene.add(hemi);

  const moon = new THREE.DirectionalLight(0x7d9cc8, L.moonIntensity);
  moon.position.set(-4.5, 3, -9);
  moon.target.position.set(-5, 0, 2);
  scene.add(moon, moon.target);

  const mainPos = anchors.fixtureA.clone().lerp(anchors.fixtureB, 0.5);
  const main = pointLight(scene, mainPos, L.mainIntensity, L.mainDistance, L.decay);
  const gen = pointLight(scene, anchors.fixtureGen, L.generatorRoomIntensity, L.generatorRoomDistance, L.decay);
  const smallPos = anchors.fixtureSupply.clone().lerp(anchors.fixtureAirlock, 0.4);
  const small = pointLight(scene, smallPos, L.smallRoomIntensity, L.smallRoomDistance, L.decay);

  const heaterGlow = new THREE.PointLight(0xff6a20, 0, 4, 1.6);
  heaterGlow.position.copy(anchors.heater);
  scene.add(heaterGlow);

  const y = 2.695;
  const mainPanels = diffusers(scene, [
    [1.2, 0.03, 0.26, anchors.fixtureA.x, y, anchors.fixtureA.z],
    [1.2, 0.03, 0.26, anchors.fixtureB.x, y, anchors.fixtureB.z],
  ]);
  const genPanel = diffusers(scene, [[1.2, 0.03, 0.26, anchors.fixtureGen.x, y, anchors.fixtureGen.z]]);
  const smallPanels = diffusers(scene, [
    [0.9, 0.03, 0.22, anchors.fixtureSupply.x, y, anchors.fixtureSupply.z],
    [0.1, 0.12, 0.1, anchors.fixtureAirlock.x, 2.66, anchors.fixtureAirlock.z],
  ]);

  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.06, 0.06),
    new THREE.MeshLambertMaterial({ color: 0x300808, emissive: 0xff1a10, emissiveIntensity: 0 })
  );
  strip.position.copy(anchors.emergency);
  scene.add(strip);

  let anomalyTime = -1;
  const level = { main: 1, gen: 1, small: 1 };
  const flickers = {};

  /** Each circuit flickers on its own, so the rooms don't strobe in sync. */
  function flicker(key, dt, reduced) {
    if (reduced) return 0.6;
    const f = (flickers[key] ||= { target: 1, hold: 0 });
    f.hold -= dt;
    if (f.hold <= 0) {
      const r = Math.random();
      f.target = r < 0.12 ? 0.08 : r < 0.3 ? 0.45 : 0.75 + Math.random() * 0.25;
      f.hold = 0.04 + Math.random() * (f.target < 0.2 ? 0.12 : 0.5);
    }
    return f.target;
  }

  function setCircuit(light, panel, base, value, red = false) {
    light.color.setHex(red ? RED : WHITE);
    light.intensity = base * value;
    panel.material.emissive.setHex(red ? 0x000000 : 0xeaf2ff);
    panel.material.emissiveIntensity = red ? 0 : value * 0.55;
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
      const unstable = !state.generator.running || state.power < CONFIG.power.unstableBelow;
      const powered = state.power > 0;

      let mainTarget = 0;
      let red = false;
      if (mode === 'normal') mainTarget = 1;
      else if (mode === 'unstable') mainTarget = flicker('main', dt, reduced);
      else if (mode === 'blackout') red = true;
      // The plant rooms are on their own circuit: the breaker doesn't cut them, a flat battery does.
      let genTarget = powered ? (unstable ? flicker('gen', dt, reduced) * 0.9 : 1) : 0;
      let smallTarget = powered ? (unstable ? flicker('small', dt, reduced) * 0.85 : 1) : 0;

      // Anomaly overrides everything for its duration.
      if (anomalyTime >= 0) {
        anomalyTime += dt;
        const stutterEnd = L.anomalyStutterSeconds;
        const darkEnd = stutterEnd + L.anomalyDarkSeconds;
        if (anomalyTime < stutterEnd) {
          const s = reduced ? 0.4 : Math.random() < 0.5 ? 0.05 : 1;
          mainTarget = Math.min(mainTarget || 0.7, s);
          genTarget = Math.min(genTarget || 0.7, s);
          smallTarget = Math.min(smallTarget || 0.7, s);
        } else if (anomalyTime < darkEnd) {
          mainTarget = genTarget = smallTarget = 0;
          red = false;
        } else {
          anomalyTime = -1;
        }
      }

      const k = Math.min(1, dt * 30);
      level.main += (mainTarget - level.main) * k;
      level.gen += (genTarget - level.gen) * k;
      level.small += (smallTarget - level.small) * k;

      const pulse = reduced ? 0.6 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((t / L.emergencyPulseSeconds) * Math.PI * 2));
      if (red && anomalyTime < 0) {
        setCircuit(main, mainPanels, L.mainIntensity, L.emergencyLevel * pulse, true);
        strip.material.emissiveIntensity = 2.2 * pulse;
      } else {
        setCircuit(main, mainPanels, L.mainIntensity, level.main);
        strip.material.emissiveIntensity = 0;
      }
      if (!powered && anomalyTime < 0) setCircuit(gen, genPanel, L.generatorRoomIntensity, L.emergencyLevel * 0.6 * pulse, true);
      else setCircuit(gen, genPanel, L.generatorRoomIntensity, level.gen);
      setCircuit(small, smallPanels, L.smallRoomIntensity, level.small);

      const heaterTarget = state.heaterActive ? 1.6 : 0;
      heaterGlow.intensity += (heaterTarget - heaterGlow.intensity) * Math.min(1, dt * 1.5);
      hemi.intensity = mode === 'blackout' || mode === 'off' ? L.ambientDark : L.ambient;
      return mode;
    },

    heaterGlowLevel() {
      return heaterGlow.intensity / 1.6;
    },
  };
}
