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
import { randomInt } from '@/lib/utils';
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
import { PourChallengeRound, getPourChallengeRounds } from './challenge';
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
  mode: 'normal',
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

export interface UsePourGameOptions {
  /** When set, the game runs as a seeded 3-round challenge. */
  challengeCode?: string;
}

export function usePourGame({ challengeCode }: UsePourGameOptions = {}) {
  usePlayBeacon(GAME_ID);
  const isChallenge = Boolean(challengeCode);
  // Deterministic per code, so every player pours to identical targets
  const challengeRounds = useMemo<PourChallengeRound[] | null>(
    () => (challengeCode ? getPourChallengeRounds(challengeCode) : null),
    [challengeCode]
  );

  const [state, setState] = useState<PourGameState>(() => ({
    ...INITIAL_STATE,
    mode: isChallenge ? 'challenge' : 'normal',
    phase: isChallenge ? 'challenge-intro' : 'selecting-difficulty',
    totalRounds: isChallenge ? CHALLENGE_ROUND_COUNT : NORMAL_ROUND_COUNT,
  }));
  const { play, loop, stop, setFill } = useSound();

  const pourIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const observeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fillTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitioningRef = useRef(false);
  // Deadline timestamp (performance.now()-based) the observe countdown
  // derives its remaining time from, so a throttled/backgrounded tab (where
  // ticks coalesce) still reports correct time left instead of nearly
  // freezing.
  const observeDeadlineRef = useRef(0);

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
      // Challenge rounds are seeded so every player pours to identical targets
      const targetFill =
        challengeRounds?.[round - 1]?.targetFill ?? randomInt(MIN_TARGET_FILL, MAX_TARGET_FILL);

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

        // Countdown derives remaining time from a deadline rather than
        // decrementing by 1 per tick, so a throttled/backgrounded tab still
        // reports correct time left. Interval-clear and ref mutation live
        // here in the interval callback, not inside the setState updater,
        // which React may invoke more than once.
        observeDeadlineRef.current = performance.now() + cfg.observeSeconds * 1000;
        observeTimerRef.current = setInterval(() => {
          const remaining = Math.ceil((observeDeadlineRef.current - performance.now()) / 1000);
          if (remaining <= 0) {
            clearInterval(observeTimerRef.current!);
            observeTimerRef.current = null;
            // Glass empties and the player takes over
            setState((prev) =>
              prev.phase !== 'observing'
                ? prev
                : { ...prev, observeTimeLeft: 0, phase: 'pouring', currentFill: 0 }
            );
            play('tick');
            return;
          }
          setState((prev) =>
            prev.phase !== 'observing' || prev.observeTimeLeft === remaining
              ? prev
              : { ...prev, observeTimeLeft: remaining }
          );
          play('tick');
        }, 1000);
      }, FILL_ANIMATION_MS);
    },
    [clearTimers, play, challengeRounds]
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
    stop('water');
    play('click');
    setState((s) => ({
      ...INITIAL_STATE,
      mode: s.mode,
      phase: s.mode === 'challenge' ? 'challenge-intro' : 'selecting-difficulty',
      totalRounds: s.totalRounds,
    }));
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

      const diff = Math.abs(prev.targetFill - prev.currentFill);
      const accuracy = getPourAccuracy(prev.targetFill, prev.currentFill);
      const score = calculateScore(accuracy);
      const rating = getPourRating(score);

      return {
        ...prev,
        phase: 'results',
        isPouring: false,
        score,
        totalScore: round2(prev.totalScore + score),
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

    // Wall-clock based so a throttled tab doesn't slow the pour rate. dt is
    // clamped so a backgrounded/throttled tab (where ticks coalesce) can't
    // let a single tick carry several seconds of pour in one jump.
    let last = performance.now();
    pourIntervalRef.current = setInterval(() => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, (TICK_MS / 1000) * 4);
      last = now;
      setState((prev) => {
        if (!prev.isPouring || prev.phase !== 'pouring') return prev;
        const cfg = POUR_DIFFICULTY[prev.difficulty!];
        const next = Math.min(100, prev.currentFill + cfg.pourSpeed * dt);
        // Couple the water loop to fill level (H5/R1) — reuses this
        // existing 16ms tick rather than adding a new timer. setWaterFill
        // just nudges an AudioParam, so re-invocation is harmless.
        setFill(next);
        return { ...prev, currentFill: next };
      });
    }, TICK_MS);
  }, [loop, setFill]);

  const stopPouring = useCallback(() => {
    if (pourIntervalRef.current) {
      clearInterval(pourIntervalRef.current);
      pourIntervalRef.current = null;
    }
    stop('water');
    setState((prev) => {
      if (prev.phase !== 'pouring') return prev;
      return { ...prev, isPouring: false };
    });
    lockIn();
  }, [stop, lockIn]);

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

  // Backgrounding the tab mid-pour must not be exploitable — end the pour
  // and lock in immediately, same as a pointer release.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && stateRef.current.isPouring) {
        stopPouring();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [stopPouring]);

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
    challengeRounds,
    selectDifficulty,
    startChallenge,
    startPouring,
    stopPouring,
    nextRound,
    replay,
    resetToMenu,
  };
}
