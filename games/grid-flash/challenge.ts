import { Difficulty } from '@/types/game';
import { CHALLENGE_DIFFICULTIES, makeChallengeRand } from '@/lib/challenge';
import { GRID_FLASH_DIFFICULTY, START_LEVEL, generatePattern, maxLevelFor } from './constants';

const GAME_ID = 'grid-flash';

export interface GridFlashChallengeRound {
  difficulty: Difficulty;
  /** Patterns for every level of this round's ladder, indexed from
   *  START_LEVEL — `levels[0]` is level 3's pattern, `levels[1]` level 4's,
   *  and so on up to the round's cap (`cells - 1`). */
  levels: number[][];
}

/**
 * Same 3 ladders (easy → medium → hard) for a code on every device. One RNG
 * stream feeds every `generatePattern` call across all three rounds, in
 * level order, so a level's pattern is identical for every player at that
 * exact (round, level) — regardless of how far any particular player
 * actually climbed. The *entire* potential ladder for each round is
 * generated up front (not lazily as levels are reached) precisely so an
 * earlier round's outcome can never shift a later round's rand-stream
 * position between players.
 */
export function getGridFlashChallengeRounds(code: string): GridFlashChallengeRound[] {
  const rand = makeChallengeRand(code, GAME_ID);
  return CHALLENGE_DIFFICULTIES.map((difficulty) => {
    const cfg = GRID_FLASH_DIFFICULTY[difficulty];
    const maxLevel = maxLevelFor(difficulty);
    const levels: number[][] = [];
    for (let level = START_LEVEL; level <= maxLevel; level++) {
      levels.push(generatePattern(cfg.cells, level, rand));
    }
    return { difficulty, levels };
  });
}
