import { Difficulty } from '@/types/game';
import { clamp } from '@/lib/utils';
import { MAX_ROUND_SCORE, round2 } from '@/utils/scoring';

/**
 * Minesweeper: the classic logic puzzle. Each difficulty is a bigger board
 * with a denser mine field — Easy stays small and forgiving (9×9, ~12%
 * mines), Hard is tall rather than wide (12×16) so it still fits a portrait
 * phone screen without ever needing horizontal scrolling.
 */
export interface MinesweeperDifficultyConfig {
  label: string;
  width: number;
  height: number;
  mineCount: number;
  /** Difficulty badge / selector-card colour (the standard easy→hard ramp
   *  every game's DifficultySelector uses — green, orange, red). */
  color: string;
  glow: string;
}

export const MINESWEEPER_DIFFICULTY: Record<Difficulty, MinesweeperDifficultyConfig> = {
  easy: {
    label: 'Easy',
    width: 9,
    height: 9,
    mineCount: 10,
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
  medium: {
    label: 'Medium',
    width: 12,
    height: 12,
    mineCount: 26,
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
  hard: {
    label: 'Hard',
    width: 12,
    height: 16,
    mineCount: 45,
    color: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
};

/** The game's single identity colour (matches the registry accent) — used
 *  for chrome shared across difficulties (HUD, borders). Difficulty only
 *  changes board size, mine density and the badge colour above. */
export const ACCENT = '#CBD5E1';
export const ACCENT_GLOW = 'rgba(203, 213, 225, 0.35)';

/** Solo sessions run this many rounds, same as a challenge (3 seeded
 *  boards, easy → medium → hard) — three timed boards at your chosen
 *  difficulty in solo, rather than the site's usual 5-round default. */
export const SOLO_ROUND_COUNT = 3;

/** Touch long-press duration that places a flag, matching the site's
 *  standard "hold to do the secondary action" affordance. */
export const LONG_PRESS_MS = 450;

/** Time (seconds) a win needs to beat for the full 10-point score — see
 *  `scoreBoard`. Bigger boards get more generous pars. */
export const PAR_SECONDS: Record<Difficulty, number> = {
  easy: 60,
  medium: 150,
  hard: 240,
};

/** Readable, distinct colours for the 1–8 adjacency numbers on a dark
 *  board background. */
export const NUMBER_COLORS: Record<number, string> = {
  1: '#60A5FA',
  2: '#34D399',
  3: '#F87171',
  4: '#A78BFA',
  5: '#FB923C',
  6: '#22D3EE',
  7: '#F472B6',
  8: '#CBD5E1',
};

/**
 * Round score out of 10.
 *
 * A win scores a floor of 6 points plus up to 4 more for beating the
 * difficulty's par time: `6 + 4 * clamp(par / time, 0, 1)`. Finishing
 * exactly at par (or faster) earns the full 10; finishing slower keeps
 * shrinking the bonus but never drops below the 6-point win floor — a slow,
 * careful clear is still a clear. A loss earns partial credit instead of
 * zero: `5 * safeRevealed / safeTotal`, rewarding how much of the board you
 * correctly mapped out before hitting a mine.
 */
export function scoreBoard(
  won: boolean,
  timeSeconds: number,
  safeRevealed: number,
  safeTotalCount: number,
  difficulty: Difficulty
): number {
  if (won) {
    const par = PAR_SECONDS[difficulty];
    const bonus = clamp(par / Math.max(timeSeconds, 0.001), 0, 1);
    return round2(6 + 4 * bonus);
  }
  if (safeTotalCount <= 0) return 0;
  return round2(clamp(5 * (safeRevealed / safeTotalCount), 0, MAX_ROUND_SCORE));
}
