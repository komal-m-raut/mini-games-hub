import { Difficulty } from '@/types/game';
import { clamp } from '@/lib/utils';
import { round2 } from '@/utils/scoring';
import { Player } from './engine';

export const GAME_ID = 'fading-xo';

/** The human always plays X; the bot is always O — fixed so the ghost/turn
 *  copy in the UI never has to branch on who's who. */
export const PLAYER_MARK: Player = 'X';
export const BOT_MARK: Player = 'O';

/** Solo mode plays 3 rounds, each a best-of-3 match against the chosen bot
 *  difficulty (mirrors Challenge mode's 3 seeded rounds). */
export const TOTAL_ROUNDS = 3;

/** Every round is a fixed best-of-3 — all 3 games are always played out
 *  (never stopped early at 2 wins), since the round score is an average
 *  over exactly 3 results. */
export const GAMES_PER_ROUND = 3;

/** The bot "thinks" for a random stretch in this range before moving, so it
 *  doesn't move instantly. Driven by the same `rand` passed to `botMove` —
 *  seeded in Challenge mode, `Math.random` in solo — so Challenge think
 *  times replay identically for everyone on a given code. */
export const BOT_THINK_MIN_MS = 500;
export const BOT_THINK_MAX_MS = 900;

export interface FadingXoDifficultyConfig {
  label: string;
  qualifier: string;
  color: string;
  glow: string;
}

export const FADING_XO_DIFFICULTY: Record<Difficulty, FadingXoDifficultyConfig> = {
  easy: {
    label: 'Easy',
    qualifier: 'Random moves',
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
  medium: {
    label: 'Medium',
    qualifier: 'Takes wins, blocks yours',
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
  hard: {
    label: 'Hard',
    qualifier: 'Plans two moves ahead',
    color: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
};

/**
 * A round's score out of 10 from its best-of-3 record: a win is worth 10, a
 * draw 5, a loss 0 (implicit — wins + draws + losses always sum to
 * GAMES_PER_ROUND, so losses need no term of their own), averaged over the 3
 * games and clamped/rounded to the shared 2dp scale — the same scorer shape
 * every duel game in the hub uses.
 */
export function score10(wins: number, draws: number): number {
  return round2(clamp((wins * 10 + draws * 5) / GAMES_PER_ROUND, 0, 10));
}
