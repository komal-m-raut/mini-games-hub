import { describe, expect, it } from 'vitest';
import {
  Cell,
  cellKey,
  comparePaths,
  extendTrace,
  generatePath,
  isAdjacent,
  moveCursor,
  straightRun,
} from '@/games/memory-path/pathGen';
import { PATH_DIFFICULTY, getPathRating } from '@/games/memory-path/constants';

/** Deterministic RNG so a failing case is reproducible. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe('generatePath', () => {
  it('returns a path of the requested length', () => {
    expect(generatePath(5, 7, seeded(1))).toHaveLength(7);
  });

  it('never revisits a cell', () => {
    for (let seed = 0; seed < 50; seed++) {
      const path = generatePath(6, 9, seeded(seed));
      expect(new Set(path.map(cellKey)).size).toBe(path.length);
    }
  });

  it('only steps between orthogonally adjacent cells', () => {
    for (let seed = 0; seed < 50; seed++) {
      const path = generatePath(6, 9, seeded(seed));
      for (let i = 1; i < path.length; i++) {
        expect(isAdjacent(path[i - 1], path[i])).toBe(true);
      }
    }
  });

  it('keeps every cell inside the grid', () => {
    const size = 4;
    const path = generatePath(size, 5, seeded(9));
    for (const { r, c } of path) {
      expect(r).toBeGreaterThanOrEqual(0);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(size);
      expect(c).toBeLessThan(size);
    }
  });

  it('caps the length at the number of cells in the grid', () => {
    expect(generatePath(2, 99, seeded(3))).toHaveLength(4);
  });

  it('produces a valid path for every difficulty preset', () => {
    for (const cfg of Object.values(PATH_DIFFICULTY)) {
      expect(generatePath(cfg.size, cfg.pathLength)).toHaveLength(cfg.pathLength);
    }
  });
});

describe('PATH_DIFFICULTY', () => {
  it('pins the grid sizes to the 9 / 12 / 16 trio', () => {
    // Regression guard: touch-target sizing (WCAG 2.5.8) depends on these
    // exact sizes — an accidental edit here should fail loudly.
    expect(PATH_DIFFICULTY.easy.size).toBe(9);
    expect(PATH_DIFFICULTY.medium.size).toBe(12);
    expect(PATH_DIFFICULTY.hard.size).toBe(16);
  });

  it('keeps every requested path short enough to fit its grid', () => {
    for (const cfg of Object.values(PATH_DIFFICULTY)) {
      expect(cfg.pathLength).toBeLessThan(cfg.size * cfg.size);
    }
  });

  it('orders reveal speed and memorize time sensibly across difficulties', () => {
    const { easy, medium, hard } = PATH_DIFFICULTY;
    // Harder difficulties reveal each cell faster...
    expect(easy.revealMs).toBeGreaterThan(medium.revealMs);
    expect(medium.revealMs).toBeGreaterThan(hard.revealMs);
    // ...but hold the finished path on screen longer to memorize.
    expect(easy.memorizeMs).toBeLessThan(medium.memorizeMs);
    expect(medium.memorizeMs).toBeLessThan(hard.memorizeMs);
    // ...and ask for a longer path.
    expect(easy.pathLength).toBeLessThan(medium.pathLength);
    expect(medium.pathLength).toBeLessThan(hard.pathLength);
  });
});

describe('straightRun', () => {
  it('returns a single cell for an adjacent step', () => {
    expect(straightRun({ r: 2, c: 2 }, { r: 2, c: 3 })).toEqual([{ r: 2, c: 3 }]);
  });

  it('fills every cell across a horizontal sweep, in order, end inclusive', () => {
    expect(straightRun({ r: 0, c: 0 }, { r: 0, c: 3 })).toEqual([
      { r: 0, c: 1 },
      { r: 0, c: 2 },
      { r: 0, c: 3 },
    ]);
  });

  it('fills a vertical sweep in the travel direction', () => {
    expect(straightRun({ r: 5, c: 4 }, { r: 2, c: 4 })).toEqual([
      { r: 4, c: 4 },
      { r: 3, c: 4 },
      { r: 2, c: 4 },
    ]);
  });

  it('rejects diagonal and zero-length moves', () => {
    expect(straightRun({ r: 0, c: 0 }, { r: 1, c: 1 })).toEqual([]);
    expect(straightRun({ r: 3, c: 3 }, { r: 3, c: 3 })).toEqual([]);
  });

  it('only produces orthogonally adjacent steps', () => {
    const run = straightRun({ r: 1, c: 1 }, { r: 1, c: 9 });
    let prev = { r: 1, c: 1 };
    for (const cell of run) {
      expect(isAdjacent(prev, cell)).toBe(true);
      prev = cell;
    }
  });
});

describe('comparePaths', () => {
  const path: Cell[] = [
    { r: 0, c: 0 },
    { r: 0, c: 1 },
    { r: 1, c: 1 },
    { r: 2, c: 1 },
  ];

  it('scores an exact trace as 100%', () => {
    const res = comparePaths(path, path);
    expect(res).toMatchObject({ correct: 4, mistakes: 0, accuracy: 100 });
    expect(res.marks).toEqual([true, true, true, true]);
  });

  it('marks the position where the trace diverges', () => {
    const traced = [path[0], path[1], { r: 1, c: 0 }, path[3]];
    const res = comparePaths(path, traced);
    expect(res.marks).toEqual([true, true, false, true]);
    expect(res.correct).toBe(3);
    expect(res.mistakes).toBe(1);
    expect(res.accuracy).toBe(75);
  });

  it('counts cells the player never reached as mistakes', () => {
    const res = comparePaths(path, [path[0], path[1]]);
    expect(res.correct).toBe(2);
    expect(res.mistakes).toBe(2); // two path cells missing
    expect(res.accuracy).toBe(50);
  });

  it('counts cells traced past the end of the path as mistakes', () => {
    const res = comparePaths(path, [...path, { r: 3, c: 1 }]);
    expect(res.correct).toBe(4);
    expect(res.mistakes).toBe(1);
    expect(res.accuracy).toBe(100);
    expect(res.marks[4]).toBe(false);
  });

  it('gives an empty trace 0%', () => {
    expect(comparePaths(path, [])).toMatchObject({ correct: 0, mistakes: 4, accuracy: 0 });
  });

  it('rounds accuracy to one decimal place', () => {
    const long = Array.from({ length: 3 }, (_, i) => ({ r: 0, c: i }));
    expect(comparePaths(long, [long[0]]).accuracy).toBe(33.3);
  });
});

describe('moveCursor', () => {
  it('steps by one cell in each direction', () => {
    expect(moveCursor({ r: 2, c: 2 }, -1, 0, 5)).toEqual({ r: 1, c: 2 });
    expect(moveCursor({ r: 2, c: 2 }, 1, 0, 5)).toEqual({ r: 3, c: 2 });
    expect(moveCursor({ r: 2, c: 2 }, 0, -1, 5)).toEqual({ r: 2, c: 1 });
    expect(moveCursor({ r: 2, c: 2 }, 0, 1, 5)).toEqual({ r: 2, c: 3 });
  });

  it('clamps at the top-left edge', () => {
    expect(moveCursor({ r: 0, c: 0 }, -1, 0, 5)).toEqual({ r: 0, c: 0 });
    expect(moveCursor({ r: 0, c: 0 }, 0, -1, 5)).toEqual({ r: 0, c: 0 });
  });

  it('clamps at the bottom-right edge', () => {
    const last = 4; // size 5 → valid indices 0..4
    expect(moveCursor({ r: last, c: last }, 1, 0, 5)).toEqual({ r: last, c: last });
    expect(moveCursor({ r: last, c: last }, 0, 1, 5)).toEqual({ r: last, c: last });
  });

  it('clamps independently on each axis for a diagonal delta', () => {
    expect(moveCursor({ r: 0, c: 4 }, -1, 1, 5)).toEqual({ r: 0, c: 4 });
  });
});

describe('extendTrace', () => {
  const path: Cell[] = [
    { r: 0, c: 0 },
    { r: 0, c: 1 },
    { r: 0, c: 2 },
    { r: 1, c: 2 },
  ];

  it('starts a trace from an empty array', () => {
    const res = extendTrace([], path[0], path.length);
    expect(res).toEqual({ type: 'extended', traced: [path[0]] });
  });

  it('ignores a repeat of the current cell', () => {
    const res = extendTrace([path[0]], path[0], path.length);
    expect(res).toEqual({ type: 'ignored' });
  });

  it('backtracks onto the second-to-last cell', () => {
    const res = extendTrace([path[0], path[1]], path[0], path.length);
    expect(res).toEqual({ type: 'backtrack', traced: [path[0]] });
  });

  it('rejects a diagonal or non-adjacent jump', () => {
    const res = extendTrace([path[0]], { r: 5, c: 5 }, path.length);
    expect(res).toEqual({ type: 'illegal' });
  });

  it('fills a straight run for a multi-cell jump, same as a fast drag', () => {
    const res = extendTrace([path[0]], path[2], path.length);
    expect(res).toEqual({ type: 'extended', traced: [path[0], path[1], path[2]] });
  });

  it('ignores further input once the trace already matches the path length', () => {
    const res = extendTrace(path, path[path.length - 1], path.length);
    expect(res).toEqual({ type: 'ignored' });
  });

  /**
   * The whole point of keyboard tracing: a player who moves the cursor one
   * cell at a time and presses Space at every step must end up with the
   * exact same `traced` array a pointer drag over the same cells would
   * produce — same shape, same order, scored by the same code either way.
   */
  it('produces an identical traced array whether stepped one cell at a time (keyboard) or dragged in one jump (pointer)', () => {
    // A straight run so a single pointer jump from the first to the last
    // cell is legal (straightRun only fills colinear gaps).
    const straightPath: Cell[] = [
      { r: 3, c: 0 },
      { r: 3, c: 1 },
      { r: 3, c: 2 },
      { r: 3, c: 3 },
    ];

    let keyboardTraced: Cell[] = [];
    for (const cell of straightPath) {
      const step = extendTrace(keyboardTraced, cell, straightPath.length);
      if (step.type === 'extended' || step.type === 'backtrack') {
        keyboardTraced = step.traced;
      }
    }

    const pointerStep = extendTrace(
      [straightPath[0]],
      straightPath[straightPath.length - 1],
      straightPath.length
    );
    expect(pointerStep.type).toBe('extended');
    const pointerTraced = pointerStep.type === 'extended' ? pointerStep.traced : [];

    expect(keyboardTraced).toEqual(straightPath);
    expect(pointerTraced).toEqual(straightPath);
    expect(keyboardTraced).toEqual(pointerTraced);
  });
});

describe('getPathRating', () => {
  it('needs a flawless trace for Perfect', () => {
    expect(getPathRating(100, 0)).toBe('Perfect');
    // Full recall but an extra cell traced past the end isn't Perfect
    expect(getPathRating(100, 1)).toBe('Great');
  });

  it('rates by how much of the path came back', () => {
    expect(getPathRating(80, 1)).toBe('Great');
    expect(getPathRating(79.9, 1)).toBe('Good');
    expect(getPathRating(60, 2)).toBe('Good');
    expect(getPathRating(59.9, 2)).toBe('Try Again');
    expect(getPathRating(0, 5)).toBe('Try Again');
  });
});
