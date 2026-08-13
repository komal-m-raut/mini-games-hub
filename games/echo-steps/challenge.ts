import { Difficulty } from '@/types/game';
import { CHALLENGE_DIFFICULTIES, makeChallengeRand } from '@/lib/challenge';
import { MASTER_SEQUENCE_LENGTH, makeSequence } from './constants';

const GAME_ID = 'echo-steps';

export interface EchoStepsChallengeRound {
  difficulty: Difficulty;
  /** The round's fixed master sequence — every level's pattern is a prefix
   *  of this (see `sequenceForLevel` in constants.ts), so it only needs to
   *  be drawn once per round. */
  master: number[];
}

/**
 * Same 3 master sequences (easy → medium → hard) for a code on every
 * device. One RNG stream feeds all three `makeSequence` calls in order, so
 * the whole series — and therefore every level's prefix within it — is
 * deterministic for the code.
 */
export function getEchoStepsChallengeRounds(code: string): EchoStepsChallengeRound[] {
  const rand = makeChallengeRand(code, GAME_ID);
  return CHALLENGE_DIFFICULTIES.map((difficulty) => ({
    difficulty,
    master: makeSequence(MASTER_SEQUENCE_LENGTH, rand),
  }));
}
