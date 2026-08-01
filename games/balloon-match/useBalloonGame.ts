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

/**
 * Fine-adjust step size (U8), keyed by difficulty — scales with the same
 * tolerance ramp as scoring, so a nudge helps without trivialising the
 * harder tiers. Units match `currentUnits` (0–100).
 */
export const BALLOON_ADJUST_STEP: Record<Difficulty, number> = {
  easy: 1,
  medium: 0.5,
  hard: 0.25,
};

/** Pure clamp used by the adjust step — exported so it can be unit tested
 *  without standing up the whole hook. */
export function adjustBalloonUnits(current: number, delta: number): number {
  return clamp(current + delta, 0, 100);
}

// useSyncExternalStore plumbing for the localStorage high score:
// server snapshot is 0, the real value arrives right after hydration.
const noopSubscribe = () => () => {};
const zeroSnapshot = () => 0;
const readBestSession = () => getLocalBestSession(GAME_ID);

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
  // Deadline timestamps (performance.now()-based) that the observe/inflate
  // countdowns derive their remaining time from, so a throttled/backgrounded
  // tab that only gets to run one tick every few seconds still reports the
  // correct time left instead of losing 1s per callback firing.
  const observeDeadlineRef = useRef(0);
  const inflateDeadlineRef = useRef(0);
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
  const bestSession = useSyncExternalStore(noopSubscribe, readBestSession, zeroSnapshot);

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

      // Countdown timer — derives remaining time from a deadline rather than
      // decrementing by 1 per tick, so a throttled/backgrounded tab (where
      // ticks coalesce) still reports correct time left instead of nearly
      // freezing. Interval-clear and ref mutation live here in the interval
      // callback, not inside the setState updater, which React may invoke
      // more than once.
      observeDeadlineRef.current = performance.now() + cfg.observeSeconds * 1000;
      observeTimerRef.current = setInterval(() => {
        const remaining = Math.ceil((observeDeadlineRef.current - performance.now()) / 1000);
        if (remaining <= 0) {
          clearInterval(observeTimerRef.current!);
          observeTimerRef.current = null;
          setState((prev) => ({ ...prev, observeTimeLeft: 0, phase: 'inflating' }));
          return;
        }
        setState((prev) =>
          prev.observeTimeLeft === remaining ? prev : { ...prev, observeTimeLeft: remaining }
        );
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
      // Scores from either the hold itself (timer ran out mid-hold) or the
      // fine-adjust step that now follows every release (U8) — this stays
      // the single scoring path either way.
      if (prev.phase !== 'inflating' && prev.phase !== 'adjusting') return prev;

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
  // When it hits zero the current size is locked in automatically. This now
  // spans both `inflating` and `adjusting` (U8): the timer keeps running
  // through the fine-adjust step and still auto-locks at zero, so Medium's
  // 5s / Hard's 3s pressure isn't silently deleted by adding a nudge step.
  // Difficulties with inflateSeconds: null (Easy) have no time limit, so
  // Easy's adjust step is untimed.
  // `inTimedPhase` (not `state.phase` itself) drives the deps so the effect
  // does NOT re-run — and doesn't reset the deadline — on the
  // inflating → adjusting transition; only entering/leaving the pair does.
  const inTimedPhase = state.phase === 'inflating' || state.phase === 'adjusting';
  useEffect(() => {
    if (!inTimedPhase) return;
    const inflateSeconds = DIFFICULTY_CONFIG[state.difficulty!].inflateSeconds;
    if (inflateSeconds === null) return;

    inflateDeadlineRef.current = performance.now() + inflateSeconds * 1000;

    const id = setInterval(() => {
      const s = stateRef.current;
      if (s.phase !== 'inflating' && s.phase !== 'adjusting') return;
      const remaining = Math.ceil((inflateDeadlineRef.current - performance.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(id);
        setState((prev) => ({ ...prev, inflateTimeLeft: 0 }));
        lockIn();
      } else {
        setState((prev) =>
          prev.inflateTimeLeft === remaining ? prev : { ...prev, inflateTimeLeft: remaining }
        );
      }
    }, 1000);

    return () => clearInterval(id);
  }, [inTimedPhase, state.difficulty, lockIn]);

  // ---------- Inflation hold mechanics ----------

  const startInflating = useCallback(() => {
    // usePressAndHold's `disabled` flag gates this to the inflating phase in
    // the common case, but AnimatePresence keeps the inflate zone mounted
    // during its exit animation, so a stray pointerdown can still land here
    // after the phase has moved on — check the live phase before creating
    // the interval, mirroring lockIn's phase guard.
    if (holdIntervalRef.current) return;
    if (stateRef.current.phase !== 'inflating') return;

    setState((s) => {
      if (s.phase !== 'inflating' || s.isHolding) return s;
      return { ...s, isHolding: true };
    });

    // Growth is wall-clock based (not per-tick) so throttled or dropped
    // intervals on slow devices don't slow the balloon down. dt is clamped
    // so a backgrounded/throttled tab (where ticks coalesce) can't let a
    // single tick carry several seconds of growth in one jump.
    let lastTick = performance.now();
    holdIntervalRef.current = setInterval(() => {
      const now = performance.now();
      const dt = Math.min((now - lastTick) / 1000, (TICK_MS / 1000) * 4);
      lastTick = now;
      setState((prev) => {
        if (!prev.isHolding || prev.phase !== 'inflating') return prev;
        const cfg = DIFFICULTY_CONFIG[prev.difficulty!];
        const next = clamp(prev.currentUnits + cfg.inflationSpeed * dt, 0, 100);
        return { ...prev, currentUnits: next };
      });
    }, TICK_MS);
  }, []);

  // Releasing the hold no longer scores the round directly (U8) — it drops
  // into the fine-adjust step instead, so the player can nudge before
  // confirming with `lockIn`. Also stops the growth interval immediately
  // rather than leaving it running no-ops until its own dt tick notices
  // isHolding went false.
  const stopInflating = useCallback(() => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setState((prev) => {
      if (prev.phase !== 'inflating') return prev;
      return { ...prev, phase: 'adjusting', isHolding: false };
    });
  }, []);

  /** Fine-adjust step (U8): nudge the current size by a difficulty-scaled
   *  amount, clamped to the same 0–100 range the hold produces. Available
   *  in every mode, including Daily/Friend challenges — one consistent rule. */
  const adjustUnits = useCallback((delta: number) => {
    setState((prev) => {
      if (prev.phase !== 'adjusting') return prev;
      return { ...prev, currentUnits: adjustBalloonUnits(prev.currentUnits, delta) };
    });
  }, []);

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
        const isNewBestSession = saveBestSession(GAME_ID, totalScore);
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

  // Backgrounding the tab mid-hold must not be exploitable (the growth loop
  // would otherwise resume from wherever it left off once refocused, after
  // however long the player kept it hidden) — end the hold, the same path a
  // pointer release takes. That now lands in `adjusting` rather than
  // scoring immediately, which is still safe: Easy's adjust step is
  // untimed anyway, and Medium/Hard's inflate timer keeps running off its
  // deadline (see `inTimedPhase` above) regardless of tab visibility, so a
  // hidden tab can't stall past the deadline either — it auto-locks same
  // as if the tab had stayed open.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && stateRef.current.isHolding) {
        stopInflating();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [stopInflating]);

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
    adjustUnits,
    lockIn,
    playAgain,
    resetToMenu,
  };
}
