import { Difficulty } from '@/types/game';
import { CHALLENGE_DIFFICULTIES, makeChallengeRand } from '@/lib/challenge';
import { RGB, rgbHue } from './colorMath';
import { GAME_ID, makeTargetColor } from './constants';

export interface ColorChallengeRound {
  difficulty: Difficulty;
  /** Colour to recreate — seeded, so everyone matches the same one. */
  target: RGB;
}

/** Same 3 target colours (easy → medium → hard) for a code on every device. */
export function getColorChallengeRounds(code: string): ColorChallengeRound[] {
  const rand = makeChallengeRand(code, GAME_ID);
  // Each round steers clear of the previous hue, so a challenge can't hand out
  // three colours from the same corner of the wheel.
  let previousHue: number | undefined;
  return CHALLENGE_DIFFICULTIES.map((difficulty) => {
    const target = makeTargetColor(difficulty, rand, previousHue);
    previousHue = rgbHue(target);
    return { difficulty, target };
  });
}
