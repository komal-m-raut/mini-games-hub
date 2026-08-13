import { Difficulty } from '@/types/game';
import { CHALLENGE_DIFFICULTIES, makeChallengeRand } from '@/lib/challenge';
import { GAME_ID, makeShape } from './constants';
import { ShapeGeom } from './types';

export interface ShapeChallengeRound {
  difficulty: Difficulty;
  /** Shape to recreate — seeded, so everyone gets the same one. */
  target: ShapeGeom;
}

/** Same 3 target shapes (easy → medium → hard) for a code on every device. */
export function getShapeEchoChallengeRounds(code: string): ShapeChallengeRound[] {
  const rand = makeChallengeRand(code, GAME_ID);
  return CHALLENGE_DIFFICULTIES.map((difficulty) => ({
    difficulty,
    target: makeShape(difficulty, rand),
  }));
}
