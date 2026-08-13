import { Difficulty } from '@/types/game';
import { CHALLENGE_DIFFICULTIES } from '@/lib/challenge';

export interface FadingXoChallengeRound {
  difficulty: Difficulty;
}

/**
 * A Fading XO challenge is always the same easy → medium → hard bot ladder —
 * there's no per-round content to draw (unlike, say, math questions), so
 * this doesn't even need the challenge code. What the code seeds instead is
 * the bot's actual play: `makeChallengeRand(code, GAME_ID)` (from
 * `useFadingXoGame.ts`, which owns `GAME_ID`) drives `botMove` and its
 * think-time jitter for the whole challenge, so every player who opens the
 * same link faces bots that make the identical sequence of moves.
 */
export function getFadingXoChallengeRounds(): FadingXoChallengeRound[] {
  return CHALLENGE_DIFFICULTIES.map((difficulty) => ({ difficulty }));
}
