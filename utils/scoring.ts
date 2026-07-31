import { clamp } from '@/lib/utils';

/** Every round is scored out of 10. */
export const MAX_ROUND_SCORE = 10;

/**
 * Maps accuracy (0–100) to a round score out of 10.
 * 100% → 10, then one point lost per 5% of accuracy; 50% or worse → 0.
 */
export function calculateScore(accuracy: number): number {
  return clamp(Math.round((accuracy - 50) / 5), 0, MAX_ROUND_SCORE);
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
