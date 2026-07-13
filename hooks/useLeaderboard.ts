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
  const [entries, setEntries] = useState<ScoreEntry[] | null>(null);
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('today');

  const refresh = useCallback(async () => {
    setEntries(null);
    try {
      const res = await fetch(`/api/scores/${gameId}/${boardFor(activeTab)}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch {
      setEntries([]);
    }
  }, [gameId, activeTab]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, activeTab, setActiveTab, isLoading: entries === null, refresh };
}
