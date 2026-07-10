'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Difficulty } from '@/types/game';
import { BALLOON_COLORS, DIFFICULTY_CONFIG } from '@/lib/constants';
import { calculateAccuracy, getRating } from '@/utils/accuracy';
import { calculateScore, getLocalHighScore, saveHighScore } from '@/utils/scoring';
import { randomPick, randomInt, clamp } from '@/lib/utils';
import { BalloonGameState } from './types';

const TICK_MS = 16; // ~60fps update interval

const INITIAL_STATE: BalloonGameState = {
  phase: 'selecting-difficulty',
  difficulty: null,
  targetUnits: 0,
  targetColor: '#A855F7',
  currentUnits: 0,
  observeTimeLeft: 5,
  round: 1,
  score: 0,
  highScore: 0,
  isNewHighScore: false,
  result: null,
  isHolding: false,
};

export function useBalloonGame() {
  const [state, setState] = useState<BalloonGameState>(INITIAL_STATE);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const observeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Mirrors latest state so callbacks can read it without stale closures
  const stateRef = useRef(state);
  stateRef.current = state;

  // Hydrate high score from localStorage after mount
  useEffect(() => {
    setState((s) => ({ ...s, highScore: getLocalHighScore() }));
  }, []);

  const clearTimers = useCallback(() => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    if (observeTimerRef.current) {
      clearInterval(observeTimerRef.current);
      observeTimerRef.current = null;
    }
  }, []);

  // ---------- Phase transitions ----------

  const startObserving = useCallback(
    (difficulty: Difficulty, round: number) => {
      clearTimers();
      const cfg = DIFFICULTY_CONFIG[difficulty];
      const targetUnits = randomInt(cfg.minUnits, cfg.maxUnits);
      const targetColor = randomPick(BALLOON_COLORS);

      setState((s) => ({
        ...s,
        phase: 'observing',
        difficulty,
        targetUnits,
        targetColor,
        currentUnits: 0,
        observeTimeLeft: cfg.observeSeconds,
        round,
        result: null,
        isHolding: false,
      }));

      // Countdown timer
      observeTimerRef.current = setInterval(() => {
        setState((prev) => {
          const next = prev.observeTimeLeft - 1;
          if (next <= 0) {
            clearInterval(observeTimerRef.current!);
            observeTimerRef.current = null;
            return { ...prev, observeTimeLeft: 0, phase: 'inflating' };
          }
          return { ...prev, observeTimeLeft: next };
        });
      }, 1000);
    },
    [clearTimers]
  );

  const selectDifficulty = useCallback(
    (difficulty: Difficulty) => {
      setState((s) => ({ ...s, difficulty, round: 1, score: 0, isNewHighScore: false }));
      startObserving(difficulty, 1);
    },
    [startObserving]
  );

  const resetToMenu = useCallback(() => {
    clearTimers();
    setState((s) => ({ ...INITIAL_STATE, highScore: s.highScore }));
  }, [clearTimers]);

  // ---------- Inflation hold mechanics ----------

  const startInflating = useCallback(() => {
    // Bail if already holding or not in the right phase
    if (stateRef.current.phase !== 'inflating' || stateRef.current.isHolding) return;
    if (holdIntervalRef.current) return;

    setState((s) => {
      if (s.phase !== 'inflating' || s.isHolding) return s;
      return { ...s, isHolding: true };
    });

    holdIntervalRef.current = setInterval(() => {
      setState((prev) => {
        if (!prev.isHolding || prev.phase !== 'inflating') return prev;
        const cfg = DIFFICULTY_CONFIG[prev.difficulty!];
        // inflationSpeed is units/second; TICK_MS/1000 is the fraction of a second
        const delta = cfg.inflationSpeed * (TICK_MS / 1000);
        const next = clamp(prev.currentUnits + delta, 0, 100);
        return { ...prev, currentUnits: next };
      });
    }, TICK_MS);
  }, []);

  const stopInflating = useCallback(() => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }

    setState((prev) => {
      if (prev.phase !== 'inflating' || !prev.isHolding) return prev;

      const cfg = DIFFICULTY_CONFIG[prev.difficulty!];
      const accuracy = calculateAccuracy(prev.targetUnits, prev.currentUnits);
      const rating = getRating(accuracy, cfg.tolerancePercent);
      const roundScore = calculateScore(rating, accuracy, prev.difficulty!);
      const newScore = prev.score + roundScore;
      const isNewHighScore = saveHighScore(newScore);

      return {
        ...prev,
        phase: 'results',
        isHolding: false,
        score: newScore,
        highScore: isNewHighScore ? newScore : Math.max(prev.highScore, newScore),
        isNewHighScore,
        result: {
          accuracy,
          targetSize: prev.targetUnits,
          actualSize: prev.currentUnits,
          sizeDiffPercent: Math.abs(((prev.currentUnits - prev.targetUnits) / prev.targetUnits) * 100),
          rating,
          score: roundScore,
        },
      };
    });
  }, []);

  // Guards against double-calls during animation transitions
  const transitioningRef = useRef(false);

  const playAgain = useCallback(() => {
    if (transitioningRef.current) return;
    const { difficulty, round, phase } = stateRef.current;
    if (!difficulty || phase !== 'results') return;
    transitioningRef.current = true;
    startObserving(difficulty, round + 1);
    // Allow the next call after the observe phase has loaded
    setTimeout(() => { transitioningRef.current = false; }, 500);
  }, [startObserving]);

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), [clearTimers]);

  return {
    state,
    selectDifficulty,
    startInflating,
    stopInflating,
    playAgain,
    resetToMenu,
  };
}
