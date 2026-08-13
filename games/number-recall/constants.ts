import { clamp } from '@/lib/utils';
import { Difficulty, Rating } from '@/types/game';
import { MAX_ROUND_SCORE, ratingFromScore, round2 } from '@/utils/scoring';

/**
 * Number Recall: a digit-span ladder. Each round starts at the difficulty's
 * `start` length and climbs one digit at a time on every correct recall.
 * `par` is the length a round has to reach for a perfect round score — set
 * a couple of digits past typical adult digit span (~7±2), so climbing all
 * the way there is a genuine, difficulty-scaled achievement rather than a
 * given.
 */
export interface RecallDifficultyConfig {
  label: string;
  qualifier: string;
  /** Digit length the ladder starts at. */
  start: number;
  /** Length a round must reach to score a perfect 10. */
  par: number;
  color: string;
  glow: string;
}

export const RECALL_DIFFICULTY: Record<Difficulty, RecallDifficultyConfig> = {
  easy: {
    label: 'Easy',
    qualifier: 'Starts at 3 digits',
    start: 3,
    par: 7,
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
  medium: {
    label: 'Medium',
    qualifier: 'Starts at 4 digits',
    start: 4,
    par: 9,
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
  hard: {
    label: 'Hard',
    qualifier: 'Starts at 5 digits, less time to look',
    start: 5,
    par: 11,
    color: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
};

/**
 * Unlike most games here, a solo session runs the same three-round count as
 * a challenge: each "round" is already a full ladder climb to failure (not
 * a single quick trial), so three ladders is a substantial session on its
 * own — a 5-round default would make solo play nearly twice as long as a
 * challenge for no real gain.
 */
export const SOLO_ROUND_COUNT = 3;

/**
 * How many digit lengths to pre-generate per challenge round. Comfortably
 * past any reachable digit span (the hardest par is 11, and typical adult
 * span is 7±2), so a round can never run past its seeded ladder.
 */
export const CHALLENGE_LADDER_DEPTH = 20;

/** Milliseconds a number stays on screen before it hides, given its digit
 *  length. Hard trades a shorter look for the same climbing pressure as
 *  Easy/Medium — every difficulty still gets more time as digits grow. */
export function getDisplayMs(length: number, difficulty: Difficulty): number {
  return difficulty === 'hard' ? 700 + 160 * length : 900 + 220 * length;
}

/**
 * Builds a `length`-digit string: no leading zero (first digit 1–9), every
 * other digit 0–9. Pure and deterministic for a given `rand`, so challenge
 * ladders (and tests) can reproduce the exact same numbers from a seed.
 */
export function makeDigits(length: number, rand: () => number = Math.random): string {
  let digits = String(1 + Math.floor(rand() * 9));
  for (let i = 1; i < length; i++) {
    digits += String(Math.floor(rand() * 10));
  }
  return digits;
}

/**
 * Index of the first digit where `entry` diverges from `target`. Digits
 * before this index are the correct, matched prefix; digits from this index
 * onward are wrong — a hard cutoff (not per-position matching), so a later
 * digit that happens to coincide with the target still reads as part of the
 * miss, matching how the result screen highlights it. Returns the shorter
 * length when one string is a correct prefix of the other (including a
 * perfect, equal-length match).
 */
export function firstMismatchIndex(target: string, entry: string): number {
  const len = Math.min(target.length, entry.length);
  for (let i = 0; i < len; i++) {
    if (target[i] !== entry[i]) return i;
  }
  return len;
}

/**
 * Round score from the longest digit length correctly recalled. `reached`
 * is always `level − 1` at the moment a round ends (the ladder starts at
 * `start` and only climbs after a correct recall, so failing on the very
 * first number yields `reached = start − 1`, never lower). Reaching `par`
 * scores a perfect 10; failing the first number scores 0.
 */
export function scoreRound(reached: number, difficulty: Difficulty): number {
  const { start, par } = RECALL_DIFFICULTY[difficulty];
  const floor = start - 1;
  const pct = ((reached - floor) / (par - floor)) * 10;
  return round2(clamp(pct, 0, MAX_ROUND_SCORE));
}

export function getRecallRating(score: number): Rating {
  return ratingFromScore(score);
}
