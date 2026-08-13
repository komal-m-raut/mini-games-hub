'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
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
import { ShapeChallengeRound, getShapeEchoChallengeRounds } from './challenge';
import { GAME_ID, SHAPE_DIFFICULTY, defaultGuess, makeShape, shapeAccuracyDetail } from './constants';
import { GuessGeom, ShapeGameState } from './types';

/** A slider (or drag) fires continuously; throttle the 'slide' sound. */
const SLIDE_SOUND_MS = 70;

/** Flash countdown tick resolution — fine enough that the 1.5s Hard window
 *  still shows more than one number, coarse enough not to spam setState. */
const FLASH_TICK_MS = 100;

const INITIAL_STATE: ShapeGameState = {
  phase: 'selecting-difficulty',
  mode: 'normal',
  difficulty: null,
  target: { type: 'rectangle', cx: 0.5, cy: 0.5, width: 0.3, ratio: 1, rotation: 0 },
  guess: defaultGuess(),
  flashTimeLeft: 0,
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

export interface UseShapeEchoGameOptions {
  /** When set, the game runs as a seeded 3-round challenge. */
  challengeCode?: string;
}

export function useShapeEchoGame({ challengeCode }: UseShapeEchoGameOptions = {}) {
  usePlayBeacon(GAME_ID);
  const isChallenge = Boolean(challengeCode);
  // Deterministic per code, so every player matches identical shapes
  const challengeRounds = useMemo<ShapeChallengeRound[] | null>(
    () => (challengeCode ? getShapeEchoChallengeRounds(challengeCode) : null),
    [challengeCode]
  );

  const [state, setState] = useState<ShapeGameState>(() => ({
    ...INITIAL_STATE,
    mode: isChallenge ? 'challenge' : 'normal',
    phase: isChallenge ? 'challenge-intro' : 'selecting-difficulty',
    totalRounds: isChallenge ? CHALLENGE_ROUND_COUNT : NORMAL_ROUND_COUNT,
  }));
  // Bumped on every flash start/restart so the ring component can key its
  // animation to replay from the top.
  const [flashKey, setFlashKey] = useState(0);
  const { play } = useSound();

  const flashTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flashDeadlineRef = useRef(0);
  const transitioningRef = useRef(false);
  const lastSlideSoundRef = useRef(0);
  // Set while the tab is hidden during 'flashing', so the visibility
  // handler knows to replay the flash rather than treating a backgrounded
  // tab as ordinary idle time.
  const hiddenDuringFlashRef = useRef(false);

  // Mirror of the latest state for callbacks, updated in an effect (never
  // during render) so it can't trip the refs-during-render rule.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const bestSession = useSyncExternalStore(noopSubscribe, readBest, zeroSnapshot);

  const clearTimers = useCallback(() => {
    if (flashTimerRef.current) {
      clearInterval(flashTimerRef.current);
      flashTimerRef.current = null;
    }
  }, []);

  // ── Flash lifecycle ──────────────────────────────────────────────

  /** Starts (or restarts) the flash countdown for the current target. */
  const beginFlash = useCallback(
    (seconds: number) => {
      clearTimers();
      setFlashKey((k) => k + 1);
      flashDeadlineRef.current = performance.now() + seconds * 1000;
      setState((s) => ({ ...s, flashTimeLeft: Math.ceil(seconds) }));
      play('glow');

      flashTimerRef.current = setInterval(() => {
        const remainingMs = flashDeadlineRef.current - performance.now();
        if (remainingMs <= 0) {
          clearInterval(flashTimerRef.current!);
          flashTimerRef.current = null;
          setState((prev) =>
            prev.phase !== 'flashing' ? prev : { ...prev, flashTimeLeft: 0, phase: 'recreating' }
          );
          return;
        }
        const remaining = Math.ceil(remainingMs / 1000);
        setState((prev) =>
          prev.phase !== 'flashing' || prev.flashTimeLeft === remaining
            ? prev
            : { ...prev, flashTimeLeft: remaining }
        );
      }, FLASH_TICK_MS);
    },
    [clearTimers, play]
  );

  /** Replays the current target's flash from the top, same shape — used
   *  after a visibility-hidden window ate the player's look. */
  const restartFlash = useCallback(() => {
    const difficulty = stateRef.current.difficulty;
    if (!difficulty) return;
    setState((s) => (s.phase === 'flashing' || s.phase === 'recreating'
      ? { ...s, phase: 'flashing', guess: defaultGuess() }
      : s));
    beginFlash(SHAPE_DIFFICULTY[difficulty].flashSeconds);
  }, [beginFlash]);

  // ── Round lifecycle ──────────────────────────────────────────────

  const startRound = useCallback(
    (difficulty: Difficulty, round: number) => {
      const cfg = SHAPE_DIFFICULTY[difficulty];
      // Challenge rounds are seeded so every player gets an identical shape
      const target = challengeRounds?.[round - 1]?.target ?? makeShape(difficulty, Math.random);

      setState((s) => ({
        ...s,
        phase: 'flashing',
        difficulty,
        target,
        guess: defaultGuess(),
        round,
        score: 0,
        result: null,
      }));

      beginFlash(cfg.flashSeconds);
    },
    [beginFlash, challengeRounds]
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

  // ── Recreate ──────────────────────────────────────────────────────

  /** Moves, resizes or rotates the recreate shape (drag, keyboard nudge, or
   *  a slider) — throttled so a fast drag doesn't spam the 'slide' sound. */
  const setGuess = useCallback(
    (next: GuessGeom) => {
      setState((prev) => (prev.phase !== 'recreating' ? prev : { ...prev, guess: next }));

      const now = performance.now();
      if (now - lastSlideSoundRef.current >= SLIDE_SOUND_MS) {
        lastSlideSoundRef.current = now;
        play('slide');
      }
    },
    [play]
  );

  /** Locks in the recreated shape and scores the round. */
  const submit = useCallback(() => {
    play('confirm');
    setState((prev) => {
      if (prev.phase !== 'recreating' || !prev.difficulty) return prev;

      const { posAcc, sizeAcc, rotAcc, accuracy } = shapeAccuracyDetail(
        prev.target,
        prev.guess,
        prev.difficulty
      );
      const score = calculateScore(accuracy);

      return {
        ...prev,
        phase: 'results',
        score,
        totalScore: round2(prev.totalScore + score),
        roundScores: [...prev.roundScores, score],
        result: {
          target: prev.target,
          guess: prev.guess,
          posAcc,
          sizeAcc,
          rotAcc,
          accuracy,
          score,
        },
      };
    });
  }, [play]);

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

  // Backgrounding mid-flash must not quietly burn the player's memorize
  // window — replay it from the top once the tab is visible again, rather
  // than scoring against a shape they never saw. A submit needs real input,
  // so the phase can only have advanced from 'flashing' to 'recreating'
  // while hidden — never past it.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (stateRef.current.phase === 'flashing') hiddenDuringFlashRef.current = true;
        return;
      }
      if (!hiddenDuringFlashRef.current) return;
      hiddenDuringFlashRef.current = false;
      if (stateRef.current.phase === 'flashing' || stateRef.current.phase === 'recreating') {
        restartFlash();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [restartFlash]);

  // Cleanup on unmount
  useEffect(() => clearTimers, [clearTimers]);

  return {
    state,
    bestSession,
    challengeRounds,
    flashKey,
    selectDifficulty,
    startChallenge,
    setGuess,
    submit,
    nextRound,
    replay,
    resetToMenu,
  };
}
