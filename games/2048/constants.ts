import { clamp } from '@/lib/utils';
import { round2 } from '@/utils/scoring';

export const GAME_ID = '2048';

/** Board is BOARD_SIZE × BOARD_SIZE (also re-exported from engine.ts — kept
 *  here too since constants.ts is the file every UI piece already imports
 *  from). */
export const BOARD_SIZE = 4;

/** Every challenge round is a fixed-length sprint against the clock. */
export const SPRINT_SECONDS = 90;
export const TOTAL_CHALLENGE_ROUNDS = 3;

/** Seconds of "3 · 2 · 1" before each sprint round starts. */
export const COUNTDOWN_SECONDS = 3;

/** Solo endless score is capped for the shared XP/quest pipeline — a raw
 *  2048 score can run into the hundreds of thousands, but `recordGameResult`
 *  only needs a bounded totalScore/maxScore pair to compute a fair XP%. This
 *  cap only affects that one XP computation; the score shown in the game and
 *  saved as the raw local best (see below) is never clamped. */
export const SOLO_XP_SCORE_CAP = 20000;

/** Swipe gesture threshold, in CSS px, before a touch drag counts as a
 *  directional move rather than a tap/scroll attempt. */
export const SWIPE_THRESHOLD_PX = 24;

/** localStorage key for the raw endless-mode best score (not the shared
 *  0–10 challenge-scale `getLocalBestSession`/`saveBestSession` pair from
 *  utils/scoring, which this game also uses for its challenge total — see
 *  use2048Game.ts for both being written). */
const RAW_BEST_KEY = 'mgh_2048_best';

/** Best raw endless score, read straight from localStorage (SSR-safe: 0 on
 *  the server). Wrapped in try/catch since private-mode/storage-denied
 *  browsers can throw on `localStorage` access itself, not just on writes. */
export function getRawBestScore(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = Number(localStorage.getItem(RAW_BEST_KEY));
    return Number.isFinite(raw) ? raw : 0;
  } catch {
    return 0;
  }
}

/** Persists a new raw endless best if `score` beats the stored one. Returns
 *  whether it was in fact a new best, so the result screen can show the
 *  banner. */
export function saveRawBestScore(score: number): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const prev = getRawBestScore();
    if (score > prev) {
      localStorage.setItem(RAW_BEST_KEY, String(score));
      return true;
    }
    return false;
  } catch {
    // Quota exceeded or storage denied — the score still "wins" for this
    // session, it just won't persist (matches saveBestSession's contract).
    return false;
  }
}

// ── Scoring ─────────────────────────────────────────────────────────

/**
 * A sprint round's score out of 10: raw merge points earned in the 90s round
 * divided by 250 (so ~2500 points — a solid run of merges up to a few
 * hundred-tile chains — is a perfect round), clamped to [0, 10] and rounded
 * to 2dp.
 */
export function calculateSprintScore(points: number): number {
  return round2(clamp(points / 250, 0, MAX_ROUND_SCORE));
}

export const MAX_ROUND_SCORE = 10;
export const POINTS_PER_PERFECT_ROUND = 2500;

// ── Tile colour ramp ────────────────────────────────────────────────

export interface TileStyle {
  background: string;
  color: string;
  glow?: string;
}

/**
 * 11-step colour ramp (2 → 2048), one entry per power of two, built off the
 * site's brand hues on the dark board background: low values sit near-flush
 * with the board (barely a tile), then climb hue by hue through the brand
 * palette, finishing at the game's own registry accent (#FB923C) glowing at
 * 2048. Text colour is chosen per step for contrast against that step's
 * background, not computed at runtime.
 */
export const TILE_STYLES: Record<number, TileStyle> = {
  2: { background: 'rgba(255,255,255,0.06)', color: '#C7CEDB' },
  4: { background: 'rgba(124,58,237,0.20)', color: '#F1F5F9' },
  8: { background: 'rgba(167,139,250,0.32)', color: '#F1F5F9' },
  16: { background: 'rgba(59,130,246,0.42)', color: '#F1F5F9' },
  32: { background: 'rgba(20,184,166,0.48)', color: '#0B0B1A' },
  64: { background: 'rgba(34,197,94,0.55)', color: '#0B0B1A' },
  128: { background: 'rgba(234,179,8,0.62)', color: '#0B0B1A', glow: 'rgba(234,179,8,0.35)' },
  256: { background: 'rgba(244,63,94,0.65)', color: '#F1F5F9', glow: 'rgba(244,63,94,0.4)' },
  512: { background: 'rgba(236,72,153,0.72)', color: '#F1F5F9', glow: 'rgba(236,72,153,0.45)' },
  1024: { background: 'rgba(251,146,60,0.78)', color: '#0B0B1A', glow: 'rgba(251,146,60,0.55)' },
  2048: { background: '#FB923C', color: '#0B0B1A', glow: 'rgba(251,146,60,0.85)' },
};

/** Anything past 2048 keeps climbing without a new entry needed per tile:
 *  the 2048 background, with glow intensity that keeps rising so 4096,
 *  8192… still read as "further along" rather than identical to 2048. */
export function getTileStyle(value: number): TileStyle {
  const known = TILE_STYLES[value];
  if (known) return known;
  if (value > 2048) {
    const extraSteps = Math.log2(value / 2048);
    return {
      background: '#FB923C',
      color: '#0B0B1A',
      glow: `rgba(255,255,255,${clamp(0.5 + extraSteps * 0.1, 0.5, 0.95)})`,
    };
  }
  // Defensive fallback — every real board value is a power of two already
  // covered above or beyond it.
  return TILE_STYLES[2];
}
