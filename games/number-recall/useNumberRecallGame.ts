'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Difficulty } from '@/types/game';
import { useSound } from '@/hooks/useSound';
import { usePlayBeacon } from '@/hooks/usePlayBeacon';
import { CHALLENGE_ROUND_COUNT } from '@/lib/challenge';
import { getLocalBestSession, round2, saveBestSession } from '@/utils/scoring';
import { RecallChallengeRound, getRecallChallengeRounds } from './challenge';
import {
  RECALL_DIFFICULTY,
  SOLO_ROUND_COUNT,
  firstMismatchIndex,
  getDisplayMs,
  getRecallRating,
  makeDigits,
  scoreRound,
} from './constants';
import { RecallGameState } from './types';

const GAME_ID = 'number-recall';
/** Pause after a correct recall, before the next (longer) number appears. */
const LEVEL_UP_DELAY_MS = 500;

const INITIAL_STATE: RecallGameState = {
  phase: 'selecting-difficulty',
  mode: 'normal',
  difficulty: null,
  target: '',
  entry: '',
  level: 0,
  round: 1,
  totalRounds: SOLO_ROUND_COUNT,
  score: 0,
  totalScore: 0,
  roundScores: [],
  result: null,
  displayAttempt: 0,
  isNewBestSession: false,
};

// localStorage best session, hydration-safe (server snapshot is 0)
const noopSubscribe = () => () => {};
const zeroSnapshot = () => 0;
const readBest = () => getLocalBestSession(GAME_ID);

export interface UseNumberRecallGameOptions {
  /** When set, the game runs as a seeded 3-round challenge. */
  challengeCode?: string;
}

export function useNumberRecallGame({ challengeCode }: UseNumberRecallGameOptions = {}) {
  usePlayBeacon(GAME_ID);
  const isChallenge = Boolean(challengeCode);
  // Deterministic per code, so every player faces the identical ladders
  const challengeRounds = useMemo<RecallChallengeRound[] | null>(
    () => (challengeCode ? getRecallChallengeRounds(challengeCode) : null),
    [challengeCode]
  );

  const [state, setState] = useState<RecallGameState>(() => ({
    ...INITIAL_STATE,
    mode: isChallenge ? 'challenge' : 'normal',
    phase: isChallenge ? 'challenge-intro' : 'selecting-difficulty',
    totalRounds: isChallenge ? CHALLENGE_ROUND_COUNT : SOLO_ROUND_COUNT,
  }));
  const { play } = useSound();

  const displayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const levelUpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitioningRef = useRef(false);
  // Guards a single submit against a synchronous double-fire (e.g. Enter
  // triggering both our keydown handler and a focused button's own click) —
  // state updates from setState aren't visible on stateRef until after the
  // next render, so the phase check alone can't catch a same-tick repeat.
  const submitLockRef = useRef(false);
  // Set when the tab was hidden mid-display, so the visibility handler knows
  // to restart the display window fresh rather than resume a stale timer.
  const hiddenDuringDisplayRef = useRef(false);

  // Mirror of the latest state for callbacks; updated in an effect (never
  // during render) so it can't trip the refs-during-render rule.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const bestSession = useSyncExternalStore(noopSubscribe, readBest, zeroSnapshot);

  const clearTimers = useCallback(() => {
    if (displayTimeoutRef.current) {
      clearTimeout(displayTimeoutRef.current);
      displayTimeoutRef.current = null;
    }
    if (levelUpTimeoutRef.current) {
      clearTimeout(levelUpTimeoutRef.current);
      levelUpTimeoutRef.current = null;
    }
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    hiddenDuringDisplayRef.current = false;
  }, []);

  /**
   * Schedules the display → input handoff off a deadline-driven timeout
   * (not a per-tick decrement), so a throttled/backgrounded tab can only
   * delay the flip, never fire it early. Unlocks submission fresh for the
   * number about to become typeable.
   */
  const scheduleDisplayTimeout = useCallback((ms: number) => {
    if (displayTimeoutRef.current) clearTimeout(displayTimeoutRef.current);
    displayTimeoutRef.current = setTimeout(() => {
      displayTimeoutRef.current = null;
      submitLockRef.current = false;
      setState((s) => (s.phase === 'display' ? { ...s, phase: 'input' } : s));
    }, ms);
  }, []);

  // ── Round lifecycle ───────────────────────────────────────────────

  /** Shows the ladder's starting number for a fresh round. */
  const startRound = useCallback(
    (difficulty: Difficulty, round: number) => {
      clearTimers();
      submitLockRef.current = false;
      const cfg = RECALL_DIFFICULTY[difficulty];
      const level = cfg.start;
      // Challenge rounds are seeded so every player faces identical ladders
      const ladder = challengeRounds?.[round - 1]?.ladder;
      const target = ladder?.[0] ?? makeDigits(level, Math.random);

      setState((s) => ({
        ...s,
        phase: 'display',
        difficulty,
        target,
        entry: '',
        level,
        round,
        score: 0,
        result: null,
        displayAttempt: s.displayAttempt + 1,
      }));
      play('glow');
      scheduleDisplayTimeout(getDisplayMs(level, difficulty));
    },
    [clearTimers, play, challengeRounds, scheduleDisplayTimeout]
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

  // ── Typing ────────────────────────────────────────────────────────

  const pressDigit = useCallback((digit: string) => {
    setState((s) => {
      if (s.phase !== 'input' || s.entry.length >= s.target.length) return s;
      return { ...s, entry: s.entry + digit };
    });
  }, []);

  const backspace = useCallback(() => {
    setState((s) => (s.phase !== 'input' || s.entry.length === 0 ? s : { ...s, entry: s.entry.slice(0, -1) }));
  }, []);

  /** Advances the ladder after the level-up beat — reads fresh state itself
   *  rather than being handed values, so it stays correct even if fired via
   *  a stale timeout closure. */
  const advanceAfterLevelUp = useCallback(() => {
    const prev = stateRef.current;
    if (prev.phase !== 'level-up' || !prev.difficulty) return;
    const nextLevel = prev.level + 1;
    const cfg = RECALL_DIFFICULTY[prev.difficulty];
    const ladder = challengeRounds?.[prev.round - 1]?.ladder;
    const nextTarget = ladder?.[nextLevel - cfg.start] ?? makeDigits(nextLevel, Math.random);

    setState((s) =>
      s.phase !== 'level-up'
        ? s
        : {
            ...s,
            phase: 'display',
            level: nextLevel,
            target: nextTarget,
            entry: '',
            displayAttempt: s.displayAttempt + 1,
          }
    );
    play('glow');
    scheduleDisplayTimeout(getDisplayMs(nextLevel, prev.difficulty));
  }, [challengeRounds, play, scheduleDisplayTimeout]);

  const submitEntry = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== 'input' || !s.difficulty || s.entry.length !== s.target.length) return;
    if (submitLockRef.current) return;
    submitLockRef.current = true;

    if (s.entry === s.target) {
      play('confirm');
      setState((prev) => (prev.phase === 'input' ? { ...prev, phase: 'level-up' } : prev));
      levelUpTimeoutRef.current = setTimeout(advanceAfterLevelUp, LEVEL_UP_DELAY_MS);
      return;
    }

    play('error');
    const diffIndex = firstMismatchIndex(s.target, s.entry);
    const reached = s.level - 1;
    const score = scoreRound(reached, s.difficulty);
    const rating = getRecallRating(score);

    setState((prev) => ({
      ...prev,
      phase: 'results',
      score,
      totalScore: round2(prev.totalScore + score),
      roundScores: [...prev.roundScores, score],
      result: { reached, target: s.target, entry: s.entry, diffIndex, rating, score },
    }));
  }, [play, advanceAfterLevelUp]);

  // Session/challenge-end feedback: a beat after the last round's "Next" —
  // wrapped in a cancellable timeout (not a bare play() call) so React
  // StrictMode's dev-only double-invoke of this effect can't double-fire it.
  useEffect(() => {
    if (state.phase !== 'session-complete' && state.phase !== 'challenge-complete') return;
    const id = setTimeout(() => play('celebrate'), 150);
    return () => clearTimeout(id);
  }, [state.phase, play]);

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

    transitionTimeoutRef.current = setTimeout(() => {
      transitionTimeoutRef.current = null;
      transitioningRef.current = false;
    }, 500);
  }, [startRound, play, challengeRounds]);

  const replay = useCallback(() => {
    const { difficulty } = stateRef.current;
    if (difficulty) selectDifficulty(difficulty);
  }, [selectDifficulty]);

  // Backgrounding mid-display must not let the hidden time count against the
  // player (and must not silently resolve a phantom answer) — pause the
  // pending timeout, then restart the same number's display window fresh
  // (full duration) once the tab is visible again, rather than trying to
  // compute a "time remaining" that a throttled tab can't report reliably.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (stateRef.current.phase === 'display') {
          if (displayTimeoutRef.current) {
            clearTimeout(displayTimeoutRef.current);
            displayTimeoutRef.current = null;
          }
          hiddenDuringDisplayRef.current = true;
        }
        return;
      }
      if (!hiddenDuringDisplayRef.current) return;
      hiddenDuringDisplayRef.current = false;
      const s = stateRef.current;
      if (s.phase !== 'display' || !s.difficulty) return;
      setState((prev) => (prev.phase === 'display' ? { ...prev, displayAttempt: prev.displayAttempt + 1 } : prev));
      scheduleDisplayTimeout(getDisplayMs(s.level, s.difficulty));
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [scheduleDisplayTimeout]);

  // Hardware keyboard: digits, Backspace, Enter — only live while a number
  // is actually typeable, so it can never hijack input on menus, the
  // challenge nickname field, or during the level-up/display beats.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (stateRef.current.phase !== 'input') return;
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        pressDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submitEntry();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [pressDigit, backspace, submitEntry]);

  // Cleanup on unmount
  useEffect(() => clearTimers, [clearTimers]);

  return {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    pressDigit,
    backspace,
    submitEntry,
    nextRound,
    replay,
    resetToMenu,
  };
}
