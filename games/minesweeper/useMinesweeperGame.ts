'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Difficulty } from '@/types/game';
import { useSound } from '@/hooks/useSound';
import { usePlayBeacon } from '@/hooks/usePlayBeacon';
import { CHALLENGE_ROUND_COUNT } from '@/lib/challenge';
import { getLocalBestSession, round2, saveBestSession } from '@/utils/scoring';
import { MinesweeperChallengeRound, getMinesweeperChallengeRounds } from './challenge';
import { MINESWEEPER_DIFFICULTY, SOLO_ROUND_COUNT, scoreBoard } from './constants';
import {
  Board,
  adjacentCounts,
  chord as chordBoard,
  createBoard,
  placeMines,
  reveal as revealCell,
  safeRevealedCount,
  safeTotal,
  toggleFlag as toggleFlagCell,
} from './engine';
import { MinesweeperGameState } from './types';

const GAME_ID = 'minesweeper';
/** How often the elapsed-time display ticks while a round is in progress. */
const ELAPSED_TICK_MS = 200;

const INITIAL_STATE: MinesweeperGameState = {
  phase: 'selecting-difficulty',
  mode: 'normal',
  difficulty: null,
  board: null,
  minesPlaced: false,
  hasInteracted: false,
  flagMode: false,
  elapsedSeconds: 0,
  lostIndex: null,
  round: 1,
  totalRounds: SOLO_ROUND_COUNT,
  score: 0,
  totalScore: 0,
  roundScores: [],
  result: null,
  isNewBestSession: false,
};

// localStorage best session, hydration-safe (server snapshot is 0)
const noopSubscribe = () => () => {};
const zeroSnapshot = () => 0;
const readBest = () => getLocalBestSession(GAME_ID);

export interface UseMinesweeperGameOptions {
  /** When set, the game runs as a seeded 3-round challenge. */
  challengeCode?: string;
}

export function useMinesweeperGame({ challengeCode }: UseMinesweeperGameOptions = {}) {
  usePlayBeacon(GAME_ID);
  const isChallenge = Boolean(challengeCode);
  // Deterministic per code, so every player faces the identical 3 boards
  const challengeRounds = useMemo<MinesweeperChallengeRound[] | null>(
    () => (challengeCode ? getMinesweeperChallengeRounds(challengeCode) : null),
    [challengeCode]
  );

  const [state, setState] = useState<MinesweeperGameState>(() => ({
    ...INITIAL_STATE,
    mode: isChallenge ? 'challenge' : 'normal',
    phase: isChallenge ? 'challenge-intro' : 'selecting-difficulty',
    totalRounds: isChallenge ? CHALLENGE_ROUND_COUNT : SOLO_ROUND_COUNT,
  }));
  const { play } = useSound();

  const bestSession = useSyncExternalStore(noopSubscribe, readBest, zeroSnapshot);

  // Refs mirroring round-scoped values the tap handlers and timers need
  // synchronously, without waiting on a render.
  const boardRef = useRef<Board | null>(null);
  const minesPlacedRef = useRef(false);
  const difficultyRef = useRef<Difficulty | null>(null);
  const roundRef = useRef(1);
  // Guards a round against finalizing twice (e.g. a chord that both
  // completes the board and would otherwise re-fire on a stray tap).
  const resolvedRoundRef = useRef(false);

  // Elapsed clock: `elapsedSeconds` = (now - startTimeRef) while not paused,
  // gated behind `hasInteracted` — a challenge board's pre-revealed opening
  // region must not itself start the clock.
  const hasInteractedRef = useRef(false);
  const startTimeRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitioningRef = useRef(false);

  // Mirror of the latest state for callbacks; updated in an effect (never
  // during render) so it can't trip the refs-during-render rule.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const clearTimers = useCallback(() => {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  }, []);

  // ── Timer ─────────────────────────────────────────────────────────

  /** Starts the round's clock on the very first interaction — a no-op on
   *  every call after the first. */
  const startClockIfNeeded = useCallback(() => {
    if (hasInteractedRef.current) return;
    hasInteractedRef.current = true;
    startTimeRef.current = performance.now();
    pausedAtRef.current = null;
    setState((s) => ({ ...s, hasInteracted: true, elapsedSeconds: 0 }));

    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = setInterval(() => {
      if (pausedAtRef.current !== null) return;
      const elapsed = round2((performance.now() - startTimeRef.current) / 1000);
      setState((s) => (s.phase !== 'playing' ? s : { ...s, elapsedSeconds: elapsed }));
    }, ELAPSED_TICK_MS);
  }, []);

  const currentElapsedSeconds = useCallback((): number => {
    if (!hasInteractedRef.current) return 0;
    const end = pausedAtRef.current ?? performance.now();
    return round2((end - startTimeRef.current) / 1000);
  }, []);

  // ── Finish a round ───────────────────────────────────────────────

  const finalizeRound = useCallback(
    (board: Board, won: boolean, lostIndex: number | null) => {
      if (resolvedRoundRef.current) return;
      resolvedRoundRef.current = true;
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }

      const difficulty = difficultyRef.current;
      if (!difficulty) return;
      const timeSeconds = currentElapsedSeconds();
      const revealedSafe = safeRevealedCount(board);
      const total = safeTotal(board);
      const score = scoreBoard(won, timeSeconds, revealedSafe, total, difficulty);

      play(won ? 'success' : 'fail');

      setState((s) => ({
        ...s,
        phase: 'round-complete',
        board,
        lostIndex,
        elapsedSeconds: timeSeconds,
        score,
        totalScore: round2(s.totalScore + score),
        roundScores: [...s.roundScores, score],
        result: {
          won,
          timeSeconds,
          safeRevealed: revealedSafe,
          safeTotal: total,
          score,
        },
      }));
    },
    [currentElapsedSeconds, play]
  );

  // ── Round lifecycle ───────────────────────────────────────────────

  const startRound = useCallback(
    (difficulty: Difficulty, round: number) => {
      clearTimers();
      const cfg = MINESWEEPER_DIFFICULTY[difficulty];
      const seededRound = challengeRounds?.[round - 1];

      let board: Board;
      let minesPlaced: boolean;
      if (seededRound) {
        board = createBoard(cfg.width, cfg.height, cfg.mineCount, seededRound.mines, seededRound.counts);
        board = { ...board, revealed: seededRound.preRevealed.slice() };
        minesPlaced = true;
      } else {
        // Solo: mines placed lazily on the first reveal, so it's guaranteed safe.
        board = createBoard(cfg.width, cfg.height, cfg.mineCount, [], []);
        minesPlaced = false;
      }

      boardRef.current = board;
      minesPlacedRef.current = minesPlaced;
      difficultyRef.current = difficulty;
      roundRef.current = round;
      resolvedRoundRef.current = false;
      hasInteractedRef.current = false;
      startTimeRef.current = 0;
      pausedAtRef.current = null;

      setState((s) => ({
        ...s,
        phase: 'playing',
        difficulty,
        round,
        board,
        minesPlaced,
        hasInteracted: false,
        lostIndex: null,
        elapsedSeconds: 0,
        score: 0,
        result: null,
      }));
    },
    [clearTimers, challengeRounds]
  );

  const selectDifficulty = useCallback(
    (difficulty: Difficulty) => {
      play('click');
      // New session: totals reset
      setState((s) => ({
        ...s,
        difficulty,
        round: 1,
        score: 0,
        totalScore: 0,
        roundScores: [],
        isNewBestSession: false,
      }));
      startRound(difficulty, 1);
    },
    [startRound, play]
  );

  const startChallenge = useCallback(() => {
    if (!challengeRounds) return;
    setState((s) => ({ ...s, score: 0, totalScore: 0, roundScores: [] }));
    startRound(challengeRounds[0].difficulty, 1);
  }, [startRound, challengeRounds]);

  const resetToMenu = useCallback(() => {
    clearTimers();
    play('click');
    setState((s) => ({
      ...INITIAL_STATE,
      mode: s.mode,
      flagMode: s.flagMode,
      phase: s.mode === 'challenge' ? 'challenge-intro' : 'selecting-difficulty',
      totalRounds: s.totalRounds,
    }));
  }, [clearTimers, play]);

  // ── Actions ───────────────────────────────────────────────────────

  const applyRevealResult = useCallback(
    (result: ReturnType<typeof revealCell> | ReturnType<typeof chordBoard>) => {
      boardRef.current = result.board;
      if (result.outcome === 'loss') {
        finalizeRound(result.board, false, result.triggeredIndex);
        return;
      }
      if (result.outcome === 'win') {
        finalizeRound(result.board, true, null);
        return;
      }
      setState((s) => (s.phase !== 'playing' ? s : { ...s, board: result.board }));
    },
    [finalizeRound]
  );

  /** Primary action: left-click, or a plain (non-long-press) tap. Flags
   *  when flag-mode is on; otherwise reveals a hidden cell, or chords an
   *  already-revealed number. */
  const primaryAction = useCallback(
    (index: number) => {
      if (stateRef.current.phase !== 'playing') return;
      const board = boardRef.current;
      if (!board) return;

      startClockIfNeeded();

      if (stateRef.current.flagMode) {
        if (board.revealed[index]) return;
        play('slide');
        const next = toggleFlagCell(board, index);
        boardRef.current = next;
        setState((s) => ({ ...s, board: next }));
        return;
      }

      if (board.flagged[index]) return; // flagged cells don't reveal on a plain tap

      if (board.revealed[index]) {
        // Chord a satisfied number.
        applyRevealResult(chordBoard(board, index));
        return;
      }

      // First solo click: place mines now, excluding this cell and its
      // neighbours, so the very first reveal is always safe.
      let workingBoard = board;
      if (!minesPlacedRef.current) {
        const difficulty = difficultyRef.current;
        if (!difficulty) return;
        const cfg = MINESWEEPER_DIFFICULTY[difficulty];
        const mines = placeMines(cfg.width, cfg.height, cfg.mineCount, Math.random, index);
        const counts = adjacentCounts(mines, cfg.width, cfg.height);
        workingBoard = { ...board, mines, counts };
        minesPlacedRef.current = true;
        setState((s) => ({ ...s, minesPlaced: true }));
      }

      play('tap');
      applyRevealResult(revealCell(workingBoard, index));
    },
    [applyRevealResult, play, startClockIfNeeded]
  );

  /** Secondary action: right-click (contextmenu) or a 450ms touch
   *  long-press. Always flags/unflags, regardless of flag-mode. */
  const secondaryAction = useCallback(
    (index: number) => {
      if (stateRef.current.phase !== 'playing') return;
      const board = boardRef.current;
      if (!board || board.revealed[index]) return;

      startClockIfNeeded();
      play('slide');
      const next = toggleFlagCell(board, index);
      boardRef.current = next;
      setState((s) => ({ ...s, board: next }));
    },
    [play, startClockIfNeeded]
  );

  const toggleFlagMode = useCallback(() => {
    play('click');
    setState((s) => ({ ...s, flagMode: !s.flagMode }));
  }, [play]);

  // ── Advance ───────────────────────────────────────────────────────

  const nextRound = useCallback(() => {
    if (transitioningRef.current) return;
    const { difficulty, round, phase, mode, totalRounds, totalScore } = stateRef.current;
    if (!difficulty || phase !== 'round-complete') return;
    transitioningRef.current = true;
    play('click');

    if (round >= totalRounds) {
      play('celebrate');
      if (mode === 'challenge') {
        setState((s) => ({ ...s, phase: 'challenge-complete' }));
      } else {
        const isNewBestSession = saveBestSession(GAME_ID, totalScore);
        setState((s) => ({ ...s, phase: 'session-complete', isNewBestSession }));
      }
    } else {
      const nextDifficulty = challengeRounds?.[round]?.difficulty ?? difficulty;
      startRound(nextDifficulty, round + 1);
    }

    transitionTimeoutRef.current = setTimeout(() => {
      transitionTimeoutRef.current = null;
      transitioningRef.current = false;
    }, 500);
  }, [startRound, play, challengeRounds]);

  const replay = useCallback(() => {
    const { difficulty } = stateRef.current;
    if (difficulty) selectDifficulty(difficulty);
  }, [selectDifficulty]);

  // A backgrounded tab must not burn round time the player never saw — push
  // the round's start time forward by exactly how long the tab was hidden,
  // so the elapsed clock skips that window instead of counting through it.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (
          stateRef.current.phase === 'playing' &&
          hasInteractedRef.current &&
          pausedAtRef.current === null
        ) {
          pausedAtRef.current = performance.now();
        }
      } else if (pausedAtRef.current !== null) {
        const hiddenMs = performance.now() - pausedAtRef.current;
        pausedAtRef.current = null;
        startTimeRef.current += hiddenMs;
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), [clearTimers]);

  return {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    primaryAction,
    secondaryAction,
    toggleFlagMode,
    nextRound,
    replay,
    resetToMenu,
  };
}
