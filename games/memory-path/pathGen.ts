/**
 * Path generation for Memory Path.
 *
 * A path is a sequence of orthogonally-adjacent grid cells that never
 * revisits a cell. Generated with a randomized depth-first walk that
 * backtracks when it paints itself into a corner, so a path of the
 * requested length is always returned (grid permitting).
 */

export interface Cell {
  r: number;
  c: number;
}

/** Stable key for set/lookup use. */
export function cellKey(cell: Cell): string {
  return `${cell.r},${cell.c}`;
}

export function cellsEqual(a: Cell, b: Cell): boolean {
  return a.r === b.r && a.c === b.c;
}

/** True when two cells share an edge (diagonals don't count). */
export function isAdjacent(a: Cell, b: Cell): boolean {
  const dr = Math.abs(a.r - b.r);
  const dc = Math.abs(a.c - b.c);
  return dr + dc === 1;
}

/**
 * Cells strictly between `from` (exclusive) and `to` (inclusive) when the two
 * share a row or column — the straight run a finger sweeps across on the big
 * grids. Returns `[]` for a diagonal or zero-length move so callers can treat
 * that as an illegal jump.
 */
export function straightRun(from: Cell, to: Cell): Cell[] {
  const out: Cell[] = [];
  if (from.r === to.r && from.c !== to.c) {
    const step = to.c > from.c ? 1 : -1;
    for (let c = from.c + step; ; c += step) {
      out.push({ r: from.r, c });
      if (c === to.c) break;
    }
  } else if (from.c === to.c && from.r !== to.r) {
    const step = to.r > from.r ? 1 : -1;
    for (let r = from.r + step; ; r += step) {
      out.push({ r, c: from.c });
      if (r === to.r) break;
    }
  }
  return out;
}

const DIRECTIONS: Cell[] = [
  { r: -1, c: 0 },
  { r: 1, c: 0 },
  { r: 0, c: -1 },
  { r: 0, c: 1 },
];

/** Fisher–Yates shuffle using the supplied RNG. */
function shuffled<T>(arr: T[], rand: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Builds a non-self-intersecting path of `length` cells on a `size`×`size` grid.
 * `rand` is injectable so tests can run deterministically.
 */
export function generatePath(size: number, length: number, rand: () => number = Math.random): Cell[] {
  const maxLength = Math.min(length, size * size);
  const visited = new Set<string>();
  const path: Cell[] = [];

  function walk(cell: Cell): boolean {
    path.push(cell);
    visited.add(cellKey(cell));
    if (path.length === maxLength) return true;

    for (const dir of shuffled(DIRECTIONS, rand)) {
      const next = { r: cell.r + dir.r, c: cell.c + dir.c };
      if (next.r < 0 || next.r >= size || next.c < 0 || next.c >= size) continue;
      if (visited.has(cellKey(next))) continue;
      if (walk(next)) return true;
    }

    // Dead end — undo and let the caller try another direction
    path.pop();
    visited.delete(cellKey(cell));
    return false;
  }

  // Try every start cell in random order; a full-grid path is guaranteed
  // to exist from some start for the lengths this game uses.
  for (const start of shuffled(allCells(size), rand)) {
    visited.clear();
    path.length = 0;
    if (walk(start)) return [...path];
  }

  return [];
}

function allCells(size: number): Cell[] {
  const cells: Cell[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) cells.push({ r, c });
  }
  return cells;
}

export interface TraceComparison {
  /** Cells traced in the right place, in order. */
  correct: number;
  /** Traced cells that didn't match the target path. */
  mistakes: number;
  /** 0–100, how much of the path was reproduced correctly. */
  accuracy: number;
  /** Per-position correctness of what the player traced. */
  marks: boolean[];
}

/**
 * Scores a traced path against the original.
 *
 * Position-wise comparison: cell i of the trace must equal cell i of the
 * path. Missing cells count against accuracy (they're path cells never
 * reproduced); extra cells past the end count as mistakes.
 */
export function comparePaths(path: Cell[], traced: Cell[]): TraceComparison {
  const marks: boolean[] = [];
  let correct = 0;

  for (let i = 0; i < traced.length; i++) {
    const ok = i < path.length && cellsEqual(path[i], traced[i]);
    marks.push(ok);
    if (ok) correct++;
  }

  const extra = Math.max(0, traced.length - path.length);
  const wrongInRange = traced.length - extra - correct;
  const missing = Math.max(0, path.length - traced.length);
  const mistakes = wrongInRange + extra + missing;

  const accuracy = path.length === 0 ? 0 : Math.round((correct / path.length) * 1000) / 10;

  return { correct, mistakes, accuracy, marks };
}
