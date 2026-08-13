'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useSound } from '@/hooks/useSound';
import { usePlayBeacon } from '@/hooks/usePlayBeacon';
import { getLocalBestSession, round2, saveBestSession } from '@/utils/scoring';
import { Challenge2048Round, get2048ChallengeRounds } from './challenge';
import {
  COUNTDOWN_SECONDS,
  GAME_ID,
  SPRINT_SECONDS,
  TOTAL_CHALLENGE_ROUNDS,
  calculateSprintScore,
  getRawBestScore,
  saveRawBestScore,
} from './constants';
import {
  Direction,
  createEmptyBoard,
  hasWon,
  highestTile,
  isGameOver,
  moveBoard,
  spawnTile,
} from './engine';
import { Game2048RoundResult, Game2048State } from './types';

/** Minimum gap between 'confirm' merge sounds — a burst of merges in one
 *  move already collapses to one call site, but fast key-repeat across
 *  several moves in quick succession shouldn't rattle off a 'confirm' per
 *  move either. */
const CONFIRM_THROTTLE_MS = 90;

const INITIAL_STATE: Game2048State = {
  phase: 'menu',
  mode: 'solo',
  board: createEmptyBoard(),
  score: 0,
  moves: 0,
  bestTileThisRun: 0,
  won: false,
  showWonBanner: false,
  undoSnapshot: null,
  undoUsed: false,
  lastMoveDir: null,
  round: 1,
  totalRounds: TOTAL_CHALLENGE_ROUNDS,
  countdown: COUNTDOWN_SECONDS,
  timeLeft: SPRINT_SECONDS,
  roundScores: [],
  result: null,
  isNewBestScore: false,
};

// localStorage reads, hydration-safe (server snapshot is always 0)
const noopSubscribe = () => () => {};
const zeroSnapshot = () => 0;
const readRawBest = () => getRawBestScore();
const readBestSession = () => getLocalBestSession(GAME_ID);

export interface Use2048GameOptions {
  /** When set, the game runs as a seeded 3-round challenge. */
  challengeCode?: string;
}

/** Starts a fresh board with the standard two opening tiles. */
function dealOpeningBoard(rand: () => number): number[] {
  let board = createEmptyBoard();
  board = spawnTile(board, rand);
  board = spawnTile(board, rand);
  return board;
}

export function use2048Game({ challengeCode }: Use2048GameOptions = {}) {
  usePlayBeacon(GAME_ID);
  const isChallenge = Boolean(challengeCode);

  // Deterministic per code: every player gets the same 3 independent spawn
  // streams, one per round (see challenge.ts for why they're independent
  // rather than one continued stream).
  const challengeRounds = useMemo<Challenge2048Round[] | null>(
    () => (challengeCode ? get2048ChallengeRounds(challengeCode) : null),
    [challengeCode]
  );

  const [state, setState] = useState<Game2048State>(() => ({
    ...INITIAL_STATE,
    mode: isChallenge ? 'challenge' : 'solo',
    phase: isChallenge ? 'challenge-intro' : 'menu',
    totalRounds: isChallenge ? TOTAL_CHALLENGE_ROUNDS : 0,
  }));
  const { play } = useSound();

  const rawBest = useSyncExternalStore(noopSubscribe, readRawBest, zeroSnapshot);
  const bestSession = useSyncExternalStore(noopSubscribe, readBestSession, zeroSnapshot);

  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownDeadlineRef = useRef(0);
  const roundTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundDeadlineRef = useRef(0);
  const transitioningRef = useRef(false);
  const lastConfirmRef = useRef(0);
  /** The active round's seeded spawn RNG (challenge mode only). */
  const currentRoundRandRef = useRef<() => number>(Math.random);

  // Mirror of the latest state for callbacks that need it outside a render
  // (interval ticks, keyboard handlers), updated in an effect — never during
  // render — so it can't trip the refs-during-render rule.
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
  }, []);

  // ── Challenge round lifecycle ────────────────────────────────────

  /** Ends the current challenge round — either the 90s clock ran out, or a
   *  move just left the board with no legal moves left. `points` is passed
   *  explicitly rather than read from state: the game-over-mid-move caller
   *  has a just-computed score that hasn't reached `state` yet (React
   *  batches the setState from the move itself), and reading `stateRef`
   *  here would see the pre-move value. */
  const finishRound = useCallback((points: number) => {
    clearTimers();
    const score10 = calculateSprintScore(points);
    const result: Game2048RoundResult = { points, score10 };

    setState((prev) => {
      if (prev.phase !== 'playing') return prev;
      const roundScores = [...prev.roundScores, score10];
      return { ...prev, phase: 'round-results', result, roundScores };
    });
  }, [clearTimers]);

  const beginPlayingRound = useCallback(
    (roundIndex: number) => {
      const rand = challengeRounds?.[roundIndex - 1]?.rand;
      if (!rand) return;
      currentRoundRandRef.current = rand;
      const board = dealOpeningBoard(rand);

      setState((s) => ({
        ...s,
        phase: 'playing',
        board,
        score: 0,
        moves: 0,
        bestTileThisRun: highestTile(board),
        won: false,
        showWonBanner: false,
        lastMoveDir: null,
        timeLeft: SPRINT_SECONDS,
        result: null,
      }));

      roundDeadlineRef.current = performance.now() + SPRINT_SECONDS * 1000;
      let lastTickSecond = SPRINT_SECONDS + 1;
      roundTimerRef.current = setInterval(() => {
        const remaining = Math.ceil((roundDeadlineRef.current - performance.now()) / 1000);
        if (remaining <= 0) {
          clearInterval(roundTimerRef.current!);
          roundTimerRef.current = null;
          finishRound(stateRef.current.score);
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
    [challengeRounds, finishRound, play]
  );

  const startRound = useCallback(
    (roundIndex: number) => {
      clearTimers();
      setState((s) => ({ ...s, phase: 'countdown', round: roundIndex, countdown: COUNTDOWN_SECONDS }));

      play('tick');
      countdownDeadlineRef.current = performance.now() + COUNTDOWN_SECONDS * 1000;
      countdownTimerRef.current = setInterval(() => {
        const remaining = Math.ceil((countdownDeadlineRef.current - performance.now()) / 1000);
        if (remaining <= 0) {
          clearInterval(countdownTimerRef.current!);
          countdownTimerRef.current = null;
          beginPlayingRound(roundIndex);
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
    [clearTimers, play, beginPlayingRound]
  );

  const startChallenge = useCallback(() => {
    if (!challengeRounds) return;
    setState((s) => ({ ...s, roundScores: [] }));
    startRound(1);
  }, [startRound, challengeRounds]);

  const nextRound = useCallback(() => {
    if (transitioningRef.current) return;
    const { round, phase, totalRounds, roundScores } = stateRef.current;
    if (phase !== 'round-results') return;
    transitioningRef.current = true;
    play('click');

    if (round >= totalRounds) {
      const totalScore = round2(roundScores.reduce((a, b) => a + b, 0));
      saveBestSession(GAME_ID, totalScore);
      setState((s) => ({ ...s, phase: 'challenge-complete' }));
      play('celebrate');
    } else {
      startRound(round + 1);
    }

    setTimeout(() => {
      transitioningRef.current = false;
    }, 500);
  }, [startRound, play]);

  // ── Solo lifecycle ────────────────────────────────────────────────

  const startSolo = useCallback(() => {
    clearTimers();
    play('click');
    const board = dealOpeningBoard(Math.random);
    setState((s) => ({
      ...s,
      mode: 'solo',
      phase: 'playing',
      board,
      score: 0,
      moves: 0,
      bestTileThisRun: highestTile(board),
      won: false,
      showWonBanner: false,
      undoSnapshot: null,
      undoUsed: false,
      lastMoveDir: null,
      isNewBestScore: false,
    }));
  }, [clearTimers, play]);

  // ── Moves ─────────────────────────────────────────────────────────

  const move = useCallback(
    (dir: Direction) => {
      const { phase, mode, board, score, moves } = stateRef.current;
      if (phase !== 'playing') return;

      const outcome = moveBoard(board, dir);
      if (!outcome.moved) return; // no-op: never spawns, never counts as a turn

      const rand = mode === 'challenge' ? currentRoundRandRef.current : Math.random;
      const spawned = spawnTile(outcome.board, rand);

      play('slide');
      if (outcome.gained > 0) {
        const now = performance.now();
        if (now - lastConfirmRef.current > CONFIRM_THROTTLE_MS) {
          lastConfirmRef.current = now;
          play('confirm');
        }
      }

      const newScore = score + outcome.gained;
      const newMoves = moves + 1;
      const justWon = !stateRef.current.won && hasWon(spawned);
      const gameOver = isGameOver(spawned);

      setState((prev) => {
        if (prev.phase !== 'playing') return prev;
        const nextUndoSnapshot =
          prev.mode === 'solo' && !prev.undoUsed
            ? { board: prev.board, score: prev.score, moves: prev.moves }
            : prev.undoSnapshot;
        return {
          ...prev,
          board: spawned,
          score: newScore,
          moves: newMoves,
          bestTileThisRun: Math.max(prev.bestTileThisRun, highestTile(spawned)),
          won: prev.won || justWon,
          showWonBanner: prev.showWonBanner || justWon,
          undoSnapshot: nextUndoSnapshot,
          lastMoveDir: dir,
        };
      });

      if (justWon) play('success');

      if (gameOver) {
        play('fail');
        clearTimers();
        if (mode === 'solo') {
          const isNewBestScore = saveRawBestScore(newScore);
          setState((prev) =>
            prev.phase !== 'playing' ? prev : { ...prev, phase: 'game-over', isNewBestScore }
          );
        } else {
          finishRound(newScore);
        }
      }
    },
    [play, clearTimers, finishRound]
  );

  const undo = useCallback(() => {
    play('click');
    setState((prev) => {
      if (prev.mode !== 'solo' || prev.phase !== 'playing' || !prev.undoSnapshot || prev.undoUsed) {
        return prev;
      }
      return {
        ...prev,
        board: prev.undoSnapshot.board,
        score: prev.undoSnapshot.score,
        moves: prev.undoSnapshot.moves,
        undoUsed: true,
        undoSnapshot: null,
      };
    });
  }, [play]);

  const dismissWonBanner = useCallback(() => {
    setState((prev) => (prev.showWonBanner ? { ...prev, showWonBanner: false } : prev));
  }, []);

  // ── Navigation ────────────────────────────────────────────────────

  const resetToMenu = useCallback(() => {
    clearTimers();
    play('click');
    setState((s) => ({
      ...INITIAL_STATE,
      mode: s.mode,
      phase: s.mode === 'challenge' ? 'challenge-intro' : 'menu',
      totalRounds: s.mode === 'challenge' ? TOTAL_CHALLENGE_ROUNDS : 0,
    }));
  }, [clearTimers, play]);

  const replaySolo = useCallback(() => {
    startSolo();
  }, [startSolo]);

  // A backgrounded tab must not burn round/countdown time the player never
  // saw — push whichever deadline is active forward by exactly how long the
  // tab was hidden, rather than pausing/resuming the interval itself.
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
        } else if (stateRef.current.phase === 'playing' && stateRef.current.mode === 'challenge') {
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
    rawBest,
    bestSession,
    challengeRounds,
    startSolo,
    startChallenge,
    move,
    undo,
    dismissWonBanner,
    nextRound,
    replaySolo,
    resetToMenu,
  };
}
