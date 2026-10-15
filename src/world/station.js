// Builds the station and keeps its moving parts in step with game state.

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { PALETTE, mat, box, hitbox } from './assets.js';
import { createBuilder } from './rooms/builder.js';
import { buildShell } from './rooms/shell.js';
import { buildMainRoom } from './rooms/main-room.js';
import { buildGeneratorRoom, CAN_SLOTS, EMPTY_CAN_SPOTS } from './rooms/generator-room.js';
import { createMetScreen, createTerminalScreen } from './screens.js';
import { createLighting } from './lighting.js';

function makeCan() {
  const can = new THREE.Group();
  box(can, 0.17, 0.42, 0.34, mat(PALETTE.red), 0, 0.21, 0);
  box(can, 0.06, 0.05, 0.2, mat(PALETTE.orange), 0, 0.45, -0.03); // handle
  box(can, 0.05, 0.08, 0.05, mat(PALETTE.yellow), 0, 0.44, 0.13); // spout
  return can;
}

function makeNote() {
  const note = new THREE.Mesh(
    new THREE.PlaneGeometry(0.16, 0.2),
    new THREE.MeshLambertMaterial({ color: PALETTE.paper, emissive: 0x3a3428, side: THREE.DoubleSide })
  );
  return note;
}

/**
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 * @param {{ getLogTitle: (id: string) => string }} options
 */
export function buildStation(scene, camera, { getLogTitle }) {
  const b = createBuilder(scene);
  buildShell(b);
  buildMainRoom(b);
  buildGeneratorRoom(b);
  const { anchors } = b;

  const met = createMetScreen(b.group, anchors.metScreen, 0);
  const terminal = createTerminalScreen(b.group, anchors.terminalScreen, Math.PI, getLogTitle);
  const lighting = createLighting(scene, anchors);

  // Generator status lamp
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0x30ff60, toneMapped: false })
  );
  lamp.position.copy(anchors.generatorLamp);
  b.group.add(lamp);

  // Breaker lever: up is on, down is tripped
  const lever = box(b.group, 0.05, 0.18, 0.06, mat(PALETTE.orange), anchors.breakerLever.x, anchors.breakerLever.y, anchors.breakerLever.z);

  // Jerry cans: full ones in slots, empties dumped by the generator, one in hand.
  const cans = CAN_SLOTS.map((slot, i) => {
    const can = makeCan();
    can.position.set(slot.x, 0, slot.z);
    can.rotation.y = Math.PI / 2;
    b.group.add(can);
    // Cans sit low, so the grab area is generous.
    const grab = hitbox(can, 0.5, 0.9, 0.55, 0, 0.45, 0);
    const entry = b.interactable('jerryCan', grab, { canId: `can-${i}` }, `can-${i}`);
    can.children.forEach((c) => (c.userData.interactable = entry));
    return can;
  });
  const empties = EMPTY_CAN_SPOTS.map((spot) => {
    const can = makeCan();
    can.position.set(spot.x, 0.085, spot.z);
    can.rotation.set(0, spot.ry, Math.PI / 2);
    can.visible = false;
    b.group.add(can);
    return can;
  });
  const carried = makeCan();
  carried.scale.setScalar(0.9);
  carried.position.set(0.32, -0.62, -0.55);
  carried.rotation.set(0.1, 0.25, 0);
  carried.visible = false;
  camera.add(carried);

  // Notes placed per night
  const noteMeshes = new Map();

  const station = {
    group: b.group,
    colliders: b.colliders,
    occluders: b.occluders,
    interactables: b.interactables,
    anchors,
    lighting,
    lightingMode: 'normal',

    /** Place this night's notes and reset moving parts. */
    resetForNight(state, night) {
      for (const [, mesh] of noteMeshes) b.group.remove(mesh);
      noteMeshes.clear();
      for (let i = b.interactables.length - 1; i >= 0; i--) {
        if (b.interactables[i].kind === 'note') b.interactables.splice(i, 1);
      }
      for (const note of night.notes || []) {
        const spot = anchors[note.spot];
        if (!spot) continue;
        const mesh = makeNote();
        mesh.position.copy(spot);
        if (note.spot === 'breaker') {
          mesh.rotation.y = Math.PI / 2;
        } else {
          mesh.rotation.x = -Math.PI / 2;
          mesh.rotation.z = (note.id.charCodeAt(2) % 5) * 0.2 - 0.4;
        }
        b.group.add(mesh);
        noteMeshes.set(note.id, mesh);
        b.interactable('note', mesh, { noteId: note.id }, `note-${note.id}`);
      }
      this.update(state, 0, 0, { reducedFlicker: false }, true);
    },

    lastScreenDraw: -1,

    update(state, dt, t, settings, forceScreens = false) {
      this.lightingMode = lighting.update(state, dt, t, settings);

      // Screens refresh a few times a second; dimmed during blackout.
      if (forceScreens || t - this.lastScreenDraw > 1 / CONFIG.render.screenRefreshPerSecond) {
        this.lastScreenDraw = t;
        met.draw(state, t);
        terminal.draw(state, t);
        const dim = state.consolesPowered ? 1 : CONFIG.lighting.blackoutScreenBrightness;
        met.material.color.setScalar(dim);
        terminal.material.color.setScalar(dim);
      }

      // Generator lamp: green running, amber cranking, blinking red stalled, dark when off.
      const gen = state.generator;
      if (gen.running) lamp.material.color.setHex(0x30ff60);
      else if (gen.cranking > 0) lamp.material.color.setHex(Math.floor(t * 8) % 2 ? 0xffb020 : 0x402800);
      else if (gen.stalled) lamp.material.color.setHex(Math.floor(t * 2.5) % 2 ? 0xff2a20 : 0x200000);
      else lamp.material.color.setHex(0x101010);

      b.refs.heaterGrille.material.emissiveIntensity = lighting.heaterGlowLevel();

      lever.rotation.z = state.breakerTripped ? 0.9 : 0;
      lever.position.y = anchors.breakerLever.y - (state.breakerTripped ? 0.12 : 0);

      // Cans
      let emptyIndex = 0;
      state.jerryCans.forEach((c, i) => {
        if (!cans[i]) return;
        cans[i].visible = c.state === 'full';
        if (c.state === 'empty' && empties[emptyIndex]) empties[emptyIndex++].visible = true;
      });
      for (let i = state.jerryCans.length; i < cans.length; i++) cans[i].visible = false;
      for (let i = emptyIndex; i < empties.length; i++) empties[i].visible = false;
      carried.visible = !!state.carrying;

      for (const [id, mesh] of noteMeshes) mesh.visible = !state.notesFound.includes(id);
    },
  };
  return station;
}
