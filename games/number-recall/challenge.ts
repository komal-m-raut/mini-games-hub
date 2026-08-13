import { Difficulty } from '@/types/game';
import { CHALLENGE_DIFFICULTIES, makeChallengeRand } from '@/lib/challenge';
import { CHALLENGE_LADDER_DEPTH, RECALL_DIFFICULTY, makeDigits } from './constants';

const GAME_ID = 'number-recall';

export interface RecallChallengeRound {
  difficulty: Difficulty;
  /** Digit strings for every ladder level, index 0 = the difficulty's start
   *  length, index i = `start + i` digits. */
  ladder: string[];
}

/**
 * Same 3 ladders (easy → medium → hard) for a code on every device. One RNG
 * stream feeds every `makeDigits` call across all three rounds in order, so
 * the whole series is deterministic for the code. Each ladder is
 * pre-generated `CHALLENGE_LADDER_DEPTH` levels deep — far past any
 * reachable digit span — so a round can never run out of numbers to show.
 */
export function getRecallChallengeRounds(code: string): RecallChallengeRound[] {
  const rand = makeChallengeRand(code, GAME_ID);
  return CHALLENGE_DIFFICULTIES.map((difficulty) => {
    const { start } = RECALL_DIFFICULTY[difficulty];
    const ladder = Array.from({ length: CHALLENGE_LADDER_DEPTH }, (_, i) =>
      makeDigits(start + i, rand)
    );
    return { difficulty, ladder };
  });
}
