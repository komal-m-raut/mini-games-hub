import { Difficulty } from '@/types/game';
import { CHALLENGE_DIFFICULTIES, makeChallengeRand } from '@/lib/challenge';
import { GAME_ID } from './constants';

export interface SnakeChallengeRound {
  difficulty: Difficulty;
  /**
   * Seeded RNG stream driving this round's food placements (fed straight
   * into engine.ts's `placeFood`). Food positions can't be pre-generated
   * into a fixed array the way other games' challenge rounds are: the set
   * of free cells `placeFood` draws from depends on the snake's exact body
   * at that moment, which depends on the path the player actually took.
   * Handing back the RNG stream itself — rather than data derived from
   * playing it out — is what makes two plays of the same round with
   * identical input produce an identical food sequence.
   */
  rand: () => number;
}

/**
 * Same 3 seeded rounds (easy → medium → hard) for a code on every device.
 * Each round is salted by its own difficulty (not just the game id), so a
 * round's food sequence only ever depends on the moves made *within* that
 * round — never on how long a previous round in the run happened to last,
 * which would otherwise vary with player skill and desync the seed.
 */
export function getSnakeChallengeRounds(code: string): SnakeChallengeRound[] {
  return CHALLENGE_DIFFICULTIES.map((difficulty) => ({
    difficulty,
    rand: makeChallengeRand(code, `${GAME_ID}:${difficulty}`),
  }));
}
