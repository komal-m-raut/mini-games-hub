'use client';

import { useEffect, useRef } from 'react';
import { Trophy, RefreshCw, Loader2 } from 'lucide-react';
import { useLeaderboard, LeaderboardTab, LEADERBOARD_PAGE_SIZE } from '@/hooks/useLeaderboard';
import { MAX_CHALLENGE_SCORE } from '@/lib/challenge';
import { RANK_COLORS } from '@/lib/constants';
import { usePlayerId } from '@/lib/player';
import { ScoreEntry } from '@/types/game';
import { formatScore } from '@/utils/scoring';

const TABS: { id: LeaderboardTab; label: string }[] = [
  { id: 'today', label: 'Today' },
  // Not "All Time" any more: scores are pruned after seven days, so that
  // label would have been a promise the storage layer no longer keeps.
  { id: 'week', label: 'This Week' },
];

interface LeaderboardProps {
  gameId: string;
  /** Heading text for this section. Defaults to "Leaderboard". */
  title?: string;
}

function RankBadge({ rank }: { rank: number }) {
  const color = RANK_COLORS[rank - 1];
  if (rank <= 3) {
    return <Trophy className="w-4 h-4" style={{ color }} strokeWidth={2} />;
  }
  return <span className="text-ink-3 font-score text-sm">{rank}</span>;
}

function LeaderboardRow({
  entry,
  rank,
  isSelf,
}: {
  entry: ScoreEntry;
  rank: number;
  isSelf: boolean;
}) {
  return (
    <div
      className={`leaderboard-row ${isSelf ? 'border border-brand-purple/40 bg-brand-purple/10' : ''}`}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="w-5 flex justify-center shrink-0">
          <RankBadge rank={rank} />
        </div>
        <p className="text-white text-sm font-medium truncate">
          {entry.name}
          {isSelf && <span className="text-brand-violet text-xs ml-1.5">you</span>}
        </p>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        {entry.roundScores && (
          <p className="text-ink-3 font-score text-xs hidden sm:block">
            {entry.roundScores.map(formatScore).join(' · ')}
          </p>
        )}
        <p className="font-score text-sm text-brand-violet tabular-nums">
          {formatScore(entry.score)}
          <span className="text-ink-4 text-xs">/{MAX_CHALLENGE_SCORE}</span>
        </p>
      </div>
    </div>
  );
}

export function Leaderboard({ gameId, title = 'Leaderboard' }: LeaderboardProps) {
  const {
    entries,
    total,
    hasMore,
    isLoadingMore,
    loadMore,
    activeTab,
    setActiveTab,
    isLoading,
    refresh,
  } = useLeaderboard(gameId);
  const playerId = usePlayerId();

  // Infinite scroll: a sentinel just past the last row inside the scroller.
  // IntersectionObserver rather than a scroll handler so it costs nothing
  // while idle and needs no throttling.
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollerRef.current;
    if (!sentinel || !root || !hasMore) return;

    const observer = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) loadMore();
      },
      // Start fetching a little before the sentinel is actually on screen,
      // so the next rows are usually there by the time you reach them.
      { root, rootMargin: '80px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore, entries?.length]);

  return (
    <section id="leaderboard" className="club-leaderboard glass-card p-0 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 sm:px-5 pt-4 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Trophy className="w-4 h-4 text-brand-yellow shrink-0" strokeWidth={2} />
          <h2 className="font-display text-base truncate">{title}</h2>
        </div>

        <div className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`btn btn-sm btn-ghost ${activeTab === tab.id ? 'lb-tab-active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={refresh}
            disabled={isLoading}
            className="btn btn-sm btn-ghost btn-icon"
            aria-label="Refresh leaderboard"
          >
            <RefreshCw className={isLoading ? 'animate-spin' : undefined} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Entries. The scroller is capped to roughly five rows so the board is
          a compact panel you scroll rather than a section that grows the page
          by a screenful whenever it fills up. */}
      <div ref={scrollerRef} className="leaderboard-scroller">
        {isLoading ? (
          <div className="flex flex-col gap-1 px-3 pb-3">
            {Array.from({ length: LEADERBOARD_PAGE_SIZE }).map((_, i) => (
              <div key={i} className="h-11 rounded-lg bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : entries && entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 px-4 py-10 text-center">
            <p className="text-ink-3 text-sm">No scores yet — play a round and claim the top spot.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1 px-3 pb-3">
            {(entries ?? []).map((entry, i) => (
              <LeaderboardRow
                key={entry.playerId}
                entry={entry}
                rank={i + 1}
                isSelf={Boolean(playerId) && entry.playerId === playerId}
              />
            ))}

            {/* Sentinel + spinner. Kept inside the scroller so it only comes
                into view when the player actually scrolls to the bottom. */}
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-2.5">
                <Loader2
                  className={`w-4 h-4 text-ink-4 ${isLoadingMore ? 'animate-spin' : ''}`}
                  strokeWidth={2}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer: how much of the board you're looking at, plus the retention
          rule stated where it matters rather than buried in a tooltip. */}
      {!isLoading && entries && entries.length > 0 && (
        <p className="px-4 sm:px-5 py-2.5 border-t border-white/5 text-xs text-ink-3">
          Showing {entries.length} of {total} · scores from the last 7 days
        </p>
      )}
    </section>
  );
}
