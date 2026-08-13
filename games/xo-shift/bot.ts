/**
 * XO Shift bots — pure functions of `(state, difficulty, rand)`, so they're
 * as unit-testable as the engine and can be replayed byte-for-byte from a
 * seed in Challenge mode.
 *
 * - easy: a uniformly random legal move.
 * - medium: take an immediate win if one exists, else block the opponent's
 *   immediate win, else a random legal move.
 * - hard: medium's win/block override, then a depth-2 minimax search over
 *   every legal move (my move → opponent's best reply), breaking ties with
 *   `rand`.
 *
 * Every branch only ever returns a move drawn from `legalMoves(state)` (or a
 * filtered subset of it), so the bot can never produce an illegal move.
 */
import { Difficulty } from '@/types/game';
import { BoardState, LINES, Move, Player, applyMove, legalMoves, opponentOf, winner } from './engine';

function pick<T>(items: T[], rand: () => number): T {
  return items[Math.floor(rand() * items.length)];
}

function withTurn(state: BoardState, player: Player): BoardState {
  return state.turn === player ? state : { ...state, turn: player };
}

/** Every legal move for `player` that wins immediately if played right now,
 *  regardless of whose turn it actually is on `state`. */
function findWinningMoves(state: BoardState, player: Player): Move[] {
  const from = withTurn(state, player);
  return legalMoves(from).filter((move) => winner(applyMove(from, move)) === player);
}

/** The mover's own legal moves that leave the opponent with zero immediate
 *  winning replies — i.e. moves that neutralise every current threat. Empty
 *  when the opponent has no immediate win to block in the first place. */
function findBlockingMoves(state: BoardState): Move[] {
  const me = state.turn;
  const opponent = opponentOf(me);
  if (findWinningMoves(state, opponent).length === 0) return [];
  return legalMoves(state).filter((move) => {
    const next = applyMove(state, move);
    return findWinningMoves(next, opponent).length === 0;
  });
}

/** Count of the 8 lines where `player` holds exactly 2 cells and the third
 *  is empty — a line one move away from completing. */
function openTwoLineCount(cells: BoardState['cells'], player: Player): number {
  let count = 0;
  for (const line of LINES) {
    let mine = 0;
    let empty = 0;
    for (const i of line) {
      if (cells[i] === player) mine++;
      else if (cells[i] === null) empty++;
    }
    if (mine === 2 && empty === 1) count++;
  }
  return count;
}

/**
 * Static evaluation from `me`'s perspective:
 * (my open two-lines − opponent's open two-lines) × 3 + centre × 2 + my
 * mobility × 0.5. A finished board scores ±1000 so wins/losses always
 * dominate the heuristic terms.
 */
function evaluate(state: BoardState, me: Player): number {
  const result = winner(state);
  if (result === me) return 1000;
  const opponent = opponentOf(me);
  if (result === opponent) return -1000;

  const openLines = openTwoLineCount(state.cells, me) - openTwoLineCount(state.cells, opponent);
  const center = state.cells[4] === me ? 1 : state.cells[4] === opponent ? -1 : 0;
  const mobility = legalMoves(withTurn(state, me)).length;

  return openLines * 3 + center * 2 + mobility * 0.5;
}

const TIE_EPSILON = 1e-9;

/** Depth-2 minimax: for each of my candidate moves, the opponent's best
 *  (minimizing, from my view) reply; I take the candidate that maximizes
 *  that worst case, tie-breaking uniformly at random via `rand`. */
function minimaxMove(state: BoardState, rand: () => number): Move {
  const me = state.turn;
  let best = -Infinity;
  let bestMoves: Move[] = [];

  for (const move of legalMoves(state)) {
    const afterMine = applyMove(state, move);
    const replies = winner(afterMine) ? [] : legalMoves(afterMine);

    let worst: number;
    if (replies.length === 0) {
      worst = evaluate(afterMine, me);
    } else {
      worst = Infinity;
      for (const reply of replies) {
        const score = evaluate(applyMove(afterMine, reply), me);
        if (score < worst) worst = score;
      }
    }

    if (worst > best + TIE_EPSILON) {
      best = worst;
      bestMoves = [move];
    } else if (Math.abs(worst - best) <= TIE_EPSILON) {
      bestMoves.push(move);
    }
  }

  return pick(bestMoves, rand);
}

/** Picks the bot's move for `state.turn`. `rand` must return floats in
 *  `[0, 1)` — pass a seeded generator for deterministic/replayable play
 *  (Challenge mode) or `Math.random` for solo play. Throws if called on a
 *  state with no legal moves; callers must check `isGameOver` first. */
export function botMove(state: BoardState, difficulty: Difficulty, rand: () => number): Move {
  const legal = legalMoves(state);
  if (legal.length === 0) {
    throw new Error('botMove: no legal moves available');
  }

  if (difficulty === 'easy') return pick(legal, rand);

  const winningMoves = findWinningMoves(state, state.turn);
  if (winningMoves.length > 0) return pick(winningMoves, rand);

  const blockingMoves = findBlockingMoves(state);
  if (blockingMoves.length > 0) return pick(blockingMoves, rand);

  if (difficulty === 'medium') return pick(legal, rand);

  return minimaxMove(state, rand);
}
