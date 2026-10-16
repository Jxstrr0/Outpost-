// Shared bookkeeping for room builders: a model kit per room, colliders, occluders,
// interactables, doors and named anchors.

import * as THREE from 'three';
import { CONFIG } from '../../config.js';
import { createKit } from '../kit.js';
import { surfaces } from '../textures.js';

const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });

/** An invisible box used only for raycasts (interaction targets and occluders). */
export function hitbox(parent, w, h, d, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hitMaterial);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  mesh.updateMatrixWorld(true);
  return mesh;
}

export function createBuilder(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const kit = createKit();
  // Walls get their own kit: their texture repeats once per wall height, not per metre.
  const wallKit = createKit({ tile: CONFIG.render.surfaces.wallTile });

  return {
    group,
    kit,
    wallKit,
    /** Axis-aligned boxes the player collides with, on the floor plane. `off` disables one. */
    colliders: [],
    /** Invisible boxes that block interaction rays (walls, big furniture). */
    occluders: [],
    /** { id, kind, hitbox, data } — kinds are mapped to actions in player/actions.js */
    interactables: [],
    /** Hinged doors, animated by station.js from state.doors. */
    doors: [],
    /** Named points: note spots, sound sources, spawn. */
    anchors: {},
    /** Meshes other modules animate (heater grille, etc). */
    refs: {},
    /** Baked room meshes, for stats and culling. */
    meshes: [],

    /** Block movement and interaction inside a world-space box on the floor. */
    block(minX, maxX, minZ, maxZ, height = 2.8, y0 = 0) {
      const c = { minX, maxX, minZ, maxZ, off: false };
      this.colliders.push(c);
      const occ = hitbox(group, maxX - minX, height, maxZ - minZ, (minX + maxX) / 2, y0 + height / 2, (minZ + maxZ) / 2);
      this.occluders.push(occ);
      return { collider: c, occluder: occ };
    },

    /** Block the footprint of a prop built in the kit's current frame (w × d, centred). */
    footprint(w, d, height, cx = 0, cz = 0) {
      const pts = [
        kit.toWorld(cx - w / 2, 0, cz - d / 2),
        kit.toWorld(cx + w / 2, 0, cz - d / 2),
        kit.toWorld(cx - w / 2, 0, cz + d / 2),
        kit.toWorld(cx + w / 2, 0, cz + d / 2),
      ];
      const xs = pts.map((p) => p.x);
      const zs = pts.map((p) => p.z);
      const y0 = pts[0].y;
      return this.block(Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs), height, y0);
    },

    /** A box drawn in the kit that also blocks movement (world axis-aligned frames only). */
    solidBox(w, h, d, hex, x, y, z) {
      kit.box(w, h, d, hex, x, y, z);
      this.block(x - w / 2, x + w / 2, z - d / 2, z + d / 2, h, y - h / 2);
    },

    interactable(kind, mesh, data = {}, id = kind) {
      const entry = { id, kind, hitbox: mesh, data };
      mesh.userData.interactable = entry;
      this.interactables.push(entry);
      return entry;
    },

    /** An invisible interaction box in world space. */
    hit(kind, w, h, d, x, y, z, data = {}, id = kind) {
      return this.interactable(kind, hitbox(group, w, h, d, x, y, z), data, id);
    },

    anchor(name, x, y, z) {
      this.anchors[name] = new THREE.Vector3(x, y, z);
      return this.anchors[name];
    },

    /** Merge everything in the kit so far into one mesh for this room. */
    bakeRoom(name) {
      const mesh = kit.bake();
      if (!mesh) return null;
      mesh.name = name;
      group.add(mesh);
      this.meshes.push(mesh);
      return mesh;
    },

    /** Merge every wall built so far into one mesh with the wall panel texture. */
    bakeWalls() {
      const mesh = wallKit.bake(surfaces().wall);
      if (!mesh) return null;
      mesh.name = 'walls';
      group.add(mesh);
      this.meshes.push(mesh);
      return mesh;
    },
  };
}
