import { Difficulty } from '@/types/game';
import { clamp } from '@/lib/utils';
import { round2 } from '@/utils/scoring';
import { WORDS } from './words';

export const GAME_ID = 'type-storm';

/** Each round is a 30-second sprint; both solo and challenge play 3 of them. */
export const ROUND_SECONDS = 30;
export const TOTAL_ROUNDS = 3;

/** Seconds of "3 · 2 · 1" before each round starts. */
export const COUNTDOWN_SECONDS = 3;

export interface TypeDifficultyConfig {
  label: string;
  /** Short qualifier shown under the difficulty name on the selector. */
  qualifier: string;
  minLen: number;
  maxLen: number;
  color: string;
  glow: string;
}

export const TYPE_DIFFICULTY: Record<Difficulty, TypeDifficultyConfig> = {
  easy: {
    label: 'Easy',
    qualifier: '3–5 letter words',
    minLen: 3,
    maxLen: 5,
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
  medium: {
    label: 'Medium',
    qualifier: '4–7 letter words',
    minLen: 4,
    maxLen: 7,
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
  hard: {
    label: 'Hard',
    qualifier: '5–9 letter words',
    minLen: 5,
    maxLen: 9,
    color: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
};

/** The corpus, filtered to each difficulty's letter-count window. */
export const WORD_POOLS: Record<Difficulty, string[]> = {
  easy: WORDS.filter((w) => w.length >= TYPE_DIFFICULTY.easy.minLen && w.length <= TYPE_DIFFICULTY.easy.maxLen),
  medium: WORDS.filter(
    (w) => w.length >= TYPE_DIFFICULTY.medium.minLen && w.length <= TYPE_DIFFICULTY.medium.maxLen
  ),
  hard: WORDS.filter((w) => w.length >= TYPE_DIFFICULTY.hard.minLen && w.length <= TYPE_DIFFICULTY.hard.maxLen),
};

// ── Word stream ───────────────────────────────────────────────────────
// Comfortably more words than a 30s round could ever get through — even
// spamming Skip as fast as physically possible can't outrun this, so a
// round never has to regenerate or wrap its stream mid-play (same reasoning
// as CHALLENGE_QUESTIONS_PER_ROUND in math-sprint/challenge.ts).
export const WORD_STREAM_LENGTH = 120;

/** Fisher–Yates, driven entirely by the RNG passed in. */
function shuffle<T>(arr: T[], rand: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * A ~120-word stream for a difficulty: the pool shuffled, emitted, then
 * reshuffled and emitted again once exhausted — "shuffle with reuse" so a
 * small pool still fuels a long round. The one seam-crossing risk (the last
 * word of one shuffle happening to equal the first word of the next) is
 * swapped away so back-to-back duplicates never happen anywhere in the
 * stream, not just within a single shuffle pass.
 */
export function makeWordStream(difficulty: Difficulty, rand: () => number): string[] {
  const pool = WORD_POOLS[difficulty];
  const out: string[] = [];
  while (out.length < WORD_STREAM_LENGTH) {
    const batch = shuffle(pool, rand);
    if (out.length > 0 && batch.length > 1 && batch[0] === out[out.length - 1]) {
      const swapWith = 1 + Math.floor(rand() * (batch.length - 1));
      [batch[0], batch[swapWith]] = [batch[swapWith], batch[0]];
    }
    out.push(...batch);
  }
  return out.slice(0, WORD_STREAM_LENGTH);
}

// ── Scoring ─────────────────────────────────────────────────────────

export interface TypeStormStats {
  /** Chars banked from correctly-submitted words (incl. one per word for
   *  the space/enter separator). */
  correctChars: number;
  /** Every char a keystroke actually added, correct or not. */
  typedChars: number;
}

export interface TypeStormScore {
  /** Words per minute: (correctChars / 5) chars-per-word, over a 30-second
   *  (0.5-minute) round. Not pre-rounded — round for display. */
  wpm: number;
  /** correctChars / typedChars, clamped to [0, 1]. */
  accuracy: number;
  /** (wpm × accuracy) / 6, clamped to [0, 10], 2dp — so 60 effective WPM
   *  (perfect accuracy) is exactly a 10. */
  score: number;
}

/** Pure function of a round's tallies — same shape for solo and challenge,
 *  and for both the end-of-round score and the live in-round HUD. */
export function scoreRound({ correctChars, typedChars }: TypeStormStats): TypeStormScore {
  const wpm = correctChars / 5 / 0.5;
  const accuracy = clamp(correctChars / Math.max(typedChars, 1), 0, 1);
  const score = round2(clamp((wpm * accuracy) / 6, 0, 10));
  return { wpm, accuracy, score };
}
