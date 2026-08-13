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
import {
  NORMAL_ROUND_COUNT,
  calculateScore,
  getLocalBestSession,
  round2,
  saveBestSession,
} from '@/utils/scoring';
import { EchoChallengeRound, getEchoChallengeRounds } from './challenge';
import {
  BLIP_THROTTLE_MS,
  ECHO_DIFFICULTY,
  GAME_ID,
  TONE_DURATION_MS,
  accuracyFromCents,
  centsBetween,
  getEchoRating,
  makeFrequency,
  makeStartFrequency,
} from './constants';
import { isAudioBlocked, playBlip, playTone, stopTone } from './tones';
import { EchoGameState, PitchDirection } from './types';

const INITIAL_STATE: EchoGameState = {
  phase: 'selecting-difficulty',
  mode: 'normal',
  difficulty: null,
  target: 440,
  guess: 440,
  replaysLeft: 0,
  hasListened: false,
  round: 1,
  totalRounds: NORMAL_ROUND_COUNT,
  score: 0,
  totalScore: 0,
  roundScores: [],
  result: null,
  isNewBestSession: false,
  audioBlocked: false,
};

// localStorage best session, hydration-safe (server snapshot is 0)
const noopSubscribe = () => () => {};
const zeroSnapshot = () => 0;
const readBest = () => getLocalBestSession(GAME_ID);

export interface UseEchoEarGameOptions {
  /** When set, the game runs as a seeded 3-round challenge. */
  challengeCode?: string;
}

export function useEchoEarGame({ challengeCode }: UseEchoEarGameOptions = {}) {
  usePlayBeacon(GAME_ID);
  const isChallenge = Boolean(challengeCode);
  // Deterministic per code, so every player hears the same three pitches
  const challengeRounds = useMemo<EchoChallengeRound[] | null>(
    () => (challengeCode ? getEchoChallengeRounds(challengeCode) : null),
    [challengeCode]
  );

  const [state, setState] = useState<EchoGameState>(() => ({
    ...INITIAL_STATE,
    mode: isChallenge ? 'challenge' : 'normal',
    phase: isChallenge ? 'challenge-intro' : 'selecting-difficulty',
    totalRounds: isChallenge ? CHALLENGE_ROUND_COUNT : NORMAL_ROUND_COUNT,
  }));
  const { play } = useSound();

  const transitioningRef = useRef(false);
  const lastBlipRef = useRef(0);

  // Mirror of the latest state for callbacks, updated in an effect (never
  // during render) so it can't trip the refs-during-render rule.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const bestSession = useSyncExternalStore(noopSubscribe, readBest, zeroSnapshot);

  // ── Round lifecycle ───────────────────────────────────────────────

  /** Rolls a fresh target and a far-enough-away slider start, then opens the
   *  listen phase. */
  const startRound = useCallback(
    (difficulty: Difficulty, round: number) => {
      stopTone();
      const cfg = ECHO_DIFFICULTY[difficulty];
      // Challenge rounds are seeded so every player hears identical pitches;
      // the slider's start point is cosmetic (it doesn't affect fairness —
      // both players still have to match the same target by ear) so it stays
      // unseeded even in challenge mode.
      const target = challengeRounds?.[round - 1]?.target ?? makeFrequency(Math.random);
      const guess = makeStartFrequency(target, Math.random);

      setState((s) => ({
        ...s,
        phase: 'listening',
        difficulty,
        target,
        guess,
        replaysLeft: cfg.replays,
        hasListened: false,
        round,
        score: 0,
        result: null,
      }));
    },
    [challengeRounds]
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
    stopTone();
    play('click');
    setState((s) => ({
      ...INITIAL_STATE,
      mode: s.mode,
      phase: s.mode === 'challenge' ? 'challenge-intro' : 'selecting-difficulty',
      totalRounds: s.totalRounds,
    }));
  }, [play]);

  // ── Listening ─────────────────────────────────────────────────────

  /** Plays the target tone. The first listen is free; every play after that
   *  draws down the difficulty's replay budget. */
  const listenToTarget = useCallback(() => {
    const { phase, target, hasListened, replaysLeft } = stateRef.current;
    if (phase !== 'listening') return;
    if (hasListened && replaysLeft <= 0) return;

    const ok = playTone(target, TONE_DURATION_MS);
    if (!ok && isAudioBlocked()) {
      setState((s) => ({ ...s, audioBlocked: true }));
      return;
    }
    setState((s) =>
      s.hasListened ? { ...s, replaysLeft: s.replaysLeft - 1 } : { ...s, hasListened: true }
    );
  }, []);

  const proceedToMatch = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== 'listening' || !prev.hasListened) return prev;
      return { ...prev, phase: 'matching' };
    });
    play('click');
  }, [play]);

  // ── Matching ──────────────────────────────────────────────────────

  /** Moves the slider live: updates the guess immediately, but throttles the
   *  pitch blip so a fast drag doesn't turn into a rattle. */
  const setGuess = useCallback((freq: number) => {
    setState((prev) => (prev.phase !== 'matching' ? prev : { ...prev, guess: freq }));

    const now = performance.now();
    if (now - lastBlipRef.current < BLIP_THROTTLE_MS) return;
    lastBlipRef.current = now;
    const ok = playBlip(freq);
    if (!ok && isAudioBlocked()) {
      setState((s) => ({ ...s, audioBlocked: true }));
    }
  }, []);

  /** Locks in the guess and scores the round. */
  const submit = useCallback(() => {
    stopTone();
    play('confirm');
    setState((prev) => {
      if (prev.phase !== 'matching' || !prev.difficulty) return prev;

      const cents = centsBetween(prev.guess, prev.target);
      const accuracy = accuracyFromCents(cents, prev.difficulty);
      const score = calculateScore(accuracy);
      const rating = getEchoRating(score);
      const direction: PitchDirection =
        prev.guess > prev.target ? 'sharp' : prev.guess < prev.target ? 'flat' : 'perfect';

      return {
        ...prev,
        phase: 'results',
        score,
        totalScore: round2(prev.totalScore + score),
        roundScores: [...prev.roundScores, score],
        result: {
          target: prev.target,
          guess: prev.guess,
          cents: round2(cents),
          direction,
          accuracy,
          rating,
          score,
        },
      };
    });
  }, [play]);

  // Held back so it lands with the score reveal, not on the confirm sound.
  useEffect(() => {
    if (state.phase !== 'results' || !state.result) return;
    const { rating } = state.result;
    const id = setTimeout(() => {
      if (rating === 'Perfect') play('celebrate');
      else if (rating === 'Great' || rating === 'Good') play('success');
      else play('fail');
    }, 420);
    return () => clearTimeout(id);
  }, [state.phase, state.result, play]);

  /** Replays either pitch from the result screen — outside the round's
   *  listen/replay budget, since the round is already scored. */
  const previewPitch = useCallback((freq: number) => {
    const ok = playTone(freq, TONE_DURATION_MS);
    if (!ok && isAudioBlocked()) {
      setState((s) => ({ ...s, audioBlocked: true }));
    }
  }, []);

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

    setTimeout(() => {
      transitioningRef.current = false;
    }, 500);
  }, [startRound, play, challengeRounds]);

  const replay = useCallback(() => {
    const { difficulty } = stateRef.current;
    if (difficulty) selectDifficulty(difficulty);
  }, [selectDifficulty]);

  // Never leave a tone sounding when the screen unmounts
  useEffect(() => stopTone, []);

  return {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    listenToTarget,
    proceedToMatch,
    setGuess,
    submit,
    previewPitch,
    nextRound,
    replay,
    resetToMenu,
  };
}
