'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Difficulty } from '@/types/game';
import { useSound } from '@/hooks/useSound';
import { usePlayBeacon } from '@/hooks/usePlayBeacon';
import { CHALLENGE_ROUND_COUNT } from '@/lib/challenge';
import {
  getLocalBestSession,
  ratingFromScore,
  round2,
  saveBestSession,
} from '@/utils/scoring';
import { GridFlashChallengeRound, getGridFlashChallengeRounds } from './challenge';
import {
  GRID_FLASH_DIFFICULTY,
  LEVEL_PAUSE_MS,
  LIVES_PER_ROUND,
  ROUND_END_DELAY_MS,
  SOLO_ROUND_COUNT,
  START_LEVEL,
  WRONG_FLASH_MS,
  calculateGridScore,
  generatePattern,
  maxLevelFor,
} from './constants';
import { GridFlashGameState } from './types';

const GAME_ID = 'grid-flash';

const INITIAL_STATE: GridFlashGameState = {
  phase: 'selecting-difficulty',
  mode: 'normal',
  difficulty: null,
  level: START_LEVEL,
  pattern: [],
  selected: [],
  wrongCell: null,
  lives: LIVES_PER_ROUND,
  peak: START_LEVEL - 1,
  flashKey: 0,
  round: 1,
  totalRounds: SOLO_ROUND_COUNT,
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

export interface UseGridFlashGameOptions {
  /** When set, the game runs as a seeded 3-round challenge. */
  challengeCode?: string;
}

export function useGridFlashGame({ challengeCode }: UseGridFlashGameOptions = {}) {
  usePlayBeacon(GAME_ID);
  const isChallenge = Boolean(challengeCode);
  // Deterministic per code, so every player's ladders match level by level
  const challengeRounds = useMemo<GridFlashChallengeRound[] | null>(
    () => (challengeCode ? getGridFlashChallengeRounds(challengeCode) : null),
    [challengeCode]
  );

  const [state, setState] = useState<GridFlashGameState>(() => ({
    ...INITIAL_STATE,
    mode: isChallenge ? 'challenge' : 'normal',
    phase: isChallenge ? 'challenge-intro' : 'selecting-difficulty',
    totalRounds: isChallenge ? CHALLENGE_ROUND_COUNT : SOLO_ROUND_COUNT,
  }));
  const { play } = useSound();

  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const levelPauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrongFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitioningRef = useRef(false);

  // Refs mirroring round-scoped values timers/handlers need synchronously,
  // without waiting on a render.
  const patternRef = useRef<number[]>([]);
  const selectedRef = useRef<Set<number>>(new Set());
  const livesRef = useRef(LIVES_PER_ROUND);
  const peakRef = useRef(START_LEVEL - 1);
  const levelRef = useRef(START_LEVEL);
  const difficultyRef = useRef<Difficulty | null>(null);
  const roundRef = useRef(1);
  // Guards a round against finalizing twice (a wrong tap at 0 lives racing
  // the max-level clear path).
  const resolvedRef = useRef(false);
  // Set while the tab is hidden during a 'flash' phase, so the visibility
  // handler knows to replay this level's flash rather than treating a
  // background tab as ordinary idle time.
  const hiddenDuringFlashRef = useRef(false);

  // Mirror of the latest state for callbacks; updated in an effect (never
  // during render) so it can't trip the refs-during-render rule.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const bestSession = useSyncExternalStore(noopSubscribe, readBest, zeroSnapshot);

  const clearTimers = useCallback(() => {
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }
    if (levelPauseTimeoutRef.current) {
      clearTimeout(levelPauseTimeoutRef.current);
      levelPauseTimeoutRef.current = null;
    }
    if (wrongFlashTimeoutRef.current) {
      clearTimeout(wrongFlashTimeoutRef.current);
      wrongFlashTimeoutRef.current = null;
    }
    if (roundEndTimeoutRef.current) {
      clearTimeout(roundEndTimeoutRef.current);
      roundEndTimeoutRef.current = null;
    }
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  }, []);

  // ── Level lifecycle ───────────────────────────────────────────────

  /** Lights a fresh level's pattern and starts its flash window. */
  const startLevel = useCallback(
    (difficulty: Difficulty, round: number, level: number) => {
      const cfg = GRID_FLASH_DIFFICULTY[difficulty];
      // Challenge levels are seeded so every player sees the same pattern
      const seededLevels = challengeRounds?.[round - 1]?.levels;
      const pattern = seededLevels?.[level - START_LEVEL] ?? generatePattern(cfg.cells, level);

      patternRef.current = pattern;
      selectedRef.current = new Set();
      levelRef.current = level;

      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = null;
      }

      setState((s) => ({
        ...s,
        phase: 'flash',
        level,
        pattern,
        selected: [],
        wrongCell: null,
        flashKey: s.flashKey + 1,
      }));
      play('glow');

      flashTimeoutRef.current = setTimeout(() => {
        setState((s) => (s.phase === 'flash' ? { ...s, phase: 'recall' } : s));
      }, cfg.flashMs);
    },
    [play, challengeRounds]
  );

  /** Replays the *current* level's flash from the top, same pattern —
   *  used after a visibility-hidden window ate the player's look. */
  const restartFlash = useCallback(() => {
    const difficulty = difficultyRef.current;
    if (!difficulty) return;
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }
    const cfg = GRID_FLASH_DIFFICULTY[difficulty];
    setState((s) => ({ ...s, phase: 'flash', selected: [], flashKey: s.flashKey + 1 }));
    play('glow');
    flashTimeoutRef.current = setTimeout(() => {
      setState((s) => (s.phase === 'flash' ? { ...s, phase: 'recall' } : s));
    }, cfg.flashMs);
  }, [play]);

  // ── Round lifecycle ───────────────────────────────────────────────

  const startRound = useCallback(
    (difficulty: Difficulty, round: number) => {
      clearTimers();
      livesRef.current = LIVES_PER_ROUND;
      peakRef.current = START_LEVEL - 1;
      difficultyRef.current = difficulty;
      roundRef.current = round;
      resolvedRef.current = false;
      hiddenDuringFlashRef.current = false;

      setState((s) => ({
        ...s,
        difficulty,
        round,
        lives: LIVES_PER_ROUND,
        peak: START_LEVEL - 1,
        score: 0,
        result: null,
      }));

      startLevel(difficulty, round, START_LEVEL);
    },
    [clearTimers, startLevel]
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
    play('click');
    setState((s) => ({
      ...INITIAL_STATE,
      mode: s.mode,
      phase: s.mode === 'challenge' ? 'challenge-intro' : 'selecting-difficulty',
      totalRounds: s.totalRounds,
    }));
  }, [clearTimers, play]);

  // ── Finish a round ───────────────────────────────────────────────

  const finalizeRound = useCallback(() => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    clearTimers();

    const difficulty = difficultyRef.current;
    if (!difficulty) return;
    const peak = peakRef.current;
    const score = calculateGridScore(peak, difficulty);
    const rating = ratingFromScore(score);
    const livesLost = LIVES_PER_ROUND - livesRef.current;

    setState((s) => ({
      ...s,
      phase: 'results',
      lives: livesRef.current,
      peak,
      score,
      totalScore: round2(s.totalScore + score),
      roundScores: [...s.roundScores, score],
      result: {
        peak,
        score,
        rating,
        livesLost,
        levelsCleared: Math.max(0, peak - (START_LEVEL - 1)),
      },
    }));
  }, [clearTimers]);

  // ── Tapping ───────────────────────────────────────────────────────

  const tapTile = useCallback(
    (index: number) => {
      if (stateRef.current.phase !== 'recall' || livesRef.current <= 0) return;
      const pattern = patternRef.current;

      if (!pattern.includes(index)) {
        if (selectedRef.current.has(index)) return;

        play('error');
        if (wrongFlashTimeoutRef.current) clearTimeout(wrongFlashTimeoutRef.current);
        setState((s) => ({ ...s, wrongCell: index }));
        wrongFlashTimeoutRef.current = setTimeout(() => {
          setState((s) => (s.wrongCell === index ? { ...s, wrongCell: null } : s));
        }, WRONG_FLASH_MS);

        livesRef.current = Math.max(0, livesRef.current - 1);
        const livesLeft = livesRef.current;
        setState((s) => ({ ...s, lives: livesLeft }));

        if (livesLeft <= 0) {
          roundEndTimeoutRef.current = setTimeout(finalizeRound, ROUND_END_DELAY_MS);
        }
        return;
      }

      // Already correctly tapped — idempotent, no double-count.
      if (selectedRef.current.has(index)) return;

      selectedRef.current.add(index);
      play('tap');
      setState((s) => ({ ...s, selected: Array.from(selectedRef.current) }));

      if (selectedRef.current.size < pattern.length) return;

      // Level fully reproduced.
      play('success');
      const level = levelRef.current;
      peakRef.current = Math.max(peakRef.current, level);
      const difficulty = difficultyRef.current!;
      const maxLevel = maxLevelFor(difficulty);

      setState((s) => ({ ...s, phase: 'level-complete', peak: peakRef.current }));

      if (level >= maxLevel) {
        levelPauseTimeoutRef.current = setTimeout(finalizeRound, LEVEL_PAUSE_MS);
      } else {
        levelPauseTimeoutRef.current = setTimeout(() => {
          startLevel(difficulty, roundRef.current, level + 1);
        }, LEVEL_PAUSE_MS);
      }
    },
    [play, finalizeRound, startLevel]
  );

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

    transitionTimeoutRef.current = setTimeout(() => {
      transitionTimeoutRef.current = null;
      transitioningRef.current = false;
    }, 500);
  }, [startRound, play, challengeRounds]);

  const replay = useCallback(() => {
    const { difficulty } = stateRef.current;
    if (difficulty) selectDifficulty(difficulty);
  }, [selectDifficulty]);

  // Backgrounding mid-flash must not quietly burn the player's memorize
  // window — replay the same level's flash from the top once the tab is
  // visible again, rather than scoring against a pattern they never saw.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (stateRef.current.phase === 'flash') hiddenDuringFlashRef.current = true;
        return;
      }
      if (!hiddenDuringFlashRef.current) return;
      hiddenDuringFlashRef.current = false;
      // A tap needs real input, so the phase can only have advanced from
      // 'flash' to 'recall' while hidden — never past it.
      if (stateRef.current.phase === 'flash' || stateRef.current.phase === 'recall') {
        restartFlash();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [restartFlash]);

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), [clearTimers]);

  return {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    tapTile,
    nextRound,
    replay,
    resetToMenu,
  };
}
