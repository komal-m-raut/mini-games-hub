import { clamp } from '@/lib/utils';
import { Rating } from '@/types/game';

/** Every round is scored out of 10. */
export const MAX_ROUND_SCORE = 10;

/**
 * Rounds to 2 decimal places, float-safe. Plain `Math.round(n * 100) / 100`
 * is wrong for inputs like `1.005` because the *3rd* decimal digit is
 * already lossy in binary floating point before rounding ever runs; routing
 * through a string round-trip sidesteps that instead of trying to out-math
 * it. Every accumulation and calculation in the scoring pipeline should
 * produce its result through this function, not raw arithmetic.
 */
export function round2(n: number): number {
  return Number(Math.round(Number(`${n}e2`)) + 'e-2');
}

/**
 * Renders a score to at most 2 decimal places for display, trimming a bare
 * `.00` (whole numbers, e.g. `8`) so the common "nice round score" case
 * still reads clean — but keeping `.50` / `.46` etc. exactly as computed.
 * Rule: format to 2dp, then strip a trailing `.00` only; never strip `.X0`.
 */
export function formatScore(n: number): string {
  const rounded = round2(n);
  return rounded.toFixed(2).replace(/\.00$/, '');
}

/**
 * Maps accuracy (0–100) to a round score out of 10, to 2 decimal places.
 * 100% → 10, then one point lost per 5% of accuracy; 50% or worse → 0.
 * `calculateAccuracy` already returns 1dp, so this naturally yields 2dp
 * (e.g. 87.3% → 7.46).
 */
export function calculateScore(accuracy: number): number {
  return clamp(round2((accuracy - 50) / 5), 0, MAX_ROUND_SCORE);
}

/**
 * Shared rating bands, expressed on the same 0–10 score curve every game
 * already uses for `calculateScore` — so the label shown next to a score
 * can never contradict the number itself (H3). Cutoffs: Perfect at 9.5+
 * (near-max), Great at 8+, Good at 6+, else Try Again.
 */
export function ratingFromScore(score: number): Rating {
  if (score >= 9.5) return 'Perfect';
  if (score >= 8) return 'Great';
  if (score >= 6) return 'Good';
  return 'Try Again';
}

/** Normal mode is a fixed session of 5 rounds, totalling 50 points. */
export const NORMAL_ROUND_COUNT = 5;
export const MAX_SESSION_SCORE = NORMAL_ROUND_COUNT * MAX_ROUND_SCORE;

/** Best single-round score (out of 10) stored in localStorage. */
const LS_KEY = 'mgh_balloon_best10';

export function getLocalHighScore(): number {
  if (typeof window === 'undefined') return 0;
  const raw = Number(localStorage.getItem(LS_KEY));
  return Number.isFinite(raw) ? raw : 0;
}

export function saveHighScore(score: number): boolean {
  if (typeof window === 'undefined') return false;
  const prev = getLocalHighScore();
  if (score > prev) {
    try {
      localStorage.setItem(LS_KEY, String(score));
    } catch {
      // Quota exceeded or private-mode storage denial — the score still
      // "wins" for this session, it just won't persist.
    }
    return true;
  }
  return false;
}

/**
 * Best full-session total (out of 50) per game, in localStorage.
 * Balloon Match keeps its original key so existing bests survive.
 */
const LEGACY_SESSION_KEYS: Record<string, string> = {
  'balloon-match': 'mgh_balloon_best_session',
};

function sessionKey(gameId: string): string {
  return LEGACY_SESSION_KEYS[gameId] ?? `mgh_best_session_${gameId}`;
}

export function getLocalBestSession(gameId: string): number {
  if (typeof window === 'undefined') return 0;
  const raw = Number(localStorage.getItem(sessionKey(gameId)));
  return Number.isFinite(raw) ? raw : 0;
}

export function saveBestSession(gameId: string, total: number): boolean {
  if (typeof window === 'undefined') return false;
  const prev = getLocalBestSession(gameId);
  if (total > prev) {
    try {
      localStorage.setItem(sessionKey(gameId), String(total));
    } catch {
      // Quota exceeded or private-mode storage denial — the total still
      // "wins" for this session, it just won't persist.
    }
    return true;
  }
  return false;
}
