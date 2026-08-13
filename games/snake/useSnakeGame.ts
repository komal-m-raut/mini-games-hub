'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Difficulty } from '@/types/game';
import { useSound } from '@/hooks/useSound';
import { usePlayBeacon } from '@/hooks/usePlayBeacon';
import { CHALLENGE_ROUND_COUNT } from '@/lib/challenge';
import { SnakeChallengeRound, getSnakeChallengeRounds } from './challenge';
import { CHALLENGE_ROUND_SECONDS, GAME_ID, scoreRound, tickMs } from './constants';
import { Direction, SnakeState, createInitialSnakeState, placeFood, step } from './engine';
import { SnakeGameState } from './types';

/** Wall-clock dt clamp for the rAF loop, matching every rAF loop in the app
 *  (see useTapFrenzyGame's MAX_DT / useBlockCountGame's… well, this one has
 *  no clamp of its own since block-count derives position from absolute
 *  elapsed time; Snake's tick loop is a fixed-step accumulator instead, so
 *  it clamps dt the way tap-frenzy does). A throttled/backgrounded tab can
 *  only starve frames, never let one frame's dt balloon past this. */
const MAX_DT_MS = 1000 / 15;
/** Safety cap on ticks processed in a single frame — the accumulator would
 *  never legitimately need more than a couple even after a stalled frame,
 *  given the dt clamp above; this just guards against a runaway loop. */
const MAX_TICKS_PER_FRAME = 10;
/** Direction inputs queue at most this many turns ahead of the sim. */
const MAX_QUEUED_DIRECTIONS = 2;

// ── Per-difficulty local best (raw foodEaten), try/catch guarded ──────
function bestKey(difficulty: Difficulty): string {
  return `mgh_snake_best_${difficulty}`;
}

function getBest(difficulty: Difficulty): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = Number(localStorage.getItem(bestKey(difficulty)));
    return Number.isFinite(raw) ? raw : 0;
  } catch {
    return 0;
  }
}

/** Saves iff it's a new best; returns whether it was. */
function saveBest(difficulty: Difficulty, value: number): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const prev = getBest(difficulty);
    if (value > prev) {
      localStorage.setItem(bestKey(difficulty), String(value));
      return true;
    }
  } catch {
    // Quota exceeded or private-mode storage denial — the run still "wins"
    // for this session, it just won't persist.
  }
  return false;
}

export interface UseSnakeGameOptions {
  /** When set, the game runs as a seeded 3-round challenge. */
  challengeCode?: string;
}

export function useSnakeGame({ challengeCode }: UseSnakeGameOptions = {}) {
  usePlayBeacon(GAME_ID);
  const isChallenge = Boolean(challengeCode);
  const reducedMotion = Boolean(useReducedMotion());
  const { play } = useSound();

  // Deterministic per code, so every player faces the identical food
  // sequence for identical play — see challenge.ts.
  const challengeRounds = useMemo<SnakeChallengeRound[] | null>(
    () => (challengeCode ? getSnakeChallengeRounds(challengeCode) : null),
    [challengeCode]
  );

  const [state, setState] = useState<SnakeGameState>(() => ({
    phase: isChallenge ? 'challenge-intro' : 'selecting-difficulty',
    mode: isChallenge ? 'challenge' : 'normal',
    difficulty: null,
    engine: null,
    round: 1,
    totalRounds: isChallenge ? CHALLENGE_ROUND_COUNT : 1,
    roundScores: [],
    lastRoundFoodEaten: 0,
    lastRoundDied: false,
    isNewBestSession: false,
    bestForDifficulty: 0,
    paused: false,
    timeLeft: CHALLENGE_ROUND_SECONDS,
  }));

  // Mirror of the latest state for callbacks/timers; updated in an effect
  // (never during render) so it can't trip the refs-during-render rule.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  // Up to MAX_QUEUED_DIRECTIONS pending turns, one dequeued per tick — see
  // engine.ts's step() for why only the *front* item's legality matters at
  // the moment it's actually processed.
  const directionQueueRef = useRef<Direction[]>([]);
  const currentRandRef = useRef<() => number>(Math.random);

  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef(0);
  const accRef = useRef(0);
  const runningRef = useRef(false);

  const roundTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundDeadlineRef = useRef(0);
  // Set at the moment a pause begins (manual, 'P', or the tab going
  // hidden) — resume() reads it to shift the round deadline forward by
  // exactly however long play was frozen, so a challenge round never loses
  // real seconds to a pause.
  const pausedAtRef = useRef<number | null>(null);

  const transitioningRef = useRef(false);
  const celebratedRef = useRef(false);

  const clearLoop = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (roundTimerRef.current) {
      clearInterval(roundTimerRef.current);
      roundTimerRef.current = null;
    }
  }, []);

  // ── Pause / resume ──────────────────────────────────────────────────
  // Freezing is a flag on the running phase, not a phase of its own: the
  // rAF loop simply stops accumulating tick time while `paused`, and the
  // round timer (below) freezes its display and shifts its deadline by the
  // pause's exact duration on resume — never loses or gains real seconds.

  const pause = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== 'running' || prev.paused) return prev;
      pausedAtRef.current = performance.now();
      return { ...prev, paused: true };
    });
  }, []);

  const resume = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== 'running' || !prev.paused) return prev;
      if (pausedAtRef.current !== null) {
        const pausedMs = performance.now() - pausedAtRef.current;
        pausedAtRef.current = null;
        if (prev.mode === 'challenge') roundDeadlineRef.current += pausedMs;
      }
      lastTsRef.current = performance.now();
      return { ...prev, paused: false };
    });
  }, []);

  /** Manual pause control (button / 'P' key) — plays a click on the way
   *  in, silent on the way out of a tab-hide pause (see resume()'s own
   *  'click' below for the audible half of that pair). */
  const togglePause = useCallback(() => {
    if (stateRef.current.paused) {
      resume();
      play('click');
    } else {
      play('click');
      pause();
    }
  }, [pause, resume, play]);

  // ── Round/run end ────────────────────────────────────────────────────

  const endRunSolo = useCallback(
    (engine: SnakeState, difficulty: Difficulty) => {
      clearLoop();
      const isNewBestSession = saveBest(difficulty, engine.foodEaten);
      setState((s) => ({
        ...s,
        engine,
        phase: 'game-over',
        isNewBestSession,
        bestForDifficulty: getBest(difficulty),
      }));
    },
    [clearLoop]
  );

  const endRoundChallenge = useCallback(
    (engine: SnakeState, died: boolean) => {
      clearLoop();
      setState((s) =>
        s.phase !== 'running'
          ? s
          : {
              ...s,
              engine,
              phase: 'results',
              roundScores: [...s.roundScores, scoreRound(engine.foodEaten)],
              lastRoundFoodEaten: engine.foodEaten,
              lastRoundDied: died,
            }
      );
    },
    [clearLoop]
  );

  // ── Tick ─────────────────────────────────────────────────────────────

  const doTick = useCallback(() => {
    const prev = stateRef.current;
    if (prev.phase !== 'running' || !prev.engine || prev.paused || !prev.difficulty) return;

    const queued = directionQueueRef.current.shift() ?? null;
    const nextEngine = step(prev.engine, queued);

    if (!nextEngine.alive) {
      play('fail');
      if (prev.mode === 'challenge') {
        endRoundChallenge(nextEngine, true);
      } else {
        endRunSolo(nextEngine, prev.difficulty);
      }
      return;
    }

    let engine = nextEngine;
    if (nextEngine.foodEaten > prev.engine.foodEaten) {
      const foodPos = placeFood(nextEngine, currentRandRef.current);
      engine = { ...nextEngine, foodPos };
      play('confirm');
    }

    setState((s) => (s.phase !== 'running' ? s : { ...s, engine }));
  }, [play, endRoundChallenge, endRunSolo]);

  // Named function expression (not the outer `const`) so the recursive rAF
  // call doesn't reference a binding before it's declared.
  const frameLoop = useCallback(
    function tick(now: number) {
      if (!runningRef.current) return;
      const dt = Math.min(now - lastTsRef.current, MAX_DT_MS);
      lastTsRef.current = now;

      const s = stateRef.current;
      if (s.phase === 'running' && !s.paused && s.engine?.alive && s.difficulty) {
        accRef.current += dt;
        let iterations = 0;
        while (iterations < MAX_TICKS_PER_FRAME) {
          const latest = stateRef.current;
          if (
            latest.phase !== 'running' ||
            latest.paused ||
            !latest.engine?.alive ||
            !latest.difficulty
          ) {
            break;
          }
          const interval = tickMs(latest.difficulty, latest.engine.foodEaten);
          if (accRef.current < interval) break;
          accRef.current -= interval;
          doTick();
          iterations++;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [doTick]
  );

  const beginLoop = useCallback(() => {
    lastTsRef.current = performance.now();
    accRef.current = 0;
    runningRef.current = true;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(frameLoop);
  }, [frameLoop]);

  /** Real-time 60s round countdown (challenge only) — deadline-based like
   *  every timer in the app, independent of the tick accumulator above. */
  const startRoundTimer = useCallback(() => {
    roundDeadlineRef.current = performance.now() + CHALLENGE_ROUND_SECONDS * 1000;
    let lastTickSecond = CHALLENGE_ROUND_SECONDS + 1;
    roundTimerRef.current = setInterval(() => {
      const prev = stateRef.current;
      if (prev.phase !== 'running' || prev.paused) return; // frozen; shifted on resume()
      const remaining = Math.ceil((roundDeadlineRef.current - performance.now()) / 1000);
      if (remaining <= 0) {
        if (roundTimerRef.current) {
          clearInterval(roundTimerRef.current);
          roundTimerRef.current = null;
        }
        if (prev.engine) endRoundChallenge(prev.engine, false);
        return;
      }
      setState((s) => (s.phase !== 'running' || s.timeLeft === remaining ? s : { ...s, timeLeft: remaining }));
      if (remaining <= 5 && remaining !== lastTickSecond) {
        lastTickSecond = remaining;
        play('tick');
      }
    }, 1000);
  }, [play, endRoundChallenge]);

  // ── Starting a run/round ─────────────────────────────────────────────

  const startSoloRun = useCallback(
    (difficulty: Difficulty) => {
      clearLoop();
      currentRandRef.current = Math.random;
      directionQueueRef.current = [];
      const engine = createInitialSnakeState(Math.random);
      setState((s) => ({
        ...s,
        phase: 'running',
        mode: 'normal',
        difficulty,
        engine,
        round: 1,
        totalRounds: 1,
        paused: false,
      }));
      beginLoop();
    },
    [clearLoop, beginLoop]
  );

  const startChallengeRound = useCallback(
    (round: number) => {
      if (!challengeRounds) return;
      const cfg = challengeRounds[round - 1];
      clearLoop();
      currentRandRef.current = cfg.rand;
      directionQueueRef.current = [];
      const engine = createInitialSnakeState(cfg.rand);
      setState((s) => ({
        ...s,
        phase: 'running',
        mode: 'challenge',
        difficulty: cfg.difficulty,
        engine,
        round,
        timeLeft: CHALLENGE_ROUND_SECONDS,
        paused: false,
      }));
      beginLoop();
      startRoundTimer();
    },
    [challengeRounds, clearLoop, beginLoop, startRoundTimer]
  );

  const selectDifficulty = useCallback(
    (difficulty: Difficulty) => {
      setState((s) => ({
        ...s,
        roundScores: [],
        isNewBestSession: false,
        bestForDifficulty: getBest(difficulty),
      }));
      startSoloRun(difficulty);
    },
    [startSoloRun]
  );

  const startChallenge = useCallback(() => {
    if (!challengeRounds) return;
    setState((s) => ({ ...s, roundScores: [] }));
    startChallengeRound(1);
  }, [challengeRounds, startChallengeRound]);

  const resetToMenu = useCallback(() => {
    clearLoop();
    setState((s) => ({
      phase: s.mode === 'challenge' ? 'challenge-intro' : 'selecting-difficulty',
      mode: s.mode,
      difficulty: null,
      engine: null,
      round: 1,
      totalRounds: s.mode === 'challenge' ? CHALLENGE_ROUND_COUNT : 1,
      roundScores: [],
      lastRoundFoodEaten: 0,
      lastRoundDied: false,
      isNewBestSession: false,
      bestForDifficulty: 0,
      paused: false,
      timeLeft: CHALLENGE_ROUND_SECONDS,
    }));
  }, [clearLoop]);

  // ── Input ────────────────────────────────────────────────────────────

  /** Queues a turn (keyboard, swipe or the on-screen d-pad all funnel
   *  through this). While paused, any direction input just resumes play —
   *  it is deliberately never also queued, so resuming never sneaks in a
   *  turn the player didn't mean to make yet. */
  const queueDirection = useCallback(
    (direction: Direction) => {
      const s = stateRef.current;
      if (s.phase !== 'running') return;
      if (s.paused) {
        resume();
        return;
      }
      const queue = directionQueueRef.current;
      const last = queue.length > 0 ? queue[queue.length - 1] : s.engine?.direction;
      if (direction === last) return;
      if (queue.length >= MAX_QUEUED_DIRECTIONS) return;
      queue.push(direction);
    },
    [resume]
  );

  // ── Advance (challenge rounds) ───────────────────────────────────────

  const nextRound = useCallback(() => {
    if (transitioningRef.current) return;
    const { round, phase, totalRounds } = stateRef.current;
    if (phase !== 'results') return;
    transitioningRef.current = true;

    if (round >= totalRounds) {
      setState((s) => ({ ...s, phase: 'challenge-complete' }));
    } else {
      startChallengeRound(round + 1);
    }

    setTimeout(() => {
      transitioningRef.current = false;
    }, 500);
  }, [startChallengeRound]);

  /** Solo "Play Again" — same difficulty, fresh run. */
  const replay = useCallback(() => {
    const { difficulty } = stateRef.current;
    if (difficulty) startSoloRun(difficulty);
  }, [startSoloRun]);

  // Backgrounding mid-run must not silently burn a challenge round's clock
  // or let the snake keep ticking off-screen — freeze exactly like a
  // manual pause. Never auto-resumes; the player taps/presses a key.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && stateRef.current.phase === 'running' && !stateRef.current.paused) {
        pause();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [pause]);

  // Session/challenge end fanfare — fires once per completed run.
  useEffect(() => {
    if (state.phase !== 'game-over' && state.phase !== 'challenge-complete') {
      celebratedRef.current = false;
      return;
    }
    if (celebratedRef.current) return;
    celebratedRef.current = true;
    play('celebrate');
  }, [state.phase, play]);

  // Cleanup on unmount
  useEffect(() => clearLoop, [clearLoop]);

  return {
    state,
    reducedMotion,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    queueDirection,
    togglePause,
    resume,
    nextRound,
    replay,
    resetToMenu,
  };
}
