'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { usePlayBeacon } from '@/hooks/usePlayBeacon';
import { useSound } from '@/hooks/useSound';
import { CHALLENGE_ROUND_COUNT } from '@/lib/challenge';
import { getLocalBestSession, ratingFromScore, round2, saveBestSession } from '@/utils/scoring';
import { getWordQuestChallengeWords } from './challenge';
import { GAME_ID, MAX_GUESSES, REVEAL_LOCK_MS, TOAST_DURATION_MS, WORD_LENGTH } from './constants';
import { GuessRow, bestRowStats, evaluateGuess, isValidWord, scoreRound } from './engine';
import { WordQuestGameState } from './types';
import { ANSWERS } from './words';

const INITIAL_STATE: WordQuestGameState = {
  phase: 'menu',
  mode: 'normal',
  answer: '',
  rows: [],
  currentGuess: '',
  round: 1,
  totalRounds: 1,
  score: 0,
  totalScore: 0,
  roundScores: [],
  result: null,
  isNewBestSession: false,
  toast: null,
  invalidNonce: 0,
};

// localStorage best session, hydration-safe (server snapshot is 0)
const noopSubscribe = () => () => {};
const zeroSnapshot = () => 0;
const readBest = () => getLocalBestSession(GAME_ID);

/** Uniform random pick from the curated answer pool — solo play only; the
 *  challenge path always goes through `getWordQuestChallengeWords`. */
function pickAnswer(): string {
  return ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
}

export interface UseWordQuestGameOptions {
  /** When set, the game runs as a seeded 3-round challenge. */
  challengeCode?: string;
}

export function useWordQuestGame({ challengeCode }: UseWordQuestGameOptions = {}) {
  usePlayBeacon(GAME_ID);
  const isChallenge = Boolean(challengeCode);
  // Deterministic per code, so every player gets the same 3 words
  const challengeWords = useMemo<string[] | null>(
    () => (challengeCode ? getWordQuestChallengeWords(challengeCode) : null),
    [challengeCode]
  );

  const [state, setState] = useState<WordQuestGameState>(() => ({
    ...INITIAL_STATE,
    mode: isChallenge ? 'challenge' : 'normal',
    phase: isChallenge ? 'challenge-intro' : 'menu',
    totalRounds: isChallenge ? CHALLENGE_ROUND_COUNT : 1,
  }));
  const { play } = useSound();
  const bestSession = useSyncExternalStore(noopSubscribe, readBest, zeroSnapshot);

  // Mirror of the latest state for callbacks; updated in an effect (never
  // during render) so it can't trip the refs-during-render rule.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Blocks typing/backspace/submit while the previous row's flip reveal (or
  // the terminal success/fail beat) is still playing out.
  const inputLockedRef = useRef(false);
  const transitioningRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
      lockTimeoutRef.current = null;
    }
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  }, []);

  // ── Round lifecycle ───────────────────────────────────────────────

  const startRound = useCallback(
    (answer: string, round: number) => {
      clearTimers();
      inputLockedRef.current = false;
      setState((s) => ({
        ...s,
        phase: 'playing',
        answer,
        rows: [],
        currentGuess: '',
        round,
        score: 0,
        result: null,
        toast: null,
      }));
    },
    [clearTimers]
  );

  const startSolo = useCallback(() => {
    play('click');
    setState((s) => ({ ...s, totalScore: 0, roundScores: [], isNewBestSession: false }));
    startRound(pickAnswer(), 1);
  }, [startRound, play]);

  const startChallenge = useCallback(() => {
    if (!challengeWords) return;
    setState((s) => ({ ...s, totalScore: 0, roundScores: [] }));
    startRound(challengeWords[0], 1);
  }, [startRound, challengeWords]);

  const resetToMenu = useCallback(() => {
    clearTimers();
    inputLockedRef.current = false;
    play('click');
    setState((s) => ({
      ...INITIAL_STATE,
      mode: s.mode,
      phase: s.mode === 'challenge' ? 'challenge-intro' : 'menu',
      totalRounds: s.totalRounds,
    }));
  }, [clearTimers, play]);

  const showToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setState((s) => ({ ...s, toast: message, invalidNonce: s.invalidNonce + 1 }));
    toastTimeoutRef.current = setTimeout(() => {
      setState((s) => (s.toast === message ? { ...s, toast: null } : s));
    }, TOAST_DURATION_MS);
  }, []);

  // ── Finish a round ───────────────────────────────────────────────

  const finalizeRound = useCallback(
    (answer: string, rows: GuessRow[], solvedIn: number | null) => {
      const best = bestRowStats(rows.map((r) => r.result));
      const score = scoreRound(solvedIn, best);
      const rating = ratingFromScore(score);
      const mode = stateRef.current.mode;

      const isNewBestSession = mode === 'normal' ? saveBestSession(GAME_ID, score) : false;

      setState((s) => ({
        ...s,
        phase: mode === 'challenge' ? 'round-result' : 'solo-result',
        score,
        totalScore: round2(s.totalScore + score),
        roundScores: [...s.roundScores, score],
        result: { answer, solvedIn, score, rating, rows },
        isNewBestSession,
      }));

      // Solo has exactly one round, so finishing it *is* finishing the
      // session — challenge instead saves its "session end" celebrate for
      // nextRound(), once the final (3rd) round's result is dismissed.
      if (mode === 'normal') play('celebrate');
    },
    [play]
  );

  // ── Typing ────────────────────────────────────────────────────────

  const typeLetter = useCallback(
    (letter: string) => {
      if (inputLockedRef.current) return;
      let accepted = false;
      setState((prev) => {
        if (prev.phase !== 'playing' || prev.currentGuess.length >= WORD_LENGTH) return prev;
        accepted = true;
        return { ...prev, currentGuess: prev.currentGuess + letter };
      });
      if (accepted) play('tap');
    },
    [play]
  );

  const backspace = useCallback(() => {
    if (inputLockedRef.current) return;
    setState((prev) =>
      prev.phase !== 'playing' || prev.currentGuess === ''
        ? prev
        : { ...prev, currentGuess: prev.currentGuess.slice(0, -1) }
    );
  }, []);

  const submitGuess = useCallback(() => {
    if (inputLockedRef.current) return;
    const { phase, currentGuess, answer, rows } = stateRef.current;
    if (phase !== 'playing') return;

    if (currentGuess.length !== WORD_LENGTH) {
      play('error');
      showToast('Not enough letters');
      return;
    }
    if (!isValidWord(currentGuess)) {
      play('error');
      showToast('Not in word list');
      return;
    }

    play('confirm');
    const result = evaluateGuess(currentGuess, answer);
    const newRows = [...rows, { guess: currentGuess, result }];
    const solved = currentGuess === answer;
    const exhausted = newRows.length >= MAX_GUESSES;

    setState((s) => ({ ...s, rows: newRows, currentGuess: '' }));

    // Lock input for the reveal animation; only a terminal guess (solved or
    // out of tries) needs a follow-up action once it finishes.
    inputLockedRef.current = true;
    lockTimeoutRef.current = setTimeout(() => {
      inputLockedRef.current = false;
      if (solved || exhausted) {
        play(solved ? 'success' : 'fail');
        finalizeRound(answer, newRows, solved ? newRows.length : null);
      }
    }, REVEAL_LOCK_MS);
  }, [play, showToast, finalizeRound]);

  // ── Advance ───────────────────────────────────────────────────────

  const nextRound = useCallback(() => {
    if (transitioningRef.current) return;
    const { round, phase, totalRounds } = stateRef.current;
    if (phase !== 'round-result' || !challengeWords) return;
    transitioningRef.current = true;
    play('click');

    if (round >= totalRounds) {
      play('celebrate');
      setState((s) => ({ ...s, phase: 'challenge-complete' }));
    } else {
      startRound(challengeWords[round], round + 1);
    }

    transitionTimeoutRef.current = setTimeout(() => {
      transitionTimeoutRef.current = null;
      transitioningRef.current = false;
    }, 500);
  }, [startRound, play, challengeWords]);

  const replay = useCallback(() => {
    if (stateRef.current.mode === 'challenge') {
      resetToMenu();
    } else {
      startSolo();
    }
  }, [resetToMenu, startSolo]);

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), [clearTimers]);

  return {
    state,
    bestSession,
    challengeWords,
    startSolo,
    startChallenge,
    typeLetter,
    backspace,
    submitGuess,
    nextRound,
    replay,
    resetToMenu,
  };
}
