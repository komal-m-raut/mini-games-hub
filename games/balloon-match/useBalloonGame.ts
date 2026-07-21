'use client';

import { useState, useRef, useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { Difficulty } from '@/types/game';
import { BALLOON_COLORS, DIFFICULTY_CONFIG } from '@/lib/constants';
import { calculateAccuracy, getRating } from '@/utils/accuracy';
import {
  NORMAL_ROUND_COUNT,
  calculateScore,
  getLocalBestSession,
  saveBestSession,
  saveHighScore,
} from '@/utils/scoring';
import { randomPick, randomInt, clamp } from '@/lib/utils';
import {
  CHALLENGE_ROUND_COUNT,
  ChallengeRound,
  getChallengeRounds,
} from '@/lib/challenge';
import { getPlayerId } from '@/lib/player';
import { BalloonGameState } from './types';

const GAME_ID = 'balloon-match';

const TICK_MS = 16; // ~60fps update interval

// useSyncExternalStore plumbing for the localStorage high score:
// server snapshot is 0, the real value arrives right after hydration.
const noopSubscribe = () => () => {};
const zeroSnapshot = () => 0;

const INITIAL_STATE: BalloonGameState = {
  phase: 'selecting-difficulty',
  mode: 'normal',
  difficulty: null,
  targetUnits: 0,
  targetColor: '#A855F7',
  currentUnits: 0,
  observeTimeLeft: 5,
  inflateTimeLeft: 0,
  round: 1,
  totalRounds: null,
  score: 0,
  totalScore: 0,
  roundScores: [],
  isNewHighScore: false,
  isNewBestSession: false,
  result: null,
  isHolding: false,
};

export interface UseBalloonGameOptions {
  /** When set, the game runs as a seeded 3-round challenge. */
  challengeCode?: string;
}

export function useBalloonGame({ challengeCode }: UseBalloonGameOptions = {}) {
  const isChallenge = Boolean(challengeCode);
  // Deterministic per code, so every player gets identical targets
  const challengeRounds = useMemo<ChallengeRound[] | null>(
    () => (challengeCode ? getChallengeRounds(challengeCode) : null),
    [challengeCode]
  );

  const [state, setState] = useState<BalloonGameState>(() => ({
    ...INITIAL_STATE,
    mode: isChallenge ? 'challenge' : 'normal',
    phase: isChallenge ? 'challenge-intro' : 'selecting-difficulty',
    totalRounds: isChallenge ? CHALLENGE_ROUND_COUNT : NORMAL_ROUND_COUNT,
  }));
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const observeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Mirrors latest state so callbacks can read it without stale closures.
  // Updated in an effect (not during render) per the react-hooks/refs rule;
  // effects run before any user event or interval tick can read it.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  // Best session total from localStorage, hydration-safe: server snapshot is
  // 0, the real value arrives right after hydration. Re-read after saves via
  // the render that the phase change triggers.
  const bestSession = useSyncExternalStore(noopSubscribe, getLocalBestSession, zeroSnapshot);

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

      // Challenge rounds are seeded so every player gets identical targets
      const seeded = challengeRounds?.[round - 1];
      const targetUnits = seeded?.targetUnits ?? randomInt(cfg.minUnits, cfg.maxUnits);
      const targetColor = seeded?.color ?? randomPick(BALLOON_COLORS);

      setState((s) => ({
        ...s,
        phase: 'observing',
        difficulty,
        targetUnits,
        targetColor,
        currentUnits: 0,
        observeTimeLeft: cfg.observeSeconds,
        inflateTimeLeft: cfg.inflateSeconds ?? 0,
        round,
        score: 0,
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
    [clearTimers, challengeRounds]
  );

  const selectDifficulty = useCallback(
    (difficulty: Difficulty) => {
      // New session: everything resets
      setState((s) => ({
        ...s,
        difficulty,
        round: 1,
        score: 0,
        totalScore: 0,
        roundScores: [],
        isNewHighScore: false,
        isNewBestSession: false,
      }));
      startObserving(difficulty, 1);
    },
    [startObserving]
  );

  const startChallenge = useCallback(() => {
    if (!challengeRounds) return;
    setState((s) => ({
      ...s,
      score: 0,
      totalScore: 0,
      roundScores: [],
      isNewHighScore: false,
    }));
    startObserving(challengeRounds[0].difficulty, 1);
  }, [startObserving, challengeRounds]);

  const resetToMenu = useCallback(() => {
    clearTimers();
    setState((s) => ({
      ...INITIAL_STATE,
      mode: s.mode,
      phase: s.mode === 'challenge' ? 'challenge-intro' : 'selecting-difficulty',
      totalRounds: s.totalRounds,
    }));
  }, [clearTimers]);

  // ---------- Round scoring ----------

  /** Locks in the current size and scores the round. Works whether the
   *  player released the balloon or the inflate timer ran out. */
  const lockIn = useCallback(() => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }

    setState((prev) => {
      if (prev.phase !== 'inflating') return prev;

      const cfg = DIFFICULTY_CONFIG[prev.difficulty!];
      const accuracy = calculateAccuracy(prev.targetUnits, prev.currentUnits);
      const rating = getRating(accuracy, cfg.tolerancePercent);
      const roundScore = calculateScore(accuracy);
      const roundScores = [...prev.roundScores, roundScore];
      const isNewHighScore = prev.mode === 'normal' && saveHighScore(roundScore);

      return {
        ...prev,
        phase: 'results',
        isHolding: false,
        score: roundScore,
        totalScore: prev.totalScore + roundScore,
        roundScores,
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

  // Each completed round counts as one play in the site stats (fire-and-forget).
  useEffect(() => {
    if (state.phase !== 'results') return;
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'play', gameId: GAME_ID, playerId: getPlayerId() }),
      keepalive: true,
    }).catch(() => {});
  }, [state.phase]);

  // Inflate countdown — same time pressure in Normal and Challenge mode.
  // When it hits zero the current size is locked in automatically.
  // Difficulties with inflateSeconds: null (Easy) have no time limit.
  useEffect(() => {
    if (state.phase !== 'inflating') return;
    if (DIFFICULTY_CONFIG[state.difficulty!].inflateSeconds === null) return;

    const id = setInterval(() => {
      const s = stateRef.current;
      if (s.phase !== 'inflating') return;
      if (s.inflateTimeLeft <= 1) {
        clearInterval(id);
        setState((prev) => ({ ...prev, inflateTimeLeft: 0 }));
        lockIn();
      } else {
        setState((prev) => ({ ...prev, inflateTimeLeft: prev.inflateTimeLeft - 1 }));
      }
    }, 1000);

    return () => clearInterval(id);
  }, [state.phase, state.difficulty, lockIn]);

  // ---------- Inflation hold mechanics ----------

  const startInflating = useCallback(() => {
    // usePressAndHold's `disabled` flag already gates this to the inflating
    // phase, and the functional setState re-checks the live state — no
    // stateRef read here, so a not-yet-flushed mirror can't reject the press.
    if (holdIntervalRef.current) return;

    setState((s) => {
      if (s.phase !== 'inflating' || s.isHolding) return s;
      return { ...s, isHolding: true };
    });

    // Growth is wall-clock based (not per-tick) so throttled or dropped
    // intervals on slow devices don't slow the balloon down.
    let lastTick = performance.now();
    holdIntervalRef.current = setInterval(() => {
      const now = performance.now();
      const elapsedSec = (now - lastTick) / 1000;
      lastTick = now;
      setState((prev) => {
        if (!prev.isHolding || prev.phase !== 'inflating') return prev;
        const cfg = DIFFICULTY_CONFIG[prev.difficulty!];
        const next = clamp(prev.currentUnits + cfg.inflationSpeed * elapsedSec, 0, 100);
        return { ...prev, currentUnits: next };
      });
    }, TICK_MS);
  }, []);

  const stopInflating = useCallback(() => {
    // usePressAndHold only fires onEnd after a successful onStart, and
    // lockIn's setState no-ops unless the round is still inflating.
    lockIn();
  }, [lockIn]);

  // Guards against double-calls during animation transitions
  const transitioningRef = useRef(false);

  /** Results screen action: next round, or finish the session/series. */
  const playAgain = useCallback(() => {
    if (transitioningRef.current) return;
    const { difficulty, round, phase, mode, totalRounds, totalScore } = stateRef.current;
    if (!difficulty || phase !== 'results') return;
    transitioningRef.current = true;

    if (totalRounds !== null && round >= totalRounds) {
      if (mode === 'challenge') {
        setState((s) => ({ ...s, phase: 'challenge-complete' }));
      } else {
        // Normal session finished: persist the best total, then show results
        const isNewBestSession = saveBestSession(totalScore);
        setState((s) => ({ ...s, phase: 'session-complete', isNewBestSession }));
      }
    } else {
      const nextRound = round + 1;
      const nextDifficulty =
        challengeRounds?.[nextRound - 1]?.difficulty ?? difficulty;
      startObserving(nextDifficulty, nextRound);
    }

    // Allow the next call after the transition has settled
    setTimeout(() => { transitioningRef.current = false; }, 500);
  }, [startObserving, challengeRounds]);

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), [clearTimers]);

  return {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    startInflating,
    stopInflating,
    playAgain,
    resetToMenu,
  };
}
