import { Difficulty } from '@/types/game';
import { clamp } from '@/lib/utils';
import { round2 } from '@/utils/scoring';

export const GAME_ID = 'snake';

/** Each challenge round runs for this many real-time seconds, whether the
 *  snake survives the whole round or dies early (see useSnakeGame.ts). */
export const CHALLENGE_ROUND_SECONDS = 60;

export interface SnakeDifficultyConfig {
  label: string;
  /** Short qualifier shown under the difficulty name on the selector. */
  qualifier: string;
  /** Tick interval at foodEaten = 0, in ms — lower is faster. */
  startTickMs: number;
  /** Floor the tick interval never drops below, however much food is eaten. */
  minTickMs: number;
  /** ms shaved off the tick interval per food eaten (see tickMs()). */
  decayPerFood: number;
  color: string;
  glow: string;
}

/**
 * Speed curve per difficulty. Values are exact per the design spec: Easy
 * 140ms → 95ms floor at −1.5ms/food, Medium 120ms → 80ms at −1.6ms/food,
 * Hard 105ms → 65ms at −1.6ms/food.
 */
export const SNAKE_DIFFICULTY: Record<Difficulty, SnakeDifficultyConfig> = {
  easy: {
    label: 'Easy',
    qualifier: '140ms start, eases to 95ms',
    startTickMs: 140,
    minTickMs: 95,
    decayPerFood: 1.5,
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
  medium: {
    label: 'Medium',
    qualifier: '120ms start, eases to 80ms',
    startTickMs: 120,
    minTickMs: 80,
    decayPerFood: 1.6,
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
  hard: {
    label: 'Hard',
    qualifier: '105ms start, eases to 65ms',
    startTickMs: 105,
    minTickMs: 65,
    decayPerFood: 1.6,
    color: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
};

/** Tick interval (ms) for a difficulty at a given food-eaten count — the
 *  snake speeds up as it eats, floored per difficulty so it never becomes
 *  literally unplayable. */
export function tickMs(difficulty: Difficulty, foodEaten: number): number {
  const cfg = SNAKE_DIFFICULTY[difficulty];
  return Math.max(cfg.minTickMs, cfg.startTickMs - cfg.decayPerFood * foodEaten);
}

/** Solo endless score is capped here before being handed to
 *  recordGameResult (see useSnakeGame.ts) — an arbitrarily long run still
 *  reports a finite maxScore-relative percentage for XP purposes. */
export const SOLO_MAX_SCORE = 50;

/**
 * Challenge round score out of 10: 25 food eaten inside the 60-second round
 * is a perfect 10 — a steep curve, intentionally (see content.ts), so a
 * genuinely excellent round is required to max it out rather than merely a
 * competent one.
 */
export function scoreRound(foodEaten: number): number {
  return round2(clamp(foodEaten / 2.5, 0, 10));
}
