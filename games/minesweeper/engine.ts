/**
 * Minesweeper board mechanics — pure, no React, no randomness of its own
 * (every function that needs randomness takes a `rand: () => number`
 * stream so solo play can pass `Math.random` and challenges can pass a
 * seeded stream from `lib/challenge`'s `makeChallengeRand`).
 *
 * A `Board` is a flat, immutable-by-convention snapshot: every mutating
 * function here returns a *new* board (arrays are copied, never written
 * in place) so the hook can treat every action as a plain state update.
 */

export interface Board {
  width: number;
  height: number;
  mineCount: number;
  /** `true` at mine cells. Length `width * height`. */
  mines: boolean[];
  /** Adjacent-mine count per cell, 0–8. Meaningless (left at 0) on a mine
   *  cell itself — nothing ever reads a mine cell's count. */
  counts: number[];
  revealed: boolean[];
  flagged: boolean[];
}

export type RevealOutcome = 'ok' | 'win' | 'loss';

export interface RevealResult {
  board: Board;
  outcome: RevealOutcome;
  /** The mine cell that ended the game, when `outcome === 'loss'`. */
  triggeredIndex: number | null;
}

/** Row/column → flat index. */
export function indexOf(x: number, y: number, width: number): number {
  return y * width + x;
}

/** Every in-bounds 8-neighbour of a cell, as flat indices. */
export function neighborsOf(index: number, width: number, height: number): number[] {
  const x = index % width;
  const y = Math.floor(index / width);
  const result: number[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        result.push(indexOf(nx, ny, width));
      }
    }
  }
  return result;
}

/**
 * Places `mineCount` mines uniformly at random, without replacement, via a
 * partial Fisher–Yates over the pool of eligible cell indices — mirroring
 * the same pattern every other game's board generator uses (see e.g.
 * `games/grid-flash/constants.ts#generatePattern`). When `excludeIndex` is
 * given, that cell and its 8 neighbours are removed from the pool first, so
 * a solo player's first click is always guaranteed safe. `mineCount` is
 * clamped to the number of eligible cells defensively; every real
 * difficulty leaves comfortably more eligible cells than mines.
 */
export function placeMines(
  width: number,
  height: number,
  mineCount: number,
  rand: () => number = Math.random,
  excludeIndex?: number
): boolean[] {
  const total = width * height;
  const excluded = new Set<number>();
  if (excludeIndex !== undefined && excludeIndex !== null) {
    excluded.add(excludeIndex);
    for (const n of neighborsOf(excludeIndex, width, height)) excluded.add(n);
  }

  const pool: number[] = [];
  for (let i = 0; i < total; i++) {
    if (!excluded.has(i)) pool.push(i);
  }

  const n = Math.min(Math.max(mineCount, 0), pool.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rand() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const mines = new Array<boolean>(total).fill(false);
  for (let i = 0; i < n; i++) mines[pool[i]] = true;
  return mines;
}

/** Adjacent-mine count for every cell (0 on a mine cell itself). */
export function adjacentCounts(mines: boolean[], width: number, height: number): number[] {
  const total = width * height;
  const counts = new Array<number>(total).fill(0);
  for (let i = 0; i < total; i++) {
    if (mines[i]) continue;
    let c = 0;
    for (const n of neighborsOf(i, width, height)) {
      if (mines[n]) c++;
    }
    counts[i] = c;
  }
  return counts;
}

function freshRevealed(board: Board): boolean[] {
  return board.revealed.slice();
}

/** Whether every non-mine cell is revealed — the win condition. */
export function isWon(board: Board): boolean {
  for (let i = 0; i < board.revealed.length; i++) {
    if (!board.mines[i] && !board.revealed[i]) return false;
  }
  return true;
}

function outcomeFor(board: Board): RevealOutcome {
  return isWon(board) ? 'win' : 'ok';
}

/**
 * Reveals a single cell. A mine cell ends the game immediately: every mine
 * on the board is revealed (so the loss screen shows the full field) and
 * the triggering cell is reported separately for its distinct "you clicked
 * this one" mark. A safe cell with an adjacent count of 0 flood-fills its
 * connected zero region and the one ring of numbered cells bordering it,
 * via an iterative queue (never recursion — a fully-zero board must not
 * risk a stack overflow). Revealing an already-revealed or flagged cell is
 * a no-op.
 */
export function reveal(board: Board, index: number): RevealResult {
  if (board.revealed[index] || board.flagged[index]) {
    return { board, outcome: outcomeFor(board), triggeredIndex: null };
  }

  if (board.mines[index]) {
    const revealed = freshRevealed(board);
    for (let i = 0; i < board.mines.length; i++) {
      if (board.mines[i]) revealed[i] = true;
    }
    return {
      board: { ...board, revealed },
      outcome: 'loss',
      triggeredIndex: index,
    };
  }

  const revealed = freshRevealed(board);
  const queue: number[] = [index];
  let qi = 0;
  while (qi < queue.length) {
    const i = queue[qi++];
    if (revealed[i] || board.flagged[i]) continue;
    revealed[i] = true;
    if (board.counts[i] === 0) {
      for (const n of neighborsOf(i, board.width, board.height)) {
        if (!revealed[n] && !board.flagged[n] && !board.mines[n]) queue.push(n);
      }
    }
  }

  const nextBoard = { ...board, revealed };
  return { board: nextBoard, outcome: outcomeFor(nextBoard), triggeredIndex: null };
}

/** Toggles a flag on a hidden cell. A no-op on an already-revealed cell. */
export function toggleFlag(board: Board, index: number): Board {
  if (board.revealed[index]) return board;
  const flagged = board.flagged.slice();
  flagged[index] = !flagged[index];
  return { ...board, flagged };
}

/**
 * Chords a revealed numbered cell: if its adjacent flag count matches its
 * adjacent mine count, every remaining unflagged, unrevealed neighbour is
 * revealed at once. This can lose the game — if a flag is on the wrong
 * cell, chording will still reveal a real mine among the "confirmed safe"
 * neighbours. A no-op on a hidden cell or a cell whose flag count doesn't
 * match.
 */
export function chord(board: Board, index: number): RevealResult {
  if (!board.revealed[index] || board.mines[index]) {
    return { board, outcome: outcomeFor(board), triggeredIndex: null };
  }

  const neighbors = neighborsOf(index, board.width, board.height);
  const flaggedCount = neighbors.filter((n) => board.flagged[n]).length;
  if (flaggedCount !== board.counts[index]) {
    return { board, outcome: outcomeFor(board), triggeredIndex: null };
  }

  let current = board;
  for (const n of neighbors) {
    if (current.revealed[n] || current.flagged[n]) continue;
    const result = reveal(current, n);
    current = result.board;
    if (result.outcome === 'loss') return result;
  }
  return { board: current, outcome: outcomeFor(current), triggeredIndex: null };
}

/** Non-mine cells the board holds in total — the denominator for scoring
 *  partial credit on a loss and for the win check. */
export function safeTotal(board: Board): number {
  return board.width * board.height - board.mineCount;
}

/** Non-mine cells currently revealed — the numerator for partial credit. */
export function safeRevealedCount(board: Board): number {
  let c = 0;
  for (let i = 0; i < board.revealed.length; i++) {
    if (board.revealed[i] && !board.mines[i]) c++;
  }
  return c;
}

/** A fresh, all-hidden board for the given mines/counts. */
export function createBoard(
  width: number,
  height: number,
  mineCount: number,
  mines: boolean[],
  counts: number[]
): Board {
  const total = width * height;
  return {
    width,
    height,
    mineCount,
    mines,
    counts,
    revealed: new Array<boolean>(total).fill(false),
    flagged: new Array<boolean>(total).fill(false),
  };
}
