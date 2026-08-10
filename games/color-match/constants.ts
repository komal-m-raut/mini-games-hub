import { Difficulty } from '@/types/game';
import { NORMAL_ROUND_COUNT, calculateScore, ratingFromScore } from '@/utils/scoring';
import { RGB, colorAccuracy, hslToRgb } from './colorMath';
import { ColorRating } from './types';

export const GAME_ID = 'color-match';

/**
 * localStorage id for a best session. Bests are kept per session length — a
 * 3-round 30 and a 5-round 50 aren't comparable — and the default length
 * keeps the bare game id so existing records survive.
 */
export function bestSessionKey(rounds: number): string {
  return rounds === NORMAL_ROUND_COUNT ? GAME_ID : `${GAME_ID}-r${rounds}`;
}

export interface ColorDifficultyConfig {
  label: string;
  /** Short qualifier under the difficulty name on the selector. */
  qualifier: string;
  observeSeconds: number;
  /** Colour distance at which accuracy hits 0 — smaller is less forgiving. */
  tolerance: number;
  color: string;
  glow: string;
}

/**
 * Difficulty moves three things at once: how long the colour is on screen,
 * how close the match has to be, and how subtle the colour is.
 */
export const COLOR_DIFFICULTY: Record<Difficulty, ColorDifficultyConfig> = {
  easy: {
    label: 'Easy',
    qualifier: 'Bold colours, 5s to look',
    observeSeconds: 5,
    tolerance: 0.5,
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
  medium: {
    label: 'Medium',
    qualifier: 'Subtler shades, 3s to look',
    observeSeconds: 3,
    tolerance: 0.32,
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
  hard: {
    label: 'Hard',
    qualifier: 'Only 2s to look',
    observeSeconds: 2,
    // 0.18 made a good-faith ~20-per-channel miss score 1.3/10 and zeroed at
    // 30. Hard should be unforgiving, not unscoreable.
    tolerance: 0.22,
    color: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
};

/** Sliders start from neutral grey, so no round is a freebie. */
export const START_COLOR: RGB = { r: 128, g: 128, b: 128 };

/**
 * Minimum hue separation between consecutive targets. Random hues clump, and
 * two greens in a row read as "the same colour again".
 */
export const MIN_HUE_GAP = 55;

/** Saturation and lightness bands per difficulty, in HSL percentages. */
const BANDS: Record<Difficulty, { s: [number, number]; l: [number, number] }> = {
  easy: { s: [60, 90], l: [45, 62] },
  medium: { s: [45, 80], l: [38, 62] },
  hard: { s: [40, 78], l: [35, 60] },
};

/**
 * Target colour for a difficulty. Takes the RNG rather than calling
 * Math.random so challenge rounds can seed it; `avoidHue` steers clear of the
 * previous round. Consumes one RNG value either way, keeping seeds stable.
 */
export function makeTargetColor(
  difficulty: Difficulty,
  rand: () => number,
  avoidHue?: number
): RGB {
  const hue =
    avoidHue === undefined
      ? rand() * 360
      : (avoidHue + MIN_HUE_GAP + rand() * (360 - 2 * MIN_HUE_GAP)) % 360;

  const { s, l } = BANDS[difficulty];
  return hslToRgb(hue, s[0] + rand() * (s[1] - s[0]), l[0] + rand() * (l[1] - l[0]));
}

export function getColorAccuracy(target: RGB, actual: RGB, difficulty: Difficulty): number {
  return colorAccuracy(target, actual, COLOR_DIFFICULTY[difficulty].tolerance);
}

/** 95%+ earns its own sound and a particle burst. */
export const AMAZING_ACCURACY = 95;
export const PERFECT_ACCURACY = 99.5;

/**
 * Perfect ≥ 99.5% · Amazing ≥ 95% · then the shared score curve. Below 95%
 * the curve tops out at 9/10, so the two "Perfect" definitions can't collide.
 */
export function getColorRating(accuracy: number): ColorRating {
  if (accuracy >= PERFECT_ACCURACY) return 'Perfect';
  if (accuracy >= AMAZING_ACCURACY) return 'Amazing';
  return ratingFromScore(calculateScore(accuracy));
}
