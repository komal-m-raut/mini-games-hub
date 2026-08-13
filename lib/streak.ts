/**
 * Daily play streak, tracked on the player's own local calendar day — unlike
 * the daily-challenge code (lib/challenge.ts), which is deliberately
 * UTC-dated so every player worldwide gets the same puzzle. The mismatch
 * between "streak day" (local) and "challenge day" (UTC) is accepted.
 */
import { useSyncExternalStore } from 'react';
import { META_EVENT } from './progress';

const STREAK_KEY = 'mgh_streak';
const DAYS_KEY = 'mgh_days_played';
const MAX_DAYS = 120;

export interface StreakState {
  current: number;
  best: number;
  /** Local YYYY-MM-DD. */
  lastDay: string;
}

const ZERO_STREAK: StreakState = { current: 0, best: 0, lastDay: '' };

/** Local (not UTC) calendar date as YYYY-MM-DD. */
export function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Whole-day difference between two YYYY-MM-DD strings, computed via
 *  Date.UTC on the parsed components so it's immune to DST — the strings
 *  carry no time-of-day, so treating them as UTC dates is just a clean way
 *  to do calendar arithmetic, not a timezone claim. */
function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const utcA = Date.UTC(ay, am - 1, ad);
  const utcB = Date.UTC(by, bm - 1, bd);
  return Math.round((utcB - utcA) / 86_400_000);
}

/**
 * Pure streak core. Same day → unchanged; exactly one day later →
 * increments; any gap, a day moving backward, or no prior streak → resets
 * to 1. `best` only ever grows.
 */
export function nextStreak(prev: StreakState | null, todayLocalDate: string): StreakState {
  if (!prev || !prev.lastDay) {
    return { current: 1, best: 1, lastDay: todayLocalDate };
  }
  if (prev.lastDay === todayLocalDate) return prev;
  const gap = daysBetween(prev.lastDay, todayLocalDate);
  const current = gap === 1 ? prev.current + 1 : 1;
  return { current, best: Math.max(prev.best, current), lastDay: todayLocalDate };
}

function readStreak(): StreakState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.current !== 'number' ||
      typeof parsed?.best !== 'number' ||
      typeof parsed?.lastDay !== 'string'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function readDays(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DAYS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((d): d is string => typeof d === 'string') : [];
  } catch {
    return [];
  }
}

export function getStreak(): StreakState {
  return readStreak() ?? ZERO_STREAK;
}

/** Local dates the player has played on, most-recent-first, capped at 120 —
 *  enough for the /daily calendar to look back a few months. */
export function getDaysPlayed(): string[] {
  return readDays();
}

/** Advances today's streak and marks today played. recordGameResult calls
 *  this at most once per completed game. */
export function recordPlayedToday(now: Date = new Date()): StreakState {
  if (typeof window === 'undefined') return ZERO_STREAK;
  const today = localDateString(now);
  const next = nextStreak(readStreak(), today);
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(next));
  } catch {
    // Quota exceeded or private-mode denial — streak still "wins" in memory.
  }
  try {
    const days = readDays();
    if (days[0] !== today) {
      const deduped = [today, ...days.filter((d) => d !== today)].slice(0, MAX_DAYS);
      localStorage.setItem(DAYS_KEY, JSON.stringify(deduped));
    }
  } catch {
    // Same as above.
  }
  invalidateStreak();
  invalidateDays();
  return next;
}

// ── useSyncExternalStore plumbing (see progress.ts for the pattern) ──

let cachedStreak: StreakState | null = null;
function invalidateStreak(): void {
  cachedStreak = null;
}
function getStreakSnapshot(): StreakState {
  if (typeof window === 'undefined') return ZERO_STREAK;
  if (!cachedStreak) cachedStreak = getStreak();
  return cachedStreak;
}
function getStreakServerSnapshot(): StreakState {
  return ZERO_STREAK;
}

const EMPTY_DAYS: string[] = [];
let cachedDays: string[] | null = null;
function invalidateDays(): void {
  cachedDays = null;
}
function getDaysSnapshot(): string[] {
  if (typeof window === 'undefined') return EMPTY_DAYS;
  if (!cachedDays) cachedDays = getDaysPlayed();
  return cachedDays;
}
function getDaysServerSnapshot(): string[] {
  return EMPTY_DAYS;
}

function subscribe(callback: () => void): () => void {
  const handler = () => {
    invalidateStreak();
    invalidateDays();
    callback();
  };
  window.addEventListener(META_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(META_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export function useStreak(): StreakState {
  return useSyncExternalStore(subscribe, getStreakSnapshot, getStreakServerSnapshot);
}

/** Reactive view of getDaysPlayed(), for the /daily calendar. */
export function useDaysPlayed(): string[] {
  return useSyncExternalStore(subscribe, getDaysSnapshot, getDaysServerSnapshot);
}
