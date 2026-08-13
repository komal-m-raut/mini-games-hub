'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Difficulty } from '@/types/game';
import { useSound } from '@/hooks/useSound';
import { usePlayBeacon } from '@/hooks/usePlayBeacon';
import { CHALLENGE_ROUND_COUNT } from '@/lib/challenge';
import { getLocalBestSession, round2, saveBestSession } from '@/utils/scoring';
import { botMove } from './bot';
import { XOChallengeRound, getXOChallengeRounds } from './challenge';
import {
  BOT_THINK_MAX_MS,
  BOT_THINK_MIN_MS,
  GAME_ID,
  GAMES_PER_ROUND,
  SOLO_ROUND_COUNT,
  calculateRoundScore,
} from './constants';
import { BoardState, Move, Player, applyMove, createInitialBoard, isDraw, winner } from './engine';
import { GameOutcome, XOGameState, XOMode } from './types';

// localStorage best session, hydration-safe (server snapshot is 0)
const noopSubscribe = () => () => {};
const zeroSnapshot = () => 0;
const readBest = () => getLocalBestSession(GAME_ID);

/** Who places the first mark of a given game. Solo: game 1 of a round
 *  starts with the player, alternating each subsequent game in that round's
 *  best-of-3. Challenge: seeded per game so every player sees the same
 *  starter for the same code. */
function starterFor(
  round: number,
  gameIndex: number,
  mode: XOMode,
  challengeRounds: XOChallengeRound[] | null
): Player {
  if (mode === 'challenge' && challengeRounds) {
    return challengeRounds[round - 1].games[gameIndex - 1].starter;
  }
  return gameIndex % 2 === 1 ? 'X' : 'O';
}

/** The bot's dice for one game: Math.random in solo, a seeded per-game
 *  stream in Challenge so bot behaviour replays identically for everyone. */
function botRandFor(
  round: number,
  gameIndex: number,
  mode: XOMode,
  challengeRounds: XOChallengeRound[] | null
): () => number {
  if (mode === 'challenge' && challengeRounds) {
    return challengeRounds[round - 1].games[gameIndex - 1].botRand;
  }
  return Math.random;
}

const INITIAL_STATE: XOGameState = {
  phase: 'selecting-difficulty',
  mode: 'normal',
  difficulty: null,
  round: 1,
  totalRounds: SOLO_ROUND_COUNT,
  gameIndex: 1,
  board: createInitialBoard('X'),
  selected: null,
  botThinking: false,
  roundGames: [],
  lastGame: null,
  roundScores: [],
  totalScore: 0,
  isNewBestSession: false,
  sessionWins: 0,
  sessionLosses: 0,
  sessionDraws: 0,
};

export interface UseXOShiftGameOptions {
  /** When set, the game runs as a seeded 3-round (9-game) challenge. */
  challengeCode?: string;
}

export function useXOShiftGame({ challengeCode }: UseXOShiftGameOptions = {}) {
  usePlayBeacon(GAME_ID);
  const isChallenge = Boolean(challengeCode);
  const challengeRounds = useMemo<XOChallengeRound[] | null>(
    () => (challengeCode ? getXOChallengeRounds(challengeCode) : null),
    [challengeCode]
  );

  const [state, setState] = useState<XOGameState>(() => ({
    ...INITIAL_STATE,
    mode: isChallenge ? 'challenge' : 'normal',
    phase: isChallenge ? 'challenge-intro' : 'selecting-difficulty',
    totalRounds: isChallenge ? CHALLENGE_ROUND_COUNT : SOLO_ROUND_COUNT,
  }));
  const { play } = useSound();

  const bestSession = useSyncExternalStore(noopSubscribe, readBest, zeroSnapshot);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const transitioningRef = useRef(false);
  const botTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botDeadlineRef = useRef(0);
  const botPendingRef = useRef<{ board: BoardState; difficulty: Difficulty; rand: () => number } | null>(
    null
  );
  /** Lets `fireBotMove` call back into `resolveTurn` without a circular
   *  useCallback dependency between the two. */
  const resolveTurnRef = useRef<
    (board: BoardState, ctx: { round: number; gameIndex: number; difficulty: Difficulty; mode: XOMode }) => void
  >(() => {});

  const clearBotTimeout = useCallback(() => {
    if (botTimeoutRef.current) {
      clearTimeout(botTimeoutRef.current);
      botTimeoutRef.current = null;
    }
    botPendingRef.current = null;
  }, []);

  // ── One finished game → game-result ──────────────────────────────

  const finishGame = useCallback(
    (board: BoardState, winnerPlayer: Player | null) => {
      const outcome: GameOutcome = winnerPlayer === 'X' ? 'win' : winnerPlayer === 'O' ? 'loss' : 'draw';
      play(outcome === 'win' ? 'success' : outcome === 'loss' ? 'fail' : 'click');

      setState((prev) => {
        if (prev.phase !== 'playing') return prev;
        return {
          ...prev,
          phase: 'game-result',
          board,
          selected: null,
          botThinking: false,
          roundGames: [...prev.roundGames, { outcome }],
          lastGame: { outcome },
          sessionWins: prev.sessionWins + (outcome === 'win' ? 1 : 0),
          sessionLosses: prev.sessionLosses + (outcome === 'loss' ? 1 : 0),
          sessionDraws: prev.sessionDraws + (outcome === 'draw' ? 1 : 0),
        };
      });
    },
    [play]
  );

  // ── Bot turn scheduling ───────────────────────────────────────────

  const fireBotMove = useCallback(() => {
    const pending = botPendingRef.current;
    botTimeoutRef.current = null;
    botPendingRef.current = null;
    if (!pending) return;

    const { board, difficulty, rand } = pending;
    const move = botMove(board, difficulty, rand);
    const next = applyMove(board, move);
    play(move.type === 'place' ? 'tap' : 'slide');
    setState((s) => (s.phase !== 'playing' ? s : { ...s, board: next, botThinking: false, selected: null }));

    const { round, gameIndex, mode } = stateRef.current;
    resolveTurnRef.current(next, { round, gameIndex, difficulty, mode });
  }, [play]);

  /** After any move: finish the game if it's over, otherwise — if it's now
   *  the bot's turn — schedule its "thinking" delay and move. `ctx` is
   *  passed explicitly rather than read from `stateRef` because this can be
   *  called synchronously right after the state update that sets it. */
  const resolveTurn = useCallback(
    (
      board: BoardState,
      ctx: { round: number; gameIndex: number; difficulty: Difficulty; mode: XOMode }
    ) => {
      const w = winner(board);
      if (w || isDraw(board)) {
        finishGame(board, w);
        return;
      }
      if (board.turn !== 'O') return;

      const rand = botRandFor(ctx.round, ctx.gameIndex, ctx.mode, challengeRounds);
      const thinkMs = BOT_THINK_MIN_MS + rand() * (BOT_THINK_MAX_MS - BOT_THINK_MIN_MS);

      setState((s) => (s.phase !== 'playing' ? s : { ...s, botThinking: true }));
      clearBotTimeout();
      botDeadlineRef.current = performance.now() + thinkMs;
      botPendingRef.current = { board, difficulty: ctx.difficulty, rand };
      botTimeoutRef.current = setTimeout(fireBotMove, thinkMs);
    },
    [finishGame, challengeRounds, clearBotTimeout, fireBotMove]
  );

  useEffect(() => {
    resolveTurnRef.current = resolveTurn;
  }, [resolveTurn]);

  // ── Starting a game / round ───────────────────────────────────────

  const startGame = useCallback(
    (round: number, gameIndex: number, difficulty: Difficulty) => {
      clearBotTimeout();
      const mode = stateRef.current.mode;
      const starter = starterFor(round, gameIndex, mode, challengeRounds);
      const board = createInitialBoard(starter);

      setState((s) => ({
        ...s,
        phase: 'playing',
        difficulty,
        round,
        gameIndex,
        board,
        selected: null,
        botThinking: false,
        roundGames: gameIndex === 1 ? [] : s.roundGames,
      }));

      resolveTurn(board, { round, gameIndex, difficulty, mode });
    },
    [challengeRounds, clearBotTimeout, resolveTurn]
  );

  const selectDifficulty = useCallback(
    (difficulty: Difficulty) => {
      play('click');
      setState((s) => ({
        ...s,
        difficulty,
        roundScores: [],
        roundGames: [],
        totalScore: 0,
        isNewBestSession: false,
        sessionWins: 0,
        sessionLosses: 0,
        sessionDraws: 0,
      }));
      startGame(1, 1, difficulty);
    },
    [startGame, play]
  );

  const startChallenge = useCallback(() => {
    if (!challengeRounds) return;
    setState((s) => ({
      ...s,
      roundScores: [],
      roundGames: [],
      totalScore: 0,
      sessionWins: 0,
      sessionLosses: 0,
      sessionDraws: 0,
    }));
    startGame(1, 1, challengeRounds[0].difficulty);
  }, [startGame, challengeRounds]);

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

  // ── Human input ───────────────────────────────────────────────────

  const applyHumanMove = useCallback(
    (move: Move) => {
      const { board, round, gameIndex, difficulty, mode } = stateRef.current;
      if (!difficulty) return;
      const next = applyMove(board, move);
      play(move.type === 'place' ? 'tap' : 'slide');
      setState((s) => (s.phase !== 'playing' ? s : { ...s, board: next, selected: null }));
      resolveTurn(next, { round, gameIndex, difficulty, mode });
    },
    [play, resolveTurn]
  );

  /** Single tap handler for the board — the hook figures out whether it's a
   *  placement, a piece selection, a deselect, or a move, from the current
   *  board phase and selection. */
  const tapCell = useCallback(
    (cellIndex: number) => {
      const { phase, board, selected, botThinking } = stateRef.current;
      if (phase !== 'playing' || botThinking || board.turn !== 'X') return;

      if (board.phase === 'placement') {
        if (board.cells[cellIndex] !== null) return;
        applyHumanMove({ type: 'place', to: cellIndex });
        return;
      }

      if (selected === cellIndex) {
        setState((s) => ({ ...s, selected: null }));
        return;
      }
      if (board.cells[cellIndex] === 'X') {
        setState((s) => ({ ...s, selected: cellIndex }));
        return;
      }
      if (selected !== null) {
        const forbidden = board.blockedReturn[selected];
        const isAdjacentEmpty =
          board.cells[cellIndex] === null && forbidden !== cellIndex && cellIndex !== selected;
        if (isAdjacentEmpty) {
          applyHumanMove({ type: 'move', from: selected, to: cellIndex });
        }
      }
    },
    [applyHumanMove]
  );

  // ── Advancing after a game / round ────────────────────────────────

  const continueAfterGame = useCallback(() => {
    if (transitioningRef.current) return;
    const { phase, roundGames, round, gameIndex, difficulty } = stateRef.current;
    if (phase !== 'game-result' || !difficulty) return;
    transitioningRef.current = true;
    play('click');

    if (roundGames.length < GAMES_PER_ROUND) {
      startGame(round, gameIndex + 1, difficulty);
    } else {
      const wins = roundGames.filter((g) => g.outcome === 'win').length;
      const draws = roundGames.filter((g) => g.outcome === 'draw').length;
      const score = calculateRoundScore(wins, draws);
      setState((s) => ({
        ...s,
        phase: 'round-result',
        roundScores: [...s.roundScores, score],
        totalScore: round2(s.totalScore + score),
      }));
    }

    setTimeout(() => {
      transitioningRef.current = false;
    }, 500);
  }, [startGame, play]);

  const continueAfterRound = useCallback(() => {
    if (transitioningRef.current) return;
    const { phase, round, totalRounds, difficulty, mode, totalScore, sessionWins, sessionLosses } =
      stateRef.current;
    if (phase !== 'round-result' || !difficulty) return;
    transitioningRef.current = true;
    play('click');

    if (round < totalRounds) {
      const nextDifficulty =
        mode === 'challenge' ? challengeRounds?.[round]?.difficulty ?? difficulty : difficulty;
      startGame(round + 1, 1, nextDifficulty);
    } else {
      const wonOverall = sessionWins > sessionLosses;
      if (mode === 'challenge') {
        setState((s) => ({ ...s, phase: 'challenge-complete' }));
      } else {
        const isNewBestSession = saveBestSession(GAME_ID, totalScore);
        setState((s) => ({ ...s, phase: 'session-complete', isNewBestSession }));
      }
      if (wonOverall) play('celebrate');
    }

    setTimeout(() => {
      transitioningRef.current = false;
    }, 500);
  }, [startGame, play, challengeRounds]);

  const replay = useCallback(() => {
    const { difficulty } = stateRef.current;
    if (difficulty) selectDifficulty(difficulty);
  }, [selectDifficulty]);

  // A backgrounded tab must not let the bot's "thinking" delay silently
  // expire unseen — push the deadline forward by exactly how long the tab
  // was hidden and reschedule, rather than letting the original timeout
  // fire while nobody was watching.
  useEffect(() => {
    let hiddenAt: number | null = null;
    const onVisibilityChange = () => {
      if (document.hidden) {
        hiddenAt = performance.now();
      } else if (hiddenAt !== null) {
        const hiddenMs = performance.now() - hiddenAt;
        hiddenAt = null;
        if (stateRef.current.botThinking && botPendingRef.current) {
          botDeadlineRef.current += hiddenMs;
          if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
          const remaining = Math.max(0, botDeadlineRef.current - performance.now());
          botTimeoutRef.current = setTimeout(fireBotMove, remaining);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [fireBotMove]);

  // Cleanup on unmount
  useEffect(() => clearBotTimeout, [clearBotTimeout]);

  return {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    tapCell,
    continueAfterGame,
    continueAfterRound,
    replay,
    resetToMenu,
  };
}
