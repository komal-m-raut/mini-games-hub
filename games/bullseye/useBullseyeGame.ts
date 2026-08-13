'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Difficulty } from '@/types/game';
import { useSound } from '@/hooks/useSound';
import { usePlayBeacon } from '@/hooks/usePlayBeacon';
import { CHALLENGE_ROUND_COUNT } from '@/lib/challenge';
import { getLocalBestSession, round2, saveBestSession } from '@/utils/scoring';
import {
  BullseyeChallengeRound,
  DartConfig,
  getBullseyeChallengeRounds,
  makeBullseyeRound,
} from './challenge';
import {
  BOARD_CENTER,
  BOARD_RADIUS,
  BULLSEYE_DIFFICULTY,
  CELEBRATE_ACCURACY,
  DARTS_PER_ROUND,
  SOLO_ROUND_COUNT,
  dartAccuracy,
  getRingLabel,
  scoreRound,
} from './constants';
import { OscillatorConfig, positionAt, steppedPositionAt } from './oscillator';
import { BullseyeGameState, DartResult } from './types';

const GAME_ID = 'bullseye';
/** How long a landed dart holds on screen before the next one (or the round
 *  result) takes over — longer on a bullseye so the flash actually reads. */
const LANDING_HOLD_MS = 650;
const CELEBRATE_HOLD_MS = 950;
/** Reduced motion: discrete positions per full oscillator cycle. */
const REDUCED_MOTION_STEPS = 12;

const INITIAL_STATE: BullseyeGameState = {
  phase: 'selecting-difficulty',
  mode: 'normal',
  difficulty: null,
  round: 1,
  totalRounds: SOLO_ROUND_COUNT,
  dartIndex: 1,
  darts: [],
  lockedY: null,
  aimPosition: 50,
  lastDart: null,
  score: 0,
  roundAccuracy: 0,
  totalScore: 0,
  roundScores: [],
  isNewBestSession: false,
};

// localStorage best session, hydration-safe (server snapshot is 0)
const noopSubscribe = () => () => {};
const zeroSnapshot = () => 0;
const readBest = () => getLocalBestSession(GAME_ID);

export interface UseBullseyeGameOptions {
  /** When set, the game runs as a seeded 3-round challenge. */
  challengeCode?: string;
}

export function useBullseyeGame({ challengeCode }: UseBullseyeGameOptions = {}) {
  usePlayBeacon(GAME_ID);
  const isChallenge = Boolean(challengeCode);
  const reducedMotion = Boolean(useReducedMotion());

  // Deterministic per code, so every player throws the identical 15 darts.
  const challengeRounds = useMemo<BullseyeChallengeRound[] | null>(
    () => (challengeCode ? getBullseyeChallengeRounds(challengeCode) : null),
    [challengeCode]
  );

  const [state, setState] = useState<BullseyeGameState>(() => ({
    ...INITIAL_STATE,
    mode: isChallenge ? 'challenge' : 'normal',
    phase: isChallenge ? 'challenge-intro' : 'selecting-difficulty',
    totalRounds: isChallenge ? CHALLENGE_ROUND_COUNT : SOLO_ROUND_COUNT,
  }));
  const { play } = useSound();

  // Mirror of the latest state for callbacks/timeouts; updated in an effect
  // (never during render) so it can't trip the refs-during-render rule.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  // This round's 5 seeded (or freshly rolled) dart configs.
  const dartConfigsRef = useRef<DartConfig[]>([]);

  const rafRef = useRef<number | null>(null);
  const landingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // performance.now() the *current* axis (Y or X) started aiming from —
  // elapsed = now - axisStartRef feeds the oscillator directly, so a
  // throttled/backgrounded frame just samples a later point on the same
  // curve instead of accumulating per-frame error.
  const axisStartRef = useRef(0);
  // Set while a visibility pause has interrupted an in-progress aim, so the
  // resume handler can shift the deadline instead of losing elapsed time.
  const pausedAtRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  // Guards an axis lock against a second tap while its resolution (state
  // update + phase change) is still in flight.
  const resolvedRef = useRef(false);
  const transitioningRef = useRef(false);

  const bestSession = useSyncExternalStore(noopSubscribe, readBest, zeroSnapshot);

  const clearTimers = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (landingTimeoutRef.current) {
      clearTimeout(landingTimeoutRef.current);
      landingTimeoutRef.current = null;
    }
    runningRef.current = false;
    pausedAtRef.current = null;
  }, []);

  // ── Motion loop ──────────────────────────────────────────────────
  // Unlike Timing Tap's stepPosition (a per-frame accumulator), positionAt
  // is a pure function of elapsed time, so the loop is a dumb sampler: no
  // dt accumulation, nothing to clamp for correctness — a dropped frame just
  // means the next one samples a later point on the same curve.

  const sampleAxis = useCallback(
    (axis: 'y' | 'x', elapsedMs: number): number => {
      const dart = dartConfigsRef.current[stateRef.current.dartIndex - 1];
      const difficulty = stateRef.current.difficulty;
      if (!dart || !difficulty) return 50;
      const diffCfg = BULLSEYE_DIFFICULTY[difficulty];
      const oscCfg: OscillatorConfig =
        axis === 'y'
          ? { frequencyHz: diffCfg.frequencyHz, phaseOffset: dart.yPhase, legSpeedScales: dart.yLegScales }
          : { frequencyHz: diffCfg.frequencyHz, phaseOffset: dart.xPhase, legSpeedScales: dart.xLegScales };
      return reducedMotion
        ? steppedPositionAt(oscCfg, elapsedMs, REDUCED_MOTION_STEPS)
        : positionAt(oscCfg, elapsedMs);
    },
    [reducedMotion]
  );

  // Named function expression (not the outer `const`) so the recursive rAF
  // call doesn't reference a binding before it's declared.
  const beginAxisLoop = useCallback(
    (axis: 'y' | 'x') => {
      runningRef.current = true;
      const phaseName = axis === 'y' ? 'aiming-y' : 'aiming-x';
      const tick = function loop(now: number) {
        if (!runningRef.current) return;
        const elapsed = Math.max(0, now - axisStartRef.current);
        const value = sampleAxis(axis, elapsed);
        setState((s) => (s.phase === phaseName ? { ...s, aimPosition: value } : s));
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [sampleAxis]
  );

  // ── Dart lifecycle ───────────────────────────────────────────────

  const startDart = useCallback(
    (dartIdx: number) => {
      resolvedRef.current = false;
      axisStartRef.current = performance.now();
      pausedAtRef.current = null;
      setState((s) => ({
        ...s,
        phase: 'aiming-y',
        dartIndex: dartIdx,
        lockedY: null,
        aimPosition: 50,
      }));
      beginAxisLoop('y');
    },
    [beginAxisLoop]
  );

  const startRound = useCallback(
    (difficulty: Difficulty, round: number) => {
      clearTimers();
      const seeded = challengeRounds?.[round - 1];
      dartConfigsRef.current = seeded?.darts ?? makeBullseyeRound(difficulty, Math.random).darts;
      setState((s) => ({
        ...s,
        phase: 'aiming-y',
        difficulty,
        round,
        dartIndex: 1,
        darts: [],
        lockedY: null,
        lastDart: null,
        aimPosition: 50,
        score: 0,
        roundAccuracy: 0,
      }));
      startDart(1);
    },
    [clearTimers, challengeRounds, startDart]
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

  // ── Aim lock ─────────────────────────────────────────────────────

  const lockAim = useCallback(() => {
    const s = stateRef.current;
    if (resolvedRef.current || (s.phase !== 'aiming-y' && s.phase !== 'aiming-x')) return;
    resolvedRef.current = true;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    runningRef.current = false;

    const axis: 'y' | 'x' = s.phase === 'aiming-y' ? 'y' : 'x';
    const elapsed = Math.max(0, performance.now() - axisStartRef.current);
    const value = sampleAxis(axis, elapsed);

    if (axis === 'y') {
      play('click');
      resolvedRef.current = false;
      axisStartRef.current = performance.now();
      setState((prev) => ({ ...prev, phase: 'aiming-x', lockedY: value, aimPosition: 50 }));
      beginAxisLoop('x');
      return;
    }

    // Both axes locked — apply the seeded landing wobble and score the dart.
    const dart = dartConfigsRef.current[s.dartIndex - 1];
    const lockedY = s.lockedY ?? BOARD_CENTER;
    const wobble = dart?.wobble ?? { dx: 0, dy: 0 };
    const x = value + wobble.dx;
    const y = lockedY + wobble.dy;
    const dist = Math.hypot(x - BOARD_CENTER, y - BOARD_CENTER);
    const accuracy = dartAccuracy(dist, BOARD_RADIUS);
    const ring = getRingLabel(dist, BOARD_RADIUS);
    const result: DartResult = { x, y, dist, accuracy, ring };
    const isBullseye = accuracy >= CELEBRATE_ACCURACY;

    play(isBullseye ? 'celebrate' : 'tap');
    setState((prev) => ({
      ...prev,
      phase: 'landing',
      darts: [...prev.darts, result],
      lastDart: result,
    }));

    landingTimeoutRef.current = setTimeout(() => {
      const cur = stateRef.current;
      if (cur.darts.length >= DARTS_PER_ROUND) {
        const accuracies = cur.darts.map((d) => d.accuracy);
        const roundAccuracy = round2(accuracies.reduce((a, b) => a + b, 0) / accuracies.length);
        const roundScore = scoreRound(accuracies);
        setState((prev) => ({
          ...prev,
          phase: 'round-result',
          score: roundScore,
          roundAccuracy,
          totalScore: round2(prev.totalScore + roundScore),
          roundScores: [...prev.roundScores, roundScore],
        }));
      } else {
        startDart(cur.dartIndex + 1);
      }
    }, isBullseye ? CELEBRATE_HOLD_MS : LANDING_HOLD_MS);
  }, [beginAxisLoop, play, sampleAxis, startDart]);

  // ── Advance ───────────────────────────────────────────────────────

  const nextRound = useCallback(() => {
    if (transitioningRef.current) return;
    const { difficulty, round, phase, mode, totalRounds, totalScore } = stateRef.current;
    if (!difficulty || phase !== 'round-result') return;
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

  // Backgrounding mid-aim must not lock in a tap the player never made —
  // freeze the loop, then resume by shifting the axis deadline forward by
  // however long the tab was hidden, so elapsed time (and therefore the
  // sampled position) picks up exactly where it left off.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (runningRef.current) {
          runningRef.current = false;
          pausedAtRef.current = performance.now();
          if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
        }
      } else if (pausedAtRef.current !== null) {
        const pausedMs = performance.now() - pausedAtRef.current;
        axisStartRef.current += pausedMs;
        pausedAtRef.current = null;
        const phase = stateRef.current.phase;
        if (phase === 'aiming-y') beginAxisLoop('y');
        else if (phase === 'aiming-x') beginAxisLoop('x');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [beginAxisLoop]);

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), [clearTimers]);

  return {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    lockAim,
    nextRound,
    replay,
    resetToMenu,
  };
}
