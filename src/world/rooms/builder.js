// Shared bookkeeping for room builders: colliders, interactables, anchors.

import * as THREE from 'three';

export function createBuilder(scene) {
  const group = new THREE.Group();
  scene.add(group);
  return {
    group,
    /** Axis-aligned boxes the player collides with, on the floor plane. */
    colliders: [],
    /** Meshes that block interaction raycasts (walls, big furniture). */
    occluders: [],
    /** { id, kind, hitbox, data } — kinds are mapped to actions in player/actions.js */
    interactables: [],
    /** Named points: note spots, sound sources, spawn. */
    anchors: {},
    /** Meshes other modules animate (heater grille, etc). */
    refs: {},

    /** Make a mesh solid: it blocks movement and interaction rays. */
    solid(mesh, pad = 0) {
      mesh.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(mesh);
      this.colliders.push({ minX: b.min.x - pad, maxX: b.max.x + pad, minZ: b.min.z - pad, maxZ: b.max.z + pad });
      this.occluders.push(mesh);
      return mesh;
    },

    interactable(kind, hitbox, data = {}, id = kind) {
      const entry = { id, kind, hitbox, data };
      hitbox.userData.interactable = entry;
      this.interactables.push(entry);
      return entry;
    },

    anchor(name, x, y, z) {
      this.anchors[name] = new THREE.Vector3(x, y, z);
      return this.anchors[name];
    },
  };
}
