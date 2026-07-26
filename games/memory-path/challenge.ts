import { Difficulty } from '@/types/game';
import { CHALLENGE_DIFFICULTIES, makeChallengeRand } from '@/lib/challenge';
import { PATH_DIFFICULTY } from './constants';
import { Cell, generatePath } from './pathGen';

const GAME_ID = 'memory-path';

export interface PathChallengeRound {
  difficulty: Difficulty;
  /** The exact path to memorize — seeded so everyone traces the same one. */
  path: Cell[];
}

/**
 * Same 3 paths (easy → medium → hard) for a code on every device. One RNG
 * stream feeds all three generatePath calls in order, so the whole series is
 * deterministic for the code.
 */
export function getPathChallengeRounds(code: string): PathChallengeRound[] {
  const rand = makeChallengeRand(code, GAME_ID);
  return CHALLENGE_DIFFICULTIES.map((difficulty) => {
    const cfg = PATH_DIFFICULTY[difficulty];
    return { difficulty, path: generatePath(cfg.size, cfg.pathLength, rand) };
  });
}
