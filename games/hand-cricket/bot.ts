import { Difficulty } from '@/types/game';

/**
 * Which innings a recorded ball belongs to. `'innings1'` is the player
 * batting / bot bowling; `'innings2'` is the bot batting / player bowling.
 * The bot's own brains below are named for what *the bot* is doing, so
 * `botBowl` only ever needs to reason about `'innings1'` history and
 * `botBat` only about `'innings2'` history.
 */
export type BallPhase = 'innings1' | 'innings2';

/**
 * One already-resolved ball. The bot brains below only ever see this
 * history — never the current simultaneous pick — so the "fairness" of
 * hand cricket (nobody can see the other side's throw before committing to
 * their own) holds even against the bot's own logic.
 */
export interface BallRecord {
  playerPick: number;
  botPick: number;
  phase: BallPhase;
}

const PICKS = [1, 2, 3, 4, 5, 6] as const;

/** Uniform 1–6. */
function pickUniform(rand: () => number): number {
  return Math.floor(rand() * 6) + 1;
}

/** Uniform over 1–6 minus `exclude`. Falls back to a uniform 1–6 draw if
 *  everything happens to be excluded (never actually reachable below, since
 *  callers only ever exclude 1 or 2 numbers). */
function pickExcluding(rand: () => number, exclude: Set<number>): number {
  const allowed = PICKS.filter((p) => !exclude.has(p));
  if (allowed.length === 0) return pickUniform(rand);
  return allowed[Math.floor(rand() * allowed.length)];
}

/** Most recent ball of a given phase, or undefined if none played yet. */
function lastOfPhase(history: BallRecord[], phase: BallPhase): BallRecord | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].phase === phase) return history[i];
  }
  return undefined;
}

/** Frequency of the player's picks within one phase, keyed by 1–6. */
function playerFrequency(history: BallRecord[], phase: BallPhase): Map<number, number> {
  const freq = new Map<number, number>();
  for (const ball of history) {
    if (ball.phase !== phase) continue;
    freq.set(ball.playerPick, (freq.get(ball.playerPick) ?? 0) + 1);
  }
  return freq;
}

/** Draws a pick weighted by `freq`; uniform if `freq` is empty (no history yet). */
function weightedPick(rand: () => number, freq: Map<number, number>): number {
  const total = Array.from(freq.values()).reduce((sum, n) => sum + n, 0);
  if (total === 0) return pickUniform(rand);
  let r = rand() * total;
  for (const n of PICKS) {
    const w = freq.get(n) ?? 0;
    if (r < w) return n;
    r -= w;
  }
  // Floating-point rounding safety net — should be unreachable.
  return PICKS[PICKS.length - 1];
}

/** The `count` most-frequent picks in `freq`, as a set (ties broken by
 *  insertion order, which is stable for a given history). */
function topFrequent(freq: Map<number, number>, count: number): Set<number> {
  return new Set(
    Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([pick]) => pick)
  );
}

/**
 * The bot's bowl for innings 1 (player batting). Never sees the player's
 * simultaneous pick — only prior balls.
 *  - easy: uniform 1–6.
 *  - medium: never repeats its own previous bowl.
 *  - hard: bowls what the player has batted most so far ("bowl what they
 *    bat" — frequency-weighted toward the player's own batting history),
 *    with 20% uniform noise so a false pattern can't be baited forever.
 */
export function botBowl(history: BallRecord[], difficulty: Difficulty, rand: () => number): number {
  if (difficulty === 'easy') return pickUniform(rand);

  if (difficulty === 'medium') {
    const last = lastOfPhase(history, 'innings1');
    return pickExcluding(rand, last ? new Set([last.botPick]) : new Set());
  }

  // hard
  if (rand() < 0.2) return pickUniform(rand);
  return weightedPick(rand, playerFrequency(history, 'innings1'));
}

/**
 * The bot's shot for innings 2 (bot batting, chasing). Never sees the
 * player's simultaneous bowl — only prior balls.
 *  - easy: uniform 1–6.
 *  - medium: avoids the number the player bowled last ball.
 *  - hard: avoids the player's two most frequent bowls so far, with 20%
 *    uniform noise.
 */
export function botBat(history: BallRecord[], difficulty: Difficulty, rand: () => number): number {
  if (difficulty === 'easy') return pickUniform(rand);

  if (difficulty === 'medium') {
    const last = lastOfPhase(history, 'innings2');
    return pickExcluding(rand, last ? new Set([last.playerPick]) : new Set());
  }

  // hard
  if (rand() < 0.2) return pickUniform(rand);
  const freq = playerFrequency(history, 'innings2');
  return pickExcluding(rand, topFrequent(freq, 2));
}
