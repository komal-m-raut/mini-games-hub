import { Difficulty } from '@/types/game';
import { CHALLENGE_DIFFICULTIES, makeChallengeRand } from '@/lib/challenge';
import { GAME_ID } from './constants';

/**
 * Unlike the other games' challenge rounds, hand cricket can't pre-generate
 * its content — each match is a live back-and-forth whose length depends on
 * the player's own picks. What's fixed per code is just the difficulty
 * ladder (easy → medium → hard) and a single seeded RNG that the bot's dice
 * draw from, live, for every ball across the whole run.
 */
export interface HandCricketChallengeRound {
  difficulty: Difficulty;
}

/** The fixed easy → medium → hard sequence every challenge run plays. */
export function getHandCricketChallengeRounds(): HandCricketChallengeRound[] {
  return CHALLENGE_DIFFICULTIES.map((difficulty) => ({ difficulty }));
}

/**
 * One seeded RNG for an entire challenge run. Bot dice for both innings,
 * across all 3 matches, are drawn from this single generator — created once
 * and never re-seeded mid-run — so a given code reproduces byte-identical
 * bot behaviour for every player who opens it.
 */
export function makeHandCricketRand(code: string): () => number {
  return makeChallengeRand(code, GAME_ID);
}
