/**
 * Echo Steps' own tiny Web Audio helper — pad tones + an error buzz. Owned
 * entirely by this game (never shared, never edits `lib/sounds.ts`): the
 * pads need four short, precisely-pitched notes on demand, which is a
 * different job from the site's ambient sound palette.
 *
 * Lazy AudioContext, created on first play — browsers only allow audio
 * after a user gesture, and the first call here always traces back to one
 * (selecting a difficulty, starting a challenge). Respects the site-wide
 * mute via `lib/sounds.ts`'s public `isMuted`/`subscribeMute` API — this
 * module never reaches into that file's internals.
 */

import { isMuted, subscribeMute } from '@/lib/sounds';

/** Pad 0=green, 1=red, 2=yellow, 3=blue — E4, A4, C#5, E5: a consonant
 *  A-major-ish set, so any two pads sounding together (or in quick
 *  succession) stay pleasant rather than clashing. */
export const PAD_FREQS = [329.63, 440, 554.37, 659.26] as const;

const TONE_DUR = 0.28; // ~280ms
const TONE_GAIN = 0.28;
const ERROR_FREQ = 150; // low buzz
const ERROR_DUR = 0.3; // ~300ms
const ERROR_GAIN = 0.22;
/** Fast fade instead of a hard cut, so a mute mid-tone doesn't click. */
const MUTE_RAMP_S = 0.03;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
// Every currently-ringing tone's gain node, so a mute mid-flight can ramp
// them all to silence instead of letting them ring out under the mute.
const activeGains = new Set<GainNode>();
let muteUnsubscribe: (() => void) | null = null;

function ensureMuteSubscription(): void {
  if (muteUnsubscribe) return;
  muteUnsubscribe = subscribeMute(() => {
    if (!isMuted() || !ctx) return;
    const t = ctx.currentTime;
    activeGains.forEach((g) => {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + MUTE_RAMP_S);
    });
    activeGains.clear();
  });
}

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  ensureMuteSubscription();
  return ctx;
}

function playTone(freq: number, dur: number, gain: number, type: OscillatorType): void {
  if (isMuted()) return;
  const c = ensureContext();
  if (!c || !master) return;

  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);

  // Quick attack, then a smooth exponential decay to the tail — the
  // "short sine blip" character every pad tone shares.
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.02, dur * 0.15));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(g);
  g.connect(master);
  activeGains.add(g);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
  osc.onended = () => {
    activeGains.delete(g);
    osc.disconnect();
    g.disconnect();
  };
}

/** Plays pad `i`'s tone (0–3 → green/red/yellow/blue). No-op for an
 *  out-of-range index, when muted, or during SSR. */
export function playPad(i: number): void {
  const freq = PAD_FREQS[i];
  if (freq === undefined) return;
  playTone(freq, TONE_DUR, TONE_GAIN, 'sine');
}

/** Low error buzz for a wrong tap. */
export function playError(): void {
  playTone(ERROR_FREQ, ERROR_DUR, ERROR_GAIN, 'square');
}
