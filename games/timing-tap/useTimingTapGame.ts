'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { MotionValue, useMotionValue } from 'framer-motion';
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
import { TapChallengeRound, getTapChallengeRounds, makeTapRound } from './challenge';
import { COUNTDOWN_SECONDS, TAP_DIFFICULTY, getTapAccuracy, getTapRating } from './constants';
import { RoundConfig, stepPosition } from './sweep';
import { TapGameState, TapResult } from './types';

const GAME_ID = 'timing-tap';
/** Wall-clock dt clamp for the rAF loop — a throttled/backgrounded tab can
 *  only starve frames, never teleport the indicator across the bar. */
const MAX_DT = 1 / 15;
/** How long the Perfect slow-motion freeze holds before the result screen. */
const PERFECT_HOLD_MS = 700;
const NORMAL_HOLD_MS = 320;

const INITIAL_STATE: TapGameState = {
  phase: 'selecting-difficulty',
  mode: 'normal',
  difficulty: null,
  countdown: COUNTDOWN_SECONDS,
  round: 1,
  totalRounds: NORMAL_ROUND_COUNT,
  score: 0,
  totalScore: 0,
  roundScores: [],
  result: null,
  isSlowMotion: false,
  isNewBestSession: false,
};

// localStorage best session, hydration-safe (server snapshot is 0)
const noopSubscribe = () => () => {};
const zeroSnapshot = () => 0;
const readBest = () => getLocalBestSession(GAME_ID);

export interface UseTimingTapGameOptions {
  /** When set, the game runs as a seeded 3-round challenge. */
  challengeCode?: string;
}

export function useTimingTapGame({ challengeCode }: UseTimingTapGameOptions = {}) {
  const isChallenge = Boolean(challengeCode);
  // Deterministic per code, so every player faces the identical sweep
  const challengeRounds = useMemo<TapChallengeRound[] | null>(
    () => (challengeCode ? getTapChallengeRounds(challengeCode) : null),
    [challengeCode]
  );

  const [state, setState] = useState<TapGameState>(() => ({
    ...INITIAL_STATE,
    mode: isChallenge ? 'challenge' : 'normal',
    phase: isChallenge ? 'challenge-intro' : 'selecting-difficulty',
    totalRounds: isChallenge ? CHALLENGE_ROUND_COUNT : NORMAL_ROUND_COUNT,
  }));
  const { play, loop, stop, setSweep } = useSound();

  // Indicator position lives outside React state — a 60fps setState would
  // re-render the whole tree every frame. `position` drives the UI via
  // framer-motion's useTransform; `positionRef` is the same value kept in
  // sync every frame so tap() can read it exactly, without a MotionValue
  // round-trip.
  const position = useMotionValue(50);
  const positionRef = useRef(50);

  const roundConfigRef = useRef<RoundConfig | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef(0);
  // True only while the rAF loop is actually advancing the indicator — used
  // both to short-circuit stale rAF callbacks and to know whether a
  // visibility pause has something to resume.
  const runningRef = useRef(false);
  // Set when a hidden-tab pause interrupted an in-progress leg, so the
  // visibility handler knows to resume the sweep rather than treating
  // "not running" as "round already resolved".
  const pausedRef = useRef(false);
  // Guards a round against a second tap() while the slow-motion hold/result
  // transition is already in flight.
  const resolvedRef = useRef(false);

  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownDeadlineRef = useRef(0);
  const tapHoldTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitioningRef = useRef(false);

  // Mirror of the latest state for callbacks; updated in an effect (never
  // during render) so it can't trip the refs-during-render rule.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const bestSession = useSyncExternalStore(noopSubscribe, readBest, zeroSnapshot);

  const clearTimers = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (tapHoldTimeoutRef.current) {
      clearTimeout(tapHoldTimeoutRef.current);
      tapHoldTimeoutRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    runningRef.current = false;
    pausedRef.current = false;
  }, []);

  // ── Motion loop ──────────────────────────────────────────────────

  // Named function expression (not the outer `const`) so the recursive
  // rAF call doesn't reference a binding before it's declared.
  const frameLoop = useCallback(
    function tick(now: number) {
      if (!runningRef.current) return;
      const dt = Math.min((now - lastTsRef.current) / 1000, MAX_DT);
      lastTsRef.current = now;
      const cfg = roundConfigRef.current;
      if (cfg) {
        const next = stepPosition(cfg, positionRef.current, dt);
        positionRef.current = next;
        position.set(next);
        setSweep(next);
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [position, setSweep]
  );

  const beginRunning = useCallback(() => {
    runningRef.current = true;
    pausedRef.current = false;
    lastTsRef.current = performance.now();
    loop('sweep');
    rafRef.current = requestAnimationFrame(frameLoop);
  }, [loop, frameLoop]);

  // ── Round lifecycle ───────────────────────────────────────────────

  /** Seeds the round's sweep, then runs the "3 · 2 · 1" countdown. */
  const startRound = useCallback(
    (difficulty: Difficulty, round: number) => {
      clearTimers();
      resolvedRef.current = false;
      const cfg = TAP_DIFFICULTY[difficulty];
      // Challenge rounds are seeded so every player faces the same sweep
      const seeded = challengeRounds?.[round - 1];
      const generated = seeded ?? makeTapRound(difficulty, Math.random);

      roundConfigRef.current = {
        speed: cfg.speed,
        zoneHalfWidth: cfg.zoneHalfWidth,
        direction: generated.direction,
        speedScales: generated.speedScales,
        legIndex: 0,
      };
      positionRef.current = generated.startPosition;
      position.set(generated.startPosition);

      setState((s) => ({
        ...s,
        phase: 'countdown',
        difficulty,
        countdown: COUNTDOWN_SECONDS,
        round,
        score: 0,
        result: null,
        isSlowMotion: false,
      }));

      // Countdown derives remaining time from a deadline rather than
      // decrementing by 1 per tick, so a throttled/backgrounded tab still
      // reports correct numbers (mirrors the pour observe countdown).
      play('tick');
      countdownDeadlineRef.current = performance.now() + COUNTDOWN_SECONDS * 1000;
      countdownTimerRef.current = setInterval(() => {
        const remaining = Math.ceil((countdownDeadlineRef.current - performance.now()) / 1000);
        if (remaining <= 0) {
          clearInterval(countdownTimerRef.current!);
          countdownTimerRef.current = null;
          setState((prev) =>
            prev.phase !== 'countdown' ? prev : { ...prev, countdown: 0, phase: 'running' }
          );
          beginRunning();
          return;
        }
        setState((prev) =>
          prev.phase !== 'countdown' || prev.countdown === remaining
            ? prev
            : { ...prev, countdown: remaining }
        );
        play('tick');
      }, 1000);
    },
    [clearTimers, play, challengeRounds, position, beginRunning]
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
    stop('sweep');
    play('click');
    setState((s) => ({
      ...INITIAL_STATE,
      mode: s.mode,
      phase: s.mode === 'challenge' ? 'challenge-intro' : 'selecting-difficulty',
      totalRounds: s.totalRounds,
    }));
  }, [clearTimers, stop, play]);

  // ── Tap ───────────────────────────────────────────────────────────

  const tap = useCallback(() => {
    // Idempotent per round — a second tap while the slow-motion hold is
    // already playing must not re-score or double-fire result audio.
    if (resolvedRef.current || stateRef.current.phase !== 'running') return;
    resolvedRef.current = true;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    runningRef.current = false;
    pausedRef.current = false;
    stop('sweep');
    play('tap');

    const cfg = roundConfigRef.current;
    const zoneHalfWidth = cfg?.zoneHalfWidth ?? 0;
    const finalPosition = Math.round(positionRef.current * 10) / 10;
    const distance = Math.round(Math.abs(finalPosition - 50) * 10) / 10;
    const accuracy = getTapAccuracy(finalPosition, zoneHalfWidth);
    const score = calculateScore(accuracy);
    const rating = getTapRating(accuracy);

    const result: TapResult = {
      position: finalPosition,
      distance,
      accuracy,
      rating,
      score,
      zoneHalfWidth,
    };

    setState((s) => ({
      ...s,
      isSlowMotion: true,
      result,
      score,
      totalScore: round2(s.totalScore + score),
      roundScores: [...s.roundScores, score],
    }));

    // Perfect taps get a longer freeze so the slow-motion beat reads before
    // the result screen cuts in.
    const holdMs = rating === 'Perfect' ? PERFECT_HOLD_MS : NORMAL_HOLD_MS;
    tapHoldTimeoutRef.current = setTimeout(() => {
      setState((s) => (s.phase !== 'running' ? s : { ...s, phase: 'results', isSlowMotion: false }));
      if (rating === 'Perfect') play('celebrate');
      else if (rating === 'Try Again') play('fail');
      else play('success');
    }, holdMs);
  }, [stop, play]);

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

    setTimeout(() => {
      transitioningRef.current = false;
    }, 500);
  }, [startRound, play, challengeRounds]);

  const replay = useCallback(() => {
    const { difficulty } = stateRef.current;
    if (difficulty) selectDifficulty(difficulty);
  }, [selectDifficulty]);

  // Backgrounding mid-sweep must not lock in a tap the player never made —
  // pause the loop and the sweep audio, then resume cleanly (dt reset)
  // instead of scoring a phantom tap like the pour hook's stopPouring does.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (runningRef.current) {
          runningRef.current = false;
          pausedRef.current = true;
          if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          stop('sweep');
        }
      } else if (pausedRef.current) {
        pausedRef.current = false;
        runningRef.current = true;
        lastTsRef.current = performance.now();
        loop('sweep');
        rafRef.current = requestAnimationFrame(frameLoop);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [stop, loop, frameLoop]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      clearTimers();
      stop('sweep');
    },
    [clearTimers, stop]
  );

  return {
    state,
    bestSession,
    challengeRounds,
    position: position as MotionValue<number>,
    selectDifficulty,
    startChallenge,
    tap,
    nextRound,
    replay,
    resetToMenu,
  };
}
