'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ScoreEntry } from '@/types/game';
import { getDailyChallengeCode } from '@/lib/challenge';

export type LeaderboardTab = 'today' | 'week';

const WEEK_BOARD = 'global';

/** How many rows the board shows before you scroll, and per page after. */
export const LEADERBOARD_PAGE_SIZE = 5;

/** Which score board backs each tab. */
function boardFor(tab: LeaderboardTab): string {
  return tab === 'today' ? getDailyChallengeCode() : WEEK_BOARD;
}

interface Page {
  entries: ScoreEntry[];
  total: number;
  nextOffset: number | null;
}

async function fetchPage(
  gameId: string,
  board: string,
  offset: number
): Promise<Page> {
  try {
    const res = await fetch(
      `/api/scores/${gameId}/${board}?offset=${offset}&limit=${LEADERBOARD_PAGE_SIZE}`,
      { cache: 'no-store' }
    );
    if (res.ok) {
      const json = await res.json();
      return {
        entries: json.entries ?? [],
        total: json.total ?? 0,
        nextOffset: json.nextOffset ?? null,
      };
    }
  } catch {
    // network error → empty page
  }
  return { entries: [], total: 0, nextOffset: null };
}

type BoardData = {
  key: string;
  entries: ScoreEntry[];
  total: number;
  nextOffset: number | null;
};

export function useLeaderboard(gameId: string) {
  const [activeTab, setActiveTabState] = useState<LeaderboardTab>('today');
  const [tick, setTick] = useState(0);
  // Result is tagged with the request key so stale data never shows for
  // the wrong tab, and switching tabs falls back to the loading skeleton.
  const [data, setData] = useState<BoardData | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // True only while we're silently checking the week board after Today came
  // back empty on first load — keeps the loading skeleton up instead of
  // flashing an empty state that's about to be replaced.
  const [checkingAutoSelect, setCheckingAutoSelect] = useState(false);

  // Mirrors `data` for synchronous reads inside the effect and in loadMore,
  // so a tab switch that lands on a board we already fetched doesn't trigger
  // a redundant request, and loadMore doesn't need `data` as a dependency.
  //
  // Synced in an effect rather than assigned during render: a render-phase
  // ref write is unsafe once rendering can be interrupted or replayed. This
  // effect is declared *before* the fetch effect below, so React has already
  // run it by the time that one reads the ref on the same commit.
  const dataRef = useRef<BoardData | null>(null);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Auto-select bookkeeping: the empty→week fallback below may only ever
  // fire once (per mount), and never once the visitor has picked a tab
  // themselves — these refs (not state) enforce both without re-rendering.
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
    // below already fetched the week board before we switched tabs to it).
    if (dataRef.current?.key === key) return;

    let cancelled = false;

    (async () => {
      const page = await fetchPage(gameId, board, 0);
      if (cancelled) return;

      const isFirstTodayLoad =
        activeTab === 'today' && !autoSelectDone.current && !userChosenTab.current;

      if (!isFirstTodayLoad || page.entries.length > 0) {
        if (isFirstTodayLoad) autoSelectDone.current = true;
        setData({ key, ...page });
        return;
      }

      // Today is empty on first load — before settling on an empty board,
      // check whether the week board has scores worth surfacing instead.
      // Marked done immediately so this can only ever run once.
      autoSelectDone.current = true;
      setCheckingAutoSelect(true);

      const weekPage = await fetchPage(gameId, WEEK_BOARD, 0);
      if (cancelled) return;

      if (weekPage.entries.length > 0 && !userChosenTab.current) {
        setData({ key: `${gameId}/${WEEK_BOARD}/${tick}`, ...weekPage });
        setActiveTabState('week');
      } else {
        // Both boards are empty (or the visitor already switched tabs
        // themselves) — show Today's empty state as-is.
        setData({ key, ...page });
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

  /**
   * Append the next page. Guarded on the *current* data rather than on React
   * state captured at render, because the scroll sentinel can fire several
   * times before a re-render lands and each extra call would duplicate rows.
   */
  const loadMore = useCallback(async () => {
    const current = dataRef.current;
    if (!current || current.nextOffset === null) return;

    const offset = current.nextOffset;
    // Claim the offset synchronously so a second sentinel hit during the
    // await can't request the same page again.
    dataRef.current = { ...current, nextOffset: null };
    setIsLoadingMore(true);

    const [id, boardName] = current.key.split('/');
    const page = await fetchPage(id, boardName, offset);

    setData((prev) => {
      // Tab switched or refreshed mid-flight — drop this page on the floor.
      if (!prev || prev.key !== current.key) return prev;
      const seen = new Set(prev.entries.map((e) => e.playerId));
      return {
        ...prev,
        entries: [...prev.entries, ...page.entries.filter((e) => !seen.has(e.playerId))],
        total: page.total,
        nextOffset: page.nextOffset,
      };
    });
    setIsLoadingMore(false);
  }, []);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const entries = data && data.key === key ? data.entries : null;
  const isLoading = entries === null || checkingAutoSelect;

  return {
    entries,
    total: data && data.key === key ? data.total : 0,
    hasMore: Boolean(data && data.key === key && data.nextOffset !== null),
    isLoadingMore,
    loadMore,
    activeTab,
    setActiveTab,
    isLoading,
    refresh,
  };
}
