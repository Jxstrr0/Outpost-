// Recorded sound layers: CC0 samples from Kenney's Impact, RPG and Sci-fi packs
// (see public/audio/CREDITS.md). They load in the background after the first tap;
// until a bank has loaded, its sounds play from the generated layer alone.

/** Sample banks: name → number of numbered variants in public/audio (`name-0.mp3` ...). */
const BANKS = {
  step: 5,
  snow: 5,
  knock: 3,
  'door-open': 2,
  'door-close': 4,
  latch: 1,
  click: 1,
  creak: 3,
  groan: 2,
  clunk: 3,
  tin: 5,
  paper: 3,
  cloth: 4,
  glass: 5,
};

/**
 * Recorded layers for each named sound. Each layer picks a random variant of its bank,
 * at a random playback rate in [min, max], once per delay (seconds).
 * A sound can have a generated layer (synth.js SOUNDS) too; both play together.
 */
export const LAYERS = {
  knocks: [{ bank: 'knock', gain: 1, rate: [0.5, 0.58], delays: [0.05, 0.67, 1.29] }],
  step: [{ bank: 'snow', gain: 0.9, rate: [0.7, 0.8] }],
  footstep: [{ bank: 'step', gain: 1, rate: [0.9, 1.1] }],
  footstepSnow: [{ bank: 'snow', gain: 1, rate: [0.95, 1.1] }],
  stall: [{ bank: 'clunk', gain: 0.5, rate: [0.45, 0.5], delays: [0.75] }],
  crank: [{ bank: 'click', gain: 0.5, rate: [0.8, 0.9] }],
  clunk: [{ bank: 'clunk', gain: 1, rate: [0.8, 0.9] }],
  click: [{ bank: 'click', gain: 0.6, rate: [0.95, 1.1] }],
  doorOpen: [{ bank: 'door-open', gain: 0.9, rate: [0.8, 0.9] }],
  doorClose: [{ bank: 'door-close', gain: 0.9, rate: [0.8, 0.9] }],
  locked: [{ bank: 'latch', gain: 0.8, rate: [0.8, 0.9] }],
  creak: [{ bank: 'creak', gain: 0.5, rate: [0.4, 0.6] }],
  groan: [{ bank: 'groan', gain: 0.8, rate: [0.2, 0.28] }],
  rustle: [{ bank: 'paper', gain: 0.8, rate: [0.95, 1.05] }],
  lift: [{ bank: 'tin', gain: 0.7, rate: [0.7, 0.8] }],
  pour: [{ bank: 'tin', gain: 0.5, rate: [0.6, 0.7], delays: [0, 1.4] }],
  tick: [{ bank: 'tin', gain: 0.2, rate: [1.4, 1.9] }],
  glassTick: [{ bank: 'glass', gain: 0.6, rate: [1.2, 1.5] }],
  pop: [{ bank: 'glass', gain: 0.5, rate: [1.8, 2.2] }],
  cloth: [{ bank: 'cloth', gain: 0.7, rate: [0.9, 1.1] }],
};

/** The recorded engine under the generator hum, looped. */
export const ENGINE_LOOP = 'engine-loop.wav';

function url(file) {
  const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
  return `${base}audio/${file}`;
}

async function decode(ctx, file) {
  const response = await fetch(url(file));
  if (!response.ok) throw new Error(`${file}: ${response.status}`);
  const data = await response.arrayBuffer();
  return new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject));
}

/**
 * Load every bank in the background. Failures are quiet: a missing file only means that
 * sound plays from its generated layer.
 * @param {BaseAudioContext} ctx
 * @param {(loaded: number, total: number) => void} [onProgress]
 */
export function loadSamples(ctx, onProgress) {
  /** @type {Record<string, AudioBuffer[]>} */
  const banks = {};
  let engine = null;
  const files = Object.entries(BANKS).flatMap(([name, n]) => Array.from({ length: n }, (_, i) => [name, `${name}-${i}.mp3`]));
  const total = files.length + 1;
  let loaded = 0;
  const tick = () => onProgress?.(++loaded, total);

  const ready = Promise.all([
    ...files.map(([name, file]) =>
      decode(ctx, file)
        .then((buffer) => (banks[name] ||= []).push(buffer))
        .catch(() => {})
        .finally(tick)
    ),
    decode(ctx, ENGINE_LOOP)
      .then((buffer) => (engine = buffer))
      .catch(() => {})
      .finally(tick),
  ]);

  return {
    ready,
    get engine() {
      return engine;
    },
    /**
     * Play a sound's recorded layers into `dest`. Returns false if none are loaded yet.
     * @param {string} sound
     * @param {AudioNode} dest
     * @param {number} [gainScale]
     */
    play(sound, dest, gainScale = 1) {
      const layers = LAYERS[sound];
      if (!layers) return false;
      let played = false;
      for (const layer of layers) {
        const bank = banks[layer.bank];
        if (!bank?.length) continue;
        for (const delay of layer.delays || [0]) {
          const src = ctx.createBufferSource();
          src.buffer = bank[Math.floor(Math.random() * bank.length)];
          src.playbackRate.value = layer.rate[0] + Math.random() * (layer.rate[1] - layer.rate[0]);
          const g = ctx.createGain();
          g.gain.value = layer.gain * gainScale;
          src.connect(g).connect(dest);
          src.onended = () => g.disconnect();
          src.start(ctx.currentTime + delay);
          played = true;
        }
      }
      return played;
    },
  };
}
