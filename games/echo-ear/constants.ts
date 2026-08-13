import { Difficulty, Rating } from '@/types/game';
import { clamp } from '@/lib/utils';
import { ratingFromScore } from '@/utils/scoring';

export const GAME_ID = 'echo-ear';

/** Playable pitch range: two octaves, per the spec (220 Hz–880 Hz). */
export const MIN_FREQ = 220;
export const MAX_FREQ = 880;

export interface EchoDifficultyConfig {
  label: string;
  /** Short qualifier under the difficulty name on the selector. */
  qualifier: string;
  /** Replays allowed *after* the first, free listen. */
  replays: number;
  /**
   * Cents error at which accuracy bottoms out at 0 — `divisor * 100`. Easy
   * tops out at 800 cents, Medium at 600, Hard at 400: smaller is less
   * forgiving.
   */
  divisor: number;
  color: string;
  glow: string;
}

/**
 * Difficulty moves two things: how many times you can re-hear the target,
 * and how tightly the match has to land.
 */
export const ECHO_DIFFICULTY: Record<Difficulty, EchoDifficultyConfig> = {
  easy: {
    label: 'Easy',
    qualifier: '3 replays, forgiving scoring',
    replays: 3,
    divisor: 8,
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
  medium: {
    label: 'Medium',
    qualifier: '1 replay, tighter scoring',
    replays: 1,
    divisor: 6,
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
  hard: {
    label: 'Hard',
    qualifier: 'One listen only, unforgiving scoring',
    replays: 0,
    divisor: 4,
    color: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
};

/** How long the target tone sounds for, in ms. */
export const TONE_DURATION_MS = 1200;
/** Live-drag blip length, in ms. */
export const BLIP_DURATION_MS = 120;
/** Minimum gap between live-drag blips while dragging, in ms. */
export const BLIP_THROTTLE_MS = 90;

/**
 * Target frequency, seeded log-uniform across the two-octave range: pass the
 * RNG rather than calling Math.random so challenge rounds can seed it.
 * Log-uniform (not linear) so 220–440 Hz gets the same share of targets as
 * 440–880 Hz — a linear draw would hand out the top octave four times as
 * often as the bottom one.
 */
export function makeFrequency(rand: () => number): number {
  const freq = MIN_FREQ * Math.pow(2, rand() * 2);
  return Math.round(freq * 100) / 100;
}

/** Absolute pitch distance between two frequencies, in cents. */
export function centsBetween(a: number, b: number): number {
  return Math.abs(1200 * Math.log2(a / b));
}

/**
 * Maps a cents error to 0–100 accuracy: 0 cents is a perfect 100, and
 * accuracy bottoms out at 0 once the miss reaches `divisor * 100` cents —
 * 800 on Easy, 600 on Medium, 400 on Hard.
 */
export function accuracyFromCents(cents: number, difficulty: Difficulty): number {
  const divisor = ECHO_DIFFICULTY[difficulty].divisor;
  return clamp(100 - cents / divisor, 0, 100);
}

/** Same shared 0–10 score curve every game uses — no game-specific bands. */
export function getEchoRating(score: number): Rating {
  return ratingFromScore(score);
}

// ── Slider mapping ───────────────────────────────────────────────────

/** Slider position (0 = MIN_FREQ, 1 = MAX_FREQ) → frequency, log-linear —
 *  so equal slider distance always means equal pitch distance. */
export function positionToFrequency(position: number): number {
  const p = clamp(position, 0, 1);
  return MIN_FREQ * Math.pow(MAX_FREQ / MIN_FREQ, p);
}

/** Frequency → slider position (0–1), the inverse of positionToFrequency. */
export function frequencyToPosition(freq: number): number {
  const f = clamp(freq, MIN_FREQ, MAX_FREQ);
  return Math.log2(f / MIN_FREQ) / Math.log2(MAX_FREQ / MIN_FREQ);
}

/** Shifts a frequency by a number of cents, clamped to the playable range —
 *  the keyboard step for the slider (±5 cents / ±50 cents on PageUp/Down). */
export function applyCents(freq: number, cents: number): number {
  return clamp(freq * Math.pow(2, cents / 1200), MIN_FREQ, MAX_FREQ);
}

/** The slider can't start closer than this to the target, or the starting
 *  position itself would hint at the answer. */
export const MIN_START_OFFSET_CENTS = 300;

/**
 * Picks a random slider start frequency at least MIN_START_OFFSET_CENTS from
 * `target`. Rejection-samples the (pure, seedable) RNG rather than applying
 * a fixed offset, so which side of the target the start lands on stays
 * unpredictable too. The two-octave range has plenty of room outside a
 * 600-cent-wide exclusion zone, so this converges in a handful of draws; the
 * fallback below exists only to guarantee termination.
 */
export function makeStartFrequency(target: number, rand: () => number): number {
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = positionToFrequency(rand());
    if (centsBetween(candidate, target) >= MIN_START_OFFSET_CENTS) {
      return candidate;
    }
  }
  // Fallback: step away from the target by exactly the minimum offset,
  // trying the other direction if that would run past the range's edge.
  // The range (2400 cents) is four times the exclusion zone (600 cents), so
  // at least one direction always has room.
  const up = applyCents(target, MIN_START_OFFSET_CENTS);
  if (centsBetween(up, target) >= MIN_START_OFFSET_CENTS) return up;
  return applyCents(target, -MIN_START_OFFSET_CENTS);
}

/**
 * Coarse, non-numeric description of where a frequency sits in the playable
 * range — feeds the slider's aria-valuetext so screen readers hear
 * "higher/lower" language, never the Hz value the round is testing.
 */
const PITCH_BANDS = [
  'Very low',
  'Low',
  'Slightly low',
  'Middle',
  'Slightly high',
  'High',
  'Very high',
];

export function pitchDescriptor(freq: number): string {
  const position = frequencyToPosition(freq);
  const idx = Math.min(PITCH_BANDS.length - 1, Math.floor(position * PITCH_BANDS.length));
  return `${PITCH_BANDS[idx]} pitch`;
}
