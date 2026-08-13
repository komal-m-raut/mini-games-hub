import { Difficulty } from '@/types/game';
import { clamp } from '@/lib/utils';
import { round2 } from '@/utils/scoring';
import { StroopColorName, Trial } from './types';

export const GAME_ID = 'stroop-snap';

/** Seconds of "3 · 2 · 1" before each round's trials start. */
export const COUNTDOWN_SECONDS = 3;

/** Length of a single round. */
export const ROUND_SECONDS = 30;

/** Solo sessions run this many rounds, all at the chosen difficulty — a
 *  30-second round is long enough that the site's usual 5-round default
 *  would run to 2.5 minutes, so this game uses the same 3-round length as
 *  its challenge instead. */
export const SOLO_ROUND_COUNT = 3;

/** Pre-generated per round. At 30s this is far more than even a very fast
 *  player can exhaust (≈375ms/trial average), so the pace never runs dry —
 *  the hook still wraps defensively if it somehow does. */
export const TRIALS_PER_ROUND = 80;

/** How long the correct/wrong flash overlay holds before fading. */
export const FLASH_MS = 150;

export interface StroopColor {
  name: StroopColorName;
  hex: string;
}

/** Every colour the game can use, keyed by name. Hex values picked for
 *  contrast on the dark background rather than pure primaries. */
export const COLORS: Record<StroopColorName, StroopColor> = {
  RED: { name: 'RED', hex: '#EF4444' },
  BLUE: { name: 'BLUE', hex: '#3B82F6' },
  GREEN: { name: 'GREEN', hex: '#22C55E' },
  YELLOW: { name: 'YELLOW', hex: '#EAB308' },
  PURPLE: { name: 'PURPLE', hex: '#A855F7' },
  ORANGE: { name: 'ORANGE', hex: '#F97316' },
};

/**
 * Colour pool per difficulty, in a fixed order — this order also drives the
 * answer grid and the 1–6 hotkey mapping, and it never changes round to
 * round, so a player's motor memory for "blue is bottom-left" stays valid
 * for the whole session (see the FAQ).
 */
export const COLOR_POOL: Record<Difficulty, StroopColorName[]> = {
  easy: ['RED', 'BLUE', 'GREEN'],
  medium: ['RED', 'BLUE', 'GREEN', 'YELLOW'],
  hard: ['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE', 'ORANGE'],
};

/** Share of trials where the ink matches the word (no conflict). Lower means
 *  more of the round is spent fighting the Stroop effect itself. */
export const CONGRUENT_RATE: Record<Difficulty, number> = {
  easy: 0.45,
  medium: 0.3,
  hard: 0.2,
};

/** Net score (correct − wrong) that earns a full 10 at this difficulty. */
export const PAR_NET: Record<Difficulty, number> = {
  easy: 18,
  medium: 16,
  hard: 14,
};

export interface StroopDifficultyConfig {
  label: string;
  /** Short qualifier shown under the difficulty name on the selector. */
  qualifier: string;
  color: string;
  glow: string;
}

export const STROOP_DIFFICULTY: Record<Difficulty, StroopDifficultyConfig> = {
  easy: {
    label: 'Easy',
    qualifier: '3 colours · 45% match',
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
  medium: {
    label: 'Medium',
    qualifier: '4 colours · 30% match',
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
  hard: {
    label: 'Hard',
    qualifier: '6 colours · 20% match',
    color: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
};

/** True when the ink matches the word — no Stroop conflict on this trial. */
export function isCongruent(trial: Trial): boolean {
  return trial.word === trial.ink;
}

/**
 * A round's trial sequence for a difficulty, drawn from `rand` — pure and
 * deterministic, so solo (Math.random) and challenge (seeded) share this one
 * generator. Congruency is decided per trial against `CONGRUENT_RATE`; an
 * incongruent trial redraws its ink until it differs from the word. A trial
 * is also redrawn if it would exactly repeat the previous trial's word+ink
 * pair, so two identical trials never appear back to back.
 */
export function makeTrials(
  difficulty: Difficulty,
  rand: () => number,
  count: number = TRIALS_PER_ROUND
): Trial[] {
  const pool = COLOR_POOL[difficulty];
  const rate = CONGRUENT_RATE[difficulty];
  const trials: Trial[] = [];
  let prev: Trial | null = null;

  for (let i = 0; i < count; i++) {
    let trial: Trial;
    do {
      const word = pool[Math.floor(rand() * pool.length)];
      const congruent = rand() < rate;
      let ink = word;
      if (!congruent) {
        do {
          ink = pool[Math.floor(rand() * pool.length)];
        } while (ink === word);
      }
      trial = { word, ink };
    } while (prev !== null && trial.word === prev.word && trial.ink === prev.ink);
    trials.push(trial);
    prev = trial;
  }
  return trials;
}

/** net = max(0, correct − wrong) — wrong taps can zero a round but never
 *  push it negative. */
export function getNetScore(correct: number, wrong: number): number {
  return Math.max(0, correct - wrong);
}

/** Round score out of 10: net scaled against that difficulty's par, clamped
 *  to [0, 10] and rounded to 2dp. */
export function getStroopScore(net: number, difficulty: Difficulty): number {
  return round2(clamp((net / PAR_NET[difficulty]) * 10, 0, 10));
}
