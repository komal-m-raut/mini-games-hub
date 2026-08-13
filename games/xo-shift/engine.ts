/**
 * XO Shift — pure game engine for the three men's morris variant.
 *
 * Two phases:
 *  1. Placement — players alternate placing one mark until each has 3 on the
 *     board (6 plies total). A 3-in-line at any point during placement wins
 *     immediately.
 *  2. Movement — on your turn you slide ONE of your marks to an adjacent
 *     empty cell (orthogonal + diagonal — 8-neighbourhood), except a piece
 *     that just moved cannot slide straight back to the cell it left, on
 *     that same piece's very next move. The restriction is per piece (keyed
 *     by the piece's current cell) and expires the moment that piece moves
 *     again, no matter where it moves to — moving a *different* piece
 *     leaves every other piece's restriction untouched.
 *
 * No React, no timers, no randomness of its own — bot.ts and the hook layer
 * supply everything external, so this module stays trivially unit-testable.
 */

export type Player = 'X' | 'O';
export type CellValue = Player | null;
export type Phase = 'placement' | 'movement';

export interface BoardState {
  /** Length-9, row-major: `0 1 2 / 3 4 5 / 6 7 8`. */
  cells: CellValue[];
  turn: Player;
  phase: Phase;
  placedCount: Record<Player, number>;
  ply: number;
  /**
   * Per-piece no-backtrack lock: a piece's *current* cell maps to the one
   * cell it may not move to next. A piece with no entry has no restriction.
   */
  blockedReturn: Partial<Record<number, number>>;
}

export type Move = { type: 'place'; to: number } | { type: 'move'; from: number; to: number };

export const BOARD_SIZE = 9;
export const PIECES_PER_PLAYER = 3;
/** Placement (6 plies) + movement plies; hitting this with no winner is a draw. */
export const MAX_PLIES = 40;

/** The 8 three-in-a-row lines: 3 rows, 3 columns, 2 diagonals. */
export const LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/**
 * 8-neighbourhood adjacency per cell (orthogonal + diagonal). Corners have 3
 * neighbours, edges 5, the centre 8 — every cell but the centre reaches it.
 */
export const ADJACENCY: readonly (readonly number[])[] = [
  [1, 3, 4],
  [0, 2, 3, 4, 5],
  [1, 4, 5],
  [0, 1, 4, 6, 7],
  [0, 1, 2, 3, 5, 6, 7, 8],
  [1, 2, 4, 7, 8],
  [3, 4, 7],
  [3, 4, 5, 6, 8],
  [4, 5, 7],
];

export function opponentOf(player: Player): Player {
  return player === 'X' ? 'O' : 'X';
}

export function createInitialBoard(startingPlayer: Player = 'X'): BoardState {
  return {
    cells: Array<CellValue>(BOARD_SIZE).fill(null),
    turn: startingPlayer,
    phase: 'placement',
    placedCount: { X: 0, O: 0 },
    ply: 0,
    blockedReturn: {},
  };
}

/** The player with three marks in a line, or null if there isn't one. */
export function winner(state: BoardState): Player | null {
  for (const [a, b, c] of LINES) {
    const v = state.cells[a];
    if (v && v === state.cells[b] && v === state.cells[c]) return v;
  }
  return null;
}

/** Every legal move for the player to move. Empty once the game is over. */
export function legalMoves(state: BoardState): Move[] {
  if (winner(state)) return [];
  const { turn, cells, phase } = state;

  if (phase === 'placement') {
    const moves: Move[] = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (cells[i] === null) moves.push({ type: 'place', to: i });
    }
    return moves;
  }

  const moves: Move[] = [];
  for (let from = 0; from < BOARD_SIZE; from++) {
    if (cells[from] !== turn) continue;
    const forbidden = state.blockedReturn[from];
    for (const to of ADJACENCY[from]) {
      if (cells[to] !== null) continue;
      if (forbidden === to) continue;
      moves.push({ type: 'move', from, to });
    }
  }
  return moves;
}

/** True once no more play can happen: the ply cap is hit, or the player to
 *  move is stalemated (only possible in movement phase). Assumes no winner
 *  — check `winner()` first, since a won board is not a draw. */
export function isDraw(state: BoardState): boolean {
  if (winner(state)) return false;
  if (state.ply >= MAX_PLIES) return true;
  return legalMoves(state).length === 0;
}

export function isGameOver(state: BoardState): boolean {
  return winner(state) !== null || isDraw(state);
}

/** Applies a move without validating it — callers must only ever pass a
 *  move drawn from `legalMoves(state)`. Returns a brand new state. */
export function applyMove(state: BoardState, move: Move): BoardState {
  const cells = state.cells.slice();
  const player = state.turn;
  const blockedReturn: Partial<Record<number, number>> = { ...state.blockedReturn };
  const placedCount: Record<Player, number> = { ...state.placedCount };

  if (move.type === 'place') {
    cells[move.to] = player;
    placedCount[player] += 1;
  } else {
    cells[move.from] = null;
    cells[move.to] = player;
    // This piece's own restriction (if it had one) is used up the instant
    // it moves again, regardless of where it lands; a fresh one now guards
    // it against sliding straight back to the cell it just left.
    delete blockedReturn[move.from];
    blockedReturn[move.to] = move.from;
  }

  const phase: Phase =
    placedCount.X >= PIECES_PER_PLAYER && placedCount.O >= PIECES_PER_PLAYER
      ? 'movement'
      : 'placement';

  return {
    cells,
    turn: opponentOf(player),
    phase,
    placedCount,
    ply: state.ply + 1,
    blockedReturn,
  };
}
