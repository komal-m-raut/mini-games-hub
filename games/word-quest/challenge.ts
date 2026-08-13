import { makeChallengeRand } from '@/lib/challenge';
import { COMMON_SLICE_SIZE, GAME_ID } from './constants';
import { ANSWERS } from './words';

/** Safety valve against an unlucky RNG stream looping forever — with 150+
 *  candidates in even the smallest pool this is never remotely approached
 *  in practice, it's just a guarantee `pickDistinct` always terminates. */
const MAX_PICK_ATTEMPTS = 1000;

function pickDistinct(pool: string[], rand: () => number, exclude: string[]): string {
  let word = pool[Math.floor(rand() * pool.length)];
  let attempts = 0;
  while (exclude.includes(word) && attempts < MAX_PICK_ATTEMPTS) {
    word = pool[Math.floor(rand() * pool.length)];
    attempts += 1;
  }
  return word;
}

/**
 * The same 3 distinct words (round 1 → 3) for a given challenge code on
 * every device. Round 1 draws from `ANSWERS`' first `COMMON_SLICE_SIZE`
 * entries — the "easy" round — rounds 2-3 draw from the full list. All
 * three are guaranteed distinct from one another.
 */
export function getWordQuestChallengeWords(code: string): string[] {
  const rand = makeChallengeRand(code, GAME_ID);
  const commonSlice = ANSWERS.slice(0, COMMON_SLICE_SIZE);

  const words: string[] = [];
  words.push(pickDistinct(commonSlice, rand, words));
  words.push(pickDistinct(ANSWERS, rand, words));
  words.push(pickDistinct(ANSWERS, rand, words));
  return words;
}
