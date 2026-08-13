import { Difficulty } from '@/types/game';
import { TapRating } from './types';

/**
 * Timing Tap: an indicator sweeps a horizontal bar (0–100 bar-percent,
 * centre at 50) and the player taps to stop it inside the Perfect Zone.
 * Bigger zones and slower sweeps make Easy forgiving; Hard adds per-leg
 * speed jitter so the bounce timing itself becomes part of the challenge.
 */
export interface TapDifficultyConfig {
  label: string;
  /** Perfect Zone half-width, in bar-percent (zone spans 50 ± this). */
  zoneHalfWidth: number;
  /** Indicator travel speed, in bar-percent per second. */
  speed: number;
  /** Hard only: per-leg speed multipliers are drawn from this ± range. */
  speedJitter: number;
  color: string;
  glow: string;
  /** Indicator/bar neon colour for this difficulty. */
  beam: string;
}

export const TAP_DIFFICULTY: Record<Difficulty, TapDifficultyConfig> = {
  easy: {
    label: 'Easy',
    zoneHalfWidth: 9,
    speed: 42,
    speedJitter: 0,
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
    beam: '#22D3EE',
  },
  medium: {
    label: 'Medium',
    zoneHalfWidth: 5,
    speed: 68,
    speedJitter: 0,
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
    beam: '#A78BFA',
  },
  hard: {
    label: 'Hard',
    zoneHalfWidth: 2.6,
    speed: 95,
    speedJitter: 0.28,
    color: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.4)',
    beam: '#F43F5E',
  },
};

/** Seconds of "3 · 2 · 1" before the indicator starts moving. */
export const COUNTDOWN_SECONDS = 3;

/** Seeded start positions stay clear of the bar's own edges so every round
 *  has room to sweep before the first bounce. */
export const MIN_START_OFFSET = 6;
export const MAX_START_OFFSET = 94;

/** Per-leg speed multipliers cycled at each bounce (Hard's drift). Easy and
 *  Medium have zero jitter, so their scales are trivially all `1`. */
export const SPEED_SCALE_COUNT = 6;

/**
 * Rating thresholds, highest first — exported so tests can assert the bands.
 * A local 5-tier scale (the shared `Rating` only has 4 and is used by other
 * games), so a near-miss inside the zone still reads as "Amazing" rather
 * than collapsing straight to "Great".
 */
export const TAP_RATING_THRESHOLDS: ReadonlyArray<readonly [TapRating, number]> = [
  ['Perfect', 98],
  ['Amazing', 94],
  ['Great', 88],
  ['Good', 75],
  ['Try Again', 0],
];

const clampPercent = (position: number): number => Math.min(100, Math.max(0, position));

/**
 * Accuracy 0–100 (1dp) for a tap at `position`, judged against
 * `zoneHalfWidth`. Measured relative to the zone (not the raw distance) so a
 * wide Easy zone is genuinely more forgiving: 100 at dead centre, 90 at the
 * zone edge, tapering linearly the rest of the way to 0 at the bar edge.
 */
export function getTapAccuracy(position: number, zoneHalfWidth: number): number {
  const distance = Math.abs(clampPercent(position) - 50);
  const accuracy =
    distance <= zoneHalfWidth
      ? 100 - 10 * (distance / zoneHalfWidth)
      : 90 - ((distance - zoneHalfWidth) * 90) / (50 - zoneHalfWidth);
  return Math.round(Math.max(0, Math.min(100, accuracy)) * 10) / 10;
}

export function getTapRating(accuracy: number): TapRating {
  for (const [rating, threshold] of TAP_RATING_THRESHOLDS) {
    if (accuracy >= threshold) return rating;
  }
  return 'Try Again';
}
