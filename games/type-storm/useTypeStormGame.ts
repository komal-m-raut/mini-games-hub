'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Difficulty } from '@/types/game';
import { useSound } from '@/hooks/useSound';
import { usePlayBeacon } from '@/hooks/usePlayBeacon';
import { CHALLENGE_ROUND_COUNT } from '@/lib/challenge';
import { getLocalBestSession, ratingFromScore, round2, saveBestSession } from '@/utils/scoring';
import { TypeStormChallengeRound, getTypeStormChallengeRounds } from './challenge';
import { COUNTDOWN_SECONDS, GAME_ID, ROUND_SECONDS, TOTAL_ROUNDS, makeWordStream, scoreRound } from './constants';
import { TypeStormGameState, TypeStormRoundResult } from './types';

/** How long the wrong-submit shake/flash stays on screen. */
const WRONG_FLASH_MS = 420;

const INITIAL_STATE: TypeStormGameState = {
  phase: 'selecting-difficulty',
  mode: 'normal',
  difficulty: null,
  countdown: COUNTDOWN_SECONDS,
  timeLeft: ROUND_SECONDS,
  round: 1,
  totalRounds: TOTAL_ROUNDS,
  words: [],
  wordIndex: 0,
  input: '',
  isWrong: false,
  correctChars: 0,
  typedChars: 0,
  correctCount: 0,
  wrongCount: 0,
  skipCount: 0,
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

export interface UseTypeStormGameOptions {
  /** When set, the game runs as a seeded 3-round challenge. */
  challengeCode?: string;
}

export function useTypeStormGame({ challengeCode }: UseTypeStormGameOptions = {}) {
  usePlayBeacon(GAME_ID);
  const isChallenge = Boolean(challengeCode);
  // Deterministic per code, so every player types the identical word streams
  const challengeRounds = useMemo<TypeStormChallengeRound[] | null>(
    () => (challengeCode ? getTypeStormChallengeRounds(challengeCode) : null),
    [challengeCode]
  );

  const [state, setState] = useState<TypeStormGameState>(() => ({
    ...INITIAL_STATE,
    mode: isChallenge ? 'challenge' : 'normal',
    phase: isChallenge ? 'challenge-intro' : 'selecting-difficulty',
    totalRounds: isChallenge ? CHALLENGE_ROUND_COUNT : TOTAL_ROUNDS,
  }));
  const { play } = useSound();

  const bestSession = useSyncExternalStore(noopSubscribe, readBest, zeroSnapshot);

  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownDeadlineRef = useRef(0);
  const roundTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundDeadlineRef = useRef(0);
  const wrongTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitioningRef = useRef(false);
  /** Owned by the hook so the same visibilitychange effect that pauses the
   *  clock can also refocus the input the instant the tab comes back. */
  const inputRef = useRef<HTMLInputElement>(null);

  // Mirror of the latest state for callbacks, updated in an effect (never
  // during render) so it can't trip the refs-during-render rule.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const clearTimers = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (roundTimerRef.current) {
      clearInterval(roundTimerRef.current);
      roundTimerRef.current = null;
    }
    if (wrongTimeoutRef.current) {
      clearTimeout(wrongTimeoutRef.current);
      wrongTimeoutRef.current = null;
    }
  }, []);

  /** This round's word stream — the seeded one for a challenge round, or a
   *  fresh random one for solo play. */
  const wordsFor = useCallback(
    (difficulty: Difficulty, round: number): string[] => {
      const seeded = challengeRounds?.[round - 1];
      return seeded ? seeded.words : makeWordStream(difficulty, Math.random);
    },
    [challengeRounds]
  );

  // Keep the input focused while a round is live — the on-screen keyboard
  // (mobile) shouldn't matter here since a physical keyboard is expected,
  // but this also covers refocusing after any click elsewhere in the card.
  useEffect(() => {
    if (state.phase === 'playing') inputRef.current?.focus();
  }, [state.phase]);

  // ── Round end ─────────────────────────────────────────────────────

  const endRound = useCallback(() => {
    const { difficulty, correctChars, typedChars, correctCount, wrongCount, skipCount } = stateRef.current;
    if (!difficulty) return;
    const { wpm, accuracy, score } = scoreRound({ correctChars, typedChars });
    const rating = ratingFromScore(score);
    const result: TypeStormRoundResult = {
      difficulty,
      wpm: round2(wpm),
      accuracy,
      correct: correctCount,
      wrong: wrongCount,
      skips: skipCount,
      score,
      rating,
    };

    setState((prev) => {
      if (prev.phase !== 'playing') return prev;
      return {
        ...prev,
        phase: 'results',
        result,
        score,
        totalScore: round2(prev.totalScore + score),
        roundScores: [...prev.roundScores, score],
      };
    });
  }, []);

  // ── Round lifecycle ───────────────────────────────────────────────

  /** Starts the 30s timer and the word stream once the countdown ends. */
  const beginPlaying = useCallback(
    (difficulty: Difficulty, round: number) => {
      const words = wordsFor(difficulty, round);

      setState((s) => ({
        ...s,
        phase: 'playing',
        words,
        wordIndex: 0,
        input: '',
        isWrong: false,
        correctChars: 0,
        typedChars: 0,
        correctCount: 0,
        wrongCount: 0,
        skipCount: 0,
        timeLeft: ROUND_SECONDS,
      }));

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
          prev.phase !== 'playing' || prev.timeLeft === remaining ? prev : { ...prev, timeLeft: remaining }
        );
        if (remaining <= 5 && remaining !== lastTickSecond) {
          lastTickSecond = remaining;
          play('tick');
        }
      }, 1000);
    },
    [wordsFor, endRound, play]
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
          beginPlaying(difficulty, round);
          return;
        }
        setState((prev) =>
          prev.phase !== 'countdown' || prev.countdown === remaining ? prev : { ...prev, countdown: remaining }
        );
        play('tick');
      }, 1000);
    },
    [clearTimers, play, beginPlaying]
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

  // ── Typing ────────────────────────────────────────────────────────

  /** Only a keystroke that actually lengthens the field counts toward
   *  typedChars — backspacing never refunds it, and never double-counts a
   *  paste (the whole added slice counts once). */
  const setInput = useCallback((value: string) => {
    setState((prev) => {
      if (prev.phase !== 'playing') return prev;
      const added = Math.max(0, value.length - prev.input.length);
      return { ...prev, input: value, typedChars: prev.typedChars + added };
    });
  }, []);

  const submitWord = useCallback(() => {
    const { phase, words, wordIndex, input } = stateRef.current;
    if (phase !== 'playing' || input === '') return;
    const currentWord = words[wordIndex];
    if (!currentWord) return;

    if (input === currentWord) {
      play('confirm');
      // Banked chars include one for the space/enter separator, so a
      // flawless round's correctChars matches typedChars exactly.
      const banked = currentWord.length + 1;
      setState((prev) => {
        if (prev.phase !== 'playing') return prev;
        return {
          ...prev,
          wordIndex: prev.wordIndex + 1,
          input: '',
          isWrong: false,
          correctChars: prev.correctChars + banked,
          correctCount: prev.correctCount + 1,
        };
      });
    } else {
      play('error');
      if (wrongTimeoutRef.current) clearTimeout(wrongTimeoutRef.current);
      setState((prev) =>
        prev.phase !== 'playing' ? prev : { ...prev, input: '', isWrong: true, wrongCount: prev.wrongCount + 1 }
      );
      wrongTimeoutRef.current = setTimeout(() => {
        setState((prev) => (prev.phase !== 'playing' ? prev : { ...prev, isWrong: false }));
      }, WRONG_FLASH_MS);
    }
  }, [play]);

  const skipWord = useCallback(() => {
    const { phase, words, wordIndex } = stateRef.current;
    if (phase !== 'playing' || !words[wordIndex]) return;
    play('click');
    setState((prev) =>
      prev.phase !== 'playing'
        ? prev
        : { ...prev, wordIndex: prev.wordIndex + 1, input: '', isWrong: false, skipCount: prev.skipCount + 1 }
    );
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

  // A backgrounded tab must not burn round/countdown time the player never
  // saw — push whichever deadline is active forward by exactly how long the
  // tab was hidden, rather than pausing/resuming the interval itself (the
  // deadline-based remaining-time math already tolerates interval jitter).
  // On return, also refocus the input: losing focus to the tab switch would
  // otherwise silently strand the player's keystrokes.
  useEffect(() => {
    let hiddenAt: number | null = null;
    const onVisibilityChange = () => {
      if (document.hidden) {
        hiddenAt = performance.now();
      } else if (hiddenAt !== null) {
        const hiddenMs = performance.now() - hiddenAt;
        hiddenAt = null;
        if (stateRef.current.phase === 'countdown') {
          countdownDeadlineRef.current += hiddenMs;
        } else if (stateRef.current.phase === 'playing') {
          roundDeadlineRef.current += hiddenMs;
          inputRef.current?.focus();
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  // Cleanup on unmount
  useEffect(() => clearTimers, [clearTimers]);

  return {
    state,
    bestSession,
    challengeRounds,
    inputRef,
    selectDifficulty,
    startChallenge,
    setInput,
    submitWord,
    skipWord,
    nextRound,
    replay,
    resetToMenu,
  };
}
