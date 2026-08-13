import { clamp } from '@/lib/utils';
import { round2 } from '@/utils/scoring';
import { MAX_GUESSES } from './constants';
import { VALID_GUESSES } from './words';

/**
 * The heart of Word Quest: pure, DOM-free game logic. Everything here is
 * unit-tested directly (see tests/word-quest.test.ts) — no React, no
 * timers, no randomness beyond what's passed in.
 */

export type TileState = 'correct' | 'present' | 'absent';

export interface GuessRow {
  guess: string;
  result: TileState[];
}

/**
 * Evaluates one guess against the answer with the standard two-pass
 * duplicate-letter algorithm (the same one Wordle uses):
 *
 *  1. First pass: mark every position where `guess` and `answer` share the
 *     same letter as `correct`, and decrement that letter's remaining count
 *     in `answer`.
 *  2. Second pass: for every position not already `correct`, mark it
 *     `present` only while `answer` still has an unclaimed copy of that
 *     letter left (decrementing as it goes) — otherwise `absent`.
 *
 * Doing greens first and decrementing before yellows are ever considered is
 * what makes duplicate letters behave correctly: a guess can't claim more
 * yellows for a letter than the answer actually has copies of once its
 * greens are accounted for.
 */
export function evaluateGuess(guess: string, answer: string): TileState[] {
  const g = guess.toLowerCase();
  const a = answer.toLowerCase();
  const result: TileState[] = new Array(a.length).fill('absent');

  const remaining: Record<string, number> = {};
  for (const letter of a) {
    remaining[letter] = (remaining[letter] ?? 0) + 1;
  }

  // Pass 1 — exact position matches.
  for (let i = 0; i < a.length; i++) {
    if (g[i] === a[i]) {
      result[i] = 'correct';
      remaining[g[i]] -= 1;
    }
  }

  // Pass 2 — wrong-position matches, capped by what pass 1 left unclaimed.
  for (let i = 0; i < a.length; i++) {
    if (result[i] === 'correct') continue;
    const letter = g[i];
    if (remaining[letter] > 0) {
      result[i] = 'present';
      remaining[letter] -= 1;
    }
  }

  return result;
}

/** Case-insensitive membership check against the game's dictionary. */
export function isValidWord(word: string): boolean {
  return VALID_GUESSES.has(word.toLowerCase());
}

const STATE_RANK: Record<TileState, number> = { absent: 0, present: 1, correct: 2 };

export type KeyboardState = Record<string, TileState>;

/**
 * Aggregates every guessed row into one state per letter, for the on-screen
 * keyboard. A letter's displayed state can only improve as more rows come
 * in — correct beats present beats absent, and it never downgrades (e.g. a
 * letter marked `correct` in one row stays `correct` even if a later row
 * marks the same letter `absent` at a different position).
 */
export function aggregateKeyboardState(rows: GuessRow[]): KeyboardState {
  const state: KeyboardState = {};
  for (const { guess, result } of rows) {
    for (let i = 0; i < guess.length; i++) {
      const letter = guess[i];
      const next = result[i];
      const current = state[letter];
      if (!current || STATE_RANK[next] > STATE_RANK[current]) {
        state[letter] = next;
      }
    }
  }
  return state;
}

export interface BestRowStats {
  greens: number;
  yellows: number;
}

/** The single best-scoring row across a (failed) round's guesses, ranked by
 *  greens first, then yellows — the pair `scoreRound` gives partial credit
 *  from. */
export function bestRowStats(rows: TileState[][]): BestRowStats {
  let best: BestRowStats = { greens: 0, yellows: 0 };
  let bestRank = -1;
  for (const row of rows) {
    const greens = row.filter((t) => t === 'correct').length;
    const yellows = row.filter((t) => t === 'present').length;
    const rank = greens * 2 + yellows;
    if (rank > bestRank) {
      bestRank = rank;
      best = { greens, yellows };
    }
  }
  return best;
}

/** Score out of 10 for solving in N guesses, indexed [0] = solved in 1. */
export const SOLVE_SCORE: readonly number[] = [10, 9, 7.5, 6, 4.5, 3];

/** Most partial credit a failed round can ever earn. */
export const FAIL_SCORE_CAP = 2.5;

/**
 * Round score out of 10. Solving the word scores from `SOLVE_SCORE`, keyed
 * by how many guesses it took (1 → 10, down to 6 → 3). Failing to solve it
 * within `MAX_GUESSES` still earns partial credit from the *best single
 * row's* green/yellow count — 0.3 per green, 0.15 per yellow — capped at
 * `FAIL_SCORE_CAP` so a near-miss can never out-score an actual solve.
 */
export function scoreRound(solvedIn: number | null, bestRow: BestRowStats): number {
  if (solvedIn !== null && solvedIn >= 1 && solvedIn <= MAX_GUESSES) {
    return SOLVE_SCORE[solvedIn - 1];
  }
  return round2(clamp(0.3 * bestRow.greens + 0.15 * bestRow.yellows, 0, FAIL_SCORE_CAP));
}

function tileEmoji(state: TileState): string {
  if (state === 'correct') return '🟩';
  if (state === 'present') return '🟨';
  return '⬛';
}

export interface WordQuestShareInput {
  /** e.g. "Solo", or a challenge's `challengeLabel(code)`. */
  label: string;
  rows: GuessRow[];
  solvedIn: number | null;
  /** Game or challenge path, e.g. "/games/word-quest". */
  path: string;
  origin: string;
}

/**
 * Wordle-style share text: a header line, the emoji tile grid (one row per
 * guess, no spoilers), and a play link — same 3-line shape as
 * `buildSessionShare`/`buildChallengeShareText` (lib/share.ts,
 * lib/challenge.ts), just built from tile colours instead of round-score
 * emoji since a single word's guesses are the thing worth showing off here.
 */
export function buildWordQuestShareText({
  label,
  rows,
  solvedIn,
  path,
  origin,
}: WordQuestShareInput): string {
  const grid = rows.map((row) => row.result.map(tileEmoji).join('')).join('\n');
  const scoreLine = solvedIn !== null ? `${solvedIn}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  return [`Word Quest · ${label} · ${scoreLine}`, grid, `Play: ${origin}${path}`].join('\n');
}
