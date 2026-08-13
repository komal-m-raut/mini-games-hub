import { describe, expect, it } from 'vitest';
import { levelForXp, xpForLevel, xpIntoLevel } from '@/lib/progress';
import { StreakState, nextStreak } from '@/lib/streak';
import { Quest, questsForCode } from '@/lib/quests';
import { GameResultInput, computeXpGain } from '@/lib/recordResult';
import { GameCategory, GameMeta } from '@/types/game';

// ── lib/progress: level curve ───────────────────────────────────────

describe('level curve (lib/progress)', () => {
  it('matches the documented boundaries: L1=0, L2=100, L3=300, L4=600, L5=1000, L10=4500', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(300);
    expect(xpForLevel(4)).toBe(600);
    expect(xpForLevel(5)).toBe(1000);
    expect(xpForLevel(10)).toBe(4500);
  });

  it('levelForXp lands exactly on each threshold', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(300)).toBe(3);
    expect(levelForXp(600)).toBe(4);
    expect(levelForXp(1000)).toBe(5);
    expect(levelForXp(4500)).toBe(10);
  });

  it('stays on the lower level for 1 XP short of the next threshold', () => {
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(299)).toBe(2);
    expect(levelForXp(999)).toBe(4);
    expect(levelForXp(4499)).toBe(9);
  });

  it('is monotonically non-decreasing as XP grows', () => {
    let prevLevel = levelForXp(0);
    for (let xp = 0; xp <= 20_000; xp += 37) {
      const level = levelForXp(xp);
      expect(level).toBeGreaterThanOrEqual(prevLevel);
      prevLevel = level;
    }
  });

  it('round-trips through xpForLevel for many levels', () => {
    for (let n = 1; n <= 100; n++) {
      expect(levelForXp(xpForLevel(n))).toBe(n);
    }
  });

  it('xpIntoLevel reports progress relative to the current level, not the next', () => {
    expect(xpIntoLevel(0)).toEqual({ into: 0, needed: 100 });
    expect(xpIntoLevel(150)).toEqual({ into: 50, needed: 200 }); // level 2 spans 100..300
    expect(xpIntoLevel(4500)).toEqual({ into: 0, needed: 1000 }); // exactly on the L10 boundary
  });
});

// ── lib/streak: pure core ───────────────────────────────────────────

describe('nextStreak (lib/streak)', () => {
  it('starts a fresh streak at 1 when there is no prior streak', () => {
    expect(nextStreak(null, '2026-08-13')).toEqual({ current: 1, best: 1, lastDay: '2026-08-13' });
  });

  it('is unchanged when played again the same day', () => {
    const prev: StreakState = { current: 4, best: 6, lastDay: '2026-08-13' };
    expect(nextStreak(prev, '2026-08-13')).toEqual(prev);
  });

  it('increments on a consecutive day and raises best when it is broken', () => {
    const prev: StreakState = { current: 4, best: 4, lastDay: '2026-08-13' };
    expect(nextStreak(prev, '2026-08-14')).toEqual({ current: 5, best: 5, lastDay: '2026-08-14' });
  });

  it('keeps best untouched when the new streak does not beat it', () => {
    const prev: StreakState = { current: 2, best: 10, lastDay: '2026-08-13' };
    expect(nextStreak(prev, '2026-08-14')).toEqual({ current: 3, best: 10, lastDay: '2026-08-14' });
  });

  it('resets to 1 after a gap of more than one day', () => {
    const prev: StreakState = { current: 8, best: 8, lastDay: '2026-08-10' };
    expect(nextStreak(prev, '2026-08-13')).toEqual({ current: 1, best: 8, lastDay: '2026-08-13' });
  });

  it('handles a consecutive day correctly across a month boundary', () => {
    const prev: StreakState = { current: 3, best: 3, lastDay: '2026-07-31' };
    expect(nextStreak(prev, '2026-08-01')).toEqual({ current: 4, best: 4, lastDay: '2026-08-01' });
  });
});

// ── lib/quests: pure core ───────────────────────────────────────────

function fixtureGame(id: string, category: GameCategory): GameMeta {
  return {
    id,
    title: id,
    category,
    description: '',
    tagline: '',
    howTo: '',
    emoji: '🎮',
    accent: '#000000',
    isAvailable: true,
    href: `/games/${id}`,
  };
}

// precision has 2 games (eligible for category-plays); every other category
// has exactly 1 (not eligible).
const FIVE_GAMES: GameMeta[] = [
  fixtureGame('a', 'precision'),
  fixtureGame('b', 'precision'),
  fixtureGame('c', 'memory'),
  fixtureGame('d', 'perception'),
  fixtureGame('e', 'reflex'),
];

// No category has 2+ games.
const NO_DUP_CATEGORY_GAMES: GameMeta[] = [
  fixtureGame('a', 'precision'),
  fixtureGame('b', 'memory'),
  fixtureGame('c', 'perception'),
  fixtureGame('d', 'reflex'),
  fixtureGame('e', 'speed'),
  fixtureGame('f', 'puzzle'),
];

function kindsOf(quests: Quest[]): string[] {
  return quests.map((q) => q.kind);
}

describe('questsForCode (lib/quests)', () => {
  it('is deterministic for the same code', () => {
    expect(questsForCode('daily-20260813', FIVE_GAMES)).toEqual(
      questsForCode('daily-20260813', FIVE_GAMES)
    );
  });

  it('differs across codes', () => {
    expect(questsForCode('daily-20260813', FIVE_GAMES)).not.toEqual(
      questsForCode('daily-20260101', FIVE_GAMES)
    );
  });

  it('always returns exactly 3 quests of distinct kinds', () => {
    for (const code of ['aaa111', 'bbb222', 'daily-20260101', 'zzzzzz', 'code-x']) {
      const quests = questsForCode(code, FIVE_GAMES);
      expect(quests).toHaveLength(3);
      expect(new Set(kindsOf(quests)).size).toBe(3);
    }
  });

  it('only ever picks a category-plays quest whose category has ≥2 available games', () => {
    let sawCategoryQuest = false;
    for (let i = 0; i < 200; i++) {
      const quests = questsForCode(`fuzz-${i}`, FIVE_GAMES);
      const categoryQuest = quests.find((q) => q.kind === 'category-plays');
      if (!categoryQuest) continue;
      sawCategoryQuest = true;
      expect(categoryQuest.category).toBe('precision'); // the only eligible category
      const count = FIVE_GAMES.filter((g) => g.category === categoryQuest.category).length;
      expect(count).toBeGreaterThanOrEqual(2);
    }
    // Sanity check the fixture actually exercises the category-plays branch.
    expect(sawCategoryQuest).toBe(true);
  });

  it('never picks category-plays when no category has ≥2 available games', () => {
    for (let i = 0; i < 200; i++) {
      const quests = questsForCode(`fuzz-${i}`, NO_DUP_CATEGORY_GAMES);
      expect(quests.some((q) => q.kind === 'category-plays')).toBe(false);
      expect(quests).toHaveLength(3);
    }
  });
});

// ── lib/recordResult: pure XP math ──────────────────────────────────

describe('computeXpGain (lib/recordResult)', () => {
  const base = (over: Partial<GameResultInput> = {}): GameResultInput => ({
    gameId: 'balloon-match',
    mode: 'solo',
    totalScore: 0,
    maxScore: 50,
    ...over,
  });

  it('awards the base 20 XP for a zero score, non-first-play, solo run', () => {
    expect(computeXpGain(base({ totalScore: 0 }), false)).toBe(20);
  });

  it('scales up to +30 XP for a perfect score', () => {
    expect(computeXpGain(base({ totalScore: 50, maxScore: 50 }), false)).toBe(50);
  });

  it('floors the fractional bonus rather than rounding', () => {
    // 33/50 = 66% → floor(0.66 * 30) = 19 → 20 + 19 = 39
    expect(computeXpGain(base({ totalScore: 33, maxScore: 50 }), false)).toBe(39);
  });

  it('adds +15 for the first play of this game today', () => {
    expect(computeXpGain(base({ totalScore: 0 }), true)).toBe(35);
  });

  it('adds +10 for a daily-challenge run', () => {
    expect(computeXpGain(base({ mode: 'daily', totalScore: 0 }), false)).toBe(30);
  });

  it('stacks every bonus', () => {
    // 30/30 = 100% → +30, +15 first play, +10 daily = 20 + 30 + 15 + 10 = 75
    expect(computeXpGain(base({ mode: 'daily', totalScore: 30, maxScore: 30 }), true)).toBe(75);
  });

  it('never divides by zero when maxScore is 0', () => {
    expect(computeXpGain(base({ totalScore: 0, maxScore: 0 }), false)).toBe(20);
  });
});
