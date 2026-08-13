import { Difficulty } from '@/types/game';
import { calculateScore } from '@/utils/scoring';
import { RingLabel } from './types';

/**
 * Bullseye: two sequential timing locks (a vertical read, then a horizontal
 * one) compose into one 2D throw, then a difficulty-seeded wobble scatters
 * it slightly — same idea as a real dart never landing exactly where the
 * hand released it. Board coordinates share Timing Tap's 0–100 bar-percent
 * convention on both axes, so the board's centre sits at (50, 50) and its
 * outer edge is a circle of radius `BOARD_RADIUS` inscribed in that square —
 * the square's corners sit outside the circle, so an extreme throw on both
 * axes can miss the board entirely, same as a real dartboard's backing.
 */
export const BOARD_CENTER = 50;
export const BOARD_RADIUS = 50;

/** A round is 5 darts; solo and challenge both run 3 rounds (15 darts). */
export const DARTS_PER_ROUND = 5;
/** Solo picks one difficulty and plays this many 5-dart rounds at it —
 *  named separately from `CHALLENGE_ROUND_COUNT` (also 3) so the two never
 *  accidentally diverge from a shared "3" that means different things. */
export const SOLO_ROUND_COUNT = 3;

/** Per-leg drift multipliers cycled at every extremum (Hard's wobble in the
 *  *timing*, distinct from the landing wobble below). Easy/Medium have zero
 *  drift, so their scales are trivially all `1`. */
export const LEG_SCALE_COUNT = 6;

/** A dart landing this close to centre (accuracy ≥ this) flashes "BULLSEYE!"
 *  and plays the celebrate sound instead of a plain thunk. Not a coincidence
 *  that this equals `100 - 8`: it's exactly the bullseye ring's threshold
 *  below, so the flash and the ring drawing always agree. */
export const CELEBRATE_ACCURACY = 92;

export interface BullseyeDifficultyConfig {
  label: string;
  /** Aim-line oscillation speed, full swings per second. */
  frequencyHz: number;
  /** Landing wobble radius, as a fraction of BOARD_RADIUS. */
  wobbleRadiusPercent: number;
  /** Hard only: per-leg duration drift is drawn from ±this fraction. */
  legDriftPercent: number;
  color: string;
  glow: string;
  beam: string;
}

export const BULLSEYE_DIFFICULTY: Record<Difficulty, BullseyeDifficultyConfig> = {
  easy: {
    label: 'Easy',
    frequencyHz: 0.8,
    wobbleRadiusPercent: 0.02,
    legDriftPercent: 0,
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
    beam: '#22D3EE',
  },
  medium: {
    label: 'Medium',
    frequencyHz: 1.15,
    wobbleRadiusPercent: 0.035,
    legDriftPercent: 0,
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
    beam: '#A78BFA',
  },
  hard: {
    label: 'Hard',
    frequencyHz: 1.5,
    wobbleRadiusPercent: 0.05,
    legDriftPercent: 0.15,
    color: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.4)',
    beam: '#F43F5E',
  },
};

const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

/**
 * Accuracy 0–100 (1dp) for a dart at distance `dist` from the board's
 * centre, judged against `boardRadius`: 100 dead centre, tapering linearly
 * to 0 at the board's edge, and 0 for anything beyond it (the clamp handles
 * that last case for free — `dist > boardRadius` already drives the raw
 * formula negative).
 */
export function dartAccuracy(dist: number, boardRadius: number): number {
  const raw = 100 * (1 - dist / boardRadius);
  return Math.round(clamp(raw, 0, 100) * 10) / 10;
}

/**
 * Round score out of 10 (2dp): the mean of a round's 5 dart accuracies,
 * mapped through the site's shared accuracy→score curve. Kept as a
 * one-line wrapper (rather than inlining the mean at every call site) so
 * "how a round's darts become its score" lives in exactly one place.
 */
export function scoreRound(accuracies: number[]): number {
  const mean = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
  return calculateScore(mean);
}

/**
 * Ring boundaries as a fraction of `BOARD_RADIUS`, innermost first, paired
 * with their cosmetic label. The bullseye ring's 0.08 threshold is exactly
 * `CELEBRATE_ACCURACY`'s complement (100 - 92 = 8), so "inside the bullseye
 * ring" and "flashes BULLSEYE!" are the same condition by construction.
 * Display only — never fed back into scoring.
 */
export const RING_THRESHOLDS: ReadonlyArray<readonly [RingLabel, number]> = [
  ['BULLSEYE', 0.08],
  ['50', 0.25],
  ['25', 0.5],
  ['10', 0.75],
  ['5', 1],
];

export function getRingLabel(dist: number, boardRadius: number): RingLabel {
  const ratio = dist / boardRadius;
  for (const [label, threshold] of RING_THRESHOLDS) {
    if (ratio <= threshold) return label;
  }
  return 'MISS';
}

export interface WobbleVector {
  dx: number;
  dy: number;
}

/**
 * A seeded point uniformly distributed inside a disc of the given radius —
 * the honest "a dart never lands exactly where you released it" scatter.
 * `sqrt(rand())` (not a bare `rand()`) for the radius draw is what makes the
 * distribution uniform *over the disc's area* rather than clustering near
 * the centre, where a linear radius draw would bunch points as the
 * circumference shrinks.
 */
export function makeWobble(radius: number, rand: () => number): WobbleVector {
  const r = radius * Math.sqrt(rand());
  const theta = rand() * 2 * Math.PI;
  return { dx: r * Math.cos(theta), dy: r * Math.sin(theta) };
}
