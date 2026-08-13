'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useReducedMotion } from 'framer-motion';
import { Difficulty } from '@/types/game';
import { useSound } from '@/hooks/useSound';
import { usePlayBeacon } from '@/hooks/usePlayBeacon';
import { CHALLENGE_ROUND_COUNT } from '@/lib/challenge';
import {
  NORMAL_ROUND_COUNT,
  getLocalBestSession,
  round2,
  saveBestSession,
} from '@/utils/scoring';
import { BlockChallengeRound, getBlockChallengeRounds } from './challenge';
import { GAME_ID, scoreGuess } from './constants';
import { SWEEP_GRACE, makeSweep } from './sweep';
import { BlockCountGameState } from './types';

/** Digits typed on the number pad are capped here — plenty for any real
 *  count (Hard tops out at 18) without an unbounded input string. */
const MAX_GUESS_DIGITS = 3;
/** How long the "Sweep restarted" announcement stays up. */
const ANNOUNCEMENT_MS = 2200;
/** Held back so the outcome sound doesn't step on the submit 'confirm'. */
const OUTCOME_SOUND_DELAY_MS = 380;

const INITIAL_STATE: BlockCountGameState = {
  phase: 'selecting-difficulty',
  mode: 'normal',
  difficulty: null,
  sweep: null,
  sweepStartAt: 0,
  guess: '',
  round: 1,
  totalRounds: NORMAL_ROUND_COUNT,
  score: 0,
  totalScore: 0,
  roundScores: [],
  result: null,
  isNewBestSession: false,
  announcement: null,
};

// localStorage best session, hydration-safe (server snapshot is 0)
const noopSubscribe = () => () => {};
const zeroSnapshot = () => 0;
const readBest = () => getLocalBestSession(GAME_ID);

export interface UseBlockCountGameOptions {
  /** When set, the game runs as a seeded 3-round challenge. */
  challengeCode?: string;
}

export function useBlockCountGame({ challengeCode }: UseBlockCountGameOptions = {}) {
  usePlayBeacon(GAME_ID);
  const isChallenge = Boolean(challengeCode);
  const reducedMotion = Boolean(useReducedMotion());
  const { play } = useSound();

  // Deterministic per code, so every player counts the identical sweeps.
  const challengeRounds = useMemo<BlockChallengeRound[] | null>(
    () => (challengeCode ? getBlockChallengeRounds(challengeCode, reducedMotion) : null),
    [challengeCode, reducedMotion]
  );

  const [state, setState] = useState<BlockCountGameState>(() => ({
    ...INITIAL_STATE,
    mode: isChallenge ? 'challenge' : 'normal',
    phase: isChallenge ? 'challenge-intro' : 'selecting-difficulty',
    totalRounds: isChallenge ? CHALLENGE_ROUND_COUNT : NORMAL_ROUND_COUNT,
  }));

  const sweepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announcementTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outcomeSoundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set while the tab is hidden mid-sweep, so the visibility handler knows
  // to restart the sweep on return rather than treating "not sweeping" as
  // "round already resolved" (mirrors useTimingTapGame's pausedRef).
  const pausedMidSweepRef = useRef(false);
  const transitioningRef = useRef(false);
  const celebratedRef = useRef(false);

  // Mirror of the latest state for callbacks/timers; updated in an effect
  // (never during render) so it can't trip the refs-during-render rule.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const bestSession = useSyncExternalStore(noopSubscribe, readBest, zeroSnapshot);

  const clearTimers = useCallback(() => {
    if (sweepTimeoutRef.current) {
      clearTimeout(sweepTimeoutRef.current);
      sweepTimeoutRef.current = null;
    }
    if (announcementTimeoutRef.current) {
      clearTimeout(announcementTimeoutRef.current);
      announcementTimeoutRef.current = null;
    }
    if (outcomeSoundTimeoutRef.current) {
      clearTimeout(outcomeSoundTimeoutRef.current);
      outcomeSoundTimeoutRef.current = null;
    }
    pausedMidSweepRef.current = false;
  }, []);

  // ── Round lifecycle ───────────────────────────────────────────────

  /** Starts a fresh sweep for the round: seeded in challenge mode, freshly
   *  generated in solo mode. Schedules the deadline-based hand-off to the
   *  no-time-limit guessing phase. */
  const startSweep = useCallback(
    (difficulty: Difficulty, round: number) => {
      clearTimers();
      const seeded = challengeRounds?.[round - 1]?.sweep;
      const sweep = seeded ?? makeSweep(difficulty, Math.random, { reducedMotion });
      const startAt = performance.now();

      setState((s) => ({
        ...s,
        phase: 'sweeping',
        difficulty,
        sweep,
        sweepStartAt: startAt,
        guess: '',
        round,
        score: 0,
        result: null,
        announcement: null,
      }));
      play('whoosh');

      sweepTimeoutRef.current = setTimeout(() => {
        sweepTimeoutRef.current = null;
        setState((prev) => (prev.phase !== 'sweeping' ? prev : { ...prev, phase: 'guessing' }));
      }, sweep.sweepMs * SWEEP_GRACE);
    },
    [clearTimers, play, challengeRounds, reducedMotion]
  );

  const selectDifficulty = useCallback(
    (difficulty: Difficulty) => {
      setState((s) => ({
        ...s,
        difficulty,
        round: 1,
        score: 0,
        totalScore: 0,
        roundScores: [],
        isNewBestSession: false,
        totalRounds: NORMAL_ROUND_COUNT,
      }));
      startSweep(difficulty, 1);
    },
    [startSweep]
  );

  const startChallenge = useCallback(() => {
    if (!challengeRounds) return;
    setState((s) => ({ ...s, score: 0, totalScore: 0, roundScores: [] }));
    startSweep(challengeRounds[0].difficulty, 1);
  }, [startSweep, challengeRounds]);

  const resetToMenu = useCallback(() => {
    clearTimers();
    setState((s) => ({
      ...INITIAL_STATE,
      mode: s.mode,
      phase: s.mode === 'challenge' ? 'challenge-intro' : 'selecting-difficulty',
      totalRounds: s.totalRounds,
    }));
  }, [clearTimers]);

  // ── Number pad ────────────────────────────────────────────────────

  const appendDigit = useCallback((digit: string) => {
    setState((prev) => {
      if (prev.phase !== 'guessing') return prev;
      if (prev.guess.length >= MAX_GUESS_DIGITS) return prev;
      // A solitary leading zero is replaced rather than becoming "01".
      if (prev.guess === '0') return { ...prev, guess: digit };
      return { ...prev, guess: prev.guess + digit };
    });
  }, []);

  const backspace = useCallback(() => {
    setState((prev) => (prev.phase !== 'guessing' ? prev : { ...prev, guess: prev.guess.slice(0, -1) }));
  }, []);

  /** Locks in the typed guess and scores the round. */
  const submitGuess = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== 'guessing' || !prev.sweep || prev.guess === '') return prev;
      const guess = parseInt(prev.guess, 10);
      if (!Number.isFinite(guess)) return prev;

      const actual = prev.sweep.actualCount;
      const score = scoreGuess(actual, guess);

      return {
        ...prev,
        phase: 'results',
        score,
        totalScore: round2(prev.totalScore + score),
        roundScores: [...prev.roundScores, score],
        result: { actual, guess, score },
      };
    });
    play('confirm');
  }, [play]);

  // Outcome sound lands a beat after 'confirm' so they don't overlap —
  // mirrors useColorMatchGame's identical delayed reveal sound.
  useEffect(() => {
    if (state.phase !== 'results' || !state.result) return;
    const { actual, guess } = state.result;
    outcomeSoundTimeoutRef.current = setTimeout(() => {
      play(guess === actual ? 'success' : 'error');
    }, OUTCOME_SOUND_DELAY_MS);
    return () => {
      if (outcomeSoundTimeoutRef.current) {
        clearTimeout(outcomeSoundTimeoutRef.current);
        outcomeSoundTimeoutRef.current = null;
      }
    };
  }, [state.phase, state.result, play]);

  // Session/challenge end fanfare — fires once per completed run.
  useEffect(() => {
    if (state.phase !== 'session-complete' && state.phase !== 'challenge-complete') {
      celebratedRef.current = false;
      return;
    }
    if (celebratedRef.current) return;
    celebratedRef.current = true;
    play('celebrate');
  }, [state.phase, play]);

  // ── Advance ───────────────────────────────────────────────────────

  const nextRound = useCallback(() => {
    if (transitioningRef.current) return;
    const { difficulty, round, phase, mode, totalRounds, totalScore } = stateRef.current;
    if (!difficulty || phase !== 'results') return;
    transitioningRef.current = true;

    if (round >= totalRounds) {
      if (mode === 'challenge') {
        setState((s) => ({ ...s, phase: 'challenge-complete' }));
      } else {
        const isNewBestSession = saveBestSession(GAME_ID, totalScore);
        setState((s) => ({ ...s, phase: 'session-complete', isNewBestSession }));
      }
    } else {
      const nextDifficulty = challengeRounds?.[round]?.difficulty ?? difficulty;
      startSweep(nextDifficulty, round + 1);
    }

    setTimeout(() => {
      transitioningRef.current = false;
    }, 500);
  }, [startSweep, challengeRounds]);

  const replay = useCallback(() => {
    const { difficulty } = stateRef.current;
    if (difficulty) selectDifficulty(difficulty);
  }, [selectDifficulty]);

  // Backgrounding mid-sweep gives the player an unfair (or impossible)
  // counting window — restart the SAME sweep from the beginning on return
  // rather than resuming wherever it silently got to, and say so.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (stateRef.current.phase === 'sweeping') {
          if (sweepTimeoutRef.current) {
            clearTimeout(sweepTimeoutRef.current);
            sweepTimeoutRef.current = null;
          }
          pausedMidSweepRef.current = true;
        }
        return;
      }

      if (!pausedMidSweepRef.current) return;
      pausedMidSweepRef.current = false;

      const { sweep } = stateRef.current;
      if (!sweep) return;
      const restartAt = performance.now();

      setState((prev) =>
        prev.phase !== 'sweeping'
          ? prev
          : { ...prev, sweepStartAt: restartAt, announcement: 'Sweep restarted' }
      );
      play('whoosh');

      sweepTimeoutRef.current = setTimeout(() => {
        sweepTimeoutRef.current = null;
        setState((prev) => (prev.phase !== 'sweeping' ? prev : { ...prev, phase: 'guessing' }));
      }, sweep.sweepMs * SWEEP_GRACE);

      if (announcementTimeoutRef.current) clearTimeout(announcementTimeoutRef.current);
      announcementTimeoutRef.current = setTimeout(() => {
        announcementTimeoutRef.current = null;
        setState((prev) => (prev.announcement ? { ...prev, announcement: null } : prev));
      }, ANNOUNCEMENT_MS);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [play]);

  // Cleanup on unmount
  useEffect(() => clearTimers, [clearTimers]);

  return {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    appendDigit,
    backspace,
    submitGuess,
    nextRound,
    replay,
    resetToMenu,
  };
}
