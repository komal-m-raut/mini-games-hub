'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Difficulty } from '@/types/game';
import { useSound } from '@/hooks/useSound';
import { usePlayBeacon } from '@/hooks/usePlayBeacon';
import { CHALLENGE_ROUND_COUNT } from '@/lib/challenge';
import { getLocalBestSession, round2, saveBestSession } from '@/utils/scoring';
import { PairChaseChallengeRound, getPairChaseChallengeRounds } from './challenge';
import { MISMATCH_FLIP_BACK_MS, SOLO_ROUND_COUNT, makeLayout, scoreRound } from './constants';
import { PairChaseGameState } from './types';

const GAME_ID = 'pair-chase';
/** How often the elapsed-time display ticks while a round is in progress. */
const ELAPSED_TICK_MS = 200;

const INITIAL_STATE: PairChaseGameState = {
  phase: 'selecting-difficulty',
  mode: 'normal',
  difficulty: null,
  board: [],
  matched: [],
  pending: [],
  mismatch: false,
  flips: 0,
  elapsedSeconds: 0,
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

export interface UsePairChaseGameOptions {
  /** When set, the game runs as a seeded 3-round challenge. */
  challengeCode?: string;
}

export function usePairChaseGame({ challengeCode }: UsePairChaseGameOptions = {}) {
  usePlayBeacon(GAME_ID);
  const isChallenge = Boolean(challengeCode);
  // Deterministic per code, so every player faces the identical 3 boards
  const challengeRounds = useMemo<PairChaseChallengeRound[] | null>(
    () => (challengeCode ? getPairChaseChallengeRounds(challengeCode) : null),
    [challengeCode]
  );

  const [state, setState] = useState<PairChaseGameState>(() => ({
    ...INITIAL_STATE,
    mode: isChallenge ? 'challenge' : 'normal',
    phase: isChallenge ? 'challenge-intro' : 'selecting-difficulty',
    totalRounds: isChallenge ? CHALLENGE_ROUND_COUNT : SOLO_ROUND_COUNT,
  }));
  const { play } = useSound();

  const bestSession = useSyncExternalStore(noopSubscribe, readBest, zeroSnapshot);

  // Refs mirroring round-scoped values the tap handler and timers need
  // synchronously, without waiting on a render.
  const boardRef = useRef<string[]>([]);
  const matchedRef = useRef<Set<number>>(new Set());
  const pendingRef = useRef<number[]>([]);
  const flipsRef = useRef(0);
  const difficultyRef = useRef<Difficulty | null>(null);
  const roundRef = useRef(1);
  // Blocks a third flip while a mismatched pair is holding face-up.
  const resolvingRef = useRef(false);
  // Guards a round against finalizing twice.
  const resolvedRoundRef = useRef(false);

  // Elapsed clock: `elapsedSeconds` = (now - startTimeRef) while not paused.
  // A hidden tab pushes startTimeRef forward by exactly how long it was
  // hidden, so the clock skips that time rather than counting through it.
  const startTimeRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mismatchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (mismatchTimeoutRef.current) {
      clearTimeout(mismatchTimeoutRef.current);
      mismatchTimeoutRef.current = null;
    }
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  }, []);

  // ── Finish a round ───────────────────────────────────────────────

  const finalizeRound = useCallback(() => {
    if (resolvedRoundRef.current) return;
    resolvedRoundRef.current = true;
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }

    const difficulty = difficultyRef.current;
    if (!difficulty) return;
    const flips = flipsRef.current;
    const elapsedSeconds = round2((performance.now() - startTimeRef.current) / 1000);
    const score = scoreRound(flips, elapsedSeconds, difficulty);

    setState((s) => ({
      ...s,
      phase: 'round-complete',
      elapsedSeconds,
      score,
      totalScore: round2(s.totalScore + score),
      roundScores: [...s.roundScores, score],
      result: { flips, elapsedSeconds, score },
    }));
  }, []);

  // ── Round lifecycle ───────────────────────────────────────────────

  const startRound = useCallback(
    (difficulty: Difficulty, round: number) => {
      clearTimers();
      // Challenge boards are seeded so every player sees the same layout
      const seeded = challengeRounds?.[round - 1]?.board;
      const board = seeded ?? makeLayout(difficulty, Math.random);

      boardRef.current = board;
      matchedRef.current = new Set();
      pendingRef.current = [];
      flipsRef.current = 0;
      difficultyRef.current = difficulty;
      roundRef.current = round;
      resolvingRef.current = false;
      resolvedRoundRef.current = false;
      pausedAtRef.current = null;
      startTimeRef.current = performance.now();

      setState((s) => ({
        ...s,
        phase: 'playing',
        difficulty,
        round,
        board,
        matched: [],
        pending: [],
        mismatch: false,
        flips: 0,
        elapsedSeconds: 0,
        score: 0,
        result: null,
      }));

      elapsedTimerRef.current = setInterval(() => {
        if (pausedAtRef.current !== null) return;
        const elapsed = round2((performance.now() - startTimeRef.current) / 1000);
        setState((s) => (s.phase !== 'playing' ? s : { ...s, elapsedSeconds: elapsed }));
      }, ELAPSED_TICK_MS);
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
      phase: s.mode === 'challenge' ? 'challenge-intro' : 'selecting-difficulty',
      totalRounds: s.totalRounds,
    }));
  }, [clearTimers, play]);

  // ── Flipping ──────────────────────────────────────────────────────

  const flipCard = useCallback(
    (index: number) => {
      if (stateRef.current.phase !== 'playing') return;
      if (resolvingRef.current) return; // a mismatch is already holding
      if (matchedRef.current.has(index)) return; // idempotent
      if (pendingRef.current.includes(index)) return; // idempotent
      if (pendingRef.current.length >= 2) return; // defensive

      play('slide');
      flipsRef.current += 1;
      pendingRef.current = [...pendingRef.current, index];
      setState((s) => ({ ...s, flips: flipsRef.current, pending: [...pendingRef.current] }));

      if (pendingRef.current.length < 2) return;

      const [a, b] = pendingRef.current;
      const board = boardRef.current;

      if (board[a] === board[b]) {
        matchedRef.current.add(a);
        matchedRef.current.add(b);
        pendingRef.current = [];
        play('success');
        const matchedArr = Array.from(matchedRef.current);
        setState((s) => ({ ...s, matched: matchedArr, pending: [] }));

        if (matchedArr.length === board.length) {
          finalizeRound();
        }
      } else {
        resolvingRef.current = true;
        play('error');
        setState((s) => ({ ...s, mismatch: true }));
        mismatchTimeoutRef.current = setTimeout(() => {
          pendingRef.current = [];
          resolvingRef.current = false;
          setState((s) => (s.phase !== 'playing' ? s : { ...s, pending: [], mismatch: false }));
        }, MISMATCH_FLIP_BACK_MS);
      }
    },
    [play, finalizeRound]
  );

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

  // A backgrounded tab must not burn round time the player never saw —
  // push the round's start time forward by exactly how long the tab was
  // hidden, so the elapsed clock skips that window instead of counting
  // through it. Only the clock pauses; flips/matches are untouched.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (stateRef.current.phase === 'playing' && pausedAtRef.current === null) {
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
    flipCard,
    nextRound,
    replay,
    resetToMenu,
  };
}
