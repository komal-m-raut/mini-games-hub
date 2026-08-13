import { Difficulty } from '@/types/game';
import { clamp } from '@/lib/utils';
import { round2 } from '@/utils/scoring';

export const GAME_ID = 'xo-shift';

/** Every round is a fixed best-of-3 — all 3 games are always played out,
 *  regardless of who's ahead, since the round score below is an average
 *  over exactly 3 results. */
export const GAMES_PER_ROUND = 3;
export const SOLO_ROUND_COUNT = 3;

/** Bot "thinking" delay range in ms — deadline-based, jittered per game. */
export const BOT_THINK_MIN_MS = 500;
export const BOT_THINK_MAX_MS = 900;

export interface XODifficultyConfig {
  label: string;
  /** Short qualifier shown under the difficulty name on the selector. */
  qualifier: string;
  color: string;
  glow: string;
}

export const XO_DIFFICULTY: Record<Difficulty, XODifficultyConfig> = {
  easy: {
    label: 'Easy',
    qualifier: 'Moves at random',
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
  medium: {
    label: 'Medium',
    qualifier: 'Takes wins, blocks threats',
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
  hard: {
    label: 'Hard',
    qualifier: 'Plans two moves ahead',
    color: '#8B5CF6',
    glow: 'rgba(139, 92, 246, 0.4)',
  },
};

/**
 * Round score out of 10 for a finished best-of-3: a win is worth 10, a draw
 * 5, a loss 0, averaged across all 3 games and rounded to 2dp.
 * (wins·10 + draws·5) / 3, clamped to [0, 10] — e.g. 3-0-0 → 10,
 * 1 win + 2 draws → 6.67.
 */
export function calculateRoundScore(wins: number, draws: number): number {
  return round2(clamp((wins * 10 + draws * 5) / GAMES_PER_ROUND, 0, 10));
}
