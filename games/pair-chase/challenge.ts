import { Difficulty } from '@/types/game';
import { CHALLENGE_DIFFICULTIES, makeChallengeRand } from '@/lib/challenge';
import { makeLayout } from './constants';

const GAME_ID = 'pair-chase';

export interface PairChaseChallengeRound {
  difficulty: Difficulty;
  board: string[];
}

/**
 * Same 3 boards (easy → medium → hard) for a code on every device. One RNG
 * stream feeds every `makeLayout` call across all three rounds, in round
 * order, so each round's board is identical for every player regardless of
 * how the previous round went.
 */
export function getPairChaseChallengeRounds(code: string): PairChaseChallengeRound[] {
  const rand = makeChallengeRand(code, GAME_ID);
  return CHALLENGE_DIFFICULTIES.map((difficulty) => ({
    difficulty,
    board: makeLayout(difficulty, rand),
  }));
}
