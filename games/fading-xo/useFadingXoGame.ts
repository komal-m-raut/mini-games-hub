'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Difficulty } from '@/types/game';
import { useSound } from '@/hooks/useSound';
import { usePlayBeacon } from '@/hooks/usePlayBeacon';
import { CHALLENGE_ROUND_COUNT, makeChallengeRand } from '@/lib/challenge';
import { getLocalBestSession, round2, saveBestSession } from '@/utils/scoring';
import { botMove } from './bot';
import { FadingXoChallengeRound, getFadingXoChallengeRounds } from './challenge';
import {
  BOT_MARK,
  BOT_THINK_MAX_MS,
  BOT_THINK_MIN_MS,
  GAME_ID,
  GAMES_PER_ROUND,
  PLAYER_MARK,
  TOTAL_ROUNDS,
  score10,
} from './constants';
import {
  FadingXoMove,
  FadingXoState,
  Player,
  Winner,
  applyMove,
  createInitialState,
  isMovementPhase,
  opponentOf,
} from './engine';
import { FadingXoGameState, FadingXoRoundResult, GameOutcome } from './types';

// localStorage best session, hydration-safe (server snapshot is 0)
const noopSubscribe = () => () => {};
const zeroSnapshot = () => 0;
const readBest = () => getLocalBestSession(GAME_ID);

function outcomeFor(winner: NonNullable<Winner>): GameOutcome {
  if (winner === 'draw') return 'draw';
  return winner === PLAYER_MARK ? 'win' : 'loss';
}

const INITIAL_STATE: FadingXoGameState = {
  phase: 'selecting-difficulty',
  mode: 'normal',
  difficulty: null,
  round: 1,
  totalRounds: TOTAL_ROUNDS,
  gameIndex: 1,
  wins: 0,
  draws: 0,
  losses: 0,
  outcomes: [],
  engine: createInitialState(PLAYER_MARK),
  starter: PLAYER_MARK,
  lastOutcome: null,
  isBotThinking: false,
  totalScore: 0,
  roundScores: [],
  result: null,
  isNewBestSession: false,
};

export interface UseFadingXoGameOptions {
  /** When set, the game runs as a seeded 3-round challenge. */
  challengeCode?: string;
}

export function useFadingXoGame({ challengeCode }: UseFadingXoGameOptions = {}) {
  usePlayBeacon(GAME_ID);
  const isChallenge = Boolean(challengeCode);
  const challengeRounds = useMemo<FadingXoChallengeRound[] | null>(
    () => (challengeCode ? getFadingXoChallengeRounds() : null),
    [challengeCode]
  );

  // One seeded generator for the whole challenge — every bot decision and
  // every think-time delay draws from it in sequence, so a given code plays
  // out identically (same bot moves, same pacing) for every player.
  const challengeRand = useMemo<(() => number) | null>(
    () => (challengeCode ? makeChallengeRand(challengeCode, GAME_ID) : null),
    [challengeCode]
  );
  const randFn = useCallback((): number => (challengeRand ? challengeRand() : Math.random()), [challengeRand]);

  const [state, setState] = useState<FadingXoGameState>(() => ({
    ...INITIAL_STATE,
    mode: isChallenge ? 'challenge' : 'normal',
    phase: isChallenge ? 'challenge-intro' : 'selecting-difficulty',
    totalRounds: isChallenge ? CHALLENGE_ROUND_COUNT : TOTAL_ROUNDS,
  }));
  const { play } = useSound();

  const bestSession = useSyncExternalStore(noopSubscribe, readBest, zeroSnapshot);

  // Mirror of the latest state for callbacks, updated in an effect (never
  // during render) so it can't trip the refs-during-render rule.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const botTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitioningRef = useRef(false);

  const clearBotTimeout = useCallback(() => {
    if (botTimeoutRef.current) {
      clearTimeout(botTimeoutRef.current);
      botTimeoutRef.current = null;
    }
  }, []);

  // ── One game's end → this round's running record ─────────────────

  const finishGame = useCallback(
    (next: FadingXoState) => {
      if (!next.winner) return;
      const outcome = outcomeFor(next.winner);
      setState((prev) => {
        if (prev.phase !== 'playing') return prev;
        return {
          ...prev,
          phase: 'game-result',
          lastOutcome: outcome,
          isBotThinking: false,
          wins: prev.wins + (outcome === 'win' ? 1 : 0),
          draws: prev.draws + (outcome === 'draw' ? 1 : 0),
          losses: prev.losses + (outcome === 'loss' ? 1 : 0),
          outcomes: [...prev.outcomes, outcome],
        };
      });
      play(outcome === 'win' ? 'success' : outcome === 'loss' ? 'fail' : 'click');
    },
    [play]
  );

  // ── Bot's turn ─────────────────────────────────────────────────────

  const scheduleBotMove = useCallback(
    (engineState: FadingXoState, difficulty: Difficulty) => {
      setState((prev) => (prev.phase !== 'playing' ? prev : { ...prev, isBotThinking: true }));
      const thinkMs = BOT_THINK_MIN_MS + randFn() * (BOT_THINK_MAX_MS - BOT_THINK_MIN_MS);

      clearBotTimeout();
      botTimeoutRef.current = setTimeout(() => {
        botTimeoutRef.current = null;
        // The player may have backed out to the menu or reset mid-think —
        // don't resurrect a move for a game that's no longer live.
        if (stateRef.current.phase !== 'playing') return;

        const move = botMove(engineState, difficulty, randFn);
        const next = applyMove(engineState, move);
        play(move.type === 'place' ? 'tap' : 'whoosh');
        setState((prev) =>
          prev.phase !== 'playing' ? prev : { ...prev, engine: next, isBotThinking: false }
        );
        if (next.winner) finishGame(next);
      }, thinkMs);
    },
    [randFn, play, clearBotTimeout, finishGame]
  );

  // ── Starting a single game within the current best-of-3 round ──────

  const startGame = useCallback(
    (starter: Player, gameIndex: number, difficulty: Difficulty) => {
      clearBotTimeout();
      const engine = createInitialState(starter);
      setState((prev) => ({
        ...prev,
        phase: 'playing',
        starter,
        gameIndex,
        engine,
        isBotThinking: false,
        lastOutcome: null,
      }));
      if (starter === BOT_MARK) scheduleBotMove(engine, difficulty);
    },
    [clearBotTimeout, scheduleBotMove]
  );

  const startRound = useCallback(
    (difficulty: Difficulty, round: number) => {
      setState((prev) => ({
        ...prev,
        difficulty,
        round,
        wins: 0,
        draws: 0,
        losses: 0,
        outcomes: [],
        result: null,
      }));
      // Fixed alternation within a round: the player always opens game 1.
      startGame(PLAYER_MARK, 1, difficulty);
    },
    [startGame]
  );

  const selectDifficulty = useCallback(
    (difficulty: Difficulty) => {
      play('click');
      setState((s) => ({ ...s, totalScore: 0, roundScores: [], isNewBestSession: false }));
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
    clearBotTimeout();
    play('click');
    setState((s) => ({
      ...INITIAL_STATE,
      mode: s.mode,
      phase: s.mode === 'challenge' ? 'challenge-intro' : 'selecting-difficulty',
      totalRounds: s.totalRounds,
    }));
  }, [clearBotTimeout, play]);

  // ── The player's action ─────────────────────────────────────────────

  const playerMove = useCallback(
    (cell: number) => {
      const { phase, engine, isBotThinking, difficulty } = stateRef.current;
      if (phase !== 'playing' || isBotThinking || !difficulty) return;
      if (engine.turn !== PLAYER_MARK || engine.winner) return;
      if (engine.board[cell] !== null) return;

      const move: FadingXoMove = isMovementPhase(engine, PLAYER_MARK)
        ? { type: 'move', from: engine.queues[PLAYER_MARK][0], to: cell }
        : { type: 'place', cell };

      const next = applyMove(engine, move);
      play(move.type === 'place' ? 'tap' : 'whoosh');
      setState((prev) => (prev.phase !== 'playing' ? prev : { ...prev, engine: next }));

      if (next.winner) {
        finishGame(next);
      } else if (next.turn === BOT_MARK) {
        scheduleBotMove(next, difficulty);
      }
    },
    [play, finishGame, scheduleBotMove]
  );

  // ── Advancing within / past a round ─────────────────────────────────

  const continueAfterGame = useCallback(() => {
    if (transitioningRef.current) return;
    const { phase, gameIndex, wins, draws, losses, outcomes, difficulty, starter, totalScore, roundScores } =
      stateRef.current;
    if (phase !== 'game-result' || !difficulty) return;
    transitioningRef.current = true;

    if (gameIndex < GAMES_PER_ROUND) {
      play('click');
      startGame(opponentOf(starter), gameIndex + 1, difficulty);
    } else {
      // The best-of-3 match itself just concluded — its own, bigger sound,
      // distinct from the per-game success/fail/click.
      play('celebrate');
      const score = score10(wins, draws);
      const result: FadingXoRoundResult = { difficulty, wins, draws, losses, outcomes, score };
      setState((prev) => ({
        ...prev,
        phase: 'round-result',
        result,
        totalScore: round2(totalScore + score),
        roundScores: [...roundScores, score],
      }));
    }

    setTimeout(() => {
      transitioningRef.current = false;
    }, 500);
  }, [startGame, play]);

  const nextRound = useCallback(() => {
    if (transitioningRef.current) return;
    const { difficulty, round, phase, mode, totalRounds, totalScore } = stateRef.current;
    if (!difficulty || phase !== 'round-result') return;
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

  // Cleanup on unmount
  useEffect(() => clearBotTimeout, [clearBotTimeout]);

  return {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    playerMove,
    continueAfterGame,
    nextRound,
    replay,
    resetToMenu,
  };
}
