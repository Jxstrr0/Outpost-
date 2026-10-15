// The flashlight beam and the torch in the player's left hand.
// The only shadow-casting light in the game. It always exists (dark when off),
// because adding or removing a light mid-night would recompile every shader.

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { PALETTE, mat } from './assets.js';

const F = CONFIG.flashlight;

export function createFlashlight(camera) {
  const hand = new THREE.Group();
  hand.position.set(-0.24, -0.3, -0.42);
  hand.rotation.set(0.06, 0.08, 0);
  camera.add(hand);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.2, 10), mat(PALETTE.steelDark));
  body.rotation.x = Math.PI / 2;
  hand.add(body);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.026, 0.06, 10), mat(PALETTE.orange));
  head.rotation.x = Math.PI / 2;
  head.position.z = -0.12;
  hand.add(head);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.031, 12), new THREE.MeshBasicMaterial({ color: 0xfff2d0, toneMapped: false }));
  lens.position.z = -0.151;
  lens.rotation.y = Math.PI;
  hand.add(lens);

  const beam = new THREE.SpotLight(0xfff0d8, 0, F.distance, F.angle, F.penumbra, F.decay);
  beam.position.set(0, 0, -0.15);
  beam.castShadow = true;
  beam.shadow.mapSize.set(F.shadowMapSize, F.shadowMapSize);
  beam.shadow.camera.near = 0.15;
  beam.shadow.camera.far = F.distance;
  beam.shadow.bias = -0.0006;
  beam.shadow.normalBias = 0.02;
  beam.shadow.autoUpdate = false;
  hand.add(beam);
  const target = new THREE.Object3D();
  target.position.set(0.04, 0.05, -4);
  hand.add(target);
  beam.target = target;

  let level = 0;
  let flick = 1;
  let flickHold = 0;

  return {
    update(state, dt, settings) {
      const torch = state.flashlight;
      hand.visible = torch.owned && torch.on;
      let want = torch.owned && torch.on ? 1 : 0;
      // A low cell makes the beam stutter and sag.
      if (want && torch.battery < F.lowBelow) {
        flickHold -= dt;
        if (flickHold <= 0) {
          flick = settings.reducedFlicker ? 0.6 : Math.random() < 0.15 ? 0.2 : 0.55 + Math.random() * 0.35;
          flickHold = 0.05 + Math.random() * 0.3;
        }
        want *= flick;
      }
      level += (want - level) * Math.min(1, dt * 20);
      beam.intensity = F.intensity * level;
      beam.shadow.autoUpdate = level > 0.01;
      if (beam.shadow.autoUpdate) beam.shadow.needsUpdate = true;
      lens.material.color.setScalar(0.25 + 0.75 * level);
    },
  };
}
