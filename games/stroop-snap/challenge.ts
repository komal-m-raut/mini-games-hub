import { Difficulty } from '@/types/game';
import { CHALLENGE_DIFFICULTIES, makeChallengeRand } from '@/lib/challenge';
import { GAME_ID, makeTrials } from './constants';
import { Trial } from './types';

export interface StroopChallengeRound {
  difficulty: Difficulty;
  /** This round's full trial sequence — seeded, so everyone sees the same
   *  words/inks in the same order. */
  trials: Trial[];
}

/** Same 3 seeded rounds (easy → medium → hard) for a code on every device. */
export function getStroopChallengeRounds(code: string): StroopChallengeRound[] {
  const rand = makeChallengeRand(code, GAME_ID);
  return CHALLENGE_DIFFICULTIES.map((difficulty) => ({
    difficulty,
    trials: makeTrials(difficulty, rand),
  }));
}
