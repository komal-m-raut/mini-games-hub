import { Difficulty } from '@/types/game';
import { CHALLENGE_DIFFICULTIES, makeChallengeRand } from '@/lib/challenge';
import { GAME_ID } from './constants';
import { makeSweep, Sweep } from './sweep';

export interface BlockChallengeRound {
  difficulty: Difficulty;
  /** Seeded so every player counts the identical sweep. */
  sweep: Sweep;
}

/**
 * Same 3 seeded sweeps (easy → medium → hard) for a code on every device.
 * `reducedMotion` is threaded through so a player with that preference still
 * gets fair (calmer) challenge rounds rather than being forced off the
 * shared board — it only changes sweepMs/decoy count, never the round's
 * difficulty sequence.
 */
export function getBlockChallengeRounds(code: string, reducedMotion = false): BlockChallengeRound[] {
  const rand = makeChallengeRand(code, GAME_ID);
  return CHALLENGE_DIFFICULTIES.map((difficulty) => ({
    difficulty,
    sweep: makeSweep(difficulty, rand, { reducedMotion }),
  }));
}
