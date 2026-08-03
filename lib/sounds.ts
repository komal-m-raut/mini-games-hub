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
  | 'error'
  | 'tap';

export type LoopName = 'water' | 'ambient' | 'sweep';

const MUTE_KEY = 'mgh_muted';
const MASTER_VOLUME = 0.45;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;

interface LoopHandle {
  stop: () => void;
  /** Only implemented by the water loop — see setWaterFill(). */
  setFill?: (percent: number) => void;
  /** Only implemented by the sweep loop — see setSweepPosition(). */
  setPosition?: (percent: number) => void;
}

const loops = new Map<LoopName, LoopHandle>();
// Which loops *should* be playing right now, independent of whether they
// currently are (muting pauses playback but must not forget intent — H6).
const activeLoopIntents = new Set<LoopName>();

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

// NOTE (SND-05): on iOS, Web Audio output is routed through the hardware
// silent switch — if the player has it flipped, they will hear nothing at
// all regardless of this in-app mute toggle. There is no Web Audio/JS API to
// detect or override that, so this is a known, unfixable-in-JS limitation.
// Intentionally no UI for it; documenting so it isn't mistaken for a bug.
export function setMuted(next: boolean): void {
  muted = next;
  if (typeof window !== 'undefined') localStorage.setItem(MUTE_KEY, next ? '1' : '0');
  if (master && ctx) {
    // Short ramp instead of a hard cut, so muting mid-pour doesn't click
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(next ? 0 : MASTER_VOLUME, ctx.currentTime, 0.02);
  }
  // Muting stops playback but must not forget which loops *should* be
  // running (H6) — otherwise unmuting mid-pour leaves that pour silent,
  // since startLoop() only starts a loop once, at pour start.
  if (next) pauseAllLoops();
  else resumeIntentLoops();
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
    // Master bus limiter (L8): overlapping one-shots (e.g. splash + celebrate
    // firing within ~260ms of each other) previously had no headroom and
    // could clip. A fast, gentle limiter keeps that safe without audibly
    // squashing single sounds.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.setValueAtTime(-6, ctx.currentTime);
    limiter.ratio.setValueAtTime(4, ctx.currentTime);
    limiter.attack.setValueAtTime(0.003, ctx.currentTime);
    limiter.release.setValueAtTime(0.25, ctx.currentTime);
    master.connect(limiter);
    limiter.connect(ctx.destination);
  }
  // Autoplay policy: the context starts suspended until a gesture resumes it
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

// M18: ctx.resume() is also attempted from non-gesture contexts (e.g. the
// perfect-pour tick interval), which WebKit silently rejects — the context
// can stay suspended (and the game silent) for the whole session even
// though the mute toggle shows "unmuted". As a backstop, independent of
// playSound()/ensureContext() being called from a real click, listen once
// for the first pointer/touch on the page and use *that* gesture to resume.
let gestureUnlockRegistered = false;

export function initAudioUnlock(): void {
  if (typeof document === 'undefined' || gestureUnlockRegistered) return;
  gestureUnlockRegistered = true;
  const unlock = () => {
    if (!ctx || ctx.state !== 'running') ensureContext();
  };
  document.addEventListener('pointerdown', unlock, { passive: true });
  document.addEventListener('touchstart', unlock, { passive: true });
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

    case 'tap': {
      // Bright transient for Timing Tap: a fast high-passed noise click (the
      // "snap") layered with a short descending triangle blip, ~70ms total,
      // kept in line with the rest of the soft palette rather than arcade-loud.
      const t0 = c.currentTime;
      const src = c.createBufferSource();
      src.buffer = getNoise(c);
      const hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 3000;
      const clickGain = c.createGain();
      clickGain.gain.setValueAtTime(0.0001, t0);
      clickGain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.005);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
      src.connect(hp);
      hp.connect(clickGain);
      clickGain.connect(master!);
      src.start(t0);
      src.stop(t0 + 0.08);

      tone(c, { freq: 1200, sweepTo: 600, dur: 0.07, gain: 0.14, type: 'triangle' });
      break;
    }
  }
}

// ── Water fill curves (R1 / H5) ────────────────────────────────────────
//
// Pure maths only — no AudioContext — so it can be unit-tested without a
// Web Audio shim. Kept in sync with §6.1 of PRE_RELEASE_AUDIT.md.

const clampPercent = (percent: number): number => Math.min(100, Math.max(0, percent));

/**
 * Resonance sweep frequency for the "glass filling" cue.
 * Pouring into an open vessel is a quarter-wave stopped pipe: the liquid
 * surface is the closed end, the rim the open end, f ≈ c / (4·L). As the
 * air column shrinks the resonance rises — log curve from ~260Hz (empty)
 * to ~1800Hz (full), matching both the physics and pitch perception.
 */
export function waterResonanceFreq(fillPercent: number): number {
  const fill = clampPercent(fillPercent);
  return 260 * Math.pow(1800 / 260, fill / 100);
}

/** Body lowpass cutoff: a fuller glass sounds duller, so it ramps down. */
export function waterBodyCutoff(fillPercent: number): number {
  const fill = clampPercent(fillPercent);
  return 950 - (950 - 700) * (fill / 100);
}

/** Gurgle bubbles should rise in pitch too, not contradict the main cue. */
export function waterGurgleScale(fillPercent: number): number {
  const fill = clampPercent(fillPercent);
  return 0.7 + 0.6 * (fill / 100);
}

// ── Sweep curves (Timing Tap) ───────────────────────────────────────
//
// Pure maths only — no AudioContext — same rationale as the water curves
// above: the ear should feel the indicator approach the bar's centre, so
// both curves are driven off `position` (0–100, centre at 50).

/**
 * Bandpass centre frequency for the sweep loop. Peaks at the bar's centre
 * and falls symmetrically toward either edge, so the timbre itself hints
 * "you're near the middle" independent of the pan cue.
 */
export function sweepFilterFreq(position: number): number {
  const p = clampPercent(position);
  const centreDistance = Math.abs(p - 50) / 50; // 0 at centre, 1 at an edge
  return 1400 - (1400 - 350) * centreDistance;
}

/** Stereo pan for the sweep loop: hard left at 0, hard right at 100. */
export function sweepPan(position: number): number {
  const p = clampPercent(position);
  return (p - 50) / 50;
}

// ── Loops ───────────────────────────────────────────────────────────

/**
 * Continuous water pour — layered for an ASMR feel rather than a flat hiss,
 * and coupled to fill level (via setFill(), see setWaterFill()) so it reads
 * as a glass filling rather than a static tap running:
 *  1. Flow body: low-passed brown noise with a slow wobble (the stream);
 *     the lowpass cutoff darkens as the glass fills.
 *  2. Resonance: a bandpass "cavity" tone sweeping ~260Hz → ~1800Hz as fill
 *     rises — the core physical cue, mixed quietly under the body.
 *  3. Spray: a quiet high-passed shimmer sitting on top (the fizz).
 *  4. Gurgle: randomized little sine "bloops" scheduled ahead of time,
 *     pitched up as the glass fills.
 * Plus a splash-onset transient at start and decaying droplet plinks at
 * stop, so the loop has an attack and a tail instead of just fading.
 * All four loop layers sum into one gain so the loop fades in/out as a whole.
 */
function startWater(c: AudioContext): LoopHandle {
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, c.currentTime);
  out.gain.exponentialRampToValueAtTime(1, c.currentTime + 0.14);
  out.connect(master!);

  let fillPercent = 0;

  // 1. Flow body ─ soft, rounded stream
  const body = c.createBufferSource();
  body.buffer = getNoise(c);
  body.loop = true;
  const bodyFilter = c.createBiquadFilter();
  bodyFilter.type = 'lowpass';
  bodyFilter.frequency.value = waterBodyCutoff(fillPercent);
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

  // 2. Resonance ─ the core R1 fix: a bandpass "cavity" tone that sweeps up
  // as the air column above the liquid shortens. Mixed quietly (under the
  // body) so it colours the sound rather than dominating it.
  const resonance = c.createBufferSource();
  resonance.buffer = getNoise(c);
  resonance.loop = true;
  const resonanceFilter = c.createBiquadFilter();
  resonanceFilter.type = 'bandpass';
  resonanceFilter.frequency.value = waterResonanceFreq(fillPercent);
  resonanceFilter.Q.value = 8;
  const resonanceGain = c.createGain();
  resonanceGain.gain.value = 0.07;
  resonance.connect(resonanceFilter);
  resonanceFilter.connect(resonanceGain);
  resonanceGain.connect(out);

  // 3. Spray ─ airy top, kept quiet so it soothes rather than hisses
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
  resonance.start();
  spray.start();
  lfo.start();

  // Splash onset ─ first contact needs an edge, not a soft fade-in. Fires
  // once, connects straight to master so it isn't gated by out's ramp-in.
  noiseBurst(c, { dur: 0.09, freq: 1400, sweepTo: 500, q: 1.2, gain: 0.28 });

  // 4. Gurgle ─ schedule bursts of short pitched "bloops" a little ahead of
  // the clock so the timing jitter of setTimeout never clicks the audio.
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const scheduleBubbles = () => {
    if (stopped || !master) return;
    const now = c.currentTime;
    const count = 2 + Math.floor(Math.random() * 3);
    const scale = waterGurgleScale(fillPercent);
    for (let i = 0; i < count; i++) {
      const t = now + Math.random() * 0.42;
      const f0 = (360 + Math.random() * 560) * scale;
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
    setFill: (percent: number) => {
      fillPercent = clampPercent(percent);
      const now = c.currentTime;
      // 50ms smoothing (setTargetAtTime): responsive to the pour without
      // zipper noise from stepping the raw AudioParam every 16ms tick.
      resonanceFilter.frequency.setTargetAtTime(waterResonanceFreq(fillPercent), now, 0.05);
      bodyFilter.frequency.setTargetAtTime(waterBodyCutoff(fillPercent), now, 0.05);
    },
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      const t = c.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), t);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      body.stop(t + 0.24);
      resonance.stop(t + 0.24);
      spray.stop(t + 0.24);
      lfo.stop(t + 0.24);

      // Settle tail ─ a few decaying droplet plinks landing after the
      // stream cuts, pitched to the fill level the pour ended at.
      const baseFreq = waterResonanceFreq(fillPercent);
      const plinks: Array<[delay: number, gain: number]> = [
        [0.04, 0.05],
        [0.16, 0.03],
        [0.34, 0.015],
      ];
      plinks.forEach(([delay, gain]) => {
        const detune = 1 + (Math.random() - 0.5) * 0.12; // small random detune
        tone(c, {
          freq: baseFreq * detune,
          dur: 0.12 + Math.random() * 0.06,
          gain,
          delay,
          type: 'sine',
        });
      });
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

/**
 * Continuous whoosh for Timing Tap's sweep, coupled to indicator position
 * (via setPosition(), see setSweepPosition()): looped brown noise through a
 * bandpass whose centre frequency rises toward the bar's centre and falls
 * toward the edges (sweepFilterFreq), panned left→right with position
 * (sweepPan). Kept well under the one-shots' gain since this plays for the
 * whole `running` phase and must not fatigue the ear.
 */
function startSweep(c: AudioContext): LoopHandle {
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, c.currentTime);
  out.gain.exponentialRampToValueAtTime(1, c.currentTime + 0.14);
  out.connect(master!);

  let percent = 50;

  const noise = c.createBufferSource();
  noise.buffer = getNoise(c);
  noise.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = sweepFilterFreq(percent);
  filter.Q.value = 1.4;
  const gain = c.createGain();
  gain.gain.value = 0.055;
  const panner = c.createStereoPanner();
  panner.pan.value = sweepPan(percent);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(panner);
  panner.connect(out);
  noise.start();

  return {
    setPosition: (next: number) => {
      percent = clampPercent(next);
      const now = c.currentTime;
      // 30ms smoothing — responsive to the sweep without zipper noise from
      // stepping the raw AudioParam every animation frame.
      filter.frequency.setTargetAtTime(sweepFilterFreq(percent), now, 0.03);
      panner.pan.setTargetAtTime(sweepPan(percent), now, 0.03);
    },
    stop: () => {
      const t = c.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), t);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      noise.stop(t + 0.24);
    },
  };
}

function createLoop(name: LoopName, c: AudioContext): LoopHandle {
  if (name === 'water') return startWater(c);
  if (name === 'sweep') return startSweep(c);
  return startAmbient(c);
}

export function startLoop(name: LoopName): void {
  // Record intent first: even if muted (so playback is skipped below),
  // unmuting later should bring this loop back (H6).
  activeLoopIntents.add(name);
  if (muted || loops.has(name)) return;
  const c = ensureContext();
  if (!c || !master) return;
  loops.set(name, createLoop(name, c));
}

export function stopLoop(name: LoopName): void {
  activeLoopIntents.delete(name);
  const loop = loops.get(name);
  if (!loop) return;
  loop.stop();
  loops.delete(name);
}

/** Full teardown: stops playback and forgets intent (screen unmount). */
export function stopAllLoops(): void {
  loops.forEach((loop) => loop.stop());
  loops.clear();
  activeLoopIntents.clear();
}

/** Mute-only stop: stops playback but keeps intent, so unmute can resume. */
function pauseAllLoops(): void {
  loops.forEach((loop) => loop.stop());
  loops.clear();
}

/** Unmute: restart any loop whose intent is still active (H6). */
function resumeIntentLoops(): void {
  if (activeLoopIntents.size === 0) return;
  const c = ensureContext();
  if (!c || !master) return;
  activeLoopIntents.forEach((name) => {
    if (!loops.has(name)) loops.set(name, createLoop(name, c));
  });
}

/**
 * Couples the water loop to pour progress (H5 / R1). Call every pour tick;
 * a no-op if the water loop isn't currently running (e.g. muted).
 */
export function setWaterFill(percent: number): void {
  loops.get('water')?.setFill?.(percent);
}

/**
 * Couples the sweep loop to Timing Tap's indicator position, 0–100. Call
 * every animation frame; a no-op if the sweep loop isn't currently running
 * (e.g. muted).
 */
export function setSweepPosition(percent: number): void {
  loops.get('sweep')?.setPosition?.(percent);
}
