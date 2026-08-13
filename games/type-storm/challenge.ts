import { Difficulty } from '@/types/game';
import { CHALLENGE_DIFFICULTIES, makeChallengeRand } from '@/lib/challenge';
import { GAME_ID, makeWordStream } from './constants';

export interface TypeStormChallengeRound {
  difficulty: Difficulty;
  /** Pre-generated stream — seeded, so everyone types the same words in the
   *  same order. */
  words: string[];
}

/** Same 3 seeded rounds (easy → medium → hard) for a code on every device. */
export function getTypeStormChallengeRounds(code: string): TypeStormChallengeRound[] {
  const rand = makeChallengeRand(code, GAME_ID);
  return CHALLENGE_DIFFICULTIES.map((difficulty) => ({
    difficulty,
    words: makeWordStream(difficulty, rand),
  }));
}
