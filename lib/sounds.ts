/**
 * Synthesized sound engine — Web Audio only, zero audio assets.
 *
 * Every sound is generated at runtime from oscillators and noise buffers, so
 * there is nothing to download, nothing to precache, and it works offline.
 * The palette is deliberately soft (sine/triangle waves, gentle attacks,
 * low-passed noise) to keep the games relaxing rather than arcade-loud.
 *
 * Browsers only allow audio after a user gesture, so the AudioContext is
 * created lazily on the first play() and resumed if it starts suspended.
 */

export type SoundName =
  | 'click'
  | 'tick'
  | 'splash'
  | 'success'
  | 'celebrate'
  | 'fail'
  | 'glow'
  | 'whoosh'
  | 'trace'
  | 'error';

export type LoopName = 'water' | 'ambient';

const MUTE_KEY = 'mgh_muted';
const MASTER_VOLUME = 0.45;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
const loops = new Map<LoopName, { stop: () => void }>();

/** Listeners for mute changes (drives useSyncExternalStore in the hook). */
const muteListeners = new Set<() => void>();
let muted = false;

export function isMuted(): boolean {
  return muted;
}

export function subscribeMute(fn: () => void): () => void {
  muteListeners.add(fn);
  return () => muteListeners.delete(fn);
}

/** Reads the persisted preference. Safe to call before hydration. */
export function loadMutePreference(): void {
  if (typeof window === 'undefined') return;
  muted = localStorage.getItem(MUTE_KEY) === '1';
  if (master && ctx) master.gain.setValueAtTime(muted ? 0 : MASTER_VOLUME, ctx.currentTime);
}

export function setMuted(next: boolean): void {
  muted = next;
  if (typeof window !== 'undefined') localStorage.setItem(MUTE_KEY, next ? '1' : '0');
  if (master && ctx) {
    // Short ramp instead of a hard cut, so muting mid-pour doesn't click
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(next ? 0 : MASTER_VOLUME, ctx.currentTime, 0.02);
  }
  if (next) stopAllLoops();
  muteListeners.forEach((fn) => fn());
}

export function toggleMuted(): void {
  setMuted(!muted);
}

// ── Engine ──────────────────────────────────────────────────────────

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : MASTER_VOLUME;
    master.connect(ctx.destination);
  }
  // Autoplay policy: the context starts suspended until a gesture resumes it
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Shared 2s noise buffer, used for water, splashes and whooshes. */
function getNoise(c: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    const len = c.sampleRate * 2;
    noiseBuffer = c.createBuffer(1, len, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    // Brown-ish noise: smoother and less hissy than white, reads as "water"
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  }
  return noiseBuffer;
}

/** One-shot tone with an exponential decay envelope. */
function tone(
  c: AudioContext,
  opts: {
    freq: number;
    dur: number;
    type?: OscillatorType;
    gain?: number;
    delay?: number;
    sweepTo?: number;
  }
) {
  const { freq, dur, type = 'sine', gain = 0.3, delay = 0, sweepTo } = opts;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (sweepTo !== undefined) osc.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);

  // Soft attack avoids the click of an instant start
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.02, dur * 0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(g);
  g.connect(master!);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** One-shot filtered noise burst (splash, whoosh). */
function noiseBurst(
  c: AudioContext,
  opts: { dur: number; freq: number; q?: number; gain?: number; sweepTo?: number; delay?: number }
) {
  const { dur, freq, q = 1, gain = 0.3, sweepTo, delay = 0 } = opts;
  const t0 = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = getNoise(c);
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(freq, t0);
  filter.Q.value = q;
  if (sweepTo !== undefined) filter.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.15);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  src.connect(filter);
  filter.connect(g);
  g.connect(master!);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

// ── One-shots ───────────────────────────────────────────────────────

export function playSound(name: SoundName): void {
  if (muted) return;
  const c = ensureContext();
  if (!c || !master) return;

  switch (name) {
    case 'click':
      tone(c, { freq: 520, sweepTo: 380, dur: 0.07, gain: 0.16, type: 'triangle' });
      break;

    case 'tick':
      // Soft countdown blip — quiet enough to sit under everything else
      tone(c, { freq: 900, dur: 0.06, gain: 0.1 });
      break;

    case 'trace':
      // Light tap as a grid cell is traced; short so fast drags stay clean
      tone(c, { freq: 720, dur: 0.05, gain: 0.12, type: 'triangle' });
      break;

    case 'splash':
      noiseBurst(c, { dur: 0.32, freq: 900, q: 0.8, gain: 0.22, sweepTo: 300 });
      tone(c, { freq: 320, sweepTo: 180, dur: 0.22, gain: 0.12 });
      break;

    case 'whoosh':
      noiseBurst(c, { dur: 0.24, freq: 400, q: 1.5, gain: 0.14, sweepTo: 1600 });
      break;

    case 'glow':
      // Rising shimmer as the path lights up
      tone(c, { freq: 440, sweepTo: 880, dur: 0.5, gain: 0.14, type: 'sine' });
      tone(c, { freq: 660, sweepTo: 1320, dur: 0.5, gain: 0.07, delay: 0.05 });
      break;

    case 'success': {
      // Major triad arpeggio (C5–E5–G5)
      [523.25, 659.25, 783.99].forEach((f, i) =>
        tone(c, { freq: f, dur: 0.5, gain: 0.2, delay: i * 0.09 })
      );
      break;
    }

    case 'celebrate': {
      // Fuller arpeggio up to the octave, with a sparkle on top
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone(c, { freq: f, dur: 0.7, gain: 0.22, delay: i * 0.08 })
      );
      [1567.98, 2093].forEach((f, i) =>
        tone(c, { freq: f, dur: 0.5, gain: 0.08, delay: 0.34 + i * 0.07 })
      );
      break;
    }

    case 'fail':
      // Gentle descending pair — disappointed, never harsh
      tone(c, { freq: 392, dur: 0.28, gain: 0.16, type: 'triangle' });
      tone(c, { freq: 294, dur: 0.4, gain: 0.14, type: 'triangle', delay: 0.14 });
      break;

    case 'error':
      tone(c, { freq: 233, dur: 0.18, gain: 0.14, type: 'triangle' });
      break;
  }
}

// ── Loops ───────────────────────────────────────────────────────────

/**
 * Continuous water pour — layered for an ASMR feel rather than a flat hiss:
 *  1. Flow body: low-passed brown noise with a slow wobble (the stream).
 *  2. Spray: a quiet high-passed shimmer sitting on top (the fizz).
 *  3. Gurgle: randomized little sine "bloops" scheduled ahead of time — the
 *     bubbling that actually reads as *water* filling a vessel.
 * All three sum into one gain so the loop fades in/out as a whole.
 */
function startWater(c: AudioContext): { stop: () => void } {
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, c.currentTime);
  out.gain.exponentialRampToValueAtTime(1, c.currentTime + 0.14);
  out.connect(master!);

  // 1. Flow body ─ soft, rounded stream
  const body = c.createBufferSource();
  body.buffer = getNoise(c);
  body.loop = true;
  const bodyFilter = c.createBiquadFilter();
  bodyFilter.type = 'lowpass';
  bodyFilter.frequency.value = 920;
  bodyFilter.Q.value = 0.6;
  const bodyGain = c.createGain();
  bodyGain.gain.value = 0.17;
  // Slow LFO on the cutoff so the stream breathes instead of sounding static
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = 6;
  lfoGain.gain.value = 230;
  lfo.connect(lfoGain);
  lfoGain.connect(bodyFilter.frequency);
  body.connect(bodyFilter);
  bodyFilter.connect(bodyGain);
  bodyGain.connect(out);

  // 2. Spray ─ airy top, kept quiet so it soothes rather than hisses
  const spray = c.createBufferSource();
  spray.buffer = getNoise(c);
  spray.loop = true;
  const sprayFilter = c.createBiquadFilter();
  sprayFilter.type = 'highpass';
  sprayFilter.frequency.value = 2600;
  const sprayGain = c.createGain();
  sprayGain.gain.value = 0.045;
  spray.connect(sprayFilter);
  sprayFilter.connect(sprayGain);
  sprayGain.connect(out);

  body.start();
  spray.start();
  lfo.start();

  // 3. Gurgle ─ schedule bursts of short pitched "bloops" a little ahead of
  // the clock so the timing jitter of setTimeout never clicks the audio.
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const scheduleBubbles = () => {
    if (stopped || !master) return;
    const now = c.currentTime;
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const t = now + Math.random() * 0.42;
      const f0 = 360 + Math.random() * 560;
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f0, t);
      // Quick downward "bloop" — the signature of a bubble collapsing
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + 0.05 + Math.random() * 0.05);
      const g = c.createGain();
      const peak = 0.026 + Math.random() * 0.05;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06 + Math.random() * 0.07);
      osc.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + 0.22);
    }
    timer = setTimeout(scheduleBubbles, 280 + Math.random() * 220);
  };
  scheduleBubbles();

  return {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      const t = c.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), t);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      body.stop(t + 0.24);
      spray.stop(t + 0.24);
      lfo.stop(t + 0.24);
    },
  };
}

/** Slow ambient pad — a few detuned sines drifting under the game. */
function startAmbient(c: AudioContext): { stop: () => void } {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.055, c.currentTime + 2);
  g.connect(master!);

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  filter.connect(g);

  // Am9-ish stack: warm, unresolved, loops without an obvious seam
  const freqs = [220, 261.63, 329.63, 392];
  const oscs = freqs.map((f, i) => {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const og = c.createGain();
    og.gain.value = 0.25 / (i + 1);

    // Independent slow drift per voice keeps the pad from sounding static
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = 0.05 + i * 0.017;
    lfoGain.gain.value = 0.12 / (i + 1);
    lfo.connect(lfoGain);
    lfoGain.connect(og.gain);
    lfo.start();

    o.connect(og);
    og.connect(filter);
    o.start();
    return { o, lfo };
  });

  return {
    stop: () => {
      const t = c.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1);
      oscs.forEach(({ o, lfo }) => {
        o.stop(t + 1.2);
        lfo.stop(t + 1.2);
      });
    },
  };
}

export function startLoop(name: LoopName): void {
  if (muted || loops.has(name)) return;
  const c = ensureContext();
  if (!c || !master) return;
  loops.set(name, name === 'water' ? startWater(c) : startAmbient(c));
}

export function stopLoop(name: LoopName): void {
  const loop = loops.get(name);
  if (!loop) return;
  loop.stop();
  loops.delete(name);
}

export function stopAllLoops(): void {
  loops.forEach((loop) => loop.stop());
  loops.clear();
}
