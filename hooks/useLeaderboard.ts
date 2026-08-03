'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ScoreEntry } from '@/types/game';
import { getDailyChallengeCode } from '@/lib/challenge';

export type LeaderboardTab = 'today' | 'alltime';

const ALLTIME_BOARD = 'global';

/** Which score board backs each tab. */
function boardFor(tab: LeaderboardTab): string {
  return tab === 'today' ? getDailyChallengeCode() : ALLTIME_BOARD;
}

type BoardData = { key: string; entries: ScoreEntry[] };

export function useLeaderboard(gameId: string) {
  const [activeTab, setActiveTabState] = useState<LeaderboardTab>('today');
  const [tick, setTick] = useState(0);
  // Result is tagged with the request key so stale data never shows for
  // the wrong tab, and switching tabs falls back to the loading skeleton.
  const [data, setData] = useState<BoardData | null>(null);
  // True only while we're silently checking All Time after Today came back
  // empty on first load — keeps the loading skeleton up instead of flashing
  // an empty state that's about to be replaced.
  const [checkingAutoSelect, setCheckingAutoSelect] = useState(false);

  // Mirrors `data` for synchronous reads inside the effect below, so a tab
  // switch that lands on a board we already fetched (e.g. via the
  // auto-select probe) doesn't trigger a redundant network request.
  const dataRef = useRef<BoardData | null>(null);
  dataRef.current = data;

  // Auto-select bookkeeping: the empty→All-Time fallback below may only
  // ever fire once (per mount), and never once the visitor has picked a
  // tab themselves — these refs (not state) enforce both without causing
  // re-renders of their own.
  const autoSelectDone = useRef(false);
  const userChosenTab = useRef(false);

  const setActiveTab = useCallback((tab: LeaderboardTab) => {
    userChosenTab.current = true;
    setActiveTabState(tab);
  }, []);

  const board = boardFor(activeTab);
  const key = `${gameId}/${board}/${tick}`;

  useEffect(() => {
    // Already have this exact board cached (e.g. the auto-select probe
    // below already fetched All Time before we switched tabs to it).
    if (dataRef.current?.key === key) return;

    let cancelled = false;

    async function fetchBoard(boardName: string): Promise<ScoreEntry[]> {
      try {
        const res = await fetch(`/api/scores/${gameId}/${boardName}`, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          return json.entries ?? [];
        }
      } catch {
        // network error → empty board
      }
      return [];
    }

    (async () => {
      const entries = await fetchBoard(board);
      if (cancelled) return;

      const isFirstTodayLoad =
        activeTab === 'today' && !autoSelectDone.current && !userChosenTab.current;

      if (!isFirstTodayLoad || entries.length > 0) {
        if (isFirstTodayLoad) autoSelectDone.current = true;
        setData({ key, entries });
        return;
      }

      // Today is empty on first load — before settling on an empty board,
      // check whether All Time has scores worth surfacing instead. Marked
      // done immediately so this can only ever run once.
      autoSelectDone.current = true;
      setCheckingAutoSelect(true);

      const allTimeEntries = await fetchBoard(ALLTIME_BOARD);
      if (cancelled) return;

      if (allTimeEntries.length > 0 && !userChosenTab.current) {
        setData({ key: `${gameId}/${ALLTIME_BOARD}/${tick}`, entries: allTimeEntries });
        setActiveTabState('alltime');
      } else {
        // Both boards are empty (or the visitor already switched tabs
        // themselves) — show Today's empty state as-is.
        setData({ key, entries });
      }
      setCheckingAutoSelect(false);
    })();

    return () => {
      cancelled = true;
      // Never leave the skeleton stuck up if this run's probe gets
      // superseded (e.g. the visitor switches tabs mid-probe).
      setCheckingAutoSelect(false);
    };
  }, [key, gameId, board, activeTab, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const entries = data && data.key === key ? data.entries : null;
  const isLoading = entries === null || checkingAutoSelect;
  return { entries, activeTab, setActiveTab, isLoading, refresh };
}
