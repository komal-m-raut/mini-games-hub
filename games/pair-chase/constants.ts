import { Difficulty } from '@/types/game';
import { clamp } from '@/lib/utils';
import { MAX_ROUND_SCORE, round2 } from '@/utils/scoring';

/**
 * Pair Chase: a face-down grid of emoji cards, flipped two at a time to find
 * matching pairs against the clock. Bigger boards on harder difficulties
 * mean more pairs to track in working memory, and a longer time par so the
 * extra board size doesn't also have to be raced through at the same pace.
 */
export interface PairChaseDifficultyConfig {
  label: string;
  cols: number;
  rows: number;
  /** Distinct emoji on the board — cells = pairs * 2. */
  pairs: number;
  /** Elapsed seconds at which the time component of the score hits 0 —
   *  finishing right at par earns no time bonus, before par earns some. */
  timeParSeconds: number;
  /** Difficulty badge / selector-card colour (the standard easy→hard ramp
   *  every game's DifficultySelector uses — green, orange, red). */
  color: string;
  glow: string;
}

export const PAIR_CHASE_DIFFICULTY: Record<Difficulty, PairChaseDifficultyConfig> = {
  easy: {
    label: 'Easy',
    cols: 4,
    rows: 3,
    pairs: 6,
    timeParSeconds: 35,
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
  medium: {
    label: 'Medium',
    cols: 4,
    rows: 4,
    pairs: 8,
    timeParSeconds: 55,
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
  hard: {
    label: 'Hard',
    cols: 5,
    rows: 4,
    pairs: 10,
    timeParSeconds: 80,
    color: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
};

/** The game's single identity colour (matches the registry accent) — used
 *  for the card back and every "face-up/matched" highlight, regardless of
 *  difficulty. Difficulty only changes board size and time par. */
export const ACCENT = '#F472B6';
export const ACCENT_GLOW = 'rgba(244, 114, 182, 0.4)';

/** How long a mismatched pair stays face-up before flipping back, in ms. */
export const MISMATCH_FLIP_BACK_MS = 600;

/** Solo sessions run this many rounds, same as a challenge (3 seeded
 *  boards, easy → medium → hard) — three timed boards at your chosen
 *  difficulty in solo, rather than the site's usual 5-round default. */
export const SOLO_ROUND_COUNT = 3;

/**
 * ~24 distinct, visually unambiguous emoji faces the board draws from —
 * a single "animals" theme so every card reads clearly at small sizes, with
 * no two faces close enough to be mistaken for each other at a glance.
 */
export const PAIR_CHASE_EMOJI: readonly string[] = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊',
  '🐻', '🐼', '🐨', '🐯', '🦁', '🐮',
  '🐷', '🐸', '🐵', '🐔', '🐧', '🦉',
  '🦄', '🐴', '🦋', '🐢', '🐙', '🦀',
];

/**
 * A round's board: `pairs` distinct emoji drawn from `PAIR_CHASE_EMOJI` via a
 * seeded partial Fisher–Yates, each duplicated, then the full deck shuffled
 * with a seeded Fisher–Yates. Pure and deterministic for a given `rand`
 * stream — Math.random for solo play, a seeded stream for challenges.
 */
export function makeLayout(difficulty: Difficulty, rand: () => number = Math.random): string[] {
  const pairs = PAIR_CHASE_DIFFICULTY[difficulty].pairs;
  const pool = [...PAIR_CHASE_EMOJI];
  const n = Math.min(pairs, pool.length);

  // Partial Fisher–Yates over the emoji pool: picks `n` distinct faces.
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rand() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picked = pool.slice(0, n);

  const deck = picked.flatMap((emoji) => [emoji, emoji]);

  // Full Fisher–Yates shuffle of the deck.
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Round score out of 10: up to 8 points for flip efficiency (how close to
 * the theoretical minimum of `2 * pairs` flips the round took) plus up to 2
 * points for beating the difficulty's time par. Finishing exactly at par
 * earns no time bonus; finishing later loses none either — the par only
 * ever adds, never subtracts.
 */
export function scoreRound(flips: number, elapsedSeconds: number, difficulty: Difficulty): number {
  const cfg = PAIR_CHASE_DIFFICULTY[difficulty];
  const minFlips = 2 * cfg.pairs;
  if (flips <= 0) return 0;

  const flipComponent = (minFlips / flips) * 8;
  const timeComponent = clamp((cfg.timeParSeconds - elapsedSeconds) / cfg.timeParSeconds, 0, 1) * 2;
  return round2(clamp(flipComponent + timeComponent, 0, MAX_ROUND_SCORE));
}
