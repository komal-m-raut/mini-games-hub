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
import { usePlayBeacon } from '@/hooks/usePlayBeacon';
import { CHALLENGE_ROUND_COUNT } from '@/lib/challenge';
import { getLocalBestSession, round2, saveBestSession } from '@/utils/scoring';
import { FrenzyChallengeRound, getFrenzyChallengeRounds } from './challenge';
import {
  COMBO_LATENCY_MS,
  COUNTDOWN_SECONDS,
  GAME_ID,
  MISS_GAP_MS,
  ROUND_SECONDS,
  TAP_FRENZY_DIFFICULTY,
  TOTAL_ROUNDS,
  TargetSpawn,
  makeTargetStream,
  scoreRound,
} from './constants';
import { FrenzyGameState, RoundResult, RoundStats } from './types';

/** Wall-clock dt clamp for the rAF loop — a throttled/backgrounded tab can
 *  only starve frames, never let a single frame's `elapsedMs` step jump
 *  ahead by more than this. Combined with resuming the loop fresh (see the
 *  visibilitychange handler below), this is what makes a hidden target's
 *  clock "freeze" instead of resolving the instant the tab regains focus. */
const MAX_DT = 1 / 15;

const INITIAL_STATE: FrenzyGameState = {
  phase: 'selecting-difficulty',
  mode: 'normal',
  difficulty: null,
  countdown: COUNTDOWN_SECONDS,
  round: 1,
  totalRounds: TOTAL_ROUNDS,
  score: 0,
  totalScore: 0,
  roundScores: [],
  result: null,
  isNewBestSession: false,
  timeLeft: ROUND_SECONDS,
  target: null,
  spawned: 0,
  hits: 0,
  totalLatencyMs: 0,
  combo: 0,
  bestCombo: 0,
};

// localStorage best session, hydration-safe (server snapshot is 0)
const noopSubscribe = () => () => {};
const zeroSnapshot = () => 0;
const readBest = () => getLocalBestSession(GAME_ID);

/** Mutable per-target bookkeeping the rAF loop advances every frame — kept
 *  outside React state since it changes at 60fps and nothing needs to
 *  re-render off it directly (the `progress` MotionValue is what the visual
 *  actually reads). */
interface LiveTargetClock {
  id: number;
  lifetimeMs: number;
  elapsedMs: number;
}

export interface UseTapFrenzyGameOptions {
  /** When set, the game runs as a seeded 3-round challenge. */
  challengeCode?: string;
}

export function useTapFrenzyGame({ challengeCode }: UseTapFrenzyGameOptions = {}) {
  usePlayBeacon(GAME_ID);
  const isChallenge = Boolean(challengeCode);
  // Deterministic per code, so every player faces the identical target sequence
  const challengeRounds = useMemo<FrenzyChallengeRound[] | null>(
    () => (challengeCode ? getFrenzyChallengeRounds(challengeCode) : null),
    [challengeCode]
  );

  const [state, setState] = useState<FrenzyGameState>(() => ({
    ...INITIAL_STATE,
    mode: isChallenge ? 'challenge' : 'normal',
    phase: isChallenge ? 'challenge-intro' : 'selecting-difficulty',
    totalRounds: isChallenge ? CHALLENGE_ROUND_COUNT : TOTAL_ROUNDS,
  }));
  const { play } = useSound();

  // Shrink/fade progress for the current target, 0 → 1 over its lifetime.
  // Lives outside React state — a 60fps setState would re-render the whole
  // tree every frame — and is read directly by Target.tsx via useTransform.
  const progress = useMotionValue(0);

  const bestSession = useSyncExternalStore(noopSubscribe, readBest, zeroSnapshot);

  // Mirror of the latest state for callbacks; updated in an effect (never
  // during render) so it can't trip the refs-during-render rule.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownDeadlineRef = useRef(0);
  const roundTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundDeadlineRef = useRef(0);
  const transitioningRef = useRef(false);

  // rAF bookkeeping for the shrink/expiry loop.
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef(0);
  const runningRef = useRef(false);
  // The live target's clock (hit/expiry deadline), or null while a target
  // isn't currently showing (the post-miss gap).
  const targetRef = useRef<LiveTargetClock | null>(null);
  // The post-miss gap's own clock, or null while a target is live.
  const gapRef = useRef<{ elapsedMs: number } | null>(null);
  // Guards the *current* target against double-resolution (a tap racing an
  // expiry) — reset to false on every fresh spawn.
  const resolvedRef = useRef(false);
  const targetIdRef = useRef(0);

  // Position stream: solo pulls live from a fresh generator per round;
  // challenge indexes into that round's pre-seeded array.
  const soloStreamRef = useRef<Generator<TargetSpawn, never, void> | null>(null);
  const positionIndexRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (roundTimerRef.current) {
      clearInterval(roundTimerRef.current);
      roundTimerRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    runningRef.current = false;
    targetRef.current = null;
    gapRef.current = null;
  }, []);

  /** Next target position for a round — the seeded sequence for a challenge
   *  round, or a live draw from a fresh solo stream. */
  const nextSpawn = useCallback(
    (difficulty: Difficulty, round: number): TargetSpawn => {
      const seeded = challengeRounds?.[round - 1];
      if (seeded) {
        const spawn = seeded.positions[positionIndexRef.current % seeded.positions.length];
        positionIndexRef.current += 1;
        return spawn;
      }
      if (!soloStreamRef.current) {
        soloStreamRef.current = makeTargetStream(difficulty, Math.random);
      }
      return soloStreamRef.current.next().value;
    },
    [challengeRounds]
  );

  // ── Target lifecycle ────────────────────────────────────────────────

  /** Shows a fresh target — spawn-on-resolve, called immediately on a hit
   *  and after the post-miss gap. */
  const spawnTarget = useCallback(
    (difficulty: Difficulty, round: number) => {
      const spawn = nextSpawn(difficulty, round);
      const cfg = TAP_FRENZY_DIFFICULTY[difficulty];
      const id = targetIdRef.current++;

      targetRef.current = { id, lifetimeMs: cfg.lifetimeMs, elapsedMs: 0 };
      resolvedRef.current = false;
      progress.set(0);

      setState((prev) =>
        prev.phase !== 'running'
          ? prev
          : {
              ...prev,
              spawned: prev.spawned + 1,
              target: { id, x: spawn.x, y: spawn.y, radius: cfg.radius, lifetimeMs: cfg.lifetimeMs },
            }
      );
    },
    [nextSpawn, progress]
  );

  /** Target lifetime ran out before it was tapped — a miss, never a hard
   *  score penalty beyond the lost hitRate point (it was already counted
   *  into `spawned` at spawn time). Breaks the combo; next target spawns
   *  after a short gap. */
  const resolveMiss = useCallback(() => {
    resolvedRef.current = true;
    targetRef.current = null;
    gapRef.current = { elapsedMs: 0 };
    play('fail');
    setState((prev) => (prev.phase !== 'running' ? prev : { ...prev, combo: 0, target: null }));
  }, [play]);

  // ── Motion loop ──────────────────────────────────────────────────────

  // Named function expression (not the outer `const`) so the recursive rAF
  // call doesn't reference a binding before it's declared.
  const frameLoop = useCallback(
    function tick(now: number) {
      if (!runningRef.current) return;
      const dt = Math.min((now - lastTsRef.current) / 1000, MAX_DT);
      lastTsRef.current = now;

      if (targetRef.current) {
        const t = targetRef.current;
        t.elapsedMs = Math.min(t.lifetimeMs, t.elapsedMs + dt * 1000);
        progress.set(t.elapsedMs / t.lifetimeMs);
        if (t.elapsedMs >= t.lifetimeMs && !resolvedRef.current) {
          resolveMiss();
        }
      } else if (gapRef.current) {
        gapRef.current.elapsedMs += dt * 1000;
        if (gapRef.current.elapsedMs >= MISS_GAP_MS) {
          gapRef.current = null;
          const { difficulty, round } = stateRef.current;
          if (difficulty) spawnTarget(difficulty, round);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [progress, resolveMiss, spawnTarget]
  );

  // ── Round end ──────────────────────────────────────────────────────

  const endRound = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    targetRef.current = null;
    gapRef.current = null;

    const { spawned, hits, totalLatencyMs, bestCombo } = stateRef.current;
    const stats: RoundStats = { spawned, hits, totalLatencyMs, bestCombo };
    const hitRate = spawned > 0 ? hits / spawned : 0;
    const meanHitMs = hits > 0 ? totalLatencyMs / hits : 0;
    const score = scoreRound(stats);
    const result: RoundResult = { ...stats, hitRate, meanHitMs, score };

    setState((prev) =>
      prev.phase !== 'running'
        ? prev
        : {
            ...prev,
            phase: 'results',
            target: null,
            result,
            score,
            totalScore: round2(prev.totalScore + score),
            roundScores: [...prev.roundScores, score],
          }
    );
  }, []);

  // ── Round lifecycle ───────────────────────────────────────────────

  /** Starts the 30s timer and the target stream once the countdown ends. */
  const beginRunning = useCallback(
    (difficulty: Difficulty, round: number) => {
      positionIndexRef.current = 0;
      soloStreamRef.current = null;
      resolvedRef.current = false;
      targetRef.current = null;
      gapRef.current = null;
      progress.set(0);

      setState((s) => ({
        ...s,
        phase: 'running',
        timeLeft: ROUND_SECONDS,
        target: null,
        spawned: 0,
        hits: 0,
        totalLatencyMs: 0,
        combo: 0,
        bestCombo: 0,
        result: null,
      }));

      // Deadline-based, robust to a throttled/backgrounded tab (see the
      // visibilitychange handler, which shifts this deadline forward by
      // however long the tab was hidden rather than pausing the interval).
      roundDeadlineRef.current = performance.now() + ROUND_SECONDS * 1000;
      let lastTickSecond = ROUND_SECONDS + 1;
      roundTimerRef.current = setInterval(() => {
        const remaining = Math.ceil((roundDeadlineRef.current - performance.now()) / 1000);
        if (remaining <= 0) {
          clearInterval(roundTimerRef.current!);
          roundTimerRef.current = null;
          endRound();
          return;
        }
        setState((prev) =>
          prev.phase !== 'running' || prev.timeLeft === remaining
            ? prev
            : { ...prev, timeLeft: remaining }
        );
        if (remaining <= 5 && remaining !== lastTickSecond) {
          lastTickSecond = remaining;
          play('tick');
        }
      }, 1000);

      runningRef.current = true;
      lastTsRef.current = performance.now();
      rafRef.current = requestAnimationFrame(frameLoop);

      spawnTarget(difficulty, round);
    },
    [play, progress, frameLoop, spawnTarget, endRound]
  );

  /** Seeds the round, then runs the "3 · 2 · 1" countdown before it starts. */
  const startRound = useCallback(
    (difficulty: Difficulty, round: number) => {
      clearTimers();
      setState((s) => ({
        ...s,
        phase: 'countdown',
        difficulty,
        countdown: COUNTDOWN_SECONDS,
        round,
        score: 0,
        result: null,
      }));

      play('tick');
      countdownDeadlineRef.current = performance.now() + COUNTDOWN_SECONDS * 1000;
      countdownTimerRef.current = setInterval(() => {
        const remaining = Math.ceil((countdownDeadlineRef.current - performance.now()) / 1000);
        if (remaining <= 0) {
          clearInterval(countdownTimerRef.current!);
          countdownTimerRef.current = null;
          beginRunning(difficulty, round);
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
    [clearTimers, play, beginRunning]
  );

  const selectDifficulty = useCallback(
    (difficulty: Difficulty) => {
      play('click');
      setState((s) => ({
        ...s,
        difficulty,
        round: 1,
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
    setState((s) => ({ ...s, totalScore: 0, roundScores: [] }));
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

  // ── Input ────────────────────────────────────────────────────────

  /** The live target itself was tapped — a hit. Idempotent per target (the
   *  hook guards it), and the next target spawns immediately. */
  const hit = useCallback(() => {
    const { phase, difficulty, round } = stateRef.current;
    if (resolvedRef.current || phase !== 'running' || !targetRef.current || !difficulty) return;
    resolvedRef.current = true;
    const latency = targetRef.current.elapsedMs;
    targetRef.current = null;
    play('tap');

    setState((prev) => {
      if (prev.phase !== 'running') return prev;
      const fast = latency <= COMBO_LATENCY_MS;
      const combo = fast ? prev.combo + 1 : prev.combo;
      return {
        ...prev,
        hits: prev.hits + 1,
        totalLatencyMs: prev.totalLatencyMs + latency,
        combo,
        bestCombo: Math.max(prev.bestCombo, combo),
        target: null,
      };
    });

    spawnTarget(difficulty, round);
  }, [play, spawnTarget]);

  /** The arena background was tapped, not the target — breaks the combo (a
   *  small "error" cue) but is never scored as a miss; the live target, if
   *  any, is untouched and keeps running its own clock. */
  const emptyTap = useCallback(() => {
    if (stateRef.current.phase !== 'running') return;
    play('error');
    setState((prev) => (prev.phase !== 'running' || prev.combo === 0 ? prev : { ...prev, combo: 0 }));
  }, [play]);

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
      play('celebrate');
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

  // Backgrounding mid-round must not silently burn the player's 30s or
  // instantly expire whatever target was on screen. The round's own
  // deadline is shifted forward by however long the tab was hidden (the
  // countdown's deadline, similarly, if backgrounded before play starts) —
  // the same tolerant-of-jitter approach every deadline-based timer in this
  // app uses. The target's own clock needs no such bookkeeping: pausing the
  // rAF loop simply stops its `elapsedMs` accumulator from advancing, and
  // resuming it fresh (dt reset) picks the shrink back up exactly where it
  // left off, rather than jumping to reflect the wall-clock hidden time.
  useEffect(() => {
    let hiddenAt: number | null = null;
    const onVisibilityChange = () => {
      if (document.hidden) {
        hiddenAt = performance.now();
        if (runningRef.current) {
          runningRef.current = false;
          if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
        }
      } else if (hiddenAt !== null) {
        const hiddenMs = performance.now() - hiddenAt;
        hiddenAt = null;
        if (stateRef.current.phase === 'countdown') {
          countdownDeadlineRef.current += hiddenMs;
        } else if (stateRef.current.phase === 'running') {
          roundDeadlineRef.current += hiddenMs;
          runningRef.current = true;
          lastTsRef.current = performance.now();
          rafRef.current = requestAnimationFrame(frameLoop);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [frameLoop]);

  // Cleanup on unmount
  useEffect(() => clearTimers, [clearTimers]);

  return {
    state,
    bestSession,
    challengeRounds,
    progress: progress as MotionValue<number>,
    selectDifficulty,
    startChallenge,
    hit,
    emptyTap,
    nextRound,
    replay,
    resetToMenu,
  };
}
