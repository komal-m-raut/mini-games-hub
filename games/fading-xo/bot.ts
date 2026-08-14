/**
 * Ghost Grid — pure bot. A function of (state, difficulty, rand) only, so
 * every difficulty is deterministic under a seeded `rand` (used for
 * Challenge mode) and reproducible in tests.
 */

import { Difficulty } from '@/types/game';
import {
  FadingXoMove,
  FadingXoState,
  LINES,
  Player,
  applyMove,
  legalMoves,
  opponentOf,
} from './engine';

/** Uniform pick from a non-empty array, driven by `rand`. */
function pick<T>(items: T[], rand: () => number): T {
  return items[Math.floor(rand() * items.length)];
}

/** `state` re-pointed at a hypothetical mover, without touching board or
 *  queues — legalMoves/applyMove only ever read `state.turn` to know who's
 *  acting, so this is all lookahead needs to simulate the *other* side. */
function asTurn(state: FadingXoState, player: Player): FadingXoState {
  return state.turn === player ? state : { ...state, turn: player };
}

/** A move `player` can make right now (from their real turn or a
 *  hypothetical one) that immediately completes a line. Null if none. */
function immediateWinningMove(state: FadingXoState, player: Player): FadingXoMove | null {
  const hypothetical = asTurn(state, player);
  for (const move of legalMoves(hypothetical)) {
    if (applyMove(hypothetical, move).winner === player) return move;
  }
  return null;
}

/**
 * Moves that leave `opponent` with no immediate winning reply. When the
 * opponent isn't currently threatening anything this is every legal move
 * (the filter never removes anything) — the caller only needs it once a
 * threat actually exists.
 *
 * Because this simulates the FULL resulting state (via applyMove) rather
 * than just the destination cell, it automatically accounts for the
 * movement-phase wrinkle where a "blocking" move also vacates the mover's
 * own oldest cell — the departure is baked into the state a candidate move
 * produces, not bolted on afterward.
 */
function movesSafeAgainst(state: FadingXoState, moves: FadingXoMove[], opponent: Player): FadingXoMove[] {
  return moves.filter((move) => {
    const next = applyMove(state, move);
    if (next.winner === opponent) return false;
    return immediateWinningMove(next, opponent) === null;
  });
}

// ── Hard difficulty: depth-2 minimax ─────────────────────────────────

/** Count of lines with exactly 2 of `player`'s marks and one empty cell —
 *  i.e. lines `player` could complete on their very next move there. */
function countOpenLines(board: readonly (Player | null)[], player: Player): number {
  let n = 0;
  for (const [a, b, c] of LINES) {
    const marks = [board[a], board[b], board[c]];
    const mine = marks.filter((m) => m === player).length;
    const empty = marks.filter((m) => m === null).length;
    if (mine === 2 && empty === 1) n++;
  }
  return n;
}

const WIN_SCORE = 1000;

/** eval = (my open 2-lines − opp open 2-lines)·3 + center·2, from `me`'s
 *  perspective. A decided state (someone already won) short-circuits to a
 *  landslide score so it always dominates the positional heuristic. */
function evaluate(state: FadingXoState, me: Player): number {
  const opponent = opponentOf(me);
  if (state.winner === me) return WIN_SCORE;
  if (state.winner === opponent) return -WIN_SCORE;

  const board = state.board;
  const lineScore = (countOpenLines(board, me) - countOpenLines(board, opponent)) * 3;
  const center = board[4] === me ? 1 : board[4] === opponent ? -1 : 0;
  return lineScore + center * 2;
}

/**
 * Depth-2 minimax over `candidates`: for each of my moves, assume the
 * opponent replies with whichever of THEIR legal moves minimizes my eval,
 * then pick the candidate that maximizes that worst case. Evaluating the
 * full two-ply state (not just the immediate board) is what makes this
 * naturally weigh whose piece becomes oldest next — a candidate that saddles
 * me with an awkward forced departure two moves from now shows up as a worse
 * opponent-optimal reply, with no special-casing required.
 */
function bestByMinimax(state: FadingXoState, me: Player, candidates: FadingXoMove[], rand: () => number): FadingXoMove {
  let bestScore = -Infinity;
  let bestMoves: FadingXoMove[] = [];

  for (const move of candidates) {
    const afterMe = applyMove(state, move);
    let score: number;

    if (afterMe.winner) {
      score = evaluate(afterMe, me);
    } else {
      const opponentMoves = legalMoves(afterMe);
      if (opponentMoves.length === 0) {
        score = evaluate(afterMe, me);
      } else {
        let worst = Infinity;
        for (const opponentMove of opponentMoves) {
          const afterOpponent = applyMove(afterMe, opponentMove);
          const s = evaluate(afterOpponent, me);
          if (s < worst) worst = s;
        }
        score = worst;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  return pick(bestMoves, rand);
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Picks the bot's move for `state.turn`. Assumes the game isn't already
 * over (`state.winner` is null) — callers should stop calling this once a
 * winner or draw lands. Never returns an illegal move: every branch below
 * draws from `legalMoves(state)` (or a filtered subset of it).
 */
export function botMove(state: FadingXoState, difficulty: Difficulty, rand: () => number): FadingXoMove {
  const moves = legalMoves(state);
  const me = state.turn;
  const opponent = opponentOf(me);

  if (difficulty === 'easy') {
    return pick(moves, rand);
  }

  // Shared by medium and hard: take an immediate win the moment it exists.
  const winningMove = immediateWinningMove(state, me);
  if (winningMove) return winningMove;

  if (difficulty === 'medium') {
    const opponentThreatens = immediateWinningMove(state, opponent) !== null;
    const candidates = opponentThreatens ? movesSafeAgainst(state, moves, opponent) : moves;
    return pick(candidates.length > 0 ? candidates : moves, rand);
  }

  // Hard: win (above) or block override, then depth-2 minimax over
  // whatever's left standing.
  const opponentThreatens = immediateWinningMove(state, opponent) !== null;
  const safeMoves = opponentThreatens ? movesSafeAgainst(state, moves, opponent) : moves;
  const candidates = safeMoves.length > 0 ? safeMoves : moves;
  return bestByMinimax(state, me, candidates, rand);
}
