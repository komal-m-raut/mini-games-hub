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
import { CHALLENGE_ROUND_COUNT } from '@/lib/challenge';
import {
  NORMAL_ROUND_COUNT,
  calculateScore,
  getLocalBestSession,
  round2,
  saveBestSession,
} from '@/utils/scoring';
import { ColorChallengeRound, getColorChallengeRounds } from './challenge';
import { RGB, rgbHue } from './colorMath';
import {
  AMAZING_ACCURACY,
  COLOR_DIFFICULTY,
  START_COLOR,
  bestSessionKey,
  getColorAccuracy,
  getColorRating,
  makeTargetColor,
} from './constants';
import { ColorGameState } from './types';

/** A range input fires continuously while dragged; throttle the tick sound. */
const SLIDE_SOUND_MS = 70;

const INITIAL_STATE: ColorGameState = {
  phase: 'selecting-difficulty',
  mode: 'normal',
  difficulty: null,
  target: START_COLOR,
  current: START_COLOR,
  observeTimeLeft: 3,
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

export interface UseColorMatchGameOptions {
  /** When set, the game runs as a seeded 3-round challenge. */
  challengeCode?: string;
}

export function useColorMatchGame({ challengeCode }: UseColorMatchGameOptions = {}) {
  const isChallenge = Boolean(challengeCode);
  // Deterministic per code, so every player matches identical colours
  const challengeRounds = useMemo<ColorChallengeRound[] | null>(
    () => (challengeCode ? getColorChallengeRounds(challengeCode) : null),
    [challengeCode]
  );

  const [state, setState] = useState<ColorGameState>(() => ({
    ...INITIAL_STATE,
    mode: isChallenge ? 'challenge' : 'normal',
    phase: isChallenge ? 'challenge-intro' : 'selecting-difficulty',
    totalRounds: isChallenge ? CHALLENGE_ROUND_COUNT : NORMAL_ROUND_COUNT,
  }));
  // Player's chosen session length, solo only — challenges always stay at
  // CHALLENGE_ROUND_COUNT so a seeded 3-round link can't drift.
  const [roundCount, setRoundCount] = useState(NORMAL_ROUND_COUNT);
  const { play } = useSound();

  const observeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitioningRef = useRef(false);
  const lastSlideSoundRef = useRef(0);
  /** Previous target's hue, so the next colour can't land on top of it. */
  const previousHueRef = useRef<number | undefined>(undefined);
  /** Countdown deadline, so a throttled tab still reports the right time. */
  const observeDeadlineRef = useRef(0);

  // Mirror of the latest state for callbacks, updated in an effect (never
  // during render) so it can't trip the refs-during-render rule.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const readBest = useCallback(() => getLocalBestSession(bestSessionKey(state.totalRounds)), [
    state.totalRounds,
  ]);
  const bestSession = useSyncExternalStore(noopSubscribe, readBest, zeroSnapshot);

  const clearTimers = useCallback(() => {
    if (observeTimerRef.current) {
      clearInterval(observeTimerRef.current);
      observeTimerRef.current = null;
    }
  }, []);

  // ── Round lifecycle ───────────────────────────────────────────────

  /** Shows a fresh target colour, counts down, then hands over the sliders. */
  const startRound = useCallback(
    (difficulty: Difficulty, round: number) => {
      clearTimers();
      const cfg = COLOR_DIFFICULTY[difficulty];
      // Challenge rounds are seeded so every player gets identical colours
      const target =
        challengeRounds?.[round - 1]?.target ??
        makeTargetColor(difficulty, Math.random, previousHueRef.current);
      previousHueRef.current = rgbHue(target);

      setState((s) => ({
        ...s,
        phase: 'observing',
        difficulty,
        target,
        current: START_COLOR,
        observeTimeLeft: cfg.observeSeconds,
        round,
        score: 0,
        result: null,
      }));
      play('glow');

      // Interval-clear and ref mutation live in the callback, not inside the
      // setState updater, which React may invoke more than once.
      observeDeadlineRef.current = performance.now() + cfg.observeSeconds * 1000;
      observeTimerRef.current = setInterval(() => {
        const remaining = Math.ceil((observeDeadlineRef.current - performance.now()) / 1000);
        if (remaining <= 0) {
          clearInterval(observeTimerRef.current!);
          observeTimerRef.current = null;
          setState((prev) =>
            prev.phase !== 'observing'
              ? prev
              : { ...prev, observeTimeLeft: 0, phase: 'matching' }
          );
          play('whoosh');
          return;
        }
        setState((prev) =>
          prev.phase !== 'observing' || prev.observeTimeLeft === remaining
            ? prev
            : { ...prev, observeTimeLeft: remaining }
        );
        play('tick');
      }, 1000);
    },
    [clearTimers, play, challengeRounds]
  );

  const selectDifficulty = useCallback(
    (difficulty: Difficulty) => {
      play('click');
      setState((s) => ({
        ...s,
        difficulty,
        round: 1,
        score: 0,
        totalScore: 0,
        roundScores: [],
        isNewBestSession: false,
        totalRounds: roundCount,
      }));
      startRound(difficulty, 1);
    },
    [startRound, play, roundCount]
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

  // ── Mixing ────────────────────────────────────────────────────────

  /** Moves one channel while the player drags a slider. */
  const setChannel = useCallback(
    (channel: keyof RGB, value: number) => {
      setState((prev) => {
        if (prev.phase !== 'matching' || prev.current[channel] === value) return prev;
        return { ...prev, current: { ...prev.current, [channel]: value } };
      });

      // Outside the updater: React may re-run it, and the sound must fire at
      // most once per gesture step.
      const now = performance.now();
      if (now - lastSlideSoundRef.current >= SLIDE_SOUND_MS) {
        lastSlideSoundRef.current = now;
        play('slide');
      }
    },
    [play]
  );

  /** Locks in the mixed colour and scores the round. */
  const submit = useCallback(() => {
    play('confirm');
    setState((prev) => {
      if (prev.phase !== 'matching' || !prev.difficulty) return prev;

      const accuracy = getColorAccuracy(prev.target, prev.current, prev.difficulty);
      const score = calculateScore(accuracy);
      const rating = getColorRating(accuracy);

      return {
        ...prev,
        phase: 'results',
        score,
        totalScore: round2(prev.totalScore + score),
        roundScores: [...prev.roundScores, score],
        result: {
          target: prev.target,
          actual: prev.current,
          accuracy,
          rating,
          score,
        },
      };
    });
  }, [play]);

  // Held back so it lands with the score reveal, not on the submit sound.
  useEffect(() => {
    if (state.phase !== 'results' || !state.result) return;
    const { accuracy, rating } = state.result;
    const id = setTimeout(() => {
      if (rating === 'Perfect') play('celebrate');
      else if (accuracy >= AMAZING_ACCURACY) play('sparkle');
      else if (rating === 'Great' || rating === 'Good') play('success');
      else play('fail');
    }, 420);
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
        const isNewBestSession = saveBestSession(bestSessionKey(totalRounds), totalScore);
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

  // Cleanup on unmount
  useEffect(() => clearTimers, [clearTimers]);

  return {
    state,
    bestSession,
    challengeRounds,
    roundCount,
    setRoundCount,
    selectDifficulty,
    startChallenge,
    setChannel,
    submit,
    nextRound,
    replay,
    resetToMenu,
  };
}
