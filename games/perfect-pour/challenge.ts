import { Difficulty } from '@/types/game';
import { CHALLENGE_DIFFICULTIES, makeChallengeRand } from '@/lib/challenge';
import { MAX_TARGET_FILL, MIN_TARGET_FILL } from './constants';

const GAME_ID = 'perfect-pour';

export interface PourChallengeRound {
  difficulty: Difficulty;
  /** Fill the player must match, 0–100 — seeded so everyone gets it. */
  targetFill: number;
}

/** Same 3 pour targets (easy → medium → hard) for a code on every device. */
export function getPourChallengeRounds(code: string): PourChallengeRound[] {
  const rand = makeChallengeRand(code, GAME_ID);
  return CHALLENGE_DIFFICULTIES.map((difficulty) => {
    const targetFill =
      Math.floor(rand() * (MAX_TARGET_FILL - MIN_TARGET_FILL + 1)) + MIN_TARGET_FILL;
    return { difficulty, targetFill };
  });
}
