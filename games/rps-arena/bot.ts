import { Difficulty } from '@/types/game';
import { Throw, ThrowRecord } from './types';

export const THROWS: Throw[] = ['rock', 'paper', 'scissors'];

/** The move that beats `t` — rock beats scissors, paper beats rock, scissors
 *  beats paper. */
const COUNTERS: Record<Throw, Throw> = {
  rock: 'paper',
  paper: 'scissors',
  scissors: 'rock',
};

export function counterThrow(t: Throw): Throw {
  return COUNTERS[t];
}

/** Uniform 1-in-3 draw from `rand`. */
export function uniformThrow(rand: () => number): Throw {
  return THROWS[Math.floor(rand() * THROWS.length) % THROWS.length];
}

/** Medium's noise rate: how often it ignores its read of the player and
 *  throws uniformly instead. */
const MEDIUM_NOISE = 0.25;
/** Hard's noise rate — lower, since it's meant to bite harder. */
const HARD_NOISE = 0.15;
/** How much Hard's order-1 Markov prediction outweighs the plain frequency
 *  counter when both have data to offer. */
const HARD_MARKOV_WEIGHT = 0.65;

function throwCounts(history: ThrowRecord[]): Record<Throw, number> {
  const counts: Record<Throw, number> = { rock: 0, paper: 0, scissors: 0 };
  for (const h of history) counts[h.player]++;
  return counts;
}

/** Normalizes a count map to a probability distribution, or null if every
 *  count is zero (nothing to read yet). */
function normalize(counts: Record<Throw, number>): Record<Throw, number> | null {
  const total = counts.rock + counts.paper + counts.scissors;
  if (total === 0) return null;
  return {
    rock: counts.rock / total,
    paper: counts.paper / total,
    scissors: counts.scissors / total,
  };
}

/** Highest-probability throw in a distribution. Ties break in a fixed
 *  rock→paper→scissors order — deterministic, no extra `rand` draw needed. */
function argmaxThrow(dist: Record<Throw, number>): Throw {
  let best: Throw = THROWS[0];
  let bestValue = -Infinity;
  for (const t of THROWS) {
    if (dist[t] > bestValue) {
      bestValue = dist[t];
      best = t;
    }
  }
  return best;
}

/** What the player tends to throw right after each of their own throws —
 *  an order-1 Markov transition table built from `history` alone. */
function transitionCounts(history: ThrowRecord[]): Record<Throw, Record<Throw, number>> {
  const table: Record<Throw, Record<Throw, number>> = {
    rock: { rock: 0, paper: 0, scissors: 0 },
    paper: { rock: 0, paper: 0, scissors: 0 },
    scissors: { rock: 0, paper: 0, scissors: 0 },
  };
  for (let i = 1; i < history.length; i++) {
    table[history[i - 1].player][history[i].player]++;
  }
  return table;
}

/** Medium's read: the player's single most-thrown move overall. `history`
 *  is guaranteed non-empty by `botMove` before this is called. */
function mediumPrediction(history: ThrowRecord[]): Throw {
  const freq = normalize(throwCounts(history));
  return argmaxThrow(freq!);
}

/** Hard's read: blends an order-1 Markov prediction — keyed off what the
 *  player threw right after their *last* throw, historically — with the
 *  same overall frequency counter Medium uses. Falls back to frequency
 *  alone when there's no transition data yet for the player's last throw. */
function hardPrediction(history: ThrowRecord[]): Throw {
  const freqDist = normalize(throwCounts(history)) ?? {
    rock: 1 / 3,
    paper: 1 / 3,
    scissors: 1 / 3,
  };
  const lastPlayerThrow = history[history.length - 1].player;
  const transitionRow = transitionCounts(history)[lastPlayerThrow];
  const transDist = normalize(transitionRow);
  if (!transDist) return argmaxThrow(freqDist);

  const blended: Record<Throw, number> = { rock: 0, paper: 0, scissors: 0 };
  for (const t of THROWS) {
    blended[t] = HARD_MARKOV_WEIGHT * transDist[t] + (1 - HARD_MARKOV_WEIGHT) * freqDist[t];
  }
  return argmaxThrow(blended);
}

/**
 * The bot's move for the throw about to happen. Pure function of `history`
 * (everything already played this match), `difficulty` and `rand` — notice
 * there is no parameter for the player's current throw, so the bot cannot
 * see it: this is enforced by the function's own signature, not a runtime
 * check.
 *
 *  - `easy`: uniform random, always.
 *  - `medium`: a frequency counter over every player throw so far predicts
 *    their favourite move; the bot throws whatever beats it, 75% of the
 *    time (25% uniform noise).
 *  - `hard`: an order-1 Markov model — what the player tends to throw right
 *    after their last throw — blended with the same frequency counter,
 *    predicts their next move; the bot throws whatever beats it, 85% of the
 *    time (15% uniform noise).
 *  - Every difficulty is uniform on a match's very first throw: there's no
 *    history yet to read.
 */
export function botMove(history: ThrowRecord[], difficulty: Difficulty, rand: () => number): Throw {
  if (history.length === 0) return uniformThrow(rand);
  if (difficulty === 'easy') return uniformThrow(rand);

  if (difficulty === 'medium') {
    if (rand() < MEDIUM_NOISE) return uniformThrow(rand);
    return counterThrow(mediumPrediction(history));
  }

  // hard
  if (rand() < HARD_NOISE) return uniformThrow(rand);
  return counterThrow(hardPrediction(history));
}
