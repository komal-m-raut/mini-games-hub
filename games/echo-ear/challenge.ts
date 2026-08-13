import { Difficulty } from '@/types/game';
import { CHALLENGE_DIFFICULTIES, makeChallengeRand } from '@/lib/challenge';
import { GAME_ID, makeFrequency } from './constants';

export interface EchoChallengeRound {
  difficulty: Difficulty;
  /** Pitch to recreate, Hz — seeded, so everyone matches the same tone. */
  target: number;
}

/** Same 3 target pitches (easy → medium → hard) for a code on every device. */
export function getEchoChallengeRounds(code: string): EchoChallengeRound[] {
  const rand = makeChallengeRand(code, GAME_ID);
  return CHALLENGE_DIFFICULTIES.map((difficulty) => ({
    difficulty,
    target: makeFrequency(rand),
  }));
}
