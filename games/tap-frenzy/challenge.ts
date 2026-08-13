import { Difficulty } from '@/types/game';
import { CHALLENGE_DIFFICULTIES, makeChallengeRand } from '@/lib/challenge';
import { GAME_ID, TargetSpawn, makeTargetStream } from './constants';

/**
 * Comfortably more targets than a 30s round could ever get through — even a
 * target hit in well under 100ms every single time (far faster than
 * realistic human reaction) can't outrun this, so the sequence never has to
 * wrap or regenerate mid-round. Pre-materialised (rather than handing back
 * the live generator) so a round's positions are a plain, comparable array —
 * same reasoning as math-sprint's `CHALLENGE_QUESTIONS_PER_ROUND`.
 */
export const CHALLENGE_TARGETS_PER_ROUND = 400;

export interface FrenzyChallengeRound {
  difficulty: Difficulty;
  /** Pre-generated position sequence — seeded, so everyone spawns targets
   *  in the same order at the same places. */
  positions: TargetSpawn[];
}

/**
 * Same 3 seeded target sequences (easy → medium → hard) for a code on every
 * device. Lifetimes are already deterministic (a fixed constant per
 * difficulty, see constants.ts), so only the position stream needs seeding
 * for the whole round to be fully reproducible.
 */
export function getFrenzyChallengeRounds(code: string): FrenzyChallengeRound[] {
  const rand = makeChallengeRand(code, GAME_ID);
  return CHALLENGE_DIFFICULTIES.map((difficulty) => {
    const stream = makeTargetStream(difficulty, rand);
    const positions = Array.from(
      { length: CHALLENGE_TARGETS_PER_ROUND },
      () => stream.next().value
    );
    return { difficulty, positions };
  });
}
