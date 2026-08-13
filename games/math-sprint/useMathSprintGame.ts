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
import { useSound } from '@/hooks/useSound';
import { usePlayBeacon } from '@/hooks/usePlayBeacon';
import { CHALLENGE_ROUND_COUNT } from '@/lib/challenge';
import { getLocalBestSession, ratingFromScore, round2, saveBestSession } from '@/utils/scoring';
import { MathChallengeRound, getMathChallengeRounds } from './challenge';
import {
  COUNTDOWN_SECONDS,
  GAME_ID,
  MathQuestion,
  ROUND_SECONDS,
  TOTAL_ROUNDS,
  calculateMathScore,
  makeMathQuestion,
} from './constants';
import { MathGameState, MathRoundResult } from './types';

/** Longest a typed answer can ever legitimately need to be — the largest
 *  possible answer across every difficulty is 198 (Hard's a+b), 3 digits. */
const MAX_INPUT_LENGTH = 3;
/** How long the wrong-answer shake/flash stays on screen. */
const WRONG_FLASH_MS = 420;

const INITIAL_STATE: MathGameState = {
  phase: 'selecting-difficulty',
  mode: 'normal',
  difficulty: null,
  countdown: COUNTDOWN_SECONDS,
  timeLeft: ROUND_SECONDS,
  round: 1,
  totalRounds: TOTAL_ROUNDS,
  question: null,
  input: '',
  isWrong: false,
  correctCount: 0,
  wrongCount: 0,
  streak: 0,
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

export interface UseMathSprintGameOptions {
  /** When set, the game runs as a seeded 3-round challenge. */
  challengeCode?: string;
}

export function useMathSprintGame({ challengeCode }: UseMathSprintGameOptions = {}) {
  usePlayBeacon(GAME_ID);
  const isChallenge = Boolean(challengeCode);
  // Deterministic per code, so every player solves the identical sequence
  const challengeRounds = useMemo<MathChallengeRound[] | null>(
    () => (challengeCode ? getMathChallengeRounds(challengeCode) : null),
    [challengeCode]
  );

  const [state, setState] = useState<MathGameState>(() => ({
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
  /** Cursor into the current round's pre-generated challenge questions. */
  const questionIndexRef = useRef(0);

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

  /** Next question for the round in progress — the seeded sequence for a
   *  challenge round, or a fresh random draw for solo play. */
  const nextQuestion = useCallback(
    (difficulty: Difficulty, round: number): MathQuestion => {
      const seeded = challengeRounds?.[round - 1];
      if (seeded) {
        const q = seeded.questions[questionIndexRef.current % seeded.questions.length];
        questionIndexRef.current += 1;
        return q;
      }
      return makeMathQuestion(difficulty, Math.random);
    },
    [challengeRounds]
  );

  // ── Round end ─────────────────────────────────────────────────────

  const endRound = useCallback(() => {
    const { difficulty, correctCount, wrongCount } = stateRef.current;
    if (!difficulty) return;
    const score = calculateMathScore(correctCount, wrongCount, difficulty);
    const rating = ratingFromScore(score);
    const result: MathRoundResult = {
      difficulty,
      correct: correctCount,
      wrong: wrongCount,
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

  /** Starts the 30s timer and the question stream once the countdown ends. */
  const beginPlaying = useCallback(
    (difficulty: Difficulty, round: number) => {
      questionIndexRef.current = 0;
      const firstQuestion = nextQuestion(difficulty, round);

      setState((s) => ({
        ...s,
        phase: 'playing',
        question: firstQuestion,
        input: '',
        isWrong: false,
        correctCount: 0,
        wrongCount: 0,
        streak: 0,
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
          prev.phase !== 'playing' || prev.timeLeft === remaining
            ? prev
            : { ...prev, timeLeft: remaining }
        );
        if (remaining <= 5 && remaining !== lastTickSecond) {
          lastTickSecond = remaining;
          play('tick');
        }
      }, 1000);
    },
    [nextQuestion, endRound, play]
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
          prev.phase !== 'countdown' || prev.countdown === remaining
            ? prev
            : { ...prev, countdown: remaining }
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

  // ── Answering ─────────────────────────────────────────────────────

  const pressDigit = useCallback((digit: string) => {
    setState((prev) => {
      if (prev.phase !== 'playing' || prev.input.length >= MAX_INPUT_LENGTH) return prev;
      return { ...prev, input: prev.input + digit };
    });
  }, []);

  const pressBackspace = useCallback(() => {
    setState((prev) =>
      prev.phase !== 'playing' || prev.input === '' ? prev : { ...prev, input: prev.input.slice(0, -1) }
    );
  }, []);

  const submitAnswer = useCallback(() => {
    const { phase, question, input, difficulty, round } = stateRef.current;
    if (phase !== 'playing' || !question || !difficulty || input === '') return;

    const isCorrect = Number(input) === question.answer;

    if (isCorrect) {
      play('confirm');
      const upcoming = nextQuestion(difficulty, round);
      setState((prev) => {
        if (prev.phase !== 'playing') return prev;
        return {
          ...prev,
          question: upcoming,
          input: '',
          isWrong: false,
          correctCount: prev.correctCount + 1,
          streak: prev.streak + 1,
        };
      });
    } else {
      play('error');
      if (wrongTimeoutRef.current) clearTimeout(wrongTimeoutRef.current);
      setState((prev) => {
        if (prev.phase !== 'playing') return prev;
        return { ...prev, input: '', isWrong: true, wrongCount: prev.wrongCount + 1, streak: 0 };
      });
      wrongTimeoutRef.current = setTimeout(() => {
        setState((prev) => (prev.phase !== 'playing' ? prev : { ...prev, isWrong: false }));
      }, WRONG_FLASH_MS);
    }
  }, [play, nextQuestion]);

  const skip = useCallback(() => {
    const { phase, question, difficulty, round } = stateRef.current;
    if (phase !== 'playing' || !question || !difficulty) return;
    play('click');
    const upcoming = nextQuestion(difficulty, round);
    setState((prev) => {
      if (prev.phase !== 'playing') return prev;
      return { ...prev, question: upcoming, input: '', isWrong: false, wrongCount: prev.wrongCount + 1, streak: 0 };
    });
  }, [play, nextQuestion]);

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
    selectDifficulty,
    startChallenge,
    pressDigit,
    pressBackspace,
    submitAnswer,
    skip,
    nextRound,
    replay,
    resetToMenu,
  };
}
