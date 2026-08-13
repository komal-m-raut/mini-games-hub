import { Difficulty } from '@/types/game';
import { CHALLENGE_DIFFICULTIES, makeChallengeRand } from '@/lib/challenge';
import { GAME_ID, MathQuestion, makeMathQuestion } from './constants';

/**
 * Comfortably more questions than a 30s round could ever get through — even
 * skip-spamming as fast as physically possible can't outrun this, so the
 * sequence never has to wrap or regenerate mid-round.
 */
export const CHALLENGE_QUESTIONS_PER_ROUND = 60;

export interface MathChallengeRound {
  difficulty: Difficulty;
  /** Pre-generated sequence — seeded, so everyone solves the same questions
   *  in the same order. */
  questions: MathQuestion[];
}

/** Same 3 seeded rounds (easy → medium → hard) for a code on every device. */
export function getMathChallengeRounds(code: string): MathChallengeRound[] {
  const rand = makeChallengeRand(code, GAME_ID);
  return CHALLENGE_DIFFICULTIES.map((difficulty) => ({
    difficulty,
    questions: Array.from({ length: CHALLENGE_QUESTIONS_PER_ROUND }, () =>
      makeMathQuestion(difficulty, rand)
    ),
  }));
}
