/**
 * Static badge catalog. Unlocks are evaluated once per recordGameResult call
 * against a snapshot of everything else the meta layer just computed, so an
 * achievement can react to this exact play (e.g. a perfect round) as well as
 * lifetime totals (e.g. total plays).
 */
import { useSyncExternalStore } from 'react';
import { META_EVENT, ProgressState } from './progress';
import { StreakState } from './streak';

const ACHIEVEMENTS_KEY = 'mgh_achievements';
const DAILY_COUNT_KEY = 'mgh_daily_challenge_count';

export interface AchievementDef {
  id: string;
  title: string;
  blurb: string;
  emoji: string;
}

/** Narrow slice of GameResultInput this module needs. Defined locally
 *  (rather than imported from recordResult.ts) so the two files don't import
 *  each other — recordResult.ts's GameResultInput is a structural superset
 *  of this, so passing one where this is expected just works. */
interface AchievementRoundInput {
  roundScores?: number[];
}

interface CheckCtx {
  input: AchievementRoundInput;
  progress: ProgressState;
  streak: StreakState;
  /** Lifetime daily-challenge count, already incremented for this play if
   *  it was one. */
  dailyChallengeCount: number;
  now: Date;
  availableGameIds: string[];
}

interface CatalogEntry extends AchievementDef {
  check(ctx: CheckCtx): boolean;
}

const CATALOG: CatalogEntry[] = [
  {
    id: 'first-play',
    title: 'First Steps',
    blurb: 'Play your first game.',
    emoji: '🎮',
    check: (ctx) => ctx.progress.totalPlays >= 1,
  },
  {
    id: 'five-games',
    title: 'Variety Pack',
    blurb: 'Play 5 different games.',
    emoji: '🎲',
    check: (ctx) => Object.keys(ctx.progress.playsByGame).length >= 5,
  },
  {
    id: 'all-games',
    title: 'Completionist',
    blurb: 'Play every available game.',
    emoji: '🏆',
    check: (ctx) =>
      ctx.availableGameIds.length > 0 &&
      ctx.availableGameIds.every((id) => (ctx.progress.playsByGame[id] ?? 0) > 0),
  },
  {
    id: 'streak-3',
    title: 'Warming Up',
    blurb: 'Reach a 3-day streak.',
    emoji: '🔥',
    check: (ctx) => ctx.streak.current >= 3,
  },
  {
    id: 'streak-7',
    title: 'One Week Strong',
    blurb: 'Reach a 7-day streak.',
    emoji: '🔥',
    check: (ctx) => ctx.streak.current >= 7,
  },
  {
    id: 'streak-30',
    title: 'Unstoppable',
    blurb: 'Reach a 30-day streak.',
    emoji: '🔥',
    check: (ctx) => ctx.streak.current >= 30,
  },
  {
    id: 'level-5',
    title: 'Leveling Up',
    blurb: 'Reach level 5.',
    emoji: '⭐',
    check: (ctx) => ctx.progress.level >= 5,
  },
  {
    id: 'level-10',
    title: 'Seasoned',
    blurb: 'Reach level 10.',
    emoji: '🌟',
    check: (ctx) => ctx.progress.level >= 10,
  },
  {
    id: 'level-20',
    title: 'Arcade Legend',
    blurb: 'Reach level 20.',
    emoji: '💫',
    check: (ctx) => ctx.progress.level >= 20,
  },
  {
    id: 'perfect-10',
    title: 'Flawless',
    blurb: 'Score a perfect 10 in any round.',
    emoji: '🎯',
    check: (ctx) => (ctx.input.roundScores ?? []).some((s) => s >= 10),
  },
  {
    id: 'first-daily',
    title: 'Creature of Habit',
    blurb: 'Complete your first Daily Challenge.',
    emoji: '📅',
    check: (ctx) => ctx.dailyChallengeCount >= 1,
  },
  {
    id: 'ten-dailies',
    title: 'Regular',
    blurb: 'Complete 10 Daily Challenges.',
    emoji: '🗓️',
    check: (ctx) => ctx.dailyChallengeCount >= 10,
  },
  {
    id: 'fifty-plays',
    title: 'Dedicated',
    blurb: 'Play 50 rounds.',
    emoji: '💪',
    check: (ctx) => ctx.progress.totalPlays >= 50,
  },
  {
    id: 'two-hundred-plays',
    title: 'Arcade Regular',
    blurb: 'Play 200 rounds.',
    emoji: '👑',
    check: (ctx) => ctx.progress.totalPlays >= 200,
  },
  {
    id: 'night-owl',
    title: 'Night Owl',
    blurb: 'Finish a game between midnight and 5am.',
    emoji: '🦉',
    check: (ctx) => ctx.now.getHours() >= 0 && ctx.now.getHours() < 5,
  },
  {
    id: 'early-bird',
    title: 'Early Bird',
    blurb: 'Finish a game between 5am and 8am.',
    emoji: '🐦',
    check: (ctx) => ctx.now.getHours() >= 5 && ctx.now.getHours() < 8,
  },
];

export const ACHIEVEMENTS: AchievementDef[] = CATALOG.map((entry) => ({
  id: entry.id,
  title: entry.title,
  blurb: entry.blurb,
  emoji: entry.emoji,
}));

function readUnlocked(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function getUnlocked(): string[] {
  return readUnlocked();
}

function readDailyChallengeCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = Number(localStorage.getItem(DAILY_COUNT_KEY));
    return Number.isFinite(raw) && raw >= 0 ? raw : 0;
  } catch {
    return 0;
  }
}

export function getDailyChallengeCount(): number {
  return readDailyChallengeCount();
}

/** Bumps the lifetime daily-challenge counter. recordGameResult calls this
 *  once per completed daily challenge. */
export function bumpDailyChallengeCount(): number {
  if (typeof window === 'undefined') return 0;
  const next = readDailyChallengeCount() + 1;
  try {
    localStorage.setItem(DAILY_COUNT_KEY, String(next));
  } catch {
    // Quota exceeded or private-mode denial.
  }
  return next;
}

/** Evaluates the full catalog against `ctx` and unlocks any newly-earned
 *  achievements. Returns only the newly unlocked ones. */
export function evaluateAchievements(ctx: CheckCtx): AchievementDef[] {
  if (typeof window === 'undefined') return [];
  const unlocked = new Set(readUnlocked());
  const newly: AchievementDef[] = [];
  for (const entry of CATALOG) {
    if (unlocked.has(entry.id)) continue;
    if (!entry.check(ctx)) continue;
    unlocked.add(entry.id);
    newly.push({ id: entry.id, title: entry.title, blurb: entry.blurb, emoji: entry.emoji });
  }
  if (newly.length > 0) {
    try {
      localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify([...unlocked]));
    } catch {
      // Quota exceeded or private-mode denial.
    }
    invalidate();
  }
  return newly;
}

// ── useSyncExternalStore plumbing (see progress.ts for the pattern) ──

export interface AchievementsSnapshot {
  defs: AchievementDef[];
  unlocked: Set<string>;
}

const EMPTY_UNLOCKED: Set<string> = new Set();
const EMPTY_SNAPSHOT: AchievementsSnapshot = { defs: ACHIEVEMENTS, unlocked: EMPTY_UNLOCKED };

let cached: AchievementsSnapshot | null = null;
function invalidate(): void {
  cached = null;
}
function getSnapshot(): AchievementsSnapshot {
  if (typeof window === 'undefined') return EMPTY_SNAPSHOT;
  if (!cached) cached = { defs: ACHIEVEMENTS, unlocked: new Set(readUnlocked()) };
  return cached;
}
function getServerSnapshot(): AchievementsSnapshot {
  return EMPTY_SNAPSHOT;
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

export function useAchievements(): AchievementsSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
