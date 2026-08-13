/**
 * Three daily quests, deterministically rolled from the daily challenge code
 * so every player sees the same quests on the same UTC day. Progress toward
 * them is tracked per LOCAL day (see lib/streak.ts's header for why that
 * mismatch is accepted rather than "fixed").
 */
import { useSyncExternalStore } from 'react';
import { GameCategory, GameMeta } from '@/types/game';
import { AVAILABLE_GAMES, CATEGORY_META } from '@/lib/gameRegistry';
import { getDailyChallengeCode, makeChallengeRand } from '@/lib/challenge';
import { META_EVENT } from './progress';

const QUEST_KEY_PREFIX = 'mgh_quests_';
const MAX_DAY_AGE = 7;

export type QuestKind =
  | 'plays'
  | 'distinct-games'
  | 'daily-challenge'
  | 'category-plays'
  | 'score-pct'
  | 'new-best';

export interface Quest {
  id: string;
  label: string;
  target: number;
  xp: number;
  kind: QuestKind;
  category?: GameCategory;
  pct?: number;
}

export interface QuestProgress extends Quest {
  progress: number;
  done: boolean;
}

const ALL_KINDS: QuestKind[] = [
  'plays',
  'distinct-games',
  'daily-challenge',
  'category-plays',
  'score-pct',
  'new-best',
];

function seededShuffle<T>(items: T[], rand: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildQuest(kind: QuestKind, rand: () => number, categories: GameCategory[]): Quest {
  switch (kind) {
    case 'plays': {
      const target = 3 + Math.floor(rand() * 3); // 3–5
      return { id: 'plays', kind, target, xp: 40, label: `Play ${target} rounds today` };
    }
    case 'distinct-games': {
      const target = 2 + Math.floor(rand() * 2); // 2–3
      return { id: 'distinct-games', kind, target, xp: 50, label: `Play ${target} different games` };
    }
    case 'daily-challenge': {
      const target = 1 + Math.floor(rand() * 2); // 1–2
      return {
        id: 'daily-challenge',
        kind,
        target,
        xp: 60,
        label: target === 1 ? 'Complete a Daily Challenge' : `Complete ${target} Daily Challenges`,
      };
    }
    case 'category-plays': {
      const category = categories[Math.floor(rand() * categories.length)];
      return {
        id: 'category-plays',
        kind,
        target: 2,
        xp: 50,
        category,
        label: `Play 2 ${CATEGORY_META[category].label} games`,
      };
    }
    case 'score-pct': {
      const pct = [70, 80, 90][Math.floor(rand() * 3)];
      return { id: 'score-pct', kind, target: 1, xp: 60, pct, label: `Score ${pct}%+ in any game` };
    }
    case 'new-best':
    default:
      return { id: 'new-best', kind, target: 1, xp: 80, label: 'Set a new personal best' };
  }
}

/**
 * PURE — same code always produces the same 3 quests. `availableGames` is a
 * parameter (rather than reading the registry itself) so it stays testable
 * with arbitrary fixtures.
 */
export function questsForCode(dailyCode: string, availableGames: GameMeta[]): Quest[] {
  const rand = makeChallengeRand(dailyCode, 'quests');

  const counts = new Map<GameCategory, number>();
  for (const g of availableGames) counts.set(g.category, (counts.get(g.category) ?? 0) + 1);
  const eligibleCategories = [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([category]) => category)
    .sort();

  // category-plays can't be built without a qualifying category — drop it
  // from the pool rather than ever picking one with < 2 available games.
  const pool = ALL_KINDS.filter((k) => k !== 'category-plays' || eligibleCategories.length > 0);
  const chosen = seededShuffle(pool, rand).slice(0, 3);

  return chosen.map((kind) => buildQuest(kind, rand, eligibleCategories));
}

// ── Per-day progress ─────────────────────────────────────────────────
// Raw counters for the local day, from which every quest's `progress` is
// derived on read — simpler than persisting progress per quest id, and it
// means yesterday's quest list (which may have had different targets) never
// has to be reconciled against today's.

interface QuestDayCounters {
  plays: number;
  distinctGames: string[];
  dailyChallenges: number;
  categoryPlays: Partial<Record<GameCategory, number>>;
  /** Highest single-session score percentage (0–100) reached today. */
  bestPct: number;
  newBest: boolean;
}

const ZERO_COUNTERS: QuestDayCounters = {
  plays: 0,
  distinctGames: [],
  dailyChallenges: 0,
  categoryPlays: {},
  bestPct: 0,
  newBest: false,
};

interface QuestDayState {
  counters: QuestDayCounters;
  /** Quest ids already XP-claimed today — quests auto-claim, no button. */
  claimed: string[];
}

const ZERO_DAY_STATE: QuestDayState = { counters: ZERO_COUNTERS, claimed: [] };

function localDayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function storageKeyForDay(dayKey: string): string {
  return `${QUEST_KEY_PREFIX}${dayKey}`;
}

function readDayState(dayKey: string): QuestDayState {
  if (typeof window === 'undefined') return ZERO_DAY_STATE;
  try {
    const raw = localStorage.getItem(storageKeyForDay(dayKey));
    if (!raw) return ZERO_DAY_STATE;
    const parsed = JSON.parse(raw);
    return {
      counters: { ...ZERO_COUNTERS, ...parsed?.counters },
      claimed: Array.isArray(parsed?.claimed) ? parsed.claimed : [],
    };
  } catch {
    return ZERO_DAY_STATE;
  }
}

function writeDayState(dayKey: string, state: QuestDayState): void {
  try {
    localStorage.setItem(storageKeyForDay(dayKey), JSON.stringify(state));
  } catch {
    // Quota exceeded or private-mode denial.
  }
}

function parseDayKey(key: string): Date | null {
  if (!/^\d{8}$/.test(key)) return null;
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(4, 6));
  const d = Number(key.slice(6, 8));
  return new Date(y, m - 1, d);
}

/** Opportunistic cleanup: drop quest-day snapshots older than a week so
 *  localStorage doesn't accumulate one key per day forever. */
function cleanupOldDays(today: Date): void {
  if (typeof window === 'undefined') return;
  try {
    const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(QUEST_KEY_PREFIX)) continue;
      const day = parseDayKey(key.slice(QUEST_KEY_PREFIX.length));
      if (!day) continue;
      const ageDays = Math.round((todayMs - day.getTime()) / 86_400_000);
      if (ageDays > MAX_DAY_AGE) stale.push(key);
    }
    stale.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage inaccessible — nothing to clean up.
  }
}

function deriveProgress(quest: Quest, counters: QuestDayCounters): number {
  switch (quest.kind) {
    case 'plays':
      return counters.plays;
    case 'distinct-games':
      return counters.distinctGames.length;
    case 'daily-challenge':
      return counters.dailyChallenges;
    case 'category-plays':
      return quest.category ? (counters.categoryPlays[quest.category] ?? 0) : 0;
    case 'score-pct':
      return counters.bestPct >= (quest.pct ?? 0) ? 1 : 0;
    case 'new-best':
      return counters.newBest ? 1 : 0;
    default:
      return 0;
  }
}

function toProgress(quests: Quest[], counters: QuestDayCounters): QuestProgress[] {
  return quests.map((q) => {
    const progress = Math.min(deriveProgress(q, counters), q.target);
    return { ...q, progress, done: progress >= q.target };
  });
}

/** Today's quests (rolled from the UTC daily code) merged with local-day
 *  progress. */
export function getTodaysQuests(): QuestProgress[] {
  const now = new Date();
  cleanupOldDays(now);
  const quests = questsForCode(getDailyChallengeCode(), AVAILABLE_GAMES());
  const { counters } = readDayState(localDayKey(now));
  return toProgress(quests, counters);
}

/** True if `gameId` already counted toward today's distinct-games quest —
 *  recordGameResult reuses this as its "first play of this game today"
 *  signal, so the two don't drift out of sync. */
export function hasPlayedToday(gameId: string): boolean {
  const { counters } = readDayState(localDayKey());
  return counters.distinctGames.includes(gameId);
}

export interface QuestActivity {
  gameId: string;
  category: GameCategory;
  mode: 'solo' | 'daily' | 'friend';
  /** 0–100. */
  scorePct: number;
  isNewBest: boolean;
}

/** Updates today's counters from a completed game and auto-claims XP for any
 *  quest that just became done. recordGameResult is the only caller. */
export function applyPlayToQuests(activity: QuestActivity): {
  quests: QuestProgress[];
  completed: QuestProgress[];
  xpFromQuests: number;
} {
  if (typeof window === 'undefined') return { quests: [], completed: [], xpFromQuests: 0 };

  const now = new Date();
  const dayKey = localDayKey(now);
  const quests = questsForCode(getDailyChallengeCode(), AVAILABLE_GAMES());
  const state = readDayState(dayKey);

  const counters: QuestDayCounters = {
    plays: state.counters.plays + 1,
    distinctGames: state.counters.distinctGames.includes(activity.gameId)
      ? state.counters.distinctGames
      : [...state.counters.distinctGames, activity.gameId],
    dailyChallenges: state.counters.dailyChallenges + (activity.mode === 'daily' ? 1 : 0),
    categoryPlays: {
      ...state.counters.categoryPlays,
      [activity.category]: (state.counters.categoryPlays[activity.category] ?? 0) + 1,
    },
    bestPct: Math.max(state.counters.bestPct, activity.scorePct),
    newBest: state.counters.newBest || activity.isNewBest,
  };

  const progressList = toProgress(quests, counters);
  const completed = progressList.filter((q) => q.done && !state.claimed.includes(q.id));
  const claimed = [...state.claimed, ...completed.map((q) => q.id)];

  writeDayState(dayKey, { counters, claimed });
  invalidate();

  return {
    quests: progressList,
    completed,
    xpFromQuests: completed.reduce((sum, q) => sum + q.xp, 0),
  };
}

// ── useSyncExternalStore plumbing (see progress.ts for the pattern) ──

const EMPTY_QUESTS: QuestProgress[] = [];
let cached: QuestProgress[] | null = null;
function invalidate(): void {
  cached = null;
}
function getSnapshot(): QuestProgress[] {
  if (typeof window === 'undefined') return EMPTY_QUESTS;
  if (!cached) cached = getTodaysQuests();
  return cached;
}
function getServerSnapshot(): QuestProgress[] {
  return EMPTY_QUESTS;
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

export function useQuests(): QuestProgress[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
