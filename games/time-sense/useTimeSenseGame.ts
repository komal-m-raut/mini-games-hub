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
import { calculateAccuracy, getRating } from '@/utils/accuracy';
import { CHALLENGE_ROUND_COUNT } from '@/lib/challenge';
import {
  NORMAL_ROUND_COUNT,
  calculateScore,
  getLocalBestSession,
  round2,
  saveBestSession,
} from '@/utils/scoring';
import { TimeSenseChallengeRound, getTimeSenseChallengeRounds } from './challenge';
import { TIME_SENSE_DIFFICULTY, makeDuration } from './constants';
import { TimeSenseGameState } from './types';

const GAME_ID = 'time-sense';
const TICK_MS = 16; // ~60fps cosmetic fill/glow updates
/** Pause after the SHOW bar completes, before RECREATE begins — gives the
 *  'confirm' chime room to land before the bar resets under the player. */
const SHOW_COMPLETE_PAUSE_MS = 500;

const INITIAL_STATE: TimeSenseGameState = {
  phase: 'selecting-difficulty',
  mode: 'normal',
  difficulty: null,
  targetMs: 0,
  showElapsedMs: 0,
  holdElapsedMs: 0,
  round: 1,
  totalRounds: NORMAL_ROUND_COUNT,
  score: 0,
  totalScore: 0,
  roundScores: [],
  result: null,
  isHolding: false,
  isNewBestSession: false,
};

// localStorage best session, hydration-safe (server snapshot is 0)
const noopSubscribe = () => () => {};
const zeroSnapshot = () => 0;
const readBest = () => getLocalBestSession(GAME_ID);

export interface UseTimeSenseGameOptions {
  /** When set, the game runs as a seeded 3-round challenge. */
  challengeCode?: string;
}

export function useTimeSenseGame({ challengeCode }: UseTimeSenseGameOptions = {}) {
  usePlayBeacon(GAME_ID);
  const isChallenge = Boolean(challengeCode);
  // Deterministic per code, so every player faces identical durations
  const challengeRounds = useMemo<TimeSenseChallengeRound[] | null>(
    () => (challengeCode ? getTimeSenseChallengeRounds(challengeCode) : null),
    [challengeCode]
  );

  const [state, setState] = useState<TimeSenseGameState>(() => ({
    ...INITIAL_STATE,
    mode: isChallenge ? 'challenge' : 'normal',
    phase: isChallenge ? 'challenge-intro' : 'selecting-difficulty',
    totalRounds: isChallenge ? CHALLENGE_ROUND_COUNT : NORMAL_ROUND_COUNT,
  }));
  const { play } = useSound();

  const showIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // The authoritative hold clock — read only as a single performance.now()
  // delta at release, never accumulated tick-by-tick (that's what the
  // interval above is for, and it only ever drives cosmetic feedback).
  const holdStartRef = useRef(0);
  const transitioningRef = useRef(false);

  // Mirror of the latest state for callbacks; updated in an effect (never
  // during render) so it can't trip the refs-during-render rule.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const bestSession = useSyncExternalStore(noopSubscribe, readBest, zeroSnapshot);

  const clearShowTimers = useCallback(() => {
    if (showIntervalRef.current) {
      clearInterval(showIntervalRef.current);
      showIntervalRef.current = null;
    }
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
  }, []);

  const clearHoldInterval = useCallback(() => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }, []);

  // ── SHOW phase: fill the bar over exactly targetMs ──────────────────

  /**
   * Drives the SHOW bar from 0 → targetMs. `elapsed` is read from an
   * absolute start timestamp every tick (never accumulated per-tick), so a
   * throttled tab can't drift the fill away from the real target duration.
   */
  const beginShow = useCallback(
    (targetMs: number) => {
      clearShowTimers();
      play('tick');
      const start = performance.now();
      setState((s) => (s.phase !== 'show' ? s : { ...s, showElapsedMs: 0 }));

      showIntervalRef.current = setInterval(() => {
        const elapsed = Math.min(targetMs, performance.now() - start);
        setState((s) => (s.phase !== 'show' ? s : { ...s, showElapsedMs: elapsed }));
        if (elapsed >= targetMs) {
          if (showIntervalRef.current) clearInterval(showIntervalRef.current);
          showIntervalRef.current = null;
          play('confirm');
          showTimeoutRef.current = setTimeout(() => {
            setState((s) => (s.phase !== 'show' ? s : { ...s, phase: 'recreate' }));
          }, SHOW_COMPLETE_PAUSE_MS);
        }
      }, TICK_MS);
    },
    [clearShowTimers, play]
  );

  // ── Round lifecycle ──────────────────────────────────────────────────

  const startRound = useCallback(
    (difficulty: Difficulty, round: number) => {
      clearShowTimers();
      clearHoldInterval();
      // Challenge rounds are seeded so every player recreates an identical
      // duration; solo rounds draw a fresh one.
      const seededSeconds = challengeRounds?.[round - 1]?.targetSeconds;
      const seconds = seededSeconds ?? makeDuration(difficulty, Math.random);
      const targetMs = Math.round(seconds * 1000);

      setState((s) => ({
        ...s,
        phase: 'show',
        difficulty,
        targetMs,
        round,
        score: 0,
        result: null,
        isHolding: false,
        showElapsedMs: 0,
        holdElapsedMs: 0,
      }));
      beginShow(targetMs);
    },
    [clearShowTimers, clearHoldInterval, challengeRounds, beginShow]
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
    clearShowTimers();
    clearHoldInterval();
    play('click');
    setState((s) => ({
      ...INITIAL_STATE,
      mode: s.mode,
      phase: s.mode === 'challenge' ? 'challenge-intro' : 'selecting-difficulty',
      totalRounds: s.totalRounds,
    }));
  }, [clearShowTimers, clearHoldInterval, play]);

  // ── RECREATE: press-and-hold ─────────────────────────────────────────

  const startHold = useCallback(() => {
    if (stateRef.current.phase !== 'recreate') return;
    holdStartRef.current = performance.now();
    play('tap');
    setState((s) => (s.phase !== 'recreate' ? s : { ...s, isHolding: true, holdElapsedMs: 0 }));

    // Only Easy renders anything off this — driving the interval
    // unconditionally would just be wasted work on Medium/Hard, which show
    // no progress feedback at all.
    if (TIME_SENSE_DIFFICULTY[stateRef.current.difficulty!].showHoldGlow) {
      const start = holdStartRef.current;
      holdIntervalRef.current = setInterval(() => {
        const elapsed = performance.now() - start;
        setState((s) => (!s.isHolding ? s : { ...s, holdElapsedMs: elapsed }));
      }, TICK_MS);
    }
  }, [play]);

  const endHold = useCallback(() => {
    if (stateRef.current.phase !== 'recreate' || !stateRef.current.isHolding) return;
    // Authoritative measurement: a single performance.now() delta, not a sum
    // of interval ticks — the cosmetic glow interval above never feeds this.
    const heldMs = performance.now() - holdStartRef.current;
    clearHoldInterval();
    play('confirm');

    setState((prev) => {
      if (prev.phase !== 'recreate' || !prev.isHolding) return prev;
      const accuracy = calculateAccuracy(prev.targetMs, heldMs);
      const score = calculateScore(accuracy);
      const rating = getRating(accuracy);

      return {
        ...prev,
        phase: 'results',
        isHolding: false,
        score,
        totalScore: round2(prev.totalScore + score),
        roundScores: [...prev.roundScores, score],
        result: {
          targetMs: prev.targetMs,
          heldMs: Math.round(heldMs),
          errorMs: Math.round(heldMs - prev.targetMs),
          accuracy,
          rating,
          score,
        },
      };
    });
  }, [clearHoldInterval, play]);

  // ── Advance ───────────────────────────────────────────────────────

  const nextRound = useCallback(() => {
    if (transitioningRef.current) return;
    const { difficulty, round, phase, mode, totalRounds, totalScore } = stateRef.current;
    if (!difficulty || phase !== 'results') return;
    transitioningRef.current = true;

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

    setTimeout(() => {
      transitioningRef.current = false;
    }, 500);
  }, [startRound, play, challengeRounds]);

  const replay = useCallback(() => {
    const { difficulty } = stateRef.current;
    if (difficulty) selectDifficulty(difficulty);
  }, [selectDifficulty]);

  // A hidden tab mid-SHOW must not let the fill complete off-screen or sit
  // frozen part-way — pause on hide, then restart the whole animation for
  // the same target once the tab is visible again (fairness: everyone has
  // to actually watch the full duration). A hidden tab mid-HOLD resolves
  // exactly like a normal release (mirrors Perfect Pour's stopPouring —
  // pointer capture means any eventual real pointerup on an already-resolved
  // round is a no-op via the phase/isHolding guard above).
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (stateRef.current.phase === 'show') {
          clearShowTimers();
        } else if (stateRef.current.phase === 'recreate' && stateRef.current.isHolding) {
          endHold();
        }
      } else if (stateRef.current.phase === 'show') {
        beginShow(stateRef.current.targetMs);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [clearShowTimers, beginShow, endHold]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      clearShowTimers();
      clearHoldInterval();
    },
    [clearShowTimers, clearHoldInterval]
  );

  return {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    startHold,
    endHold,
    nextRound,
    replay,
    resetToMenu,
  };
}
