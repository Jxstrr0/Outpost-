// Builds the station and keeps its moving parts in step with game state.

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { PALETTE, mat, box, makeCrackTexture } from './assets.js';
import { createKit } from './kit.js';
import { createDecals } from './decals.js';
import { createBuilder, hitbox } from './rooms/builder.js';
import { buildShell, DOORWAYS, ROOM } from './rooms/shell.js';
import { buildMainRoom } from './rooms/main-room.js';
import { buildGeneratorRoom, CAN_SLOTS, EMPTY_CAN_SPOTS } from './rooms/generator-room.js';
import { buildSupplyRoom } from './rooms/supply-room.js';
import { buildAirlock } from './rooms/airlock.js';
import { buildBunkRoom } from './rooms/bunk-room.js';
import { doorLeaf } from './props.js';
import { createMetScreen, createTerminalScreen } from './screens.js';
import { createLighting } from './lighting.js';
import { buildExterior, SHED_CAN_SLOTS } from './exterior.js';
import { createStoryProps } from './story-props.js';

const D = CONFIG.doors;

function makeCan() {
  const can = new THREE.Group();
  box(can, 0.17, 0.4, 0.34, mat(PALETTE.red), 0, 0.2, 0);
  box(can, 0.175, 0.03, 0.345, mat(PALETTE.redDark), 0, 0.12, 0); // pressed rib
  box(can, 0.06, 0.05, 0.2, mat(PALETTE.orange), 0, 0.43, -0.03); // handle
  box(can, 0.05, 0.08, 0.05, mat(PALETTE.yellow), 0, 0.43, 0.13); // spout
  can.children.forEach((m) => (m.castShadow = true));
  return can;
}

/** A hinged door: a leaf on a pivot, an interaction box that swings with it, and a collider. */
function makeDoor(b, id) {
  const o = DOORWAYS[id];
  const heavy = id === 'airlockOuter' || id === 'west';
  const w = o.to - o.from - 0.02;
  const h = o.top - 0.02;
  const hingeAt = o.hinge === 'from' ? o.from + 0.01 : o.to - 0.01;
  const sign = o.hinge === 'from' ? 1 : -1;
  const pivot = new THREE.Group();
  if (o.axis === 'x') pivot.position.set(hingeAt, 0, o.fixed);
  else pivot.position.set(o.fixed, 0, hingeAt);
  const dir = o.axis === 'x' ? [sign, 0] : [0, sign];
  const base = Math.atan2(-dir[1], dir[0]);
  const swing = o.axis === 'x' ? [0, o.swing] : [o.swing, 0];
  const openFor = (theta) => Math.cos(base + theta) * swing[0] - Math.sin(base + theta) * swing[1];
  const open = openFor(D.openAngle) > 0 ? D.openAngle : -D.openAngle;

  const k = createKit();
  doorLeaf(k, w, h, heavy ? 0x46525a : 0x55606a, { heavy, porthole: heavy });
  const leaf = k.bake();
  leaf.matrixAutoUpdate = true;
  pivot.add(leaf);
  b.group.add(pivot);
  pivot.rotation.y = base;

  const hit = hitbox(pivot, w, 2.0, 0.26, w / 2, 1.0, 0);
  b.interactable('door', hit, { doorId: id }, `door-${id}`);

  const T = ROOM.wall;
  const collider =
    o.axis === 'x'
      ? { minX: o.from, maxX: o.to, minZ: o.fixed - T / 2, maxZ: o.fixed + T / 2, off: false }
      : { minX: o.fixed - T / 2, maxX: o.fixed + T / 2, minZ: o.from, maxZ: o.to, off: false };
  b.colliders.push(collider);

  // A small lamp on the frame head: red while locked, green once the door can open.
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.08), new THREE.MeshBasicMaterial({ color: 0x401010, toneMapped: false }));
  const mid = (o.from + o.to) / 2;
  if (o.axis === 'x') lamp.scale.set(1, 1, (T + 0.12) / 0.08);
  else lamp.scale.set((T + 0.12) / 0.08, 1, 1);
  lamp.position.set(o.axis === 'x' ? mid : o.fixed, o.top + 0.16, o.axis === 'x' ? o.fixed : mid);
  b.group.add(lamp);
  b.anchor(`door-${id}`, lamp.position.x, 1.2, lamp.position.z);

  return { id, pivot, base, open, angle: 0, collider, lamp };
}

/**
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 * @param {{ getLogTitle: (id: string) => string }} options
 */
export function buildStation(scene, camera, { getLogTitle }) {
  const b = createBuilder(scene);
  b.decals = createDecals();
  buildShell(b);
  b.bakeRoom('shell');
  b.bakeWalls();
  buildMainRoom(b);
  b.bakeRoom('main');
  buildGeneratorRoom(b);
  b.bakeRoom('generator');
  buildSupplyRoom(b);
  b.bakeRoom('supply');
  buildAirlock(b);
  b.bakeRoom('airlock');
  buildBunkRoom(b);
  b.bakeRoom('bunk');
  b.decals.bake(b.group);
  const exterior = buildExterior(b, scene);
  const { anchors } = b;

  const doors = Object.keys(DOORWAYS).map((id) => makeDoor(b, id));

  const met = createMetScreen(b.group, anchors.metScreen, 0);
  const terminal = createTerminalScreen(b.group, anchors.terminalScreen, Math.PI, getLogTitle);
  const lighting = createLighting(scene, anchors);

  // A crack across the north window, shown while it's cracked.
  const crack = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 0.95),
    new THREE.MeshBasicMaterial({ map: makeCrackTexture(), transparent: true, depthWrite: false, toneMapped: false })
  );
  crack.position.set(anchors.window.x, anchors.window.y, anchors.window.z + 0.035);
  crack.visible = false;
  b.group.add(crack);

  // Tape across Vance's door, on the main room side, until it's cut.
  const sealed = new THREE.Group();
  {
    const o = DOORWAYS.bunkRoom;
    const w = o.to - o.from;
    const len = Math.hypot(w, o.top) - 0.1;
    const tilt = Math.atan2(o.top, w);
    for (const s of [-1, 1]) {
      const strip = box(sealed, len, 0.07, 0.008, mat(0xb8b090), (o.from + o.to) / 2, o.top / 2, o.fixed - ROOM.wall / 2 - 0.045);
      strip.rotation.z = s * tilt;
    }
    for (const y of [0.5, 1.6]) box(sealed, w + 0.1, 0.07, 0.008, mat(0xb8b090), (o.from + o.to) / 2, y, o.fixed - ROOM.wall / 2 - 0.047);
  }
  b.group.add(sealed);

  // Generator status lamp
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0x30ff60, toneMapped: false })
  );
  lamp.position.copy(anchors.generatorLamp);
  b.group.add(lamp);

  // Breaker lever: up is on, down is tripped
  const lever = box(b.group, 0.05, 0.18, 0.06, mat(PALETTE.orange), anchors.breakerLever.x, anchors.breakerLever.y, anchors.breakerLever.z);

  // Jerry cans: full ones in slots (generator room, and the fuel shed outside), empties
  // dumped by the generator, one in hand.
  const placeCan = (slot, id) => {
    const can = makeCan();
    can.position.set(slot.x, slot.y, slot.z);
    can.rotation.y = Math.PI / 2;
    b.group.add(can);
    // Cans sit low, so the grab area is generous.
    const grab = hitbox(can, 0.5, 0.9, 0.55, 0, 0.45, 0);
    const entry = b.interactable('jerryCan', grab, { canId: id }, id);
    can.children.forEach((c) => (c.userData.interactable = entry));
    return can;
  };
  const cans = new Map([
    ...CAN_SLOTS.map((slot, i) => [`can-${i}`, placeCan(slot, `can-${i}`)]),
    ...SHED_CAN_SLOTS.map((slot, i) => [`shed-${i}`, placeCan(slot, `shed-${i}`)]),
  ]);
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

  // Notes, tapes and the things that move between nights.
  const story = createStoryProps(b);

  const station = {
    group: b.group,
    colliders: b.colliders,
    occluders: b.occluders,
    interactables: b.interactables,
    anchors,
    lighting,
    exterior,
    lightingMode: 'normal',
    meshes: b.meshes,

    /** Place this night's notes, tape and changes, and reset moving parts. */
    resetForNight(state, night) {
      story.reset(night);
      for (const door of doors) door.angle = state.doors[door.id] === 'open' ? door.open : 0;
      exterior.reset();
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

      crack.visible = state.windowCracked;
      sealed.visible = state.doors.bunkRoom === 'locked' || state.doors.bunkRoom === 'taped';
      lever.rotation.z = state.breakerTripped ? 0.9 : 0;
      lever.position.y = anchors.breakerLever.y - (state.breakerTripped ? 0.12 : 0);

      // Doors swing toward their state; a closed or locked door blocks the opening.
      for (const door of doors) {
        const s = state.doors[door.id];
        const target = s === 'open' ? door.open : 0;
        door.angle += (target - door.angle) * Math.min(1, dt * D.swingSpeed);
        door.pivot.rotation.y = door.base + door.angle;
        door.collider.off = s === 'open';
        const powered = state.power > 0;
        door.lamp.material.color.setHex(!powered ? 0x101010 : s === 'locked' || s === 'taped' ? 0xd02818 : 0x30c050);
      }

      // Cans
      let emptyIndex = 0;
      for (const can of cans.values()) can.visible = false;
      for (const c of state.jerryCans) {
        const can = cans.get(c.id);
        if (can) can.visible = c.state === 'full';
        if (c.state === 'empty' && empties[emptyIndex]) empties[emptyIndex++].visible = true;
      }
      for (let i = emptyIndex; i < empties.length; i++) empties[i].visible = false;
      carried.visible = !!state.carrying;

      story.update(state);
      exterior.update(state, dt, t, camera);
    },
  };
  return station;
}
