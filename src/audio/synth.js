// Generated sound. Every sound is built from oscillators and filtered noise, so the game
// needs no audio files. Recorded CC0 layers arrive in milestone M5.

export function createNoiseBuffer(ctx, seconds = 2) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b = 0;
  for (let i = 0; i < data.length; i++) {
    // Slightly pink: smoother and less harsh than white noise
    const white = Math.random() * 2 - 1;
    b = 0.97 * b + 0.03 * white;
    data[i] = white * 0.5 + b * 3;
  }
  return buffer;
}

function noiseSource(ctx, buffer, loop = true) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = loop;
  src.loopStart = Math.random();
  return src;
}

/** Envelope helper: quick attack, exponential decay. */
function envelope(param, t, peak, attack, decay) {
  param.setValueAtTime(0.0001, t);
  param.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
  param.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

// ---------- Loops ----------

export function createWind(ctx, noise) {
  const src = noiseSource(ctx, noise);
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 380;
  band.Q.value = 0.6;
  const whistle = ctx.createBiquadFilter();
  whistle.type = 'bandpass';
  whistle.frequency.value = 1300;
  whistle.Q.value = 9;
  const whistleGain = ctx.createGain();
  whistleGain.gain.value = 0.15;
  const out = ctx.createGain();
  out.gain.value = 0.6;
  src.connect(band).connect(out);
  src.connect(whistle).connect(whistleGain).connect(out);
  src.start();

  let gust = 0;
  let gustTarget = 0.5;
  let timer = 0;
  return {
    output: out,
    update(dt) {
      timer -= dt;
      if (timer <= 0) {
        gustTarget = 0.25 + Math.random() * 0.9;
        timer = 1.5 + Math.random() * 5;
      }
      gust += (gustTarget - gust) * Math.min(1, dt * 0.6);
      const now = ctx.currentTime;
      out.gain.setTargetAtTime(0.35 + gust * 0.65, now, 0.3);
      band.frequency.setTargetAtTime(260 + gust * 420, now, 0.4);
      whistle.frequency.setTargetAtTime(1000 + gust * 900, now, 0.6);
      whistleGain.gain.setTargetAtTime(0.04 + gust * gust * 0.2, now, 0.5);
    },
  };
}

export function createGeneratorHum(ctx, noise) {
  const out = ctx.createGain();
  out.gain.value = 0;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 340;
  const o1 = ctx.createOscillator();
  o1.type = 'sawtooth';
  o1.frequency.value = 49;
  const o2 = ctx.createOscillator();
  o2.type = 'square';
  o2.frequency.value = 98.5;
  const g2 = ctx.createGain();
  g2.gain.value = 0.25;
  const rumble = noiseSource(ctx, noise);
  const rlp = ctx.createBiquadFilter();
  rlp.type = 'lowpass';
  rlp.frequency.value = 160;
  const rg = ctx.createGain();
  rg.gain.value = 0.7;
  // Chug: amplitude wobble at engine speed
  const chug = ctx.createOscillator();
  chug.frequency.value = 12.5;
  const chugDepth = ctx.createGain();
  chugDepth.gain.value = 0.18;
  const body = ctx.createGain();
  body.gain.value = 0.8;
  chug.connect(chugDepth).connect(body.gain);
  o1.connect(lp);
  o2.connect(g2).connect(lp);
  rumble.connect(rlp).connect(rg).connect(lp);
  lp.connect(body).connect(out);
  o1.start();
  o2.start();
  rumble.start();
  chug.start();
  return {
    output: out,
    set(level, sputter = false) {
      const now = ctx.currentTime;
      out.gain.setTargetAtTime(level, now, level > 0 ? 0.4 : 0.25);
      const f = sputter ? 42 + Math.random() * 6 : 49;
      o1.frequency.setTargetAtTime(f, now, 0.3);
      o2.frequency.setTargetAtTime(f * 2.01, now, 0.3);
    },
  };
}

export function createHiss(ctx, noise) {
  const src = noiseSource(ctx, noise);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 2400;
  const out = ctx.createGain();
  out.gain.value = 0;
  src.connect(hp).connect(out);
  src.start();
  return {
    output: out,
    set(level) {
      out.gain.setTargetAtTime(level, ctx.currentTime, 0.6);
    },
  };
}

// ---------- One-shots: each takes (ctx, destination, noiseBuffer) ----------

function thump(ctx, dest, t, freq, peak, decay) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.45, t + decay);
  const g = ctx.createGain();
  envelope(g.gain, t, peak, 0.005, decay);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + decay + 0.05);
}

function burst(ctx, dest, noise, t, freq, q, peak, decay, type = 'bandpass') {
  const src = noiseSource(ctx, noise, false);
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  envelope(g.gain, t, peak, 0.004, decay);
  src.connect(f).connect(g).connect(dest);
  src.start(t, Math.random() * 1.5);
  src.stop(t + decay + 0.05);
}

function tone(ctx, dest, t, freq, peak, dur, type = 'sine') {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.01);
  g.gain.setValueAtTime(peak, t + dur - 0.02);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const SOUNDS = {
  /** Three heavy knocks on a steel door. */
  knocks(ctx, dest, noise) {
    const t = ctx.currentTime + 0.05;
    for (let i = 0; i < 3; i++) {
      const at = t + i * 0.62;
      thump(ctx, dest, at, 95, 1.0, 0.35);
      burst(ctx, dest, noise, at, 900, 1.2, 0.5, 0.08);
    }
  },
  /** Footsteps crossing the roof: handled by the caller moving the emitter. */
  step(ctx, dest, noise) {
    const t = ctx.currentTime;
    thump(ctx, dest, t, 70, 0.6, 0.22);
    burst(ctx, dest, noise, t, 500, 0.8, 0.35, 0.12);
  },
  /** Generator stall: coughs, then the engine dies. */
  stall(ctx, dest, noise) {
    const t = ctx.currentTime;
    for (let i = 0; i < 4; i++) burst(ctx, dest, noise, t + i * 0.18 + Math.random() * 0.05, 220 - i * 30, 1.5, 0.9 - i * 0.15, 0.14, 'lowpass');
    thump(ctx, dest, t + 0.75, 60, 0.7, 0.5);
  },
  /** One restart attempt: the starter motor whirs. */
  crank(ctx, dest, noise) {
    const t = ctx.currentTime;
    for (let i = 0; i < 6; i++) {
      burst(ctx, dest, noise, t + i * 0.2, 300 + i * 25, 3, 0.55, 0.15);
      thump(ctx, dest, t + i * 0.2, 55 + i * 4, 0.35, 0.12);
    }
  },
  /** Engine catches. */
  started(ctx, dest, noise) {
    const t = ctx.currentTime;
    thump(ctx, dest, t, 80, 0.9, 0.3);
    burst(ctx, dest, noise, t, 180, 1, 0.6, 0.4, 'lowpass');
  },
  /** Fails to catch. */
  sputter(ctx, dest, noise) {
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) burst(ctx, dest, noise, t + i * 0.24, 160, 2, 0.6, 0.12, 'lowpass');
  },
  /** Breaker trips: heavy clunk. */
  clunk(ctx, dest, noise) {
    const t = ctx.currentTime;
    thump(ctx, dest, t, 120, 1.0, 0.18);
    burst(ctx, dest, noise, t, 2500, 2, 0.6, 0.05);
    thump(ctx, dest, t + 0.03, 60, 0.7, 0.4);
  },
  /** Breaker reset or a light switch. */
  click(ctx, dest, noise) {
    const t = ctx.currentTime;
    burst(ctx, dest, noise, t, 3200, 3, 0.45, 0.03);
    thump(ctx, dest, t, 200, 0.25, 0.05);
  },
  /** Heater igniting. */
  whump(ctx, dest, noise) {
    const t = ctx.currentTime;
    burst(ctx, dest, noise, t, 300, 0.7, 0.7, 0.5, 'lowpass');
  },
  /** Fuel glugging into the tank. */
  pour(ctx, dest, noise) {
    const t = ctx.currentTime;
    for (let i = 0; i < 9; i++) {
      const at = t + i * 0.16 + Math.random() * 0.04;
      tone(ctx, dest, at, 140 + Math.random() * 90, 0.18, 0.08, 'sine');
      burst(ctx, dest, noise, at, 700, 4, 0.2, 0.07);
    }
  },
  /** Met console: reading due. */
  beeps(ctx, dest) {
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) tone(ctx, dest, t + i * 0.22, 1046, 0.22, 0.12, 'square');
  },
  /** Reading logged. */
  confirm(ctx, dest) {
    const t = ctx.currentTime;
    tone(ctx, dest, t, 784, 0.2, 0.09, 'square');
    tone(ctx, dest, t + 0.1, 1175, 0.2, 0.14, 'square');
  },
  /** Something that's wrong: low swell under the anomaly. */
  drone(ctx, dest) {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(38, t);
    o.frequency.linearRampToValueAtTime(31, t + 3.2);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 180;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.6, t + 1);
    g.gain.linearRampToValueAtTime(0.0001, t + 3.4);
    o.connect(lp).connect(g).connect(dest);
    o.start(t);
    o.stop(t + 3.5);
  },
  /** The building creaks in the cold. */
  creak(ctx, dest) {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const f = 70 + Math.random() * 60;
    o.frequency.setValueAtTime(f, t);
    o.frequency.linearRampToValueAtTime(f * (0.8 + Math.random() * 0.5), t + 0.9);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 600 + Math.random() * 500;
    bp.Q.value = 12;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.25, t + 0.2);
    g.gain.linearRampToValueAtTime(0.0001, t + 1);
    o.connect(bp).connect(g).connect(dest);
    o.start(t);
    o.stop(t + 1.05);
  },
  /** Paper. */
  rustle(ctx, dest, noise) {
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) burst(ctx, dest, noise, t + i * 0.07, 4000, 1, 0.12, 0.06, 'highpass');
  },
  /** Can lifted. */
  lift(ctx, dest, noise) {
    const t = ctx.currentTime;
    tone(ctx, dest, t, 330, 0.08, 0.1, 'triangle');
    burst(ctx, dest, noise, t, 1800, 2, 0.2, 0.06);
  },
};
