/**
 * Ghost Grid — pure game engine. No React, no timers, no randomness: every
 * function here is a deterministic function of its inputs, so the whole
 * ruleset is unit-testable in plain Node and reusable by both the bot
 * (games/fading-xo/bot.ts) and the UI hook.
 *
 * Rules recap (see AGENTS.md for the full brief):
 *  - Phase 1 (placement): players alternate placing a mark until each side
 *    has placed 3. Three in a row during placement wins immediately.
 *  - Phase 2 (movement): from each side's 4th action onward, a player MUST
 *    teleport their oldest mark (FIFO) to any empty cell. The moved mark
 *    becomes that player's newest. Three in a row after any action wins.
 *  - The board never truly "fills" once movement starts — each side always
 *    has exactly 3 marks on the board, so there are always empty cells to
 *    move into. A 60-action cap prevents an infinite shuffle: reaching it
 *    with no winner is a draw.
 */

export type Player = 'X' | 'O';

export type Cell = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type Winner = Player | 'draw' | null;

/** Each side's marks in FIFO placement/movement order — index 0 is oldest
 *  (the one that must move next), the last entry is newest. */
export interface FadingXoQueues {
  X: number[];
  O: number[];
}

export interface FadingXoState {
  /** 9 cells, index = row*3+col; null = empty. */
  board: (Player | null)[];
  queues: FadingXoQueues;
  turn: Player;
  /** Total placements + movements applied so far, across both players. */
  actionCount: number;
  winner: Winner;
}

export type FadingXoMove = { type: 'place'; cell: number } | { type: 'move'; from: number; to: number };

/** Every side places exactly 3 marks before movement begins. */
export const MARKS_PER_SIDE = 3;

/** 60 total actions (both players combined) with no winner is a draw. */
export const MAX_ACTIONS = 60;

/** The 8 tic-tac-toe lines: 3 rows, 3 columns, 2 diagonals. */
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

export function opponentOf(player: Player): Player {
  return player === 'X' ? 'O' : 'X';
}

/** Fresh 9-cell empty board and empty queues. `starter` decides who acts
 *  first (Ghost Grid alternates who opens each best-of-3 game). */
export function createInitialState(starter: Player = 'X'): FadingXoState {
  return {
    board: new Array(9).fill(null),
    queues: { X: [], O: [] },
    turn: starter,
    actionCount: 0,
    winner: null,
  };
}

/** Scans the board for any completed line. Returns the winning player, or
 *  null if none. (A board can never show both players winning at once — a
 *  move only ever completes a line for the player who just acted.) */
export function checkWinner(board: readonly (Player | null)[]): Player | null {
  for (const [a, b, c] of LINES) {
    const mark = board[a];
    if (mark && mark === board[b] && mark === board[c]) return mark;
  }
  return null;
}

/** Which line completed the win, for highlighting it in the UI. Null if
 *  `player` doesn't currently have three in a row. */
export function findWinningLine(
  board: readonly (Player | null)[],
  player: Player
): readonly number[] | null {
  for (const line of LINES) {
    if (line.every((i) => board[i] === player)) return line;
  }
  return null;
}

/** The mark that must move next for `player` — the oldest entry in their
 *  queue — once they've completed placement (3 marks down). Null during
 *  placement, when there's no forced piece yet. Rendered at ~45% opacity
 *  with a ghost shimmer in the UI, for BOTH players (full information). */
export function getOldest(state: FadingXoState, player: Player): number | null {
  const queue = state.queues[player];
  return queue.length >= MARKS_PER_SIDE ? queue[0] : null;
}

/** Whether `player`'s next action is a movement (they've already placed all
 *  3 marks) rather than a placement. */
export function isMovementPhase(state: FadingXoState, player: Player): boolean {
  return state.queues[player].length >= MARKS_PER_SIDE;
}

/**
 * Legal moves for the side to move (`state.turn`): every empty cell during
 * placement, or every empty cell as a destination for the forced oldest
 * piece once that side is in movement phase. Returns [] only once the game
 * has already ended.
 */
export function legalMoves(state: FadingXoState): FadingXoMove[] {
  if (state.winner) return [];

  const empties: number[] = [];
  for (let i = 0; i < state.board.length; i++) {
    if (state.board[i] === null) empties.push(i);
  }

  if (!isMovementPhase(state, state.turn)) {
    return empties.map((cell) => ({ type: 'place', cell }));
  }

  const from = state.queues[state.turn][0];
  return empties.map((to) => ({ type: 'move', from, to }));
}

/**
 * Applies `move` as the current `state.turn` player, returning a new state.
 * Assumes `move` came from `legalMoves(state)` — pure and side-effect free,
 * so callers doing lookahead (the bot) can freely apply hypothetical moves
 * without mutating anything shared.
 */
export function applyMove(state: FadingXoState, move: FadingXoMove): FadingXoState {
  const player = state.turn;
  const board = state.board.slice();
  const queues: FadingXoQueues = { X: state.queues.X.slice(), O: state.queues.O.slice() };

  if (move.type === 'place') {
    board[move.cell] = player;
    queues[player].push(move.cell);
  } else {
    board[move.from] = null;
    queues[player].shift();
    board[move.to] = player;
    queues[player].push(move.to);
  }

  const actionCount = state.actionCount + 1;
  const lineWinner = checkWinner(board);
  const winner: Winner = lineWinner ?? (actionCount >= MAX_ACTIONS ? 'draw' : null);

  return {
    board,
    queues,
    turn: opponentOf(player),
    actionCount,
    winner,
  };
}
