import { Difficulty } from '@/types/game';
import { CHALLENGE_DIFFICULTIES, makeChallengeRand } from '@/lib/challenge';
import { GAME_ID, GAMES_PER_ROUND } from './constants';
import { Player } from './engine';

/**
 * Local mulberry32 — the exact algorithm `lib/challenge.ts` uses internally,
 * kept private here since only `makeChallengeRand`'s 0–1 stream is exported.
 * Turns a 32-bit seed into its own independent deterministic 0–1 stream, so
 * each of the 9 challenge games gets a bot RNG that's reproducible on its
 * own without depending on how many rand() calls happened before it.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface XOChallengeGame {
  /** Who places the first mark in this one game. */
  starter: Player;
  /** Seeded RNG for the bot's own tie-break dice during this game — every
   *  player replaying the same code sees the identical bot behaviour. */
  botRand: () => number;
}

export interface XOChallengeRound {
  difficulty: Difficulty;
  games: XOChallengeGame[];
}

/** Same 3 seeded rounds (easy → medium → hard) — each a best-of-3 — for a
 *  code on every device. Bot dice and the starting player for every single
 *  game are drawn from one shared per-code stream, so a link always sets up
 *  identically no matter who opens it. */
export function getXOChallengeRounds(code: string): XOChallengeRound[] {
  const rand = makeChallengeRand(code, GAME_ID);
  return CHALLENGE_DIFFICULTIES.map((difficulty) => ({
    difficulty,
    games: Array.from({ length: GAMES_PER_ROUND }, () => {
      const starter: Player = rand() < 0.5 ? 'X' : 'O';
      const botSeed = Math.floor(rand() * 4294967296);
      return { starter, botRand: mulberry32(botSeed) };
    }),
  }));
}
