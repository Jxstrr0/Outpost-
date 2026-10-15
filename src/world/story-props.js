// The things that change from night to night: handwritten notes, the recorder with
// tonight's tape, Hollis's mug (which never stays where it was left), Vance's bedroll,
// frost handprints on the window and a locker that won't stay shut.
// Each night's JSON says what is where (`notes`, `tape`, `station`).

import * as THREE from 'three';
import { PALETTE as C, mat, box } from './assets.js';
import { hitbox } from './rooms/builder.js';

// Notes on these spots are pinned to a wall; everywhere else they lie flat.
const WALL_NOTES = { breaker: Math.PI / 2, shedWall: -Math.PI / 2 };

// Where Hollis's mug turns up. Anchors are made by the rooms.
const MUG_SPOTS = {
  kitchen: 'mugKitchen',
  console: 'mugConsole',
  bedroll: 'mugBedroll',
  windowSill: 'mugSill',
  westDoor: 'mugWestDoor',
};

function makeNote() {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(0.16, 0.2),
    new THREE.MeshLambertMaterial({ color: C.paper, emissive: 0x3a3428, side: THREE.DoubleSide })
  );
}

/** Vance's pocket recorder, with an orange play key so it reads in the dark. */
function makeRecorder() {
  const g = new THREE.Group();
  box(g, 0.15, 0.04, 0.1, mat(C.black), 0, 0.02, 0);
  box(g, 0.07, 0.006, 0.045, mat(0x4a5257), -0.02, 0.043, 0); // cassette window
  box(g, 0.025, 0.012, 0.02, mat(C.orange, { emissive: 0x3a1a08 }), 0.05, 0.046, 0.025);
  box(g, 0.025, 0.012, 0.02, mat(C.steelLight), 0.05, 0.046, -0.01);
  return g;
}

function makeMug() {
  const g = new THREE.Group();
  const m = mat(C.cream);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.095, 10), m);
  cup.position.y = 0.0475;
  g.add(cup);
  box(g, 0.02, 0.05, 0.012, m, 0.05, 0.05, 0);
  return g;
}

function makeBedroll() {
  const g = new THREE.Group();
  box(g, 0.7, 0.08, 1.75, mat(C.olive), 0, 0.04, 0);
  box(g, 0.66, 0.05, 1.1, mat(C.blanket), 0, 0.1, 0.3); // blanket, thrown back
  box(g, 0.48, 0.1, 0.3, mat(C.cream), 0, 0.13, -0.68); // pillow
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.66, 8), mat(C.blanket));
  roll.rotation.z = Math.PI / 2;
  roll.position.set(0, 0.12, 0.9);
  g.add(roll);
  return g;
}

/** Small frost handprints, on the inside of the glass. */
function makeHandprints() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(225, 238, 248, 0.55)';
  g.shadowColor = 'rgba(225, 238, 248, 0.8)';
  g.shadowBlur = 6;
  const hand = (x, y, s, tilt) => {
    g.save();
    g.translate(x, y);
    g.rotate(tilt);
    g.beginPath();
    g.ellipse(0, 0, 11 * s, 13 * s, 0, 0, Math.PI * 2); // palm
    g.fill();
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.ellipse((-8 + i * 5.5) * s, -20 * s, 2.4 * s, 7 * s, (i - 1.5) * 0.12, 0, Math.PI * 2);
      g.fill();
    }
    g.beginPath();
    g.ellipse(13 * s, -2 * s, 2.6 * s, 6 * s, 0.9, 0, Math.PI * 2); // thumb
    g.fill();
    g.restore();
  };
  hand(60, 80, 1, -0.15);
  hand(104, 66, 1, 0.1);
  hand(186, 92, 0.9, 0.3);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.45),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false })
  );
}

/** The middle locker by the north wall, standing open. Drawn over the closed one. */
function makeOpenLocker() {
  const g = new THREE.Group();
  box(g, 0.44, 1.74, 0.02, mat(0x101214), 0, 0.98, 0.012); // the dark inside
  box(g, 0.3, 0.5, 0.02, mat(C.olive), 0.02, 1.25, 0.004); // a coat left inside
  const leaf = new THREE.Group();
  leaf.position.set(-0.23, 0, 0.02);
  leaf.rotation.y = -1.9;
  box(leaf, 0.46, 1.78, 0.02, mat(0x56614d), 0.23, 0.98, 0);
  box(leaf, 0.1, 0.06, 0.006, mat(C.paper), 0.23, 1.55, 0.012); // name card
  g.add(leaf);
  return g;
}

/**
 * @param {ReturnType<import('./rooms/builder.js').createBuilder>} b
 */
export function createStoryProps(b) {
  const { group, anchors } = b;
  const placed = []; // interactables added for the current night
  const noteMeshes = new Map();

  const recorder = makeRecorder();
  // Grab areas are bigger than the things themselves, so they're easy to aim at on a phone.
  const recorderHit = hitbox(recorder, 0.4, 0.3, 0.4, 0, 0.08, 0);
  group.add(recorder);

  const mug = makeMug();
  const mugHit = hitbox(mug, 0.3, 0.3, 0.3, 0, 0.08, 0);
  group.add(mug);

  const bedroll = makeBedroll();
  bedroll.position.copy(anchors.bedroll).setY(0);
  group.add(bedroll);

  const handprints = makeHandprints();
  handprints.position.set(anchors.window.x - 0.35, anchors.window.y - 0.2, anchors.window.z + 0.04);
  group.add(handprints);

  const locker = makeOpenLocker();
  locker.position.copy(anchors.lockerOpen);
  group.add(locker);

  let tapeId = null;

  return {
    noteMeshes,

    /** Put tonight's notes, tape and changes in place. */
    reset(night) {
      for (const [, mesh] of noteMeshes) group.remove(mesh);
      noteMeshes.clear();
      for (const entry of placed) {
        const i = b.interactables.indexOf(entry);
        if (i >= 0) b.interactables.splice(i, 1);
      }
      placed.length = 0;

      for (const note of night.notes || []) {
        const spot = anchors[note.spot];
        if (!spot) continue;
        const mesh = makeNote();
        mesh.position.copy(spot);
        if (note.spot in WALL_NOTES) {
          mesh.rotation.y = WALL_NOTES[note.spot];
        } else {
          mesh.rotation.x = -Math.PI / 2;
          mesh.rotation.z = (note.id.charCodeAt(2) % 5) * 0.2 - 0.4;
        }
        group.add(mesh);
        mesh.updateMatrixWorld(true);
        noteMeshes.set(note.id, mesh);
        const grab = hitbox(mesh, 0.34, 0.38, 0.14, 0, 0, 0);
        placed.push(b.interactable('note', grab, { noteId: note.id }, `note-${note.id}`));
      }

      const tape = night.tape;
      tapeId = tape && anchors[tape.spot] ? tape.id : null;
      recorder.visible = !!tapeId;
      if (tapeId) {
        recorder.position.copy(anchors[tape.spot]);
        recorder.rotation.y = tape.turn ?? 0.3;
        recorder.updateMatrixWorld(true);
        placed.push(b.interactable('tape', recorderHit, { tapeId }, 'tape'));
      }

      const st = night.station || {};
      const mugAt = anchors[MUG_SPOTS[st.mug]];
      mug.visible = !!mugAt;
      if (mugAt) {
        mug.position.copy(mugAt);
        mug.rotation.y = st.mug === 'westDoor' ? Math.PI : 0.6;
        mug.updateMatrixWorld(true);
        placed.push(b.interactable('mug', mugHit, { text: st.mugText || '' }, 'mug'));
      }
      bedroll.visible = !!st.bedroll;
      handprints.visible = !!st.handprints;
      locker.visible = !!st.lockerOpen;
    },

    /** Picked-up notes vanish; the recorder stays where it is. */
    update(state) {
      for (const [id, mesh] of noteMeshes) mesh.visible = !state.notesFound.includes(id);
    },
  };
}
