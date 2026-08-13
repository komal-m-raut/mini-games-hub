'use client';

/**
 * Echo Ear's own pitch-tone engine — a game-specific companion to
 * `lib/sounds.ts`, which only knows fixed sound-effect frequencies and has
 * no notion of "play an arbitrary Hz for this many ms". This module owns
 * exactly that: a lazily-created AudioContext (browsers only allow audio
 * after a user gesture, so it's created on first playTone() call, same
 * pattern as lib/sounds.ts), a single sine oscillator with a soft envelope,
 * and the same mute contract as the rest of the site (`isMuted()` /
 * `subscribeMute()` from lib/sounds.ts) so the global sound toggle covers
 * game tones too.
 */

import { isMuted, subscribeMute } from '@/lib/sounds';
import { BLIP_DURATION_MS } from './constants';

const TONE_GAIN = 0.28;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
/** Set once, permanently, if the context can't be created at all — distinct
 *  from mute, which is a deliberate, reversible silence. */
let blocked = false;
let unmuteUnsubscribe: (() => void) | null = null;
let activeVoice: { osc: OscillatorNode; gain: GainNode } | null = null;

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (blocked) return null;
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }

  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) {
    blocked = true;
    return null;
  }

  try {
    ctx = new AC();
  } catch {
    blocked = true;
    return null;
  }

  master = ctx.createGain();
  master.gain.value = isMuted() ? 0 : TONE_GAIN;
  master.connect(ctx.destination);

  unmuteUnsubscribe?.();
  unmuteUnsubscribe = subscribeMute(() => {
    if (!master || !ctx) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(isMuted() ? 0 : TONE_GAIN, ctx.currentTime, 0.02);
  });

  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** True once audio has failed to start at all (rare) — callers use this to
 *  show a blocked-state message instead of a silently broken game. */
export function isAudioBlocked(): boolean {
  return blocked;
}

function stopVoice(c: AudioContext) {
  if (!activeVoice) return;
  const { osc, gain } = activeVoice;
  const t = c.currentTime;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  try {
    osc.stop(t + 0.04);
  } catch {
    // Already stopped/scheduled — nothing to do.
  }
  activeVoice = null;
}

/**
 * Plays a sine tone at `freq` Hz for `durationMs`, with a soft attack/release
 * envelope so it never clicks. Cuts off any tone already sounding first.
 *
 * Returns `false` only when the AudioContext genuinely couldn't be created —
 * check `isAudioBlocked()` afterwards to tell that apart from a deliberate
 * mute, which still returns `true` (the engine is fine; it's just silent).
 */
export function playTone(freq: number, durationMs: number): boolean {
  const c = ensureContext();
  if (!c || !master) return false;
  stopVoice(c);
  if (isMuted()) return true;

  const dur = durationMs / 1000;
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t0);

  const attack = Math.min(0.03, dur * 0.2);
  const release = Math.min(0.08, dur * 0.3);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(1, t0 + attack);
  gain.gain.setValueAtTime(1, t0 + Math.max(attack, dur - release));
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
  activeVoice = { osc, gain };
  return true;
}

/** Short live-drag blip while the slider moves — same engine, shorter note. */
export function playBlip(freq: number): boolean {
  return playTone(freq, BLIP_DURATION_MS);
}

/** Immediately silences any tone in flight (e.g. leaving the round). */
export function stopTone(): void {
  if (ctx) stopVoice(ctx);
}
