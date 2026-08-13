'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { Difficulty } from '@/types/game';
import { useSound } from '@/hooks/useSound';
import { usePlayBeacon } from '@/hooks/usePlayBeacon';
import { CHALLENGE_ROUND_COUNT } from '@/lib/challenge';
import {
  NORMAL_ROUND_COUNT,
  calculateScore,
  getLocalBestSession,
  round2,
  saveBestSession,
} from '@/utils/scoring';
import { PathChallengeRound, getPathChallengeRounds } from './challenge';
import { PATH_DIFFICULTY, PATH_FADE_MS, getPathRating } from './constants';
import { Cell, comparePaths, extendTrace, generatePath } from './pathGen';
import { PathGameState } from './types';

const GAME_ID = 'memory-path';
/** Stopwatch resolution while tracing. */
const TRACE_TICK_MS = 100;
/** Beat after the last cell lands, so the player sees it before scoring. */
const FINALIZE_DELAY_MS = 380;

const INITIAL_STATE: PathGameState = {
  phase: 'selecting-difficulty',
  mode: 'normal',
  difficulty: null,
  path: [],
  revealCount: 0,
  traced: [],
  traceMs: 0,
  locked: false,
  round: 1,
  totalRounds: NORMAL_ROUND_COUNT,
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

export interface UseMemoryPathGameOptions {
  /** When set, the game runs as a seeded 3-round challenge. */
  challengeCode?: string;
}

export function useMemoryPathGame({ challengeCode }: UseMemoryPathGameOptions = {}) {
  usePlayBeacon(GAME_ID);
  const isChallenge = Boolean(challengeCode);
  // Deterministic per code, so every player traces identical paths
  const challengeRounds = useMemo<PathChallengeRound[] | null>(
    () => (challengeCode ? getPathChallengeRounds(challengeCode) : null),
    [challengeCode]
  );

  const [state, setState] = useState<PathGameState>(() => ({
    ...INITIAL_STATE,
    mode: isChallenge ? 'challenge' : 'normal',
    phase: isChallenge ? 'challenge-intro' : 'selecting-difficulty',
    totalRounds: isChallenge ? CHALLENGE_ROUND_COUNT : NORMAL_ROUND_COUNT,
  }));
  const { play, loop, stop } = useSound();

  const revealTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const traceTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitioningRef = useRef(false);

  // The trace is mirrored in a ref because pointermove fires faster than React
  // re-renders: every move must decide against what was *just* traced, not
  // against the last committed render.
  const pathRef = useRef<Cell[]>([]);
  const tracedRef = useRef<Cell[]>([]);
  const lockedRef = useRef(false);
  const traceStartRef = useRef(0);

  // Mirror of the latest state for callbacks; updated in an effect (never
  // during render) so it can't trip the refs-during-render rule.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const bestSession = useSyncExternalStore(noopSubscribe, readBest, zeroSnapshot);

  const clearTimers = useCallback(() => {
    if (revealTimerRef.current) {
      clearInterval(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    if (traceTickRef.current) {
      clearInterval(traceTickRef.current);
      traceTickRef.current = null;
    }
    if (phaseTimeoutRef.current) {
      clearTimeout(phaseTimeoutRef.current);
      phaseTimeoutRef.current = null;
    }
    if (finalizeTimeoutRef.current) {
      clearTimeout(finalizeTimeoutRef.current);
      finalizeTimeoutRef.current = null;
    }
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  }, []);

  // ── Round lifecycle ───────────────────────────────────────────────

  /** Reveal → memorize → fade → trace. Each stage hands off to the next. */
  const startRound = useCallback(
    (difficulty: Difficulty, round: number) => {
      clearTimers();
      const cfg = PATH_DIFFICULTY[difficulty];
      // Challenge rounds are seeded so every player traces the same path
      const path = challengeRounds?.[round - 1]?.path ?? generatePath(cfg.size, cfg.pathLength);

      pathRef.current = path;
      tracedRef.current = [];
      lockedRef.current = false;

      setState((s) => ({
        ...s,
        phase: 'revealing',
        difficulty,
        path,
        // First cell is already lit; the interval walks the rest
        revealCount: 1,
        traced: [],
        traceMs: 0,
        locked: false,
        round,
        score: 0,
        result: null,
      }));
      play('glow');

      let step = 1;
      revealTimerRef.current = setInterval(() => {
        step += 1;
        setState((s) => (s.phase === 'revealing' ? { ...s, revealCount: step } : s));
        play('whoosh');

        if (step < path.length) return;

        clearInterval(revealTimerRef.current!);
        revealTimerRef.current = null;
        setState((s) => (s.phase === 'revealing' ? { ...s, phase: 'memorize' } : s));

        // Hold the finished path, then dissolve it and open tracing
        phaseTimeoutRef.current = setTimeout(() => {
          setState((s) => (s.phase === 'memorize' ? { ...s, phase: 'fading' } : s));

          phaseTimeoutRef.current = setTimeout(() => {
            traceStartRef.current = performance.now();
            setState((s) => (s.phase === 'fading' ? { ...s, phase: 'tracing' } : s));

            traceTickRef.current = setInterval(() => {
              setState((s) =>
                s.phase === 'tracing'
                  ? { ...s, traceMs: performance.now() - traceStartRef.current }
                  : s
              );
            }, TRACE_TICK_MS);
          }, PATH_FADE_MS);
        }, cfg.memorizeMs);
      }, cfg.revealMs);
    },
    [clearTimers, play, challengeRounds]
  );

  const startChallenge = useCallback(() => {
    if (!challengeRounds) return;
    loop('ambient');
    setState((s) => ({ ...s, score: 0, totalScore: 0, roundScores: [] }));
    startRound(challengeRounds[0].difficulty, 1);
  }, [startRound, challengeRounds, loop]);

  const selectDifficulty = useCallback(
    (difficulty: Difficulty) => {
      play('click');
      loop('ambient');
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
    [startRound, play, loop]
  );

  const resetToMenu = useCallback(() => {
    clearTimers();
    stop('ambient');
    play('click');
    pathRef.current = [];
    tracedRef.current = [];
    lockedRef.current = false;
    setState((s) => ({
      ...INITIAL_STATE,
      mode: s.mode,
      phase: s.mode === 'challenge' ? 'challenge-intro' : 'selecting-difficulty',
      totalRounds: s.totalRounds,
    }));
  }, [clearTimers, stop, play]);

  // ── Tracing ───────────────────────────────────────────────────────

  /** Scores whatever has been traced and ends the round. */
  const finalizeTrace = useCallback(() => {
    if (stateRef.current.phase !== 'tracing') return;
    lockedRef.current = true;
    clearTimers();

    const traced = [...tracedRef.current];
    const { correct, mistakes, accuracy, marks } = comparePaths(pathRef.current, traced);
    const seconds = Math.round(((performance.now() - traceStartRef.current) / 1000) * 10) / 10;
    const score = calculateScore(accuracy);
    const rating = getPathRating(score, mistakes);

    setState((s) => ({
      ...s,
      phase: 'results',
      traced,
      score,
      totalScore: round2(s.totalScore + score),
      roundScores: [...s.roundScores, score],
      result: {
        accuracy,
        correct,
        mistakes,
        seconds,
        rating,
        score,
        marks,
        pathLength: pathRef.current.length,
      },
    }));
  }, [clearTimers]);

  /**
   * Extends the trace toward `cell` — the shared step used by both pointer
   * dragging and keyboard laying, so either input scores through the exact
   * same `extendTrace` core (see pathGen.ts) rather than a parallel path.
   */
  const traceCell = useCallback(
    (cell: Cell) => {
      if (lockedRef.current || stateRef.current.phase !== 'tracing') return;

      const path = pathRef.current;
      const result = extendTrace(tracedRef.current, cell, path.length);

      if (result.type === 'ignored') return;
      if (result.type === 'illegal') {
        play('error');
        return;
      }

      tracedRef.current = result.traced;
      play('trace');

      if (result.type === 'backtrack') {
        setState((s) => ({ ...s, traced: [...tracedRef.current] }));
        return;
      }

      // Full-length trace locks immediately (state, not just the ref) so
      // controls that read `locked` disable right away — scoring itself
      // still lands ~380ms later, after a beat on the last cell.
      const isComplete = tracedRef.current.length >= path.length;
      if (isComplete) lockedRef.current = true;
      setState((s) => ({ ...s, traced: [...tracedRef.current], locked: isComplete || s.locked }));

      if (isComplete) {
        finalizeTimeoutRef.current = setTimeout(finalizeTrace, FINALIZE_DELAY_MS);
      }
    },
    [play, finalizeTrace]
  );

  const clearTrace = useCallback(() => {
    if (lockedRef.current || stateRef.current.phase !== 'tracing') return;
    play('click');
    tracedRef.current = [];
    setState((s) => ({ ...s, traced: [] }));
  }, [play]);

  // Result feedback: a tone matching how the round went
  useEffect(() => {
    if (state.phase !== 'results' || !state.result) return;
    const { rating } = state.result;
    const id = setTimeout(() => {
      if (rating === 'Perfect') play('celebrate');
      else if (rating === 'Great' || rating === 'Good') play('success');
      else play('fail');
    }, 180);
    return () => clearTimeout(id);
  }, [state.phase, state.result, play]);

  // ── Advance ───────────────────────────────────────────────────────

  const nextRound = useCallback(() => {
    if (transitioningRef.current) return;
    const { difficulty, round, phase, mode, totalRounds, totalScore } = stateRef.current;
    if (!difficulty || phase !== 'results') return;
    transitioningRef.current = true;
    play('click');

    if (round >= totalRounds) {
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

  // Cleanup on unmount
  useEffect(
    () => () => {
      clearTimers();
      stop('ambient');
    },
    [clearTimers, stop]
  );

  return {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    traceCell,
    clearTrace,
    submitTrace: finalizeTrace,
    nextRound,
    replay,
    resetToMenu,
  };
}
