import { Difficulty } from '@/types/game';
import { CHALLENGE_DIFFICULTIES, makeChallengeRand } from '@/lib/challenge';
import { GAME_ID } from './constants';

export interface RpsChallengeMatch {
  difficulty: Difficulty;
}

/**
 * RPS Arena has nothing to pre-generate like a target number or a sweep —
 * the bot's throws depend live on what the player actually does — so the
 * only seeded content is the difficulty sequence (always easy → medium →
 * hard, same as every other challenge here) plus the bot's dice stream
 * below. Every player who opens a code sees the same 3-match sequence.
 */
export function getRpsChallengeRounds(code: string): RpsChallengeMatch[] {
  void code;
  return CHALLENGE_DIFFICULTIES.map((difficulty) => ({ difficulty }));
}

/**
 * Seeds the bot's `rand` stream for a whole challenge — one generator
 * shared across all 3 matches, continued call-by-call as the player plays.
 * "Same brain, same dice": everyone who opens this code gives the bot the
 * exact same sequence of noise/tie-break rolls, but the actual match
 * outcomes still depend entirely on the player's own throws, since the
 * bot's *predictions* are read live off each player's own history.
 */
export function makeRpsChallengeRand(code: string): () => number {
  return makeChallengeRand(code, GAME_ID);
}
