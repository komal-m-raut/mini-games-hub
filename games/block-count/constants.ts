import { Difficulty } from '@/types/game';
import { clamp } from '@/lib/utils';
import { MAX_ROUND_SCORE, round2 } from '@/utils/scoring';

export const GAME_ID = 'block-count';

/**
 * Target block colour — also the game's registry accent (#EF4444), so the
 * hub card and the blocks players actually count are the same red.
 */
export const TARGET_COLOR = '#EF4444';

// Decoy palettes escalate with difficulty rather than being replaced: Medium
// adds warm near-reds on top of Easy's cool greys, and Hard adds
// crimson-adjacent hues on top of that — more visual noise to sort from the
// one true red, never a different red standing in for it.
const GREY_DECOYS = ['#475569', '#64748B', '#334155'];
const WARM_DECOYS = ['#F97316', '#F472B6'];
// Deliberately close to TARGET_COLOR in hue — Hard stays fair only because
// targets get a subtle glow (see BlockCanvas) and these are darker/lighter
// than #EF4444 rather than the same brightness.
const CRIMSON_DECOYS = ['#B91C1C', '#F87171'];

/**
 * The px sizes below (and every block's generated `size`) are relative to
 * this reference stage width — the canvas scales them to whatever width it
 * actually renders at, so the same `Sweep` data looks right on any device.
 */
export const REFERENCE_STAGE_WIDTH = 640;

export interface BlockDifficultyConfig {
  label: string;
  /** Short qualifier under the difficulty name on the selector. */
  qualifier: string;
  minRed: number;
  maxRed: number;
  /** Decoy count = round(redCount * decoyMultiplier). */
  decoyMultiplier: number;
  decoyColors: string[];
  /** Nominal sweep duration; the hook waits `sweepMs * SWEEP_GRACE` before
   *  moving on to the guess phase (see sweep.ts). */
  sweepMs: number;
  minSize: number;
  maxSize: number;
  /** Vertical band, as a fraction (0–1) of stage height, blocks may occupy. */
  ySpread: [number, number];
  /** Hard only: relaxes the soft min vertical separation so blocks can
   *  overlap, on top of the tighter `ySpread` band, for real clustering. */
  allowOverlap: boolean;
  color: string;
  glow: string;
}

export const BLOCK_DIFFICULTY: Record<Difficulty, BlockDifficultyConfig> = {
  easy: {
    label: 'Easy',
    qualifier: '6–10 reds · slow, spread out',
    minRed: 6,
    maxRed: 10,
    decoyMultiplier: 1.5,
    decoyColors: GREY_DECOYS,
    sweepMs: 5200,
    minSize: 22,
    maxSize: 34,
    ySpread: [0.1, 0.9],
    allowOverlap: false,
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
  medium: {
    label: 'Medium',
    qualifier: '8–14 reds · warm decoys mixed in',
    minRed: 8,
    maxRed: 14,
    decoyMultiplier: 2,
    decoyColors: [...GREY_DECOYS, ...WARM_DECOYS],
    sweepMs: 4600,
    minSize: 18,
    maxSize: 30,
    ySpread: [0.12, 0.88],
    allowOverlap: false,
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
  hard: {
    label: 'Hard',
    qualifier: '10–18 reds · crimson decoys, tight pack',
    minRed: 10,
    maxRed: 18,
    decoyMultiplier: 2.5,
    decoyColors: [...GREY_DECOYS, ...WARM_DECOYS, ...CRIMSON_DECOYS],
    sweepMs: 3800,
    minSize: 16,
    maxSize: 26,
    ySpread: [0.2, 0.8],
    allowOverlap: true,
    color: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
};

/**
 * Round score from a guess against the true red count. An exact guess always
 * scores the max, whatever the count — otherwise accuracy tapers off with
 * the relative miss (`|guess - actual| / actual`), so a near-miss on a large
 * count is judged more gently than the same absolute miss on a small one.
 * Capped at 9 pre-round-off so only an exact guess can ever reach a 10 (an
 * off-by-one on 12 reds scores ≈8.25, never rounds up to a perfect 10).
 */
export function scoreGuess(actual: number, guess: number): number {
  if (guess === actual) return MAX_ROUND_SCORE;
  if (actual <= 0) return 0;
  const accuracy = clamp(1 - Math.abs(guess - actual) / actual, 0, 1);
  return round2(accuracy * 9);
}
