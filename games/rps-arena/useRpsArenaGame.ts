'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Difficulty } from '@/types/game';
import { useSound } from '@/hooks/useSound';
import { usePlayBeacon } from '@/hooks/usePlayBeacon';
import { CHALLENGE_ROUND_COUNT } from '@/lib/challenge';
import { getLocalBestSession, round2, saveBestSession } from '@/utils/scoring';
import { botMove } from './bot';
import { RpsChallengeMatch, getRpsChallengeRounds, makeRpsChallengeRand } from './challenge';
import {
  GAME_ID,
  MATCHES_PER_SESSION,
  applyThrowToMatch,
  judgeThrow,
  matchOutcome,
  scoreMatch,
} from './constants';
import { RpsGameState, Throw, ThrowRecord } from './types';

/** Seconds-equivalent step for the "3 · 2 · 1" reveal cadence, in ms. */
const REVEAL_STEP_MS = 600;
const REVEAL_STEPS = 3;
/** Hold from "hands visible" (revealCount hits 0) to the result flash — long
 *  enough for the hands' spring reveal to actually land first. */
const REVEAL_HOLD_MS = 500;
/** Hold on the win/lose/tie flash before auto-advancing to the next throw
 *  (or the match-result screen, if that throw decided the match). */
const RESULT_HOLD_MS = 900;

const INITIAL_STATE: RpsGameState = {
  phase: 'selecting-difficulty',
  mode: 'normal',
  difficulty: null,
  match: 1,
  totalRounds: MATCHES_PER_SESSION,
  playerWins: 0,
  botWins: 0,
  history: [],
  playerStreak: 0,
  playerThrow: null,
  botThrow: null,
  revealCount: REVEAL_STEPS,
  throwResult: null,
  matchOutcome: null,
  score: 0,
  totalScore: 0,
  roundScores: [],
  isNewBestSession: false,
};

// localStorage best session, hydration-safe (server snapshot is 0)
const noopSubscribe = () => () => {};
const zeroSnapshot = () => 0;
const readBest = () => getLocalBestSession(GAME_ID);

export interface UseRpsArenaGameOptions {
  /** When set, the game runs as a seeded 3-match challenge. */
  challengeCode?: string;
}

export function useRpsArenaGame({ challengeCode }: UseRpsArenaGameOptions = {}) {
  usePlayBeacon(GAME_ID);
  const isChallenge = Boolean(challengeCode);
  const challengeRounds = useMemo<RpsChallengeMatch[] | null>(
    () => (challengeCode ? getRpsChallengeRounds(challengeCode) : null),
    [challengeCode]
  );

  const [state, setState] = useState<RpsGameState>(() => ({
    ...INITIAL_STATE,
    mode: isChallenge ? 'challenge' : 'normal',
    phase: isChallenge ? 'challenge-intro' : 'selecting-difficulty',
    totalRounds: isChallenge ? CHALLENGE_ROUND_COUNT : MATCHES_PER_SESSION,
  }));
  const { play } = useSound();

  const bestSession = useSyncExternalStore(noopSubscribe, readBest, zeroSnapshot);

  // The bot's own dice — plain Math.random() for solo play, or one seeded
  // generator shared across the whole challenge (see makeRpsChallengeRand).
  const botRandRef = useRef<() => number>(Math.random);

  const revealTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const revealDeadlineRef = useRef(0);
  const revealHoldTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitioningRef = useRef(false);
  // Guards a throw against a second tap while it's already resolving.
  const throwLockRef = useRef(false);
  // Stashed between beginReveal() and resolveThrow() — the bot's move (and
  // the outcome it produces) is decided the instant the player throws, but
  // only applied to state once the reveal cadence finishes.
  const pendingBotRef = useRef<Throw | null>(null);
  const pendingOutcomeRef = useRef<ThrowRecord['result'] | null>(null);

  // Mirror of the latest state for callbacks; updated in an effect (never
  // during render) so it can't trip the refs-during-render rule.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const clearTimers = useCallback(() => {
    if (revealTimerRef.current) {
      clearInterval(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    if (revealHoldTimeoutRef.current) {
      clearTimeout(revealHoldTimeoutRef.current);
      revealHoldTimeoutRef.current = null;
    }
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
  }, []);

  // ── Match lifecycle ─────────────────────────────────────────────────

  const startMatch = useCallback(
    (difficulty: Difficulty, match: number) => {
      clearTimers();
      throwLockRef.current = false;
      pendingBotRef.current = null;
      pendingOutcomeRef.current = null;
      setState((s) => ({
        ...s,
        phase: 'choosing',
        difficulty,
        match,
        playerWins: 0,
        botWins: 0,
        history: [],
        playerStreak: 0,
        playerThrow: null,
        botThrow: null,
        revealCount: REVEAL_STEPS,
        throwResult: null,
        matchOutcome: null,
        score: 0,
      }));
    },
    [clearTimers]
  );

  const selectDifficulty = useCallback(
    (difficulty: Difficulty) => {
      play('click');
      botRandRef.current = Math.random;
      setState((s) => ({ ...s, totalScore: 0, roundScores: [], isNewBestSession: false }));
      startMatch(difficulty, 1);
    },
    [startMatch, play]
  );

  const startChallenge = useCallback(() => {
    if (!challengeRounds) return;
    botRandRef.current = challengeCode ? makeRpsChallengeRand(challengeCode) : Math.random;
    setState((s) => ({ ...s, totalScore: 0, roundScores: [] }));
    startMatch(challengeRounds[0].difficulty, 1);
  }, [startMatch, challengeRounds, challengeCode]);

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

  // ── One throw ─────────────────────────────────────────────────────

  /** Resolves the throw whose reveal cadence just finished: folds it into
   *  match progress, flashes the result, then either loops back to the next
   *  throw or — if that throw decided the match — advances to the
   *  match-result screen. */
  const resolveThrow = useCallback(() => {
    const bot = pendingBotRef.current;
    const outcome = pendingOutcomeRef.current;
    const { playerThrow, playerWins: pw, botWins: bw, history, playerStreak } = stateRef.current;
    if (!bot || !outcome || !playerThrow) return;
    pendingBotRef.current = null;
    pendingOutcomeRef.current = null;

    const record: ThrowRecord = { player: playerThrow, bot, result: outcome };
    const newHistory = [...history, record];
    const playerWins = pw + (outcome === 'win' ? 1 : 0);
    const botWins = bw + (outcome === 'lose' ? 1 : 0);
    const streak = outcome === 'win' ? playerStreak + 1 : outcome === 'lose' ? 0 : playerStreak;
    const decided = matchOutcome(
      applyThrowToMatch({ playerWins: pw, botWins: bw, games: pw + bw, throws: history.length }, outcome)
    );

    setState((s) =>
      s.phase !== 'revealing'
        ? s
        : {
            ...s,
            phase: 'throw-result',
            history: newHistory,
            playerWins,
            botWins,
            playerStreak: streak,
            throwResult: outcome,
          }
    );

    if (outcome === 'win') play('success');
    else if (outcome === 'lose') play('fail');
    else play('click');

    advanceTimeoutRef.current = setTimeout(() => {
      if (decided) {
        const score = scoreMatch(playerWins, botWins, decided);
        setState((s) => ({
          ...s,
          phase: 'match-result',
          matchOutcome: decided,
          score,
          totalScore: round2(s.totalScore + score),
          roundScores: [...s.roundScores, score],
        }));
      } else {
        throwLockRef.current = false;
        setState((s) =>
          s.phase !== 'throw-result'
            ? s
            : {
                ...s,
                phase: 'choosing',
                playerThrow: null,
                botThrow: null,
                throwResult: null,
                revealCount: REVEAL_STEPS,
              }
        );
      }
    }, RESULT_HOLD_MS);
  }, [play]);

  /** Kicks off the 3-2-1 reveal cadence for one throw. The bot's move is
   *  computed right here, from `history` only — it never sees `hand`. */
  const beginReveal = useCallback(
    (hand: Throw) => {
      const { difficulty, history } = stateRef.current;
      if (!difficulty) return;
      const bot = botMove(history, difficulty, botRandRef.current);
      pendingBotRef.current = bot;
      pendingOutcomeRef.current = judgeThrow(hand, bot);

      setState((s) => ({
        ...s,
        phase: 'revealing',
        playerThrow: hand,
        botThrow: bot,
        revealCount: REVEAL_STEPS,
        throwResult: null,
      }));

      play('tick');
      revealDeadlineRef.current = performance.now() + REVEAL_STEPS * REVEAL_STEP_MS;
      revealTimerRef.current = setInterval(() => {
        const remaining = Math.ceil((revealDeadlineRef.current - performance.now()) / REVEAL_STEP_MS);
        if (remaining <= 0) {
          clearInterval(revealTimerRef.current!);
          revealTimerRef.current = null;
          setState((prev) => (prev.phase !== 'revealing' ? prev : { ...prev, revealCount: 0 }));
          revealHoldTimeoutRef.current = setTimeout(resolveThrow, REVEAL_HOLD_MS);
          return;
        }
        setState((prev) =>
          prev.phase !== 'revealing' || prev.revealCount === remaining
            ? prev
            : { ...prev, revealCount: remaining }
        );
        play('tick');
      }, REVEAL_STEP_MS);
    },
    [play, resolveThrow]
  );

  const throwHand = useCallback(
    (hand: Throw) => {
      if (throwLockRef.current || stateRef.current.phase !== 'choosing') return;
      throwLockRef.current = true;
      beginReveal(hand);
    },
    [beginReveal]
  );

  // ── Advance ───────────────────────────────────────────────────────

  const nextRound = useCallback(() => {
    if (transitioningRef.current) return;
    const { difficulty, match, phase, mode, totalRounds, totalScore } = stateRef.current;
    if (!difficulty || phase !== 'match-result') return;
    transitioningRef.current = true;
    play('click');

    if (match >= totalRounds) {
      if (mode === 'challenge') {
        setState((s) => ({ ...s, phase: 'challenge-complete' }));
      } else {
        const isNewBestSession = saveBestSession(GAME_ID, totalScore);
        setState((s) => ({ ...s, phase: 'session-complete', isNewBestSession }));
      }
      play('celebrate');
    } else {
      const nextDifficulty = challengeRounds?.[match]?.difficulty ?? difficulty;
      startMatch(nextDifficulty, match + 1);
    }

    setTimeout(() => {
      transitioningRef.current = false;
    }, 500);
  }, [startMatch, play, challengeRounds]);

  const replay = useCallback(() => {
    const { difficulty } = stateRef.current;
    if (difficulty) selectDifficulty(difficulty);
  }, [selectDifficulty]);

  // A backgrounded tab must not silently fast-forward the reveal cadence —
  // push the deadline forward by exactly how long the tab was hidden,
  // mirroring Math Sprint's countdown/round timers. No player input is ever
  // pending during `revealing`/`throw-result`, so nothing here can score a
  // phantom action; this only keeps the visible "3 · 2 · 1" honest.
  useEffect(() => {
    let hiddenAt: number | null = null;
    const onVisibilityChange = () => {
      if (document.hidden) {
        hiddenAt = performance.now();
      } else if (hiddenAt !== null) {
        const hiddenMs = performance.now() - hiddenAt;
        hiddenAt = null;
        if (stateRef.current.phase === 'revealing') {
          revealDeadlineRef.current += hiddenMs;
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
    throwHand,
    nextRound,
    replay,
    resetToMenu,
  };
}
