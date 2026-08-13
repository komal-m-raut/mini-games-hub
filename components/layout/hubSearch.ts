/**
 * Pure helpers behind the home page's search box, category chips and
 * category-grouped grid — and reused by the footer's game directory, so the
 * "what counts as this category" logic lives in exactly one place. Kept
 * dependency-free (no React) so they're trivially unit-testable from
 * tests/shell.test.ts.
 */
import { GameCategory, GameMeta } from '@/types/game';

/** True if `game` matches a free-text query against its title or tagline.
 *  An empty/whitespace-only query matches everything. */
export function matchesQuery(game: GameMeta, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return game.title.toLowerCase().includes(q) || game.tagline.toLowerCase().includes(q);
}

/** Games whose title or tagline contains `query` (case-insensitive). */
export function filterGames(games: GameMeta[], query: string): GameMeta[] {
  return games.filter((g) => matchesQuery(g, query));
}

/** `games` restricted to one category, or all of them for `'all'`. */
export function filterByCategory(games: GameMeta[], category: GameCategory | 'all'): GameMeta[] {
  return category === 'all' ? games : games.filter((g) => g.category === category);
}

/** Categories from `order` that have at least one game in `games`, in `order`'s
 *  sequence — drives both the filter chip row and the footer directory's
 *  column list, so a category never shows an empty chip or an empty column. */
export function categoriesWithGames(games: GameMeta[], order: GameCategory[]): GameCategory[] {
  const present = new Set(games.map((g) => g.category));
  return order.filter((c) => present.has(c));
}

export interface CategoryGroup {
  category: GameCategory;
  games: GameMeta[];
}

/** `games` bucketed by category, in `order`'s sequence, dropping any category
 *  with no games. The section list for the grouped grid and the footer's
 *  column list are both this shape. */
export function groupByCategory(games: GameMeta[], order: GameCategory[]): CategoryGroup[] {
  return order
    .map((category) => ({ category, games: games.filter((g) => g.category === category) }))
    .filter((group) => group.games.length > 0);
}
