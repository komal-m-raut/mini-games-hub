'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Difficulty } from '@/types/game';
import { randomInt } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import {
  NORMAL_ROUND_COUNT,
  calculateScore,
  getLocalBestSession,
  saveBestSession,
} from '@/utils/scoring';
import {
  MAX_TARGET_FILL,
  MIN_TARGET_FILL,
  POUR_DIFFICULTY,
  getPourAccuracy,
  getPourRating,
} from './constants';
import { PourGameState } from './types';

const GAME_ID = 'perfect-pour';
const TICK_MS = 16; // ~60fps pour updates
/** How long the automatic target fill animation runs before the countdown. */
const FILL_ANIMATION_MS = 900;

const INITIAL_STATE: PourGameState = {
  phase: 'selecting-difficulty',
  difficulty: null,
  targetFill: 0,
  currentFill: 0,
  observeTimeLeft: 3,
  round: 1,
  totalRounds: NORMAL_ROUND_COUNT,
  score: 0,
  totalScore: 0,
  roundScores: [],
  result: null,
  isPouring: false,
  isNewBestSession: false,
};

// localStorage best session, hydration-safe (server snapshot is 0)
const noopSubscribe = () => () => {};
const zeroSnapshot = () => 0;
const readBest = () => getLocalBestSession(GAME_ID);

export function usePourGame() {
  const [state, setState] = useState<PourGameState>(INITIAL_STATE);
  const { play, loop, stop } = useSound();

  const pourIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const observeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fillTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitioningRef = useRef(false);

  // Mirror of the latest state for callbacks; updated in an effect (never
  // during render) so it can't trip the refs-during-render rule.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const bestSession = useSyncExternalStore(noopSubscribe, readBest, zeroSnapshot);

  const clearTimers = useCallback(() => {
    if (pourIntervalRef.current) {
      clearInterval(pourIntervalRef.current);
      pourIntervalRef.current = null;
    }
    if (observeTimerRef.current) {
      clearInterval(observeTimerRef.current);
      observeTimerRef.current = null;
    }
    if (fillTimeoutRef.current) {
      clearTimeout(fillTimeoutRef.current);
      fillTimeoutRef.current = null;
    }
  }, []);

  // ── Round lifecycle ───────────────────────────────────────────────

  /** Fills the glass to a fresh target, then runs the observe countdown. */
  const startRound = useCallback(
    (difficulty: Difficulty, round: number) => {
      clearTimers();
      const cfg = POUR_DIFFICULTY[difficulty];
      const targetFill = randomInt(MIN_TARGET_FILL, MAX_TARGET_FILL);

      setState((s) => ({
        ...s,
        phase: 'filling',
        difficulty,
        targetFill,
        currentFill: targetFill,
        observeTimeLeft: cfg.observeSeconds,
        round,
        score: 0,
        result: null,
        isPouring: false,
      }));

      // Let the liquid animate up before the countdown starts
      fillTimeoutRef.current = setTimeout(() => {
        setState((s) => (s.phase === 'filling' ? { ...s, phase: 'observing' } : s));
        play('tick');

        observeTimerRef.current = setInterval(() => {
          setState((prev) => {
            if (prev.phase !== 'observing') return prev;
            const next = prev.observeTimeLeft - 1;
            if (next <= 0) {
              clearInterval(observeTimerRef.current!);
              observeTimerRef.current = null;
              // Glass empties and the player takes over
              return { ...prev, observeTimeLeft: 0, phase: 'pouring', currentFill: 0 };
            }
            return { ...prev, observeTimeLeft: next };
          });
          play('tick');
        }, 1000);
      }, FILL_ANIMATION_MS);
    },
    [clearTimers, play]
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

  const resetToMenu = useCallback(() => {
    clearTimers();
    stop('water');
    play('click');
    setState({ ...INITIAL_STATE });
  }, [clearTimers, stop, play]);

  // ── Pour mechanics ────────────────────────────────────────────────

  /** Locks in the poured level and scores the round. */
  const lockIn = useCallback(() => {
    if (pourIntervalRef.current) {
      clearInterval(pourIntervalRef.current);
      pourIntervalRef.current = null;
    }
    stop('water');

    setState((prev) => {
      if (prev.phase !== 'pouring') return prev;

      const cfg = POUR_DIFFICULTY[prev.difficulty!];
      const diff = Math.abs(prev.targetFill - prev.currentFill);
      const accuracy = getPourAccuracy(prev.targetFill, prev.currentFill);
      const rating = getPourRating(diff, cfg.tolerance);
      const score = calculateScore(accuracy);

      return {
        ...prev,
        phase: 'results',
        isPouring: false,
        score,
        totalScore: prev.totalScore + score,
        roundScores: [...prev.roundScores, score],
        result: {
          targetFill: prev.targetFill,
          actualFill: Math.round(prev.currentFill * 10) / 10,
          diff: Math.round(diff * 10) / 10,
          accuracy,
          rating,
          score,
        },
      };
    });
  }, [stop]);

  // Result feedback: splash on release, then a tone matching the rating
  useEffect(() => {
    if (state.phase !== 'results' || !state.result) return;
    play('splash');
    const rating = state.result.rating;
    const id = setTimeout(() => {
      if (rating === 'Perfect') play('celebrate');
      else if (rating === 'Great' || rating === 'Good') play('success');
      else play('fail');
    }, 260);
    return () => clearTimeout(id);
  }, [state.phase, state.result, play]);

  const startPouring = useCallback(() => {
    // The hold handler's `disabled` flag gates the phase; the functional
    // setState below re-checks against live state.
    if (pourIntervalRef.current) return;

    setState((s) => {
      if (s.phase !== 'pouring' || s.isPouring) return s;
      return { ...s, isPouring: true };
    });
    loop('water');

    // Wall-clock based so a throttled tab doesn't slow the pour rate
    let last = performance.now();
    pourIntervalRef.current = setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      setState((prev) => {
        if (!prev.isPouring || prev.phase !== 'pouring') return prev;
        const cfg = POUR_DIFFICULTY[prev.difficulty!];
        const next = Math.min(100, prev.currentFill + cfg.pourSpeed * dt);
        return { ...prev, currentFill: next };
      });
    }, TICK_MS);
  }, [loop]);

  const stopPouring = useCallback(() => {
    lockIn();
  }, [lockIn]);

  // ── Advance ───────────────────────────────────────────────────────

  const nextRound = useCallback(() => {
    if (transitioningRef.current) return;
    const { difficulty, round, phase, totalRounds, totalScore } = stateRef.current;
    if (!difficulty || phase !== 'results') return;
    transitioningRef.current = true;
    play('click');

    if (round >= totalRounds) {
      const isNewBestSession = saveBestSession(GAME_ID, totalScore);
      setState((s) => ({ ...s, phase: 'session-complete', isNewBestSession }));
    } else {
      startRound(difficulty, round + 1);
    }

    setTimeout(() => {
      transitioningRef.current = false;
    }, 500);
  }, [startRound, play]);

  const replay = useCallback(() => {
    const { difficulty } = stateRef.current;
    if (difficulty) selectDifficulty(difficulty);
  }, [selectDifficulty]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      clearTimers();
      stop('water');
    },
    [clearTimers, stop]
  );

  return {
    state,
    bestSession,
    selectDifficulty,
    startPouring,
    stopPouring,
    nextRound,
    replay,
    resetToMenu,
  };
}
