'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Search, X } from 'lucide-react';
import { GAME_REGISTRY, CATEGORY_META, CATEGORY_ORDER } from '@/lib/gameRegistry';
import { useSiteStats } from '@/hooks/useSiteStats';
import { useQuests, QuestProgress } from '@/lib/quests';
import { useStreak } from '@/lib/streak';
import { StreakFlame } from '@/components/meta/StreakFlame';
import { GameCategory, GameMeta } from '@/types/game';
import { cn } from '@/lib/utils';
import {
  categoriesWithGames,
  filterByCategory,
  filterGames,
  groupByCategory,
} from '@/components/layout/hubSearch';

// ── Count-up stat ────────────────────────────────────────────────────
// useSyncExternalStore (not useState+useEffect) so reading the media query
// never calls setState synchronously from an effect body — same plumbing
// shape lib/{progress,streak,quests}.ts already use for hydration-safe
// external reads. Server snapshot is `false`: SSR has no matchMedia, and the
// count-up effect below only ever *speeds up* on the client, never mismatches.
function subscribeReducedMotion(callback: () => void): () => void {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}
function getReducedMotionSnapshot(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function getReducedMotionServerSnapshot(): boolean {
  return false;
}
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );
}

/** Eases 0 → `value` over ~900ms with rAF. Under prefers-reduced-motion the
 *  animation effect is skipped outright and the final value renders directly
 *  (globals.css's reduced-motion block only catches CSS animations/
 *  transitions — this is JS, so it needs its own guard). */
function CountUp({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const start = performance.now();
    const duration = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);

  return <span className="hub-stat__value">{(reduced ? value : display).toLocaleString()}</span>;
}

// ── Quest chip (compact daily-strip variant of QuestList) ─────────────
function QuestChip({ quest }: { quest: QuestProgress }) {
  const pct = quest.target > 0 ? Math.min(100, Math.round((quest.progress / quest.target) * 100)) : 0;
  return (
    <span className={cn('quest-chip', quest.done && 'quest-chip-done')}>
      {quest.done ? (
        <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
      ) : (
        <span className="quest-chip__track" aria-hidden="true">
          <span className="quest-chip__fill" style={{ transform: `scaleX(${pct / 100})` }} />
        </span>
      )}
      <span>{quest.label}</span>
    </span>
  );
}

// ── Game Card ───────────────────────────────
/**
 * One arcade cabinet. Everything a player needs before clicking is on the
 * face of it: the artwork, the name, how it feels, what you actually do, and
 * a Play affordance. No tag pills, no status badge, no SEO paragraph — the
 * long copy lives in `description` for crawlers and on the game page itself.
 */
function GameCard({ game, index = 0 }: { game: GameMeta; index?: number }) {
  const Wrapper = game.isAvailable ? Link : 'div';

  return (
    <div className="fade-up" style={{ animationDelay: `${Math.min(index, 12) * 0.05}s` }}>
      <Wrapper
        // @ts-expect-error — href is only used when isAvailable is true
        href={game.isAvailable ? game.href : undefined}
        className={`game-card ${!game.isAvailable ? 'game-card-unavailable' : ''}`}
        style={{ '--game': game.accent } as React.CSSProperties}
        aria-disabled={!game.isAvailable}
        // Only the Link case needs a label — it's the only case with an
        // otherwise-ambiguous accessible name. The unavailable `div` case has
        // no implicit link semantics, so it just reads its own content.
        aria-label={game.isAvailable ? `Play ${game.title}` : undefined}
      >
        <span className="game-card__sheen" aria-hidden="true" />
        <div className="game-card__art">
          <span className="game-card__emoji" aria-hidden="true">
            {game.emoji}
          </span>
        </div>

        <div className="game-card__body">
          <p className="game-card__kind">{game.tagline}</p>
          <h3 className="game-card__title">{game.title}</h3>
          <p className="game-card__how">{game.howTo}</p>
        </div>

        <div className="game-card__cta">
          <span>{game.isAvailable ? 'Play' : 'Coming soon'}</span>
          {game.isAvailable && <ArrowRight strokeWidth={2.5} aria-hidden="true" />}
        </div>
      </Wrapper>
    </div>
  );
}

// ── Page ─────────────────────────────────────
export default function HubPage() {
  const stats = useSiteStats();
  const quests = useQuests();
  const streak = useStreak();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<GameCategory | 'all'>('all');

  const liveCount = GAME_REGISTRY.filter((g) => g.isAvailable).length;
  const players = stats?.totalPlayers ?? 0;
  const plays = stats?.totalPlays ?? 0;

  const availableCategories = useMemo(
    () => categoriesWithGames(GAME_REGISTRY, CATEGORY_ORDER),
    []
  );

  const isFiltering = query.trim() !== '' || category !== 'all';
  const filteredGames = useMemo(
    () => filterByCategory(filterGames(GAME_REGISTRY, query), category),
    [query, category]
  );
  const groupedGames = useMemo(() => groupByCategory(GAME_REGISTRY, CATEGORY_ORDER), []);

  const allQuestsDone = quests.length > 0 && quests.every((q) => q.done);

  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-8 sm:gap-10">
      {/* Hero. Deliberately short: on a games hub the hero is a signpost, not
          a landing page. */}
      <header className="max-w-3xl flex flex-col gap-5">
        <div>
          <h1
            className="fade-up font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.05]"
            style={{ animationDelay: '0.05s' }}
          >
            <span className="neon-text-purple">Tiny</span>{' '}
            <span className="neon-text-cyan">Arcadium</span>
          </h1>
          <p
            className="fade-up mt-4 text-lg sm:text-xl text-ink-2 leading-relaxed"
            style={{ animationDelay: '0.12s' }}
          >
            Quick free mini-games — no downloads, no signups, just play.
          </p>
        </div>

        {/* Live stats — count from the registry (available games) is
            synchronous; players/plays come from /api/stats and count up once
            loaded, so the row never shows a misleading zero. */}
        <div className="hub-stats-row fade-up" style={{ animationDelay: '0.18s' }}>
          <div className="hub-stat">
            <CountUp value={liveCount} />
            <span className="hub-stat__label">games</span>
          </div>
          {players > 0 && (
            <div className="hub-stat">
              <CountUp value={players} />
              <span className="hub-stat__label">players</span>
            </div>
          )}
          {plays > 0 && (
            <div className="hub-stat">
              <CountUp value={plays} />
              <span className="hub-stat__label">plays</span>
            </div>
          )}
        </div>
      </header>

      {/* Daily strip */}
      <section
        className="hub-daily-strip glass-card fade-up flex flex-col gap-4 sm:flex-row sm:items-center"
        style={{ animationDelay: '0.22s' }}
      >
        <div className="flex items-center gap-3 shrink-0">
          <StreakFlame streak={streak} size="sm" />
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="font-ui text-xs text-ink-3 uppercase tracking-widest mb-2">
            Today&apos;s Quests
          </h2>
          {quests.length === 0 ? (
            <p className="text-ink-4 text-xs font-ui">Loading today&apos;s quests…</p>
          ) : allQuestsDone ? (
            <p className="font-ui text-sm text-brand-green">
              All quests complete — come back tomorrow 🔥
            </p>
          ) : (
            <div className="quest-chip-row">
              {quests.map((q) => (
                <QuestChip key={q.id} quest={q} />
              ))}
            </div>
          )}
        </div>

        <Link href="/daily" className="btn btn-sm btn-secondary shrink-0 self-start sm:self-auto">
          Daily
          <ArrowRight strokeWidth={2.5} aria-hidden="true" />
        </Link>
      </section>

      {/* Search + filter */}
      <section className="fade-up flex flex-col gap-3" style={{ animationDelay: '0.26s' }}>
        <div className="hub-search-wrap">
          <label htmlFor="game-search" className="sr-only">
            Search games by name
          </label>
          <Search className="hub-search-icon" aria-hidden="true" />
          <input
            id="game-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search games…"
            className="hub-search-input"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="hub-search-clear"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          )}
        </div>

        <div className="hub-chip-row" role="group" aria-label="Filter by category">
          <button
            type="button"
            className={cn('hub-chip', category === 'all' && 'hub-chip-active')}
            aria-pressed={category === 'all'}
            onClick={() => setCategory('all')}
          >
            All
          </button>
          {availableCategories.map((c) => (
            <button
              key={c}
              type="button"
              className={cn('hub-chip', category === c && 'hub-chip-active')}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {CATEGORY_META[c].label}
            </button>
          ))}
        </div>
      </section>

      {/* Games */}
      {isFiltering ? (
        <section className="flex flex-col gap-4">
          <p className="text-sm text-ink-3" role="status" aria-live="polite">
            {filteredGames.length} game{filteredGames.length === 1 ? '' : 's'} found
          </p>
          {filteredGames.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {filteredGames.map((game, i) => (
                <GameCard key={game.id} game={game} index={i} />
              ))}
            </div>
          ) : (
            <div className="hub-empty-state">
              <p className="font-ui text-ink-3 text-sm">
                No games match &ldquo;{query}&rdquo;. Try a different search or clear the filters.
              </p>
              <button
                type="button"
                className="btn btn-sm btn-ghost mt-3"
                onClick={() => {
                  setQuery('');
                  setCategory('all');
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </section>
      ) : (
        groupedGames.map(({ category: sectionCategory, games }) => (
          <section key={sectionCategory} className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl">
                  {CATEGORY_META[sectionCategory].label}
                </h2>
                <p className="text-sm text-ink-3">{CATEGORY_META[sectionCategory].blurb}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {games.map((game, i) => (
                <GameCard key={game.id} game={game} index={i} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
