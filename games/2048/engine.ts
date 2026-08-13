/**
 * Pure 2048 board engine — no React, no timers, no localStorage. Every
 * function here is a plain function of its arguments (rand is always
 * injected, never `Math.random` called directly), so the whole module runs
 * identically in solo play, a seeded challenge round, and a vitest node
 * environment.
 *
 * Board representation: a flat `number[16]`, row-major (`index = row*4 +
 * col`), 0 meaning an empty cell. A flat array (rather than number[][])
 * keeps spawn/equality/serialization trivial — an undo snapshot is just
 * `board.slice()`.
 */

export const BOARD_SIZE = 4;
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface MoveOutcome {
  board: number[];
  /** Sum of every merge produced by this move (0 if nothing merged). */
  gained: number;
  /** False for a no-op move (nothing slid or merged) — the caller must not
   *  spawn a tile or count this as a turn when this is false. */
  moved: boolean;
}

/** A fresh, empty board. */
export function createEmptyBoard(): number[] {
  return new Array(CELL_COUNT).fill(0);
}

/**
 * Collapses one row *toward its start* (index 0): tiles slide left, equal
 * adjacent tiles merge exactly once per pair, and a tile produced by a merge
 * can never merge again in the same collapse — because it only ever gets
 * compared against the *next unconsumed* source tile, never against another
 * already-produced result. `moveBoard` reuses this for every direction by
 * feeding it the row (or column) reversed/transposed as needed, so this is
 * the one place merge order and the double-merge rule are decided.
 */
export function collapseRow(row: number[]): { row: number[]; gained: number } {
  const filtered = row.filter((v) => v !== 0);
  const result: number[] = [];
  let gained = 0;
  let i = 0;
  while (i < filtered.length) {
    const current = filtered[i];
    const next = filtered[i + 1];
    if (next !== undefined && next === current) {
      const merged = current * 2;
      result.push(merged);
      gained += merged;
      i += 2;
    } else {
      result.push(current);
      i += 1;
    }
  }
  while (result.length < row.length) result.push(0);
  return { row: result, gained };
}

/** Read the 4 cells of row `i` (0-indexed) in left→right order. */
function readRow(board: number[], i: number): number[] {
  return [board[i * 4], board[i * 4 + 1], board[i * 4 + 2], board[i * 4 + 3]];
}

/** Read the 4 cells of column `i` (0-indexed) in top→bottom order. */
function readCol(board: number[], i: number): number[] {
  return [board[i], board[4 + i], board[8 + i], board[12 + i]];
}

/**
 * Slides and merges the whole board one step in `dir`, via `collapseRow`
 * plus reflection: every direction reduces to "collapse toward index 0" —
 * `left`/`up` collapse the row/column as read; `right`/`down` reverse it
 * first (so the far edge becomes index 0), collapse, then reverse the result
 * back before writing it out. Rows carry the horizontal directions, columns
 * the vertical ones — no separate rotate-the-whole-board step is needed.
 */
export function moveBoard(board: number[], dir: Direction): MoveOutcome {
  const next = board.slice();
  let gained = 0;
  let moved = false;

  const horizontal = dir === 'left' || dir === 'right';
  const reversed = dir === 'right' || dir === 'down';

  for (let i = 0; i < BOARD_SIZE; i++) {
    const line = horizontal ? readRow(board, i) : readCol(board, i);
    const source = reversed ? line.slice().reverse() : line;
    const { row: collapsed, gained: g } = collapseRow(source);
    gained += g;
    const finalLine = reversed ? collapsed.slice().reverse() : collapsed;

    for (let j = 0; j < BOARD_SIZE; j++) {
      const idx = horizontal ? i * 4 + j : j * 4 + i;
      if (next[idx] !== finalLine[j]) moved = true;
      next[idx] = finalLine[j];
    }
  }

  return { board: next, gained, moved };
}

/** Indices of every empty (0) cell, in board order. */
export function emptyCells(board: number[]): number[] {
  const cells: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === 0) cells.push(i);
  }
  return cells;
}

/**
 * Spawns one tile (2 with 90% probability, else 4) on a uniform-random empty
 * cell, consuming exactly two draws from `rand` in a fixed order — cell
 * selector first, then value — so a seeded `rand` (challenge mode) or
 * `Math.random` (solo mode) both produce the same shape of stream and a
 * seeded run is fully reproducible draw-for-draw. Returns the board
 * unchanged (a new array, same contents) if there is no empty cell to spawn
 * into — callers should already know this can't happen mid-game since
 * `isGameOver` catches a full, stuck board before another spawn is needed.
 */
export function spawnTile(board: number[], rand: () => number = Math.random): number[] {
  const empties = emptyCells(board);
  if (empties.length === 0) return board.slice();
  const cellIndex = empties[Math.floor(rand() * empties.length)];
  const value = rand() < 0.9 ? 2 : 4;
  const next = board.slice();
  next[cellIndex] = value;
  return next;
}

/**
 * True once the board is completely full AND no adjacent pair (horizontal
 * or vertical) could still merge — i.e. no legal move remains in any
 * direction.
 */
export function isGameOver(board: number[]): boolean {
  if (board.includes(0)) return false;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const v = board[r * 4 + c];
      if (c < BOARD_SIZE - 1 && board[r * 4 + c + 1] === v) return false;
      if (r < BOARD_SIZE - 1 && board[(r + 1) * 4 + c] === v) return false;
    }
  }
  return true;
}

/** True once any tile has reached (or passed) 2048. */
export function hasWon(board: number[]): boolean {
  return board.some((v) => v >= 2048);
}

/** Highest tile currently on the board (0 for an empty board). */
export function highestTile(board: number[]): number {
  return board.reduce((max, v) => Math.max(max, v), 0);
}
