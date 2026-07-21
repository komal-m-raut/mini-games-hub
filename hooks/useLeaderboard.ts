'use client';

import { useCallback, useEffect, useState } from 'react';
import { ScoreEntry } from '@/types/game';
import { getDailyChallengeCode } from '@/lib/challenge';

export type LeaderboardTab = 'today' | 'alltime';

/** Which score board backs each tab. */
function boardFor(tab: LeaderboardTab): string {
  return tab === 'today' ? getDailyChallengeCode() : 'global';
}

export function useLeaderboard(gameId: string) {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('today');
  const [tick, setTick] = useState(0);
  // Result is tagged with the request key so stale data never shows for
  // the wrong tab, and switching tabs falls back to the loading skeleton.
  const [data, setData] = useState<{ key: string; entries: ScoreEntry[] } | null>(null);

  const board = boardFor(activeTab);
  const key = `${gameId}/${board}/${tick}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let entries: ScoreEntry[] = [];
      try {
        const res = await fetch(`/api/scores/${gameId}/${board}`, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          entries = json.entries ?? [];
        }
      } catch {
        // network error → empty board
      }
      if (!cancelled) setData({ key, entries });
    })();
    return () => {
      cancelled = true;
    };
  }, [key, gameId, board]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const entries = data && data.key === key ? data.entries : null;
  return { entries, activeTab, setActiveTab, isLoading: entries === null, refresh };
}
