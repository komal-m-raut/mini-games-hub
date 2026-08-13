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
import { EchoStepsChallengeRound, getEchoStepsChallengeRounds } from './challenge';
import {
  ECHO_STEPS_DIFFICULTY,
  LEVEL_PAUSE_MS,
  LIGHT_MS_RATIO,
  MASTER_SEQUENCE_LENGTH,
  ROUND_END_DELAY_MS,
  SOLO_ROUND_COUNT,
  TAP_FLASH_MS,
  makeSequence,
  scoreRound,
  sequenceForLevel,
} from './constants';
import { playError, playPad } from './tones';
import { EchoStepsGameState } from './types';

const GAME_ID = 'echo-steps';

const INITIAL_STATE: EchoStepsGameState = {
  phase: 'selecting-difficulty',
  mode: 'normal',
  difficulty: null,
  length: 0,
  sequence: [],
  playbackIndex: null,
  inputProgress: 0,
  tappedPad: null,
  wrongPad: null,
  revealPad: null,
  peak: 0,
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

export interface UseEchoStepsGameOptions {
  /** When set, the game runs as a seeded 3-round challenge. */
  challengeCode?: string;
}

export function useEchoStepsGame({ challengeCode }: UseEchoStepsGameOptions = {}) {
  usePlayBeacon(GAME_ID);
  const isChallenge = Boolean(challengeCode);
  // Deterministic per code, so every player's ladders match level by level
  const challengeRounds = useMemo<EchoStepsChallengeRound[] | null>(
    () => (challengeCode ? getEchoStepsChallengeRounds(challengeCode) : null),
    [challengeCode]
  );

  const [state, setState] = useState<EchoStepsGameState>(() => ({
    ...INITIAL_STATE,
    mode: isChallenge ? 'challenge' : 'normal',
    phase: isChallenge ? 'challenge-intro' : 'selecting-difficulty',
    totalRounds: isChallenge ? CHALLENGE_ROUND_COUNT : SOLO_ROUND_COUNT,
  }));
  // Menu/round sounds only — pad tones and the error buzz come from
  // ./tones.ts exclusively, never from lib/sounds.ts.
  const { play } = useSound();

  const playbackTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const levelPauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitioningRef = useRef(false);

  // Refs mirroring round-scoped values timers/handlers need synchronously,
  // without waiting on a render.
  const sequenceRef = useRef<number[]>([]);
  const lengthRef = useRef(0);
  const inputProgressRef = useRef(0);
  const peakRef = useRef(0);
  const difficultyRef = useRef<Difficulty | null>(null);
  const roundRef = useRef(1);
  // This round's fixed master sequence — a level's pattern is a prefix of
  // it (never freshly drawn), matching the challenge's own seeding.
  const soloMasterRef = useRef<number[]>([]);
  // Guards a round against finalizing twice (a wrong tap racing the
  // level-complete path is not possible here, but mirrors the other games'
  // idempotency guard for consistency and future-proofing).
  const resolvedRef = useRef(false);
  // Set while the tab is hidden during 'playback', so the visibility
  // handler knows to replay this level's sequence rather than treating a
  // background tab as ordinary idle time.
  const hiddenDuringPlaybackRef = useRef(false);

  // Mirror of the latest state for callbacks; updated in an effect (never
  // during render) so it can't trip the refs-during-render rule.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const bestSession = useSyncExternalStore(noopSubscribe, readBest, zeroSnapshot);

  const clearTimers = useCallback(() => {
    playbackTimersRef.current.forEach(clearTimeout);
    playbackTimersRef.current = [];
    if (levelPauseTimeoutRef.current) {
      clearTimeout(levelPauseTimeoutRef.current);
      levelPauseTimeoutRef.current = null;
    }
    if (tapFlashTimeoutRef.current) {
      clearTimeout(tapFlashTimeoutRef.current);
      tapFlashTimeoutRef.current = null;
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

  // ── Playback ─────────────────────────────────────────────────────

  /** Lights + sounds `sequence` step by step, `stepMs` apart, then opens
   *  input. Flat list of timeouts (not a chained interval) so a
   *  visibility-driven restart can simply clear and reschedule from zero. */
  const schedulePlayback = useCallback((sequence: number[], stepMs: number) => {
    playbackTimersRef.current.forEach(clearTimeout);
    playbackTimersRef.current = [];

    const lightMs = Math.round(stepMs * LIGHT_MS_RATIO);
    sequence.forEach((pad, i) => {
      const onAt = i * stepMs;
      const lightTimer = setTimeout(() => {
        setState((s) => (s.phase === 'playback' ? { ...s, playbackIndex: i } : s));
        playPad(pad);
      }, onAt);
      const offTimer = setTimeout(() => {
        setState((s) =>
          s.phase === 'playback' && s.playbackIndex === i ? { ...s, playbackIndex: null } : s
        );
      }, onAt + lightMs);
      playbackTimersRef.current.push(lightTimer, offTimer);
    });

    const endTimer = setTimeout(
      () => {
        setState((s) =>
          s.phase === 'playback' ? { ...s, phase: 'input', playbackIndex: null, inputProgress: 0 } : s
        );
        inputProgressRef.current = 0;
      },
      sequence.length * stepMs
    );
    playbackTimersRef.current.push(endTimer);
  }, []);

  /** Replays the *current* level's sequence from the top — used after a
   *  visibility-hidden window ate the player's chance to watch/listen. */
  const restartPlayback = useCallback(() => {
    const difficulty = difficultyRef.current;
    if (!difficulty) return;
    const cfg = ECHO_STEPS_DIFFICULTY[difficulty];
    setState((s) => ({ ...s, phase: 'playback', playbackIndex: null }));
    schedulePlayback(sequenceRef.current, cfg.stepMs);
  }, [schedulePlayback]);

  // ── Level lifecycle ───────────────────────────────────────────────

  const startLevel = useCallback(
    (difficulty: Difficulty, round: number, length: number) => {
      const cfg = ECHO_STEPS_DIFFICULTY[difficulty];
      // Challenge levels are seeded so every player hears the same notes
      const master = challengeRounds?.[round - 1]?.master ?? soloMasterRef.current;
      const sequence = sequenceForLevel(master, length);

      sequenceRef.current = sequence;
      lengthRef.current = length;
      inputProgressRef.current = 0;

      setState((s) => ({
        ...s,
        phase: 'playback',
        length,
        sequence,
        playbackIndex: null,
        inputProgress: 0,
        tappedPad: null,
        wrongPad: null,
        revealPad: null,
      }));

      schedulePlayback(sequence, cfg.stepMs);
    },
    [challengeRounds, schedulePlayback]
  );

  // ── Round lifecycle ───────────────────────────────────────────────

  const startRound = useCallback(
    (difficulty: Difficulty, round: number) => {
      clearTimers();
      const start = ECHO_STEPS_DIFFICULTY[difficulty].start;
      peakRef.current = start - 1;
      difficultyRef.current = difficulty;
      roundRef.current = round;
      resolvedRef.current = false;
      hiddenDuringPlaybackRef.current = false;
      // Solo draws its own master sequence per round, the same way the
      // challenge does — just with Math.random instead of a seeded rand.
      if (!challengeRounds) soloMasterRef.current = makeSequence(MASTER_SEQUENCE_LENGTH, Math.random);

      setState((s) => ({
        ...s,
        difficulty,
        round,
        peak: start - 1,
        score: 0,
        result: null,
      }));

      startLevel(difficulty, round, start);
    },
    [clearTimers, startLevel, challengeRounds]
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
    const len = peakRef.current;
    const score = scoreRound(len, difficulty);
    const rating = ratingFromScore(score);

    setState((s) => ({
      ...s,
      phase: 'results',
      peak: len,
      score,
      totalScore: round2(s.totalScore + score),
      roundScores: [...s.roundScores, score],
      result: { len, score, rating },
    }));
  }, [clearTimers]);

  // ── Tapping ───────────────────────────────────────────────────────

  const tapPad = useCallback(
    (index: number) => {
      if (stateRef.current.phase !== 'input') return;
      const sequence = sequenceRef.current;
      const expected = sequence[inputProgressRef.current];

      if (index !== expected) {
        playError();
        setState((s) => ({ ...s, wrongPad: index, revealPad: expected }));
        roundEndTimeoutRef.current = setTimeout(finalizeRound, ROUND_END_DELAY_MS);
        return;
      }

      playPad(index);
      inputProgressRef.current += 1;
      const progress = inputProgressRef.current;

      if (tapFlashTimeoutRef.current) clearTimeout(tapFlashTimeoutRef.current);
      setState((s) => ({ ...s, inputProgress: progress, tappedPad: index }));
      tapFlashTimeoutRef.current = setTimeout(() => {
        setState((s) => (s.tappedPad === index ? { ...s, tappedPad: null } : s));
      }, TAP_FLASH_MS);

      if (progress < sequence.length) return;

      // Sequence fully repeated.
      const length = lengthRef.current;
      peakRef.current = Math.max(peakRef.current, length);
      const difficulty = difficultyRef.current!;
      setState((s) => ({ ...s, phase: 'level-complete', peak: peakRef.current }));

      if (length >= MASTER_SEQUENCE_LENGTH) {
        // Exhausted the master sequence — an exceptional run; treat it as
        // a clean round end rather than reading past the array.
        roundEndTimeoutRef.current = setTimeout(finalizeRound, LEVEL_PAUSE_MS);
      } else {
        levelPauseTimeoutRef.current = setTimeout(() => {
          startLevel(difficulty, roundRef.current, length + 1);
        }, LEVEL_PAUSE_MS);
      }
    },
    [finalizeRound, startLevel]
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

  // Backgrounding mid-playback must not quietly burn the player's chance to
  // watch/listen — replay the same sequence from the top once the tab is
  // visible again, rather than opening input on a sequence they never saw.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (stateRef.current.phase === 'playback') hiddenDuringPlaybackRef.current = true;
        return;
      }
      if (!hiddenDuringPlaybackRef.current) return;
      hiddenDuringPlaybackRef.current = false;
      // Input needs real taps, so the phase can only have advanced from
      // 'playback' to 'input' while hidden — never past it.
      if (stateRef.current.phase === 'playback' || stateRef.current.phase === 'input') {
        restartPlayback();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [restartPlayback]);

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), [clearTimers]);

  return {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    tapPad,
    nextRound,
    replay,
    resetToMenu,
  };
}
