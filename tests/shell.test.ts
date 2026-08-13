import { describe, expect, it } from 'vitest';
import {
  categoriesWithGames,
  filterByCategory,
  filterGames,
  groupByCategory,
  matchesQuery,
} from '@/components/layout/hubSearch';
import { GameMeta } from '@/types/game';

function game(over: Partial<GameMeta> = {}): GameMeta {
  return {
    id: 'demo',
    title: 'Demo Game',
    category: 'reflex',
    description: 'A demo game.',
    tagline: 'Speed & focus',
    howTo: 'Do the thing.',
    emoji: '🎮',
    accent: '#7C3AED',
    isAvailable: true,
    href: '/games/demo',
    ...over,
  };
}

const FIXTURE: GameMeta[] = [
  game({ id: 'balloon-match', title: 'Balloon Match', category: 'precision', tagline: 'Memory & precision' }),
  game({ id: 'perfect-pour', title: 'Perfect Pour', category: 'precision', tagline: 'Calm & precise' }),
  game({ id: 'memory-path', title: 'Memory Path', category: 'memory', tagline: 'Focus & recall' }),
  game({ id: 'color-match', title: 'Color Match', category: 'perception', tagline: 'Colour & perception' }),
  game({ id: 'snake', title: 'Snake', category: 'arcade', tagline: 'Grow & survive', isAvailable: false }),
];

const ORDER = ['reflex', 'speed', 'memory', 'perception', 'precision', 'arcade'] as const;

describe('matchesQuery / filterGames', () => {
  it('matches an empty query against everything', () => {
    expect(matchesQuery(FIXTURE[0], '')).toBe(true);
    expect(matchesQuery(FIXTURE[0], '   ')).toBe(true);
  });

  it('matches title case-insensitively', () => {
    expect(matchesQuery(FIXTURE[0], 'balloon')).toBe(true);
    expect(matchesQuery(FIXTURE[0], 'BALLOON')).toBe(true);
  });

  it('matches tagline as well as title', () => {
    expect(matchesQuery(FIXTURE[2], 'recall')).toBe(true);
  });

  it('does not match unrelated text', () => {
    expect(matchesQuery(FIXTURE[0], 'zzz')).toBe(false);
  });

  it('filterGames narrows to the matching subset, order preserved', () => {
    const result = filterGames(FIXTURE, 'match');
    expect(result.map((g) => g.id)).toEqual(['balloon-match', 'color-match']);
  });

  it('filterGames with an empty query returns every game', () => {
    expect(filterGames(FIXTURE, '')).toHaveLength(FIXTURE.length);
  });
});

describe('filterByCategory', () => {
  it("'all' returns every game untouched", () => {
    expect(filterByCategory(FIXTURE, 'all')).toEqual(FIXTURE);
  });

  it('restricts to a single category', () => {
    const result = filterByCategory(FIXTURE, 'precision');
    expect(result.map((g) => g.id)).toEqual(['balloon-match', 'perfect-pour']);
  });

  it('returns an empty array for a category with no games', () => {
    expect(filterByCategory(FIXTURE, 'duel')).toEqual([]);
  });
});

describe('categoriesWithGames', () => {
  it('keeps only categories with at least one game, in the given order', () => {
    expect(categoriesWithGames(FIXTURE, [...ORDER])).toEqual([
      'memory',
      'perception',
      'precision',
      'arcade',
    ]);
  });

  it('includes categories whose only game is unavailable (coming soon still counts)', () => {
    expect(categoriesWithGames(FIXTURE, [...ORDER])).toContain('arcade');
  });

  it('returns an empty array when no game matches any category in order', () => {
    expect(categoriesWithGames(FIXTURE, ['duel', 'word', 'puzzle'])).toEqual([]);
  });
});

describe('groupByCategory', () => {
  it('buckets games by category in order, dropping empty categories', () => {
    const groups = groupByCategory(FIXTURE, [...ORDER]);
    expect(groups.map((g) => g.category)).toEqual(['memory', 'perception', 'precision', 'arcade']);
    const precision = groups.find((g) => g.category === 'precision');
    expect(precision?.games.map((g) => g.id)).toEqual(['balloon-match', 'perfect-pour']);
  });

  it('every game in the fixture appears in exactly one group', () => {
    const groups = groupByCategory(FIXTURE, [...ORDER]);
    const total = groups.reduce((sum, g) => sum + g.games.length, 0);
    expect(total).toBe(FIXTURE.length);
  });

  it('returns an empty array when given no games', () => {
    expect(groupByCategory([], [...ORDER])).toEqual([]);
  });
});
