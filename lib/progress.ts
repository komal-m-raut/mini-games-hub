/**
 * XP and level progress — the core of the meta layer. Local-first: everything
 * lives under one localStorage key, no accounts.
 */
import { useSyncExternalStore } from 'react';

const PROGRESS_KEY = 'mgh_progress';

/** Fired once by recordGameResult after a full update, so every use* hook in
 *  lib/{progress,streak,quests,achievements}.ts can invalidate its cache and
 *  re-render from one shared signal instead of each mutator dispatching its
 *  own event. */
export const META_EVENT = 'mgh:meta';

export interface ProgressState {
  xp: number;
  level: number;
  playsByGame: Record<string, number>;
  totalPlays: number;
}

/** Module-level constant — never recreate this per call, or a hook that
 *  returns it as a fallback snapshot loops forever (useSyncExternalStore
 *  compares snapshots by reference). */
const ZERO_PROGRESS: ProgressState = { xp: 0, level: 1, playsByGame: {}, totalPlays: 0 };

/** Total XP required to REACH level n: 50·(n−1)·n. L1=0, L2=100, L3=300,
 *  L4=600, L5=1000, L10=4500. */
export function xpForLevel(n: number): number {
  return 50 * (n - 1) * n;
}

/** Inverse of xpForLevel — the highest level whose threshold `xp` clears. */
export function levelForXp(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 1;
  // Closed-form root of 50n² − 50n − xp = 0, then nudged either direction to
  // correct for float error landing just off an exact boundary.
  let level = Math.max(1, Math.floor((50 + Math.sqrt(2500 + 200 * xp)) / 100));
  while (xpForLevel(level + 1) <= xp) level++;
  while (level > 1 && xpForLevel(level) > xp) level--;
  return level;
}

/** Progress within the current level, for an XP bar. */
export function xpIntoLevel(xp: number): { into: number; needed: number } {
  const level = levelForXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { into: xp - base, needed: next - base };
}

function readProgress(): ProgressState {
  if (typeof window === 'undefined') return ZERO_PROGRESS;
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return ZERO_PROGRESS;
    const parsed = JSON.parse(raw);
    const xp = typeof parsed?.xp === 'number' && Number.isFinite(parsed.xp) ? parsed.xp : 0;
    const playsByGame: Record<string, number> =
      parsed?.playsByGame && typeof parsed.playsByGame === 'object' ? parsed.playsByGame : {};
    const totalPlays = typeof parsed?.totalPlays === 'number' ? parsed.totalPlays : 0;
    return { xp, level: levelForXp(xp), playsByGame, totalPlays };
  } catch {
    return ZERO_PROGRESS;
  }
}

function writeProgress(state: ProgressState): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or private-mode denial — state still "wins" for this
    // session via the in-memory cache, it just won't persist.
  }
  invalidate();
}

export function getProgress(): ProgressState {
  return readProgress();
}

/** Adds XP (never below 0) and recomputes level. Returns the updated state. */
export function addXp(amount: number): ProgressState {
  if (typeof window === 'undefined' || !Number.isFinite(amount) || amount === 0) {
    return readProgress();
  }
  const prev = readProgress();
  const xp = Math.max(0, prev.xp + amount);
  const next: ProgressState = { ...prev, xp, level: levelForXp(xp) };
  writeProgress(next);
  return next;
}

/** Bumps this game's play count and the lifetime total. Returns the updated
 *  state. Separate from addXp so callers that only care about XP don't also
 *  have to know a gameId. */
export function recordPlay(gameId: string): ProgressState {
  if (typeof window === 'undefined') return readProgress();
  const prev = readProgress();
  const next: ProgressState = {
    ...prev,
    playsByGame: { ...prev.playsByGame, [gameId]: (prev.playsByGame[gameId] ?? 0) + 1 },
    totalPlays: prev.totalPlays + 1,
  };
  writeProgress(next);
  return next;
}

// ── useSyncExternalStore plumbing ───────────────────────────────────
// Cache the parsed snapshot and only re-read localStorage when this tab
// (META_EVENT) or another tab ('storage') invalidates it — getSnapshot must
// return a referentially stable object between renders, or React re-renders
// forever comparing two freshly-parsed objects.
let cached: ProgressState | null = null;

function invalidate(): void {
  cached = null;
}

function getSnapshot(): ProgressState {
  if (typeof window === 'undefined') return ZERO_PROGRESS;
  if (!cached) cached = readProgress();
  return cached;
}

function getServerSnapshot(): ProgressState {
  return ZERO_PROGRESS;
}

function subscribe(callback: () => void): () => void {
  const handler = () => {
    invalidate();
    callback();
  };
  window.addEventListener(META_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(META_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
