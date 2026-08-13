import { Difficulty } from '@/types/game';
import { clamp } from '@/lib/utils';
import { MAX_ROUND_SCORE, round2 } from '@/utils/scoring';

/**
 * Grid Flash: a growing set of tiles flashes simultaneously, then goes
 * dark; the player taps the same set back from memory. Each difficulty is a
 * bigger grid with a shorter flash — Easy and Medium both hold the pattern
 * for 1200ms, Hard cuts that to 900ms so the bigger board doesn't also get
 * more time to study it.
 */
export interface GridFlashDifficultyConfig {
  label: string;
  /** Grid is gridSize × gridSize. */
  gridSize: number;
  cells: number;
  /** How long the full pattern stays lit, in ms. */
  flashMs: number;
  /** Peak lit-tile count that scores a perfect 10 for this difficulty. */
  par: number;
  /** Difficulty badge / selector-card colour (the standard easy→hard ramp
   *  every game's DifficultySelector uses — green, orange, red). */
  color: string;
  glow: string;
}

export const GRID_FLASH_DIFFICULTY: Record<Difficulty, GridFlashDifficultyConfig> = {
  easy: {
    label: 'Easy',
    gridSize: 4,
    cells: 16,
    flashMs: 1200,
    par: 7,
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
  medium: {
    label: 'Medium',
    gridSize: 5,
    cells: 25,
    flashMs: 1200,
    par: 8,
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
  hard: {
    label: 'Hard',
    gridSize: 6,
    cells: 36,
    flashMs: 900,
    par: 9,
    color: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
};

/** The game's single identity colour (matches the registry accent) — used
 *  for every tile's lit/correct fill, regardless of difficulty. Difficulty
 *  only changes board size, timing and par; the "what does progress look
 *  like" colour stays constant so the game always reads as Grid Flash. */
export const ACCENT = '#3B82F6';
export const ACCENT_GLOW = 'rgba(59, 130, 246, 0.4)';

/** Lives spent on wrong taps before a round ends. */
export const LIVES_PER_ROUND = 3;
/** First level's lit-tile count. */
export const START_LEVEL = 3;
/** Pause between clearing a level and the next one's flash, in ms. */
export const LEVEL_PAUSE_MS = 600;
/** How long a wrong tap's red flash holds before clearing, in ms. */
export const WRONG_FLASH_MS = 360;
/** Beat after lives hit 0, so the last wrong flash reads before the round's
 *  result screen cuts in — mirrors memory-path's FINALIZE_DELAY_MS. */
export const ROUND_END_DELAY_MS = 500;
/** Solo sessions run this many rounds, same as a challenge (3 seeded
 *  rounds, easy → medium → hard). Grid Flash keeps both at 3 rather than
 *  the site's usual 5-round solo default, since a single round can already
 *  run through several levels of its own. */
export const SOLO_ROUND_COUNT = 3;

/**
 * A round's ladder tops out one level short of lighting every cell, so a
 * fully-cleared final level still leaves at least one dark tile — proof the
 * player reproduced a genuine *subset*, not just "tap everything".
 */
export function maxLevelFor(difficulty: Difficulty): number {
  return GRID_FLASH_DIFFICULTY[difficulty].cells - 1;
}

/**
 * `count` distinct cell indices out of `cells`, via a partial Fisher–Yates
 * over the cell pool — pure, deterministic under a seeded `rand`, and never
 * repeats an index. `count` is clamped to `[0, cells]` defensively; the
 * ladder's own cap (`maxLevelFor`) keeps real callers from ever needing it.
 */
export function generatePattern(
  cells: number,
  count: number,
  rand: () => number = Math.random
): number[] {
  const n = Math.min(Math.max(count, 0), cells);
  const pool = Array.from({ length: cells }, (_, i) => i);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rand() * (cells - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

/**
 * Round score out of 10 from the peak level reached: a straight line from a
 * peak of 2 (failed the very first level — score 0) up to `par` (score 10),
 * clamped so climbing past par still tops out at 10.
 */
export function calculateGridScore(peak: number, difficulty: Difficulty): number {
  const par = GRID_FLASH_DIFFICULTY[difficulty].par;
  return round2(clamp(((peak - 2) / (par - 2)) * 10, 0, MAX_ROUND_SCORE));
}
