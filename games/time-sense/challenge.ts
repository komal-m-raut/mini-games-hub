import { Difficulty } from '@/types/game';
import { CHALLENGE_DIFFICULTIES, makeChallengeRand } from '@/lib/challenge';
import { makeDuration } from './constants';

const GAME_ID = 'time-sense';

export interface TimeSenseChallengeRound {
  difficulty: Difficulty;
  /** Target duration in seconds (2dp) — seeded so everyone gets the same one. */
  targetSeconds: number;
}

/** Same 3 seeded durations (easy → medium → hard) for a code on every device. */
export function getTimeSenseChallengeRounds(code: string): TimeSenseChallengeRound[] {
  const rand = makeChallengeRand(code, GAME_ID);
  return CHALLENGE_DIFFICULTIES.map((difficulty) => ({
    difficulty,
    targetSeconds: makeDuration(difficulty, rand),
  }));
}
