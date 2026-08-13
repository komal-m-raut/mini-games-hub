import { makeChallengeRand } from '@/lib/challenge';
import { GAME_ID } from './constants';

/**
 * Each challenge round needs its own independent seeded stream, salted by
 * round index — not one continuous stream carried across all 3 rounds.
 * Every round starts from a fresh empty board, but *how many* spawns a
 * player consumes during a 90s round depends entirely on how many moves
 * they personally made, which varies player to player. If round 2's stream
 * simply continued wherever round 1 left off, two players who played
 * different numbers of moves in round 1 would see *different* round 2
 * boards even while making identical moves — breaking the "same dice for
 * everyone" fairness the whole challenge scaffold promises. Salting each
 * round independently (still off the same code, still via the shared
 * `makeChallengeRand`) keeps every round's spawn stream reproducible from
 * that round's start alone.
 */
export function makeRoundRand(code: string, roundIndex: number): () => number {
  return makeChallengeRand(code, `${GAME_ID}-r${roundIndex}`);
}

export interface Challenge2048Round {
  /** Seeded spawn-stream RNG for this round — cell + value draws for every
   *  `spawnTile` call during the round, consumed in play order. */
  rand: () => number;
}

/** The 3 rounds' independent seeded RNGs for a given code — same on every
 *  device, case-insensitive (delegated to `makeChallengeRand`). */
export function get2048ChallengeRounds(code: string): Challenge2048Round[] {
  return Array.from({ length: 3 }, (_, i) => ({ rand: makeRoundRand(code, i) }));
}
