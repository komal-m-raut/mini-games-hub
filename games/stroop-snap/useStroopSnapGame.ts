'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { Difficulty, Rating } from '@/types/game';
import { useSound } from '@/hooks/useSound';
import { usePlayBeacon } from '@/hooks/usePlayBeacon';
import { CHALLENGE_ROUND_COUNT } from '@/lib/challenge';
import { getLocalBestSession, ratingFromScore, round2, saveBestSession } from '@/utils/scoring';
import { StroopChallengeRound, getStroopChallengeRounds } from './challenge';
import {
  COUNTDOWN_SECONDS,
  GAME_ID,
  PAR_NET,
  ROUND_SECONDS,
  SOLO_ROUND_COUNT,
  getNetScore,
  getStroopScore,
  makeTrials,
} from './constants';
import { StroopColorName, StroopGameState, StroopResult } from './types';

const INITIAL_STATE: StroopGameState = {
  phase: 'selecting-difficulty',
  mode: 'normal',
  difficulty: null,
  countdown: COUNTDOWN_SECONDS,
  round: 1,
  totalRounds: SOLO_ROUND_COUNT,
  timeLeft: ROUND_SECONDS,
  trials: [],
  trialIndex: 0,
  correct: 0,
  wrong: 0,
  streak: 0,
  bestStreak: 0,
  lastAnswer: null,
  flashSeq: 0,
  result: null,
  score: 0,
  totalScore: 0,
  roundScores: [],
  isNewBestSession: false,
};

// localStorage best session, hydration-safe (server snapshot is 0)
const noopSubscribe = () => () => {};
const zeroSnapshot = () => 0;
const readBest = () => getLocalBestSession(GAME_ID);

export interface UseStroopSnapGameOptions {
  /** When set, the game runs as a seeded 3-round challenge. */
  challengeCode?: string;
}

export function useStroopSnapGame({ challengeCode }: UseStroopSnapGameOptions = {}) {
  usePlayBeacon(GAME_ID);
  const isChallenge = Boolean(challengeCode);
  // Deterministic per code, so every player faces identical trial sequences
  const challengeRounds = useMemo<StroopChallengeRound[] | null>(
    () => (challengeCode ? getStroopChallengeRounds(challengeCode) : null),
    [challengeCode]
  );

  const [state, setState] = useState<StroopGameState>(() => ({
    ...INITIAL_STATE,
    mode: isChallenge ? 'challenge' : 'normal',
    phase: isChallenge ? 'challenge-intro' : 'selecting-difficulty',
    totalRounds: isChallenge ? CHALLENGE_ROUND_COUNT : SOLO_ROUND_COUNT,
  }));
  const { play } = useSound();

  // Guards a trial against a second resolveTrial() while it's already
  // resolved but the next trial hasn't committed to the DOM yet.
  const resolvedRef = useRef(false);
  const transitioningRef = useRef(false);

  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownDeadlineRef = useRef(0);
  const roundTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundDeadlineRef = useRef(0);
  // Which deadline-based timer a hidden tab interrupted, so the visibility
  // handler knows what to resume (and with how much time left).
  const pausedPhaseRef = useRef<'countdown' | 'running' | null>(null);
  const pausedRemainingMsRef = useRef(0);

  // Mirror of the latest state for callbacks; updated in an effect (never
  // during render) so it can't trip the refs-during-render rule.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const bestSession = useSyncExternalStore(noopSubscribe, readBest, zeroSnapshot);

  const clearAllTimers = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (roundTimerRef.current) {
      clearInterval(roundTimerRef.current);
      roundTimerRef.current = null;
    }
    pausedPhaseRef.current = null;
  }, []);

  // ── Round lifecycle ───────────────────────────────────────────────

  /** Scores the round and hands off to the results screen. */
  const endRound = useCallback(() => {
    const { correct, wrong, difficulty } = stateRef.current;
    if (!difficulty) return;
    const net = getNetScore(correct, wrong);
    const score = getStroopScore(net, difficulty);
    const rating: Rating = ratingFromScore(score);
    const result: StroopResult = {
      difficulty,
      correct,
      wrong,
      net,
      par: PAR_NET[difficulty],
      score,
      rating,
    };

    setState((s) => ({
      ...s,
      phase: 'results',
      result,
      score,
      totalScore: round2(s.totalScore + score),
      roundScores: [...s.roundScores, score],
    }));
  }, []);

  /** Ticks the 30s round deadline down, with a heartbeat tick in the last 5s. */
  const runRoundTimer = useCallback(() => {
    roundTimerRef.current = setInterval(() => {
      const remaining = Math.ceil((roundDeadlineRef.current - performance.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(roundTimerRef.current!);
        roundTimerRef.current = null;
        setState((prev) => (prev.phase !== 'running' ? prev : { ...prev, timeLeft: 0 }));
        endRound();
        return;
      }
      if (remaining <= 5) play('tick');
      setState((prev) =>
        prev.phase !== 'running' || prev.timeLeft === remaining
          ? prev
          : { ...prev, timeLeft: remaining }
      );
    }, 1000);
  }, [endRound, play]);

  /** Opens the trial window: sets the round deadline and flips to 'running'. */
  const beginRound = useCallback(() => {
    roundDeadlineRef.current = performance.now() + ROUND_SECONDS * 1000;
    setState((prev) =>
      prev.phase !== 'countdown' ? prev : { ...prev, countdown: 0, phase: 'running' }
    );
    runRoundTimer();
  }, [runRoundTimer]);

  /** "3 · 2 · 1" before each round, deadline-based like every other timer here. */
  const runCountdown = useCallback(() => {
    countdownTimerRef.current = setInterval(() => {
      const remaining = Math.ceil((countdownDeadlineRef.current - performance.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(countdownTimerRef.current!);
        countdownTimerRef.current = null;
        beginRound();
        return;
      }
      setState((prev) =>
        prev.phase !== 'countdown' || prev.countdown === remaining
          ? prev
          : { ...prev, countdown: remaining }
      );
      play('tick');
    }, 1000);
  }, [beginRound, play]);

  const startRound = useCallback(
    (difficulty: Difficulty, round: number) => {
      clearAllTimers();
      resolvedRef.current = false;
      // Challenge rounds are seeded so every player faces the same trials
      const seeded = challengeRounds?.[round - 1];
      const trials = seeded?.trials ?? makeTrials(difficulty, Math.random);

      setState((s) => ({
        ...s,
        phase: 'countdown',
        difficulty,
        countdown: COUNTDOWN_SECONDS,
        round,
        timeLeft: ROUND_SECONDS,
        trials,
        trialIndex: 0,
        correct: 0,
        wrong: 0,
        streak: 0,
        bestStreak: 0,
        lastAnswer: null,
        result: null,
      }));

      play('tick');
      countdownDeadlineRef.current = performance.now() + COUNTDOWN_SECONDS * 1000;
      runCountdown();
    },
    [clearAllTimers, challengeRounds, play, runCountdown]
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
    clearAllTimers();
    play('click');
    setState((s) => ({
      ...INITIAL_STATE,
      mode: s.mode,
      phase: s.mode === 'challenge' ? 'challenge-intro' : 'selecting-difficulty',
      totalRounds: s.totalRounds,
    }));
  }, [clearAllTimers, play]);

  // ── Trials ────────────────────────────────────────────────────────

  /** Scores the current trial and advances instantly to the next one —
   *  wraps defensively if the pre-generated batch is somehow exhausted. */
  const resolveTrial = useCallback(
    (picked: StroopColorName) => {
      if (resolvedRef.current || stateRef.current.phase !== 'running') return;
      resolvedRef.current = true;

      const { trials, trialIndex } = stateRef.current;
      if (trials.length === 0) return;
      const trial = trials[trialIndex % trials.length];
      const isCorrect = picked === trial.ink;
      play(isCorrect ? 'confirm' : 'error');

      setState((s) => {
        const streak = isCorrect ? s.streak + 1 : 0;
        return {
          ...s,
          correct: s.correct + (isCorrect ? 1 : 0),
          wrong: s.wrong + (isCorrect ? 0 : 1),
          streak,
          bestStreak: Math.max(s.bestStreak, streak),
          lastAnswer: isCorrect ? 'correct' : 'wrong',
          flashSeq: s.flashSeq + 1,
          trialIndex: s.trialIndex + 1,
        };
      });
    },
    [play]
  );

  // Released once the advance to the next trial has actually committed —
  // resolving this synchronously inside resolveTrial would let a genuine
  // double-tap (two pointerdown events in the same tick) sneak a second
  // score in before React ever re-renders with the new trialIndex.
  useEffect(() => {
    resolvedRef.current = false;
  }, [state.trialIndex]);

  // ── Advance ───────────────────────────────────────────────────────

  const nextRound = useCallback(() => {
    if (transitioningRef.current) return;
    const { difficulty, round, phase, mode, totalRounds, totalScore } = stateRef.current;
    if (!difficulty || phase !== 'results') return;
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

    setTimeout(() => {
      transitioningRef.current = false;
    }, 500);
  }, [startRound, play, challengeRounds]);

  const replay = useCallback(() => {
    const { difficulty } = stateRef.current;
    if (difficulty) selectDifficulty(difficulty);
  }, [selectDifficulty]);

  // Backgrounding mid-round must not silently burn the countdown or the 30s
  // clock — pause whichever deadline timer is active and resume it with the
  // same time remaining once the tab is visible again.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const phase = stateRef.current.phase;
        if (phase === 'countdown' && countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          pausedRemainingMsRef.current = countdownDeadlineRef.current - performance.now();
          pausedPhaseRef.current = 'countdown';
        } else if (phase === 'running' && roundTimerRef.current) {
          clearInterval(roundTimerRef.current);
          roundTimerRef.current = null;
          pausedRemainingMsRef.current = roundDeadlineRef.current - performance.now();
          pausedPhaseRef.current = 'running';
        }
      } else if (pausedPhaseRef.current) {
        const remaining = Math.max(0, pausedRemainingMsRef.current);
        if (pausedPhaseRef.current === 'countdown') {
          countdownDeadlineRef.current = performance.now() + remaining;
          runCountdown();
        } else {
          roundDeadlineRef.current = performance.now() + remaining;
          runRoundTimer();
        }
        pausedPhaseRef.current = null;
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [runCountdown, runRoundTimer]);

  // Cleanup on unmount
  useEffect(() => clearAllTimers, [clearAllTimers]);

  const currentTrial =
    state.trials.length > 0 ? state.trials[state.trialIndex % state.trials.length] : null;

  return {
    state,
    bestSession,
    challengeRounds,
    currentTrial,
    selectDifficulty,
    startChallenge,
    resolveTrial,
    nextRound,
    replay,
    resetToMenu,
  };
}
